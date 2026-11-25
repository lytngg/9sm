-- Open demo mode. While the flag is on, a visitor with no login is signed in
-- as an anonymous user and given staff access, so the site can be explored
-- without an account. TURN THIS OFF BEFORE REAL CLIENT DATA GOES IN:
--   update public.app_flags set is_on = false where key = 'open_demo';
--   delete from auth.users where is_anonymous;
-- and set DEMO_OPEN to false in lib/demo.ts.

create table if not exists public.app_flags (
  key text primary key,
  is_on boolean not null default false
);
alter table public.app_flags enable row level security;
-- No policies: only security-definer functions read this table.

insert into public.app_flags (key, is_on) values ('open_demo', true)
  on conflict (key) do update set is_on = excluded.is_on;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r text := 'pending';
begin
  if coalesce(new.is_anonymous, false) then
    if exists (select 1 from public.app_flags where key = 'open_demo' and is_on) then
      insert into public.profiles (id, email, role) values (new.id, 'demo visitor', 'staff')
        on conflict (id) do nothing;
    end if;
    return new;
  end if;
  if exists (select 1 from public.invites where lower(email) = lower(new.email) and role = 'staff') then
    r := 'staff';
  elsif exists (select 1 from public.invites where lower(email) = lower(new.email) and role = 'operator') then
    r := 'operator';
  end if;
  insert into public.profiles (id, email, role) values (new.id, new.email, r)
    on conflict (id) do nothing;
  insert into public.client_members (client_id, user_id)
    select client_id, new.id from public.invites
    where lower(email) = lower(new.email) and role = 'operator'
    on conflict do nothing;
  return new;
end;
$$;
