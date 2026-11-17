-- 9SM Platform, stage 2: calendar, operator requests, posts and approvals.
-- Run this in the Supabase SQL editor after schema.sql.

create table if not exists public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  date date not null,
  kind text not null default 'event' check (kind in ('event', 'note')),
  text text not null,
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  for_date date not null,
  kind text not null check (kind in ('Offer', 'Product news', 'Event', 'Other')),
  details text not null,
  status text not null default 'New' check (status in ('New', 'Scheduled', 'Done')),
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  channels text[] not null,
  publish_date date not null,
  publish_time time not null,
  body text not null,
  status text not null default 'Draft'
    check (status in ('Draft', 'Team lead review', 'Client review', 'Approved', 'Posted')),
  feedback text,
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists calendar_entries_client_date on public.calendar_entries (client_id, date);
create index if not exists requests_client on public.requests (client_id, for_date);
create index if not exists posts_client on public.posts (client_id, publish_date);

alter table public.calendar_entries enable row level security;
alter table public.requests enable row level security;
alter table public.posts enable row level security;

-- Calendar: operators read their own client's entries, staff manage them.
drop policy if exists calendar_read on public.calendar_entries;
create policy calendar_read on public.calendar_entries for select to authenticated
  using (public.is_staff() or public.is_member(client_id));
drop policy if exists calendar_write on public.calendar_entries;
create policy calendar_write on public.calendar_entries for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Requests: operators read and create for their own client, staff manage them.
drop policy if exists requests_read on public.requests;
create policy requests_read on public.requests for select to authenticated
  using (public.is_staff() or public.is_member(client_id));
drop policy if exists requests_create on public.requests;
create policy requests_create on public.requests for insert to authenticated
  with check (
    public.is_staff()
    or (public.is_member(client_id) and status = 'New' and created_by = auth.uid())
  );
drop policy if exists requests_update on public.requests;
create policy requests_update on public.requests for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists requests_delete on public.requests;
create policy requests_delete on public.requests for delete to authenticated
  using (public.is_staff());

-- Posts: operators never see drafts or posts still in internal review.
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select to authenticated
  using (
    public.is_staff()
    or (public.is_member(client_id) and status in ('Client review', 'Approved', 'Posted'))
  );
drop policy if exists posts_write on public.posts;
create policy posts_write on public.posts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- The one thing an operator can do to a post: approve it or send it back,
-- and only while it is waiting on them.
create or replace function public.review_post(p_post uuid, p_approve boolean, p_feedback text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  st text;
begin
  select client_id, status into cid, st from public.posts where id = p_post;
  if cid is null or not (public.is_staff() or public.is_member(cid)) then
    raise exception 'Post not found';
  end if;
  if st <> 'Client review' then
    raise exception 'This post is not waiting for client review';
  end if;
  if p_approve then
    update public.posts set status = 'Approved', feedback = null where id = p_post;
  else
    update public.posts set status = 'Draft', feedback = nullif(trim(coalesce(p_feedback, '')), '') where id = p_post;
  end if;
end;
$$;
revoke execute on function public.review_post(uuid, boolean, text) from public, anon;
grant execute on function public.review_post(uuid, boolean, text) to authenticated;
