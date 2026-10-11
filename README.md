# Stoic Reader

Marcus Aurelius' **Meditations** (Gregory Hays) and Epictetus' **Enchiridion** with **Fragments** (George Long), organized into 15 themes each. Read one theme at a time, add Tamil translations, highlight, write your own thoughts, keep favorites, search with typo tolerance, read in focus mode, and make quote images. Sign in to keep everything in sync across devices.

**Stack (all free tiers):** Vite (plain JavaScript) on **Vercel** · **Supabase** (Postgres, Auth, Row Level Security) · **GitHub** (source and CI).

How it works: the app is local-first. It always works from your browser's storage, even without an account. If you sign in, your Tamil text, notes, favorites, highlights and read marks are copied to the `user_data` table in Supabase, protected so each person can only reach their own rows.

## 1. Run it on your computer

```bash
npm install
cp .env.example .env     # then fill in the two values from step 2
npm run dev              # http://localhost:5173
npm test                 # sync logic tests
```

Without the `.env` values the app still works fully; the account button just says "Cloud sync off".

## 2. Supabase (database and login)

1. Go to https://supabase.com and create a free project.
2. Open **SQL Editor**, paste the whole of `supabase/schema.sql`, and press **Run**.
3. Open **Project Settings, API**. Copy the **Project URL** and the **anon public** key into `.env` (names: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). The anon key is meant to be public; the row level security rules in the SQL are what protect the data.
4. Open **Authentication, Providers** and make sure **Email** is on. For quick testing you can turn off "Confirm email"; otherwise new users get a confirmation email.
5. Once you have your Vercel address (step 4), open **Authentication, URL Configuration**: set **Site URL** to it, and add it (and `http://localhost:5173`) under **Redirect URLs**. Magic links and confirmation emails need this.

## 3. GitHub

Create an empty repository on GitHub (no README), then in this folder:

```bash
git init
git add .
git commit -m "Stoic Reader"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/stoic-reader.git
git push -u origin main
```

The workflow in `.github/workflows/ci.yml` runs the tests and a build on every push.

## 4. Vercel

1. Go to https://vercel.com, sign in with GitHub, press **Add New, Project**, and import your repository.
2. Vercel detects Vite. Before pressing **Deploy**, add two **Environment Variables**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as your `.env`).
3. Deploy. Every later `git push` to `main` redeploys automatically.
4. Copy your `https://....vercel.app` address into the Supabase URL settings (step 2.5).

## Accounts and passwords

- **Create an account** asks you to type the password twice and checks that both match (at least 8 characters). The "Show password" box lets you see what you typed.
- **Forgot password?** on the sign-in page emails a reset link. Opening the link brings you back to the site, which asks for a new password (typed twice). For this to work, your site address must be listed under Supabase, Authentication, URL Configuration (Site URL and Redirect URLs).
- **Change password** is in the account window once you are signed in.
- **Locked out and no email arrives?** In the Supabase dashboard, open Authentication, Users, pick the user and choose "Send password recovery", or delete the user and create the account again (nothing is lost if it has no saved data yet).

## Notes

- **Free tiers:** Vercel Hobby and Supabase Free are enough for personal use. Free Supabase projects pause after a week of no activity; open the Supabase dashboard and press Restore if that happens.
- **Backups:** the Back up and Restore buttons still work and save a JSON file of the current book's data.
- **Sync rules:** changes are saved a moment after you make them. If two devices both changed the same kind of data, favorites are combined and, for everything else, the device you are using wins. Deleting something on one device is not undone by another unless that other device changed it in between.
- **Privacy:** passwords are handled by Supabase Auth. The anon key in the browser can only do what the row level security policies allow.

## Project layout

```
index.html              page markup
src/main.js             the app
src/sync.js             sign-in and cloud sync
src/styles.css          styles
src/data/               book text and themes (med.json, enc.json)
supabase/schema.sql     database table and security rules
tests/sync.test.mjs     tests for the sync logic
vercel.json             Vercel settings
.github/workflows/      CI
```
