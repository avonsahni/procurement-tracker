# Deploying Procurement Tracker to Vercel

End-to-end checklist. ~15 min start to finish.

## 1. Create the Supabase project

1. Go to https://supabase.com/dashboard and sign in (free).
2. **New project** → name it, pick a region close to your users, set a strong DB password (save it somewhere; you won't need it day-to-day but recovery needs it).
3. Wait ~2 min for provisioning.

## 2. Run the schema migration

1. In your Supabase project, open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/schema.sql` from this repo and paste the entire contents.
3. Click **Run**. You should see "Success. No rows returned" — all tables, RLS policies, and the signup trigger are now in place.

## 3. Configure auth

1. **Authentication → Providers → Email** in the Supabase dashboard.
2. Confirm **Enable Email provider** is on.
3. For development, turn **OFF** "Confirm email" so new signups can use the app immediately. **For production, turn it back ON** and set up SMTP under Authentication → SMTP Settings (or use Supabase's built-in email for low volume).

## 4. Grab your env vars

In Supabase → **Project Settings → API**:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | "Project URL" — `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "Project API keys" → `anon` `public` |

Drop them into `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## 5. Try it locally

```bash
npm run dev
```

Open http://localhost:3000 → sign up with any email + password (min 8 chars) → you should land on an empty dashboard. Hit **Settings → Load Sample Data** to populate demo projects.

## 6. Deploy to Vercel

1. Push your repo to GitHub.
2. Go to https://vercel.com/new → **Import** your repo.
3. **Framework Preset**: Next.js (auto-detected).
4. **Environment Variables** — add the same two as above:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. **Deploy.**

That's it. Vercel gives you a URL like `procurement-tracker-xxx.vercel.app`.

## 7. Add the production URL to Supabase

Once deployed, go back to Supabase → **Authentication → URL Configuration**:

- **Site URL**: your Vercel URL (`https://procurement-tracker-xxx.vercel.app`)
- **Redirect URLs**: add the same URL

This makes email confirmation links point to your deployed app instead of localhost.

## 8. Optional: custom domain

Vercel project → **Settings → Domains** → add your domain. Update Supabase URL config to match.

---

## Notes & gotchas

- **Multi-tenant isolation** is enforced at the Postgres level via Row Level Security. Each user only ever sees their own data. No app-level filtering needed.
- **Each user signup auto-creates** a profile, default company info, and 5 default categories (Civil/Electrical/Mechanical/Instrumentation/Services) via a Postgres trigger on `auth.users`. See `supabase/schema.sql`.
- **Vercel free tier** is plenty for this app. Supabase free tier gives you 500MB Postgres, 50k auth users, 2GB transfer — more than enough.
- **Cold starts**: first request after idle may take ~1s. Acceptable for an internal tool.
- **No file uploads yet** — the Documents section stores metadata only. To enable real file storage, use Supabase Storage and update the documents POST route to upload + store the path.
- **Email confirmation**: in dev, leave it off. In prod, turn it on. Supabase sends from their domain by default; for branded emails, hook up SMTP.
