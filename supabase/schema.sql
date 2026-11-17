-- 9SM Platform, stage 1: logins, roles and client workspaces.
-- Run this once in the Supabase SQL editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  role text not null default 'pending' check (role in ('pending', 'staff', 'operator')),
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text,
  smm text,
  created_at timestamptz not null default now()
);

-- Which operator logins belong to which client.
create table if not exists public.client_members (
  client_id uuid not null references public.clients on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  primary key (client_id, user_id)
);

-- People who have been given access but may not have signed up yet.
-- client_id is null for staff invites.
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('staff', 'operator')),
  client_id uuid references public.clients on delete cascade,
  created_at timestamptz not null default now(),
  check ((role = 'staff' and client_id is null) or (role = 'operator' and client_id is not null))
);
create unique index if not exists invites_unique
  on public.invites (lower(email), coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Helpers used by the access rules. Security definer so they can read
-- profiles and memberships without tripping the rules they serve.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'staff');
$$;

create or replace function public.is_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.client_members where client_id = cid and user_id = auth.uid());
$$;

-- When someone signs up, give them whatever their invites say. No invite
-- means role 'pending', which can see nothing.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r text := 'pending';
begin
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Staff give access with this. It records the invite and, if the person
-- already has a login, applies it straight away. It never downgrades staff.
create or replace function public.invite_user(p_email text, p_role text, p_client uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  if not public.is_staff() then
    raise exception 'Only staff can give access';
  end if;
  insert into public.invites (email, role, client_id)
    values (lower(trim(p_email)), p_role, p_client)
    on conflict do nothing;
  select id into uid from public.profiles where lower(email) = lower(trim(p_email));
  if uid is not null then
    if p_role = 'staff' then
      update public.profiles set role = 'staff' where id = uid;
    else
      update public.profiles set role = 'operator' where id = uid and role = 'pending';
      insert into public.client_members (client_id, user_id) values (p_client, uid)
        on conflict do nothing;
    end if;
  end if;
end;
$$;

-- Staff take an operator's access to one client away with this.
create or replace function public.remove_access(p_email text, p_client uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can remove access';
  end if;
  delete from public.invites where lower(email) = lower(trim(p_email)) and client_id = p_client;
  delete from public.client_members
    where client_id = p_client
      and user_id in (select id from public.profiles where lower(email) = lower(trim(p_email)));
end;
$$;

revoke execute on function public.invite_user(text, text, uuid) from public, anon;
revoke execute on function public.remove_access(text, uuid) from public, anon;
grant execute on function public.invite_user(text, text, uuid) to authenticated;
grant execute on function public.remove_access(text, uuid) to authenticated;

-- Access rules. Staff see everything. Operators see only their own clients.
-- Nobody can change their own role: there is no update rule on profiles.
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_members enable row level security;
alter table public.invites enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists clients_read on public.clients;
create policy clients_read on public.clients for select to authenticated
  using (public.is_staff() or public.is_member(id));
drop policy if exists clients_write on public.clients;
create policy clients_write on public.clients for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists members_read on public.client_members;
create policy members_read on public.client_members for select to authenticated
  using (public.is_staff() or user_id = auth.uid());
drop policy if exists members_write on public.client_members;
create policy members_write on public.client_members for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists invites_staff on public.invites;
create policy invites_staff on public.invites for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
