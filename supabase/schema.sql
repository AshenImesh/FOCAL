-- ════════════════════════════════════════════════════════════════
--  FOCAL — Supabase schema
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ════════════════════════════════════════════════════════════════

-- ── Students (tied to Supabase Auth users) ──────────────────────
create table if not exists public.students (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text not null,
  grade      text not null,
  phone      text,
  approved   boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Paper results (uploaded by teacher / admin) ─────────────────
create table if not exists public.results (
  id         bigint generated always as identity primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  paper      text not null,
  marks      numeric not null,
  total      numeric not null default 100,
  date       text,
  created_at timestamptz not null default now()
);

-- ── Quiz scores (saved automatically when a student finishes a quiz) ──
create table if not exists public.quiz_scores (
  id         bigint generated always as identity primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  grade      text not null,
  score      integer not null,
  total      integer not null,
  pct        numeric not null,
  created_at timestamptz not null default now()
);

-- ── Teachers (accounts created by the admin) ─────────────────────
create table if not exists public.teachers (
  id            bigint generated always as identity primary key,
  name          text not null,
  username      text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ── Admins (extra admin panel Gmail accounts, managed in the panel) ──
create table if not exists public.admins (
  id         bigint generated always as identity primary key,
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- ── Notices (notice banner messages, created by admin) ───────────
create table if not exists public.notices (
  id         bigint generated always as identity primary key,
  message    text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Row Level Security ──────────────────────────────────────────
alter table public.students enable row level security;
alter table public.results enable row level security;
alter table public.quiz_scores enable row level security;
alter table public.notices enable row level security;
alter table public.teachers enable row level security;
alter table public.admins enable row level security;

-- students: any logged-in student may read the roster (used by leaderboards),
-- may insert their OWN registration row, and may update their own profile —
-- but they can NEVER change their own `approved` flag.
create policy "students_select"   on public.students for select using (auth.role() = 'authenticated');
create policy "students_insert"   on public.students for insert with check (auth.uid() = id);
create policy "students_update"   on public.students for update using (auth.uid() = id) with check (auth.uid() = id);

-- results: a student may only read their OWN paper results.
create policy "results_select_own" on public.results for select using (student_id = auth.uid());

-- quiz_scores: any logged-in student may read scores (leaderboard) and may
-- insert their own scores.
create policy "quiz_scores_select" on public.quiz_scores for select using (auth.role() = 'authenticated');
create policy "quiz_scores_insert" on public.quiz_scores for insert with check (student_id = auth.uid());

-- notices: public (shown on the homepage to everyone).
create policy "notices_select" on public.notices for select using (true);

-- teachers: no policies → only the service-role key (used server-side by the
-- admin/teacher panels) can read or write this table.
-- admins: no policies → only the service-role key (used server-side by the
-- admin panel) can read or write this table.

-- ── Guard: a student cannot approve themselves ──────────────────
create or replace function public.prevent_self_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The service-role key (used by the admin panel) may change `approved`.
  if current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role' then
    return new;
  end if;
  if new.approved is distinct from old.approved then
    raise exception 'Approval status can only be changed by an admin.';
  end if;
  return new;
end;
$$;

drop trigger if exists students_no_self_approval on public.students;
create trigger students_no_self_approval
  before update on public.students
  for each row execute function public.prevent_self_approval();

-- ── Helpful index ───────────────────────────────────────────────
create index if not exists results_student_idx   on public.results(student_id);
create index if not exists quiz_scores_student_idx on public.quiz_scores(student_id);
