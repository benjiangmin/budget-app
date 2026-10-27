# Budget

Log expenses, see spending per category, flip between months.

Next.js (App Router) + Tailwind + Supabase. All database calls run on the server with your secret key, so nothing sensitive reaches the browser.

## Setup

1. **Install**
   ```bash
   npm install
   ```

2. **Create the tables** — Supabase dashboard → SQL Editor → New query → paste `supabase/schema.sql` → Run.
   This creates `categories` and `entries` and adds 7 starter categories. Rename or recolor them in the Table Editor anytime.

3. **Add your keys** — copy `.env.example` to `.env.local` and fill in:
   - `SUPABASE_URL` — Project Settings → API
   - `SUPABASE_SECRET_KEY` — the secret key (`sb_secret_…`) or legacy `service_role` key

4. **Run it**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## Project map

```
src/app/page.tsx            page shell
src/app/actions.ts          add / delete expense (server actions)
src/components/MonthView    month header, total, category breakdown
src/components/AddEntryForm the expense form
src/components/EntryList    expenses grouped by day
src/lib/data.ts             Supabase reads
src/lib/month.ts            month math + money formatting
supabase/schema.sql         tables, RLS, starter categories
```

## Before deploying publicly

There's no login yet. That's fine on localhost, but add Supabase Auth (and a `user_id` column) before putting this on Vercel, or anyone with the URL can add and delete entries.
Update test
Update test