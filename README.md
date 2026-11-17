# 9SM Platform

Client workspaces for 9th Street Media. Staff see every client. Operators see only their own.

## What is built

Stage 1: logins, staff and operator roles, client workspaces, giving and removing access.

Next: calendar, requests and approvals. Then talent (live tracking, hours, contracts, codes, outreach). Then the scheduler, inbox and attribution.

## How it fits together

- `app/` the pages (Next.js).
- `lib/supabase/server.ts` the database client. Every query runs as the signed-in user.
- `supabase/schema.sql` the tables and the access rules. The database enforces who sees what, so a bug in a page cannot leak another client's data.
- `proxy.ts` keeps sessions fresh and sends signed-out visitors to `/login`.

## Going live

1. **Supabase.** Create a project. Open the SQL editor, paste all of `supabase/schema.sql` and run it.
2. **Vercel.** Import this repository. Under Environment Variables add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase (Project Settings, API). Deploy.
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
