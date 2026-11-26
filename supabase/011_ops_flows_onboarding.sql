-- 9SM Platform, stage 11: the operations team's own request forms and statuses,
-- task priority, and the team onboarding checklist for each new client.

-- Each team has its own statuses now, checked in the app (lib/flows.ts).
alter table public.briefs drop constraint if exists briefs_status_check;
alter table public.briefs add column if not exists priority text not null default 'Medium'
  check (priority in ('Low', 'Medium', 'High', 'Super Urgent'));
update public.briefs set priority = 'Super Urgent' where urgent and priority = 'Medium';
update public.briefs set status = case status when 'Requested' then 'New Request' when 'In progress' then 'In Design'
  when 'In review' then 'In Review' when 'Delivered' then 'Complete' else status end
  where team in ('design', 'video');

-- The internal checklist ops runs for every new client: who does what, by when.
create table if not exists public.onboarding_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  task text not null,
  phase text not null,
  owner_label text,
  assignee uuid references public.profiles on delete set null,
  due date,
  status text not null default 'Not started' check (status in ('Not started', 'In progress', 'Done')),
  position integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists onboarding_items_client on public.onboarding_items (client_id, position);
alter table public.onboarding_items enable row level security;
drop policy if exists onboarding_items_staff on public.onboarding_items;
create policy onboarding_items_staff on public.onboarding_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- A link the client uses to pick a time for the intro call.
alter table public.client_profile add column if not exists intro_booking_url text;
