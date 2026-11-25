-- 9SM Platform, stage 9: internal briefs between teams, and the accounts watched for the trending page.

-- A brief is one team asking another for something, for a client. Staff only.
create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  team text not null references public.departments on delete restrict,
  title text not null,
  details text,
  format text,
  due date,
  urgent boolean not null default false,
  reference_url text,
  attachment_path text,
  status text not null default 'Requested' check (status in ('Requested', 'In progress', 'In review', 'Delivered')),
  assignee uuid references public.profiles on delete set null,
  delivery_url text,
  delivery_path text,
  requested_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists briefs_status on public.briefs (status, due);
alter table public.briefs enable row level security;
drop policy if exists briefs_staff on public.briefs;
create policy briefs_staff on public.briefs for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- The conversation on a brief, so it stops happening in Slack threads.
create table if not exists public.brief_notes (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.briefs on delete cascade,
  body text not null,
  kind text not null default 'note' check (kind in ('note', 'changes', 'event')),
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists brief_notes_brief on public.brief_notes (brief_id, created_at);
alter table public.brief_notes enable row level security;
drop policy if exists brief_notes_staff on public.brief_notes;
create policy brief_notes_staff on public.brief_notes for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Accounts the social team wants to keep an eye on. The trending page reads
-- these once the X connection is on.
create table if not exists public.watch_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'X',
  handle text not null,
  segment text not null,
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index if not exists watch_accounts_unique on public.watch_accounts (platform, lower(handle));
alter table public.watch_accounts enable row level security;
drop policy if exists watch_accounts_staff on public.watch_accounts;
create policy watch_accounts_staff on public.watch_accounts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
