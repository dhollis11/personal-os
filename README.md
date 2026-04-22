# Personal OS

Your daily dashboard — agenda, tasks, weather, USD/PHP exchange rate, news, and upcoming occasions. Built from the **CONSOLE** design direction in the original mock.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth) · Vercel

**Live data already wired:**
- Weather for Columbus, Delaware OH, and Cebu City — via [Open-Meteo](https://open-meteo.com) (no key needed)
- USD/PHP rate + 12-day sparkline — via [Frankfurter](https://www.frankfurter.app) / ECB (no key needed)

**Stubbed for now (live mock data, ready to swap):**
- Calendar events — replace `SEED_EVENTS` once you wire Google Calendar OAuth
- News feed — replace `SEED_NEWS` with an RSS fetcher when ready
- Tasks and occasions are **real** the moment you add Supabase

---

## Quick start (5 minutes)

### 1. Install and run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The dashboard renders immediately in **demo mode** with seed data — weather and FX are already live.

### 2. Set up Supabase (for real tasks + occasions + login)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard, go to **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and click **Run**. This creates the `tasks` and `occasions` tables and turns on row-level security.
3. Go to **Settings → API** and copy your **Project URL** and **anon public key**.
4. In the project root, copy `.env.example` to `.env.local` and paste those two values:

   ```bash
   cp .env.example .env.local
   ```
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   ```
5. Restart the dev server. The "SIGN IN" link in the top right now works — enter your email, click the magic link, and your tasks/occasions will save to your Supabase database.

> **Email delivery note:** Supabase's free tier sends magic-link emails from a generic sender. For a personalized "from" address, configure SMTP under **Project Settings → Auth → SMTP Settings**.

### 3. Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo. Vercel auto-detects Next.js — accept the defaults.
3. Add the two environment variables (same as `.env.local`) under **Environment Variables**.
4. Click **Deploy**. You'll get a URL like `personal-os-xxxx.vercel.app`.
5. **Important:** Back in Supabase, go to **Authentication → URL Configuration** and add your Vercel URL to **Site URL** and **Redirect URLs** (e.g. `https://personal-os-xxxx.vercel.app/auth/callback`). Otherwise magic-link emails will redirect to localhost.

You're done. The app works on desktop and mobile browsers and can be installed to your home screen as a PWA (icon, splash screen, fullscreen).

---

## Project structure

```
app/
  api/
    weather/route.ts     # Open-Meteo proxy
    fx/route.ts          # Frankfurter / ECB proxy
    tasks/route.ts       # CRUD with Supabase auth + RLS
    occasions/route.ts   # CRUD with Supabase auth + RLS
  auth/callback/route.ts # Magic-link callback
  login/page.tsx         # Sign-in page
  layout.tsx             # Fonts, metadata, ambient gradient
  page.tsx               # Renders <Dashboard />
  globals.css            # Tailwind + the CONSOLE styles

components/
  Dashboard.tsx          # Main shell, view switcher, data wiring
  Header.tsx             # Logo, greeting, Day/Week/Month tabs, avatar
  Hero.tsx               # Big clock, date, "next up"
  Agenda.tsx             # Timeline + event list with NOW marker
  Tasks.tsx              # Interactive checklist (optimistic updates)
  Weather.tsx            # 3-city cards, fetches live data
  Fx.tsx                 # Currency converter + sparkline
  News.tsx               # Color-coded feed
  Occasions.tsx          # Birthdays / anniversaries with countdown
  CalendarViews.tsx      # Week heatmap, Month grid, Quote
  ui.tsx                 # Card, Label, PillTabs primitives

lib/
  supabase-browser.ts    # Browser client (singleton)
  supabase-server.ts     # Server client for route handlers
  seed-data.ts           # Mock data — also fallback when offline
  utils.ts               # Date math, formatters, color maps

supabase/
  schema.sql             # Tables + RLS policies. Run once.

types/
  index.ts               # Shared Task / Occasion / CalendarEvent / etc.
```

---

## Demo mode

The app is designed to **always render** even before Supabase is configured:

- No env vars set → tasks and occasions show seed data, "SIGN IN" link is hidden, edits are disabled.
- Env vars set, not signed in → same as above, but a "SIGN IN" link appears in the header.
- Signed in → tasks and occasions load from your Supabase database, edits save in real time.

This means you can deploy first and configure auth later without breaking anything.

---

## Adding a new section to the dashboard

1. Add the data type to `types/index.ts`.
2. If it's user-owned data, add a table + RLS policies to `supabase/schema.sql` (run the new statements in the Supabase SQL editor).
3. Create an API route under `app/api/<thing>/route.ts` following the pattern in `tasks/route.ts`.
4. Build a component in `components/`, call your API from `useEffect`.
5. Drop the component into `Dashboard.tsx`.

---

## Wiring real Google Calendar / Tasks (phase 2)

The current `SEED_EVENTS` is wrapped behind the `Hero` and `Agenda` components, which only need an array of `CalendarEvent` objects. To swap in real data:

1. Set up a Google Cloud project, create OAuth credentials, add `https://your-vercel-url/auth/google/callback` as a redirect URI.
2. Add a Supabase table to store the user's encrypted refresh token.
3. Create `app/api/calendar/route.ts` that uses the stored token to fetch from `https://www.googleapis.com/calendar/v3/calendars/primary/events`.
4. In `Dashboard.tsx`, replace `SEED_EVENTS` with a `useEffect` fetch from `/api/calendar`.

I deliberately kept the calendar shape (`{ start, end, title, where, color }`) close to what Google returns so the swap is small.

---

## License

Personal use. The CONSOLE visual design is yours — derived from the mock you provided.
