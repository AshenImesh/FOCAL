# FOCAL — Science Classes Website

Tuition science classes (grades 6–11, English medium, Sri Lanka). Students log in with Gmail,
see their paper results and quiz history, take timed quizzes and climb the leaderboard. Teachers
upload results; the admin approves registrations, manages teachers and publishes notices.

Built with **Next.js 15 (App Router, TypeScript)**, **Supabase** (Auth + Postgres + RLS) and
**Recharts**.

## Quick start

### 1. Database (one time)

1. Open your Supabase project dashboard → **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and press **Run**.
   It creates all tables, row-level security, 60 seed quiz questions (10 per grade) and a welcome
   notice. Re-running it is safe.

### 2. Google login

In Supabase Dashboard → **Authentication → Providers**:
1. Enable **Google**.
2. Create credentials at <https://console.cloud.google.com/apis/credentials> (OAuth client,
   Web application). Add the redirect URL shown in the Supabase Google provider settings.
3. Paste the Client ID and Client Secret back into Supabase.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in values from Supabase
(**Settings → API**):

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` API key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (**secret** — server only) |
| `SESSION_SECRET` | Any long random string (signs teacher-login cookies) |
| `ADMIN_EMAIL` | Your Gmail — this account becomes the site **admin** on first login |

### 4. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Roles

- **Student** — registers with any Gmail, then gives name/grade/phone. Once the admin approves
  them, paper results unlock on their dashboard (quizzes work immediately).
- **Teacher** — the admin creates their login (username + password) in the admin panel. Teachers
  sign in at `/teacher` and upload paper results.
- **Admin** — the Gmail in `ADMIN_EMAIL`. Opens `/admin`: approve/reject registrations, edit or
  delete students, create/change teacher credentials, publish notices for the site banner. The
  **Quiz bank** tab lets you upload quiz questions per grade as simple markdown (numbered
  questions with `A`–`D` options and an `Answer:` line) — either append or replace the grade's
  question set.

## Deploying to Vercel

1. Push this folder to a GitHub repo and import it in Vercel (or run `npx vercel` from the folder).
2. In Vercel → **Settings → Environment Variables**, add the same five variables from `.env.local`.
3. Deploy. The framework preset (Next.js) is detected automatically.

## Replacing the teacher photo

Put a photo (transparent background works best) at `public/teacher.png` and redeploy. The
homepage uses it; a placeholder SVG is shown until then.

## Project layout

```
app/            routes: / (home), /login, /register, /auth/callback, /dashboard,
                /quiz, /board, /teacher, /admin
components/     client components (quiz player, panels, charts, banner)
lib/            server actions, types, prediction, Supabase clients
supabase/       schema.sql — full database setup + seed data
```

Notes:

- Quiz questions are managed per grade from the admin **Quiz bank** tab (markdown upload). The
  `schema.sql` still seeds 10 starter questions per grade.
- The leaderboards on `/board` are public (as before), the homepage shows a top-5 quiz
  leaderboard, and the dashboard compares your best quiz score against the top performers in
  your grade. Paper results per student are private until the admin approves the registration.
