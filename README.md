# 9SM Platform

Client workspaces for 9th Street Media. Staff see every client. Operators see only their own.

## What is built

Stage 1: logins, staff and operator roles, client workspaces, giving and removing access.

Stage 2: a calendar per client, operator requests, and posts with team lead and client approval. Operators never see a post before it reaches client review. Publishing is still by hand.

Stage 3: staff profiles with a name, title and photo, and a social media manager assigned to each client. Operators see that person at the top of their workspace, without the email address.

Next: talent (live tracking, hours, contracts, codes, outreach). Then the scheduler, inbox and attribution.

## How it fits together

- `app/` the pages (Next.js).
- `lib/supabase/server.ts` the database client. Every query runs as the signed-in user.
- `supabase/schema.sql` the tables and the access rules. The database enforces who sees what, so a bug in a page cannot leak another client's data.
- `proxy.ts` keeps sessions fresh and sends signed-out visitors to `/login`.

## Going live

1. **Supabase.** Create a project. Open the SQL editor, paste all of `supabase/schema.sql` and run it. Then do the same with `supabase/002_calendar_requests_posts.sql` and `supabase/003_staff_profiles_smm.sql`, in that order. Each later stage adds one more numbered file to run.
2. **Vercel.** Import this repository. Under Environment Variables add `NEXT_PUBLIC_SUPABASE_URL` (the project address) and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the Publishable key, from Project Settings, API Keys). Never use a Secret key here. Deploy.
3. **Supabase again.** Under Authentication, URL Configuration, set the Site URL to the Vercel address.
4. **First staff account.** Open the site, create an account, then run this in the Supabase SQL editor with your email:

   ```sql
   update public.profiles set role = 'staff' where email = 'you@example.com';
   ```

   After that, add other staff and operators from inside the app.

Never commit keys or passwords to this repository.

## Working on it locally

```bash
cp .env.example .env.local   # fill in the two values
npm install
npm run dev
```

`npm run build` and `npm run lint` should both pass before anything is pushed.
