-- ════════════════════════════════════════════════════════════════
--  FOCAL — Supabase schema (run once)
--  Supabase Dashboard → SQL Editor → paste → Run
--  Creates tables, row-level security, seed quiz questions & notice.
-- ════════════════════════════════════════════════════════════════

-- ── Student / teacher / admin profiles (tied to Google Auth users) ──
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  grade      smallint check (grade between 6 and 11),
  phone      text,
  role       text not null default 'student' check (role in ('student','teacher','admin')),
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- ── Paper results (uploaded by teacher / admin) ─────────────────
create table if not exists public.papers (
  id         bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  paper_name text not null,
  marks      numeric not null,
  total      numeric not null default 100,
  date       text,
  created_at timestamptz not null default now()
);

-- ── Quiz scores (saved automatically when a student finishes a quiz) ──
create table if not exists public.quiz_scores (
  id         bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  grade      smallint not null,
  score      integer not null,
  total      integer not null,
  pct        numeric not null,
  created_at timestamptz not null default now()
);

-- ── Quiz question bank (per grade) ───────────────────────────────
create table if not exists public.quiz_questions (
  id         bigint generated always as identity primary key,
  grade      smallint not null,
  question   text not null,
  options    jsonb not null,            -- array of 4 option strings
  answer     integer not null,          -- index of the correct option
  feedback   text not null default '',  -- explanation shown after the quiz
  created_at timestamptz not null default now()
);

-- ── Teachers (login accounts created by the admin) ───────────────
create table if not exists public.teachers (
  id            bigint generated always as identity primary key,
  full_name     text not null,
  username      text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ── Notices (site-wide banner, created by the admin) ─────────────
create table if not exists public.notices (
  id         bigint generated always as identity primary key,
  title      text not null,
  body       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════
--  Row Level Security
-- ════════════════════════════════════════════════════════════════
alter table public.profiles       enable row level security;
alter table public.papers         enable row level security;
alter table public.quiz_scores    enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.teachers       enable row level security;
alter table public.notices        enable row level security;

-- Helpers (security definer, so policies can use them safely)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('teacher','admin')
  );
$$;

grant execute on function public.is_admin()  to anon, authenticated;
grant execute on function public.is_staff()  to anon, authenticated;

-- profiles:
--  · anyone may read names (public leaderboard)
--  · a student may insert/update only their own row
--  · staff may update/delete any row
create policy "profiles_select" on public.profiles
  for select using (true);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id or is_staff())
  with check (auth.uid() = id or is_staff());

create policy "profiles_delete" on public.profiles
  for delete using (is_admin());

-- Guard: nobody can flip their own role/status (only the admin or the
-- service-role key may, and the service role bypasses RLS entirely).
create or replace function public.prevent_self_promotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role' then
    return new;
  end if;
  if (new.role is distinct from old.role) or (new.status is distinct from old.status) then
    if not public.is_admin() then
      raise exception 'Only an admin can change role or status.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_no_self_promotion on public.profiles;
create trigger profiles_no_self_promotion
  before update on public.profiles
  for each row execute function public.prevent_self_promotion();

-- papers:
--  · a student sees only their own
--  · staff may read/write/delete any (teacher adds results)
--  · anonymous visitors may read (public paper leaderboard)
create policy "papers_select" on public.papers
  for select using (student_id = auth.uid() or is_staff() or auth.role() = 'anon');

create policy "papers_insert_staff" on public.papers
  for insert with check (is_staff());

create policy "papers_update_staff" on public.papers
  for update using (is_staff());

create policy "papers_delete_staff" on public.papers
  for delete using (is_staff());

-- quiz_scores:
--  · public read (leaderboard)
--  · a student may insert only their own score
create policy "quiz_scores_select" on public.quiz_scores
  for select using (true);

create policy "quiz_scores_insert_own" on public.quiz_scores
  for insert with check (student_id = auth.uid());

-- quiz_questions: any signed-in student may read the bank; writes are
-- only possible with the service-role key (no policy = denied).
create policy "quiz_questions_select" on public.quiz_questions
  for select using (auth.role() = 'authenticated');

-- notices: public read, admin write
create policy "notices_select" on public.notices
  for select using (true);

create policy "notices_insert_admin" on public.notices
  for insert with check (is_admin());

create policy "notices_update_admin" on public.notices
  for update using (is_admin());

create policy "notices_delete_admin" on public.notices
  for delete using (is_admin());

-- teachers: no policies — only the service-role key (server-side) can
-- read or write this table.

-- ════════════════════════════════════════════════════════════════
--  Indexes
-- ════════════════════════════════════════════════════════════════
create index if not exists papers_student_idx      on public.papers(student_id);
create index if not exists quiz_scores_student_idx on public.quiz_scores(student_id);
create index if not exists quiz_questions_grade_idx on public.quiz_questions(grade);
create index if not exists notices_active_idx      on public.notices(active);


-- ════════════════════════════════════════════════════════════════
--  Seed: quiz questions (60 — 10 per grade)
-- ════════════════════════════════════════════════════════════════
-- Seed quiz questions (10 per grade, grades 6-11)
insert into public.quiz_questions (grade, question, options, answer, feedback) values (6, 'What is the chemical symbol for water?', '["HO","H₂O","WA","OHH"]'::jsonb, 1, 'Water is H₂O — two hydrogen atoms bonded to one oxygen atom.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (6, 'Which organ pumps blood throughout the body?', '["Liver","Lung","Brain","Heart"]'::jsonb, 3, 'The heart is a muscular organ that pumps blood through the circulatory system.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (6, 'What is the process by which plants make food?', '["Respiration","Photosynthesis","Digestion","Transpiration"]'::jsonb, 1, 'Photosynthesis uses sunlight, water, and CO₂ to produce glucose and oxygen.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (6, 'Which planet is closest to the Sun?', '["Venus","Earth","Mercury","Mars"]'::jsonb, 2, 'Mercury is the closest planet to the Sun, though Venus is sometimes the hottest.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (6, 'What is the unit of force?', '["Joule","Watt","Newton","Pascal"]'::jsonb, 2, 'Force is measured in Newtons (N), named after Sir Isaac Newton.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (6, 'Which gas do plants absorb during photosynthesis?', '["Oxygen","Nitrogen","Carbon Dioxide","Hydrogen"]'::jsonb, 2, 'Plants absorb CO₂ and release O₂ during photosynthesis — the opposite of animals.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (6, 'What is the hardest natural substance on Earth?', '["Iron","Diamond","Quartz","Gold"]'::jsonb, 1, 'Diamond scores 10 on the Mohs scale — the highest possible hardness.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (6, 'Which part of the cell controls its activities?', '["Cytoplasm","Cell wall","Nucleus","Vacuole"]'::jsonb, 2, 'The nucleus contains DNA and acts as the control center of the cell.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (6, 'What type of energy does food contain?', '["Kinetic","Chemical","Thermal","Sound"]'::jsonb, 1, 'Food stores chemical energy, which our bodies convert into other forms of energy.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (6, 'What is the boiling point of water at sea level?', '["90°C","95°C","100°C","110°C"]'::jsonb, 2, 'Water boils at 100°C (212°F) at standard atmospheric pressure (sea level).');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (7, 'What is the formula for speed?', '["Speed = Distance × Time","Speed = Distance / Time","Speed = Time / Distance","Speed = Force × Mass"]'::jsonb, 1, 'Speed = Distance ÷ Time. For example, 100m in 10s = 10 m/s.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (7, 'Which type of rock is formed from cooled lava?', '["Sedimentary","Metamorphic","Igneous","Limestone"]'::jsonb, 2, 'Igneous rock forms when magma or lava cools and solidifies.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (7, 'What is the powerhouse of the cell?', '["Nucleus","Ribosome","Mitochondria","Chloroplast"]'::jsonb, 2, 'Mitochondria produce ATP, the cell''s energy currency, through cellular respiration.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (7, 'Which electromagnetic wave has the shortest wavelength?', '["Radio waves","Microwaves","Visible light","Gamma rays"]'::jsonb, 3, 'Gamma rays have the shortest wavelength and highest energy in the EM spectrum.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (7, 'What is the chemical formula for carbon dioxide?', '["CO","C₂O","CO₂","C₂O₂"]'::jsonb, 2, 'CO₂ has one carbon atom bonded to two oxygen atoms.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (7, 'Which type of reproduction requires only one parent?', '["Sexual","Asexual","Binary","Meiotic"]'::jsonb, 1, 'Asexual reproduction produces offspring from a single parent, e.g. budding, cloning.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (7, 'What is the largest organ in the human body?', '["Liver","Brain","Skin","Lung"]'::jsonb, 2, 'The skin is the largest organ, protecting the body and regulating temperature.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (7, 'In which layer of the Earth do tectonic plates move?', '["Crust","Inner core","Outer core","Mantle"]'::jsonb, 3, 'Tectonic plates float on the semi-fluid upper mantle (asthenosphere).');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (7, 'What particle has a negative charge?', '["Proton","Neutron","Electron","Photon"]'::jsonb, 2, 'Electrons carry a negative charge and orbit the nucleus of an atom.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (7, 'What does DNA stand for?', '["Deoxyribonucleic Acid","Deoxyribose Nitrogen Acid","Diribonucleic Acid","Double Nitrogen Acid"]'::jsonb, 0, 'DNA (Deoxyribonucleic Acid) carries genetic information in living organisms.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (8, 'What is Newton''s Second Law of Motion?', '["F = mv","F = ma","F = m/a","F = a/m"]'::jsonb, 1, 'Newton''s 2nd Law: Force = mass × acceleration. More mass or acceleration = more force.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (8, 'Which acid is found in the stomach?', '["Sulfuric acid","Nitric acid","Hydrochloric acid","Citric acid"]'::jsonb, 2, 'The stomach produces hydrochloric acid (HCl) to digest food and kill bacteria.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (8, 'What is the pH of a neutral solution?', '["0","5","7","14"]'::jsonb, 2, 'pH 7 is neutral. Below 7 is acidic; above 7 is alkaline/basic.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (8, 'Which gas makes up most of Earth''s atmosphere?', '["Oxygen","Carbon Dioxide","Argon","Nitrogen"]'::jsonb, 3, 'Nitrogen makes up about 78% of the atmosphere; oxygen is only ~21%.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (8, 'What type of wave is sound?', '["Transverse","Longitudinal","Electromagnetic","Surface"]'::jsonb, 1, 'Sound travels as a longitudinal wave — compressions and rarefactions in a medium.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (8, 'What does the law of conservation of energy state?', '["Energy can be created","Energy can be destroyed","Energy cannot be created or destroyed","Energy equals mass"]'::jsonb, 2, 'Energy is never created or destroyed — it only transforms from one form to another.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (8, 'What is the chemical symbol for gold?', '["Go","Gd","Au","Ag"]'::jsonb, 2, 'Gold''s symbol Au comes from the Latin word ''Aurum''.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (8, 'Which type of bond involves sharing of electrons?', '["Ionic","Metallic","Covalent","Hydrogen"]'::jsonb, 2, 'Covalent bonds form when atoms share electron pairs. E.g. H₂O, CO₂.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (8, 'What is the SI unit of electric current?', '["Volt","Watt","Ohm","Ampere"]'::jsonb, 3, 'Electric current is measured in Amperes (A), named after André-Marie Ampère.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (8, 'Which part of the brain controls balance and coordination?', '["Cerebrum","Cerebellum","Medulla","Hypothalamus"]'::jsonb, 1, 'The cerebellum coordinates movement, balance, and fine motor skills.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (9, 'What is the formula for kinetic energy?', '["KE = mv","KE = ½mv²","KE = mgh","KE = mv²"]'::jsonb, 1, 'Kinetic Energy = ½ × mass × velocity². Doubling speed quadruples KE.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (9, 'In an atom, where are electrons found?', '["In the nucleus","Around the nucleus in shells","In the proton","Inside neutrons"]'::jsonb, 1, 'Electrons occupy energy shells (orbitals) around the nucleus.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (9, 'What is the process of cell division that produces 4 genetically different cells?', '["Mitosis","Meiosis","Binary fission","Budding"]'::jsonb, 1, 'Meiosis produces 4 haploid cells for sexual reproduction, each genetically unique.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (9, 'Which element has atomic number 6?', '["Calcium","Nitrogen","Carbon","Oxygen"]'::jsonb, 2, 'Carbon (C) has 6 protons, giving it atomic number 6. It''s the basis of all life.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (9, 'What is Ohm''s Law?', '["V = IR","I = VR","R = VI","V = I/R"]'::jsonb, 0, 'Ohm''s Law: Voltage (V) = Current (I) × Resistance (R).');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (9, 'Which type of radiation is stopped by a sheet of paper?', '["Beta","Gamma","Alpha","X-ray"]'::jsonb, 2, 'Alpha particles are the largest and least penetrating — stopped by paper or skin.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (9, 'What is the role of ribosomes in a cell?', '["Energy production","Protein synthesis","DNA replication","Lipid storage"]'::jsonb, 1, 'Ribosomes are the cell''s protein factories, translating mRNA into proteins.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (9, 'What is the acceleration due to gravity on Earth?', '["8.9 m/s²","9.8 m/s²","10.8 m/s²","11 m/s²"]'::jsonb, 1, 'Earth''s gravitational acceleration is approximately 9.8 m/s² (often rounded to 10).');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (9, 'Which process converts glucose into energy without oxygen?', '["Aerobic respiration","Photosynthesis","Anaerobic respiration","Transpiration"]'::jsonb, 2, 'Anaerobic respiration produces energy without O₂, creating lactic acid or ethanol.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (9, 'What is the speed of light in a vacuum?', '["3 × 10⁶ m/s","3 × 10⁸ m/s","3 × 10¹⁰ m/s","3 × 10⁴ m/s"]'::jsonb, 1, 'Light travels at approximately 3 × 10⁸ m/s (300,000 km/s) in a vacuum.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (10, 'What is the half-life of a radioactive substance?', '["Time for all atoms to decay","Time for half the atoms to decay","Time for one atom to decay","Time for energy to be released"]'::jsonb, 1, 'Half-life is the time it takes for half the radioactive nuclei in a sample to decay.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (10, 'Which type of isomerism involves compounds with the same molecular formula but different structural arrangements?', '["Optical isomerism","Geometric isomerism","Structural isomerism","Chain isomerism"]'::jsonb, 2, 'Structural isomers share a molecular formula but differ in how atoms are bonded.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (10, 'What is Faraday''s First Law of Electrolysis?', '["Mass deposited is proportional to time","Mass deposited is proportional to charge passed","Mass deposited is proportional to voltage","Mass deposited is proportional to resistance"]'::jsonb, 1, 'Faraday''s 1st Law: Mass of substance deposited is proportional to the charge passed.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (10, 'In genetics, what does ''heterozygous'' mean?', '["Both alleles are identical","One dominant, one recessive allele","Both alleles are recessive","No alleles present"]'::jsonb, 1, 'Heterozygous means having two different alleles for a gene (e.g., Aa).');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (10, 'Which law states that gas pressure and volume are inversely proportional at constant temperature?', '["Charles''s Law","Gay-Lussac''s Law","Boyle''s Law","Dalton''s Law"]'::jsonb, 2, 'Boyle''s Law: P₁V₁ = P₂V₂ at constant temperature — pressure and volume are inversely proportional.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (10, 'What is the function of the nephron?', '["Oxygenate blood","Filter blood and produce urine","Digest proteins","Produce hormones"]'::jsonb, 1, 'Nephrons are the functional units of the kidney, filtering blood and forming urine.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (10, 'What type of reaction releases heat to the surroundings?', '["Endothermic","Exothermic","Photosynthetic","Electrolytic"]'::jsonb, 1, 'Exothermic reactions release energy as heat. Combustion and neutralization are examples.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (10, 'Which force keeps electrons in orbit around the nucleus?', '["Gravitational force","Magnetic force","Electrostatic (Coulomb) force","Nuclear force"]'::jsonb, 2, 'The electrostatic attraction between the positive nucleus and negative electrons keeps them bound.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (10, 'What is the primary function of mRNA?', '["Stores genetic information permanently","Carries genetic code from DNA to ribosomes","Builds cell walls","Transports amino acids"]'::jsonb, 1, 'mRNA (messenger RNA) carries a copy of the DNA code to the ribosome for protein synthesis.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (10, 'Which enzyme breaks down hydrogen peroxide in cells?', '["Amylase","Lipase","Catalase","Protease"]'::jsonb, 2, 'Catalase breaks H₂O₂ into water and oxygen, preventing cellular damage.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (11, 'What is the equation for calculating electrical power?', '["P = I/V","P = IV","P = V/I","P = I²/V"]'::jsonb, 1, 'Electrical Power P = Current × Voltage (P = IV). Also written as P = I²R or V²/R.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (11, 'In Hardy-Weinberg equilibrium, which condition is NOT required?', '["Large population","No mutation","Random natural selection","No gene flow"]'::jsonb, 2, 'Hardy-Weinberg requires no natural selection. Random selection would disrupt allele frequencies.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (11, 'What does the Heisenberg Uncertainty Principle state?', '["Energy is quantized","Position and momentum cannot both be precisely known simultaneously","Electrons have wave-particle duality","Force equals mass times acceleration"]'::jsonb, 1, 'You cannot simultaneously know the exact position and momentum of a particle — measuring one disturbs the other.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (11, 'Which type of bond is responsible for the high boiling point of water?', '["Ionic bond","Covalent bond","Metallic bond","Hydrogen bond"]'::jsonb, 3, 'Hydrogen bonds between water molecules require significant energy to break, giving water a high boiling point.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (11, 'What is the term for the minimum energy required to start a chemical reaction?', '["Enthalpy","Entropy","Activation energy","Bond energy"]'::jsonb, 2, 'Activation energy is the minimum energy needed to break bonds and start a reaction.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (11, 'Which hormone regulates blood glucose levels by promoting its uptake into cells?', '["Glucagon","Adrenaline","Insulin","Cortisol"]'::jsonb, 2, 'Insulin (from the pancreas) lowers blood glucose by promoting glucose uptake into cells.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (11, 'What is the formula for calculating pressure?', '["P = Force / Area","P = Force × Area","P = Area / Force","P = Force + Area"]'::jsonb, 0, 'Pressure = Force ÷ Area. Units are Pascals (Pa) = N/m².');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (11, 'In organic chemistry, what is the general formula for alkanes?', '["CₙH₂ₙ","CₙHₙ","CₙH₂ₙ₊₂","CₙH₂ₙ₋₂"]'::jsonb, 2, 'Alkanes have the formula CₙH₂ₙ₊₂. Methane is CH₄, ethane is C₂H₆, etc.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (11, 'What does ATP stand for in biology?', '["Amino Triphosphate","Adenosine Triphosphate","Adenine Transfer Protein","Active Transport Protein"]'::jsonb, 1, 'ATP (Adenosine Triphosphate) is the universal energy currency of all living cells.');
insert into public.quiz_questions (grade, question, options, answer, feedback) values (11, 'Which law relates to the conservation of momentum?', '["Newton''s 1st Law","Newton''s 2nd Law","Newton''s 3rd Law","Hooke''s Law"]'::jsonb, 2, 'Newton''s 3rd Law (equal and opposite forces) is the basis for conservation of momentum in collisions.');


-- ════════════════════════════════════════════════════════════════
--  Seed: sample welcome notice
-- ════════════════════════════════════════════════════════════════
insert into public.notices (title, body) values (
  'Welcome to FOCAL Classes!',
  'Results and quizzes are now online. Take your first quiz or check your dashboard for paper results.'
);
