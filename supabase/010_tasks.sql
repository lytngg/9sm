-- 9SM Platform, stage 10: briefs grow into a task tool. Checklists, custom
-- fields, templates, tasks with no client, and an inbox.

alter table public.briefs drop constraint if exists briefs_team_fkey;
alter table public.briefs alter column client_id drop not null;
alter table public.briefs add column if not exists fields jsonb not null default '{}';

create table if not exists public.brief_items (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.briefs on delete cascade,
  text text not null,
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists brief_items_brief on public.brief_items (brief_id, position);

-- Extra columns a team adds to its tasks.
create table if not exists public.task_fields (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null check (kind in ('text', 'select', 'date', 'number', 'link')),
  options text[] not null default '{}',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  team text not null,
  format text,
  details text,
  items text[] not null default '{}'
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on public.notifications (user_id, created_at desc);

alter table public.brief_items enable row level security;
alter table public.task_fields enable row level security;
alter table public.task_templates enable row level security;
alter table public.notifications enable row level security;
drop policy if exists brief_items_staff on public.brief_items;
create policy brief_items_staff on public.brief_items for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists task_fields_staff on public.task_fields;
create policy task_fields_staff on public.task_fields for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists task_templates_staff on public.task_templates;
create policy task_templates_staff on public.task_templates for all to authenticated using (public.is_staff()) with check (public.is_staff());
-- People read and tick off their own notifications. Any staff member can send one.
drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notifications_mark on public.notifications;
create policy notifications_mark on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_send on public.notifications;
create policy notifications_send on public.notifications for insert to authenticated with check (public.is_staff());

insert into public.task_templates (name, team, format, details, items) values
  ('Offer creative', 'design', 'Offer creative',
   E'Offer:\nTerms line:\nChannels:\nGoes live:',
   array['Check the offer and terms against the client''s compliance notes', 'Hero image', 'Cut-downs for each channel', 'Terms line readable on mobile', 'Send to the client for approval']),
  ('Short video', 'video', 'Short vertical video',
   E'Hook in the first two seconds:\nWhat it shows:\nLength:\nChannels:',
   array['Script and hook agreed', 'Footage or assets in', 'First cut', 'Captions and 18+ line', 'Vertical and square exports']),
  ('Seasonal refresh', 'design', 'Seasonal refresh',
   E'Season or event:\nLive from:\nBack to normal on:',
   array['Logo', 'Avatar for every channel', 'Headers for every channel', 'Client sign-off', 'Calendar entry to switch back']),
  ('New client onboarding', 'ops', null,
   E'Go-live date:\nMain contact:',
   array['Slack channel created and client invited', 'Brand guidelines received', 'Access to every account confirmed', 'Intro call booked', 'Weekly meeting slot agreed', 'First designs signed off', 'First week of posts scheduled'])
on conflict (name) do nothing;

insert into public.task_fields (name, kind, options, position) values
  ('Channel', 'select', array['X', 'Instagram', 'TikTok', 'YouTube', 'Facebook', 'Discord', 'Telegram', 'All'], 1),
  ('Working file', 'link', '{}', 2),
  ('Size or length', 'text', '{}', 3)
on conflict (name) do nothing;
