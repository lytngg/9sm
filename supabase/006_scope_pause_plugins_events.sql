-- 9SM Platform, stage 6: scope against delivery, the pause switch, departments as
-- plugins with requests, and shared sports and esports events on client calendars.
-- Run this in the Supabase SQL editor after 005_prices_pitches_health.sql.

-- ---------- pause switch ----------
alter table public.clients add column if not exists paused_at timestamptz;
alter table public.clients add column if not exists paused_by uuid references public.profiles on delete set null;
alter table public.clients add column if not exists pause_reason text;

-- Staff or the client's own people can stop all posting, and start it again.
create or replace function public.set_client_pause(p_client uuid, p_on boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_staff() or public.is_member(p_client)) then
    raise exception 'Client not found';
  end if;
  update public.clients
    set paused_at = case when p_on then now() else null end,
        paused_by = case when p_on then auth.uid() else null end,
        pause_reason = case when p_on then nullif(trim(coalesce(p_reason, '')), '') else null end
    where id = p_client;
end;
$$;
revoke execute on function public.set_client_pause(uuid, boolean, text) from public, anon;
grant execute on function public.set_client_pause(uuid, boolean, text) to authenticated;

-- ---------- scope against delivery ----------
-- One line per thing the contract promises each month.
-- counts = 'posts' is counted from posts marked Posted. 'manual' is typed in.
create table if not exists public.scope_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  label text not null,
  monthly_target integer not null check (monthly_target > 0),
  counts text not null default 'manual' check (counts in ('manual', 'posts')),
  created_at timestamptz not null default now()
);
create table if not exists public.scope_delivery (
  item_id uuid not null references public.scope_items on delete cascade,
  client_id uuid not null references public.clients on delete cascade,
  month date not null,
  delivered integer not null check (delivered >= 0),
  primary key (item_id, month)
);
alter table public.scope_items enable row level security;
alter table public.scope_delivery enable row level security;
drop policy if exists scope_items_read on public.scope_items;
create policy scope_items_read on public.scope_items for select to authenticated
  using (public.is_staff() or public.is_member(client_id));
drop policy if exists scope_items_write on public.scope_items;
create policy scope_items_write on public.scope_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists scope_delivery_read on public.scope_delivery;
create policy scope_delivery_read on public.scope_delivery for select to authenticated
  using (public.is_staff() or public.is_member(client_id));
drop policy if exists scope_delivery_write on public.scope_delivery;
create policy scope_delivery_write on public.scope_delivery for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------- departments, offered to clients as plugins ----------
create table if not exists public.departments (
  key text primary key,
  name text not null,
  blurb text,
  lead_name text,
  slack_member_id text,
  position integer not null default 0
);
insert into public.departments (key, name, blurb, lead_name, position) values
  ('talent', 'Talent', null, null, 1),
  ('clipping', 'Clipping', null, null, 2),
  ('crm', 'CRM', null, null, 3),
  ('design', 'Design', null, 'Leo', 4),
  ('video', 'Video', null, 'Otto', 5),
  ('pr', 'PR', 'PR campaigns distributed across 500 third-party websites.', null, 6),
  ('community', 'Community', null, null, 7)
on conflict (key) do nothing;
alter table public.departments enable row level security;
drop policy if exists departments_read on public.departments;
create policy departments_read on public.departments for select to authenticated using (true);
drop policy if exists departments_write on public.departments;
create policy departments_write on public.departments for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Which plugins a client already has.
create table if not exists public.client_plugins (
  client_id uuid not null references public.clients on delete cascade,
  dept_key text not null references public.departments on delete cascade,
  primary key (client_id, dept_key)
);
alter table public.client_plugins enable row level security;
drop policy if exists client_plugins_read on public.client_plugins;
create policy client_plugins_read on public.client_plugins for select to authenticated
  using (public.is_staff() or public.is_member(client_id));
drop policy if exists client_plugins_write on public.client_plugins;
create policy client_plugins_write on public.client_plugins for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- A client asking a department for something.
create table if not exists public.department_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  dept_key text not null references public.departments on delete cascade,
  message text not null,
  status text not null default 'New' check (status in ('New', 'Picked up', 'Done')),
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.department_requests enable row level security;
drop policy if exists dept_requests_read on public.department_requests;
create policy dept_requests_read on public.department_requests for select to authenticated
  using (public.is_staff() or public.is_member(client_id));
drop policy if exists dept_requests_create on public.department_requests;
create policy dept_requests_create on public.department_requests for insert to authenticated
  with check (public.is_staff() or (public.is_member(client_id) and status = 'New' and created_by = auth.uid()));
drop policy if exists dept_requests_update on public.department_requests;
create policy dept_requests_update on public.department_requests for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------- shared events ----------
-- One list of sports and esports dates for everyone, kept by staff.
-- tier 1 is the handful everybody knows, 2 is big, 3 is everything else.
create table if not exists public.global_events (
  id uuid primary key default gen_random_uuid(),
  starts date not null,
  ends date,
  title text not null,
  category text not null,
  regions text[] not null default '{Global}',
  tier integer not null default 2 check (tier between 1 and 3),
  created_at timestamptz not null default now(),
  unique (starts, title)
);
alter table public.global_events enable row level security;
drop policy if exists global_events_read on public.global_events;
create policy global_events_read on public.global_events for select to authenticated using (true);
drop policy if exists global_events_write on public.global_events;
create policy global_events_write on public.global_events for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- How much of that list a client's calendar shows. 0 is none, 1 is only the
-- biggest, 3 is everything. An empty category list means all categories.
alter table public.clients add column if not exists event_level integer not null default 1 check (event_level between 0 and 3);
alter table public.clients add column if not exists event_categories text[] not null default '{}';
