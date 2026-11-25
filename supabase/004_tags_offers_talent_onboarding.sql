-- 9SM Platform, stage 4: operator tags, offers and images on posts, client files,
-- the talent roster with matching, and onboarding.
-- Run this in the Supabase SQL editor after 003_staff_profiles_smm.sql.

-- ---------- operator tags ----------
alter table public.clients add column if not exists tags text[] not null default '{}';
alter table public.clients add column if not exists markets text[] not null default '{}';

-- Which 9SM team a member of staff is on. Purely descriptive for now.
alter table public.profiles add column if not exists team text;

-- Replaces the three-argument version from stage 3, so calls are never ambiguous.
drop function if exists public.update_my_profile(text, text, text);
create or replace function public.update_my_profile(p_name text, p_title text, p_photo text default null, p_team text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff have a profile to edit';
  end if;
  if p_photo is not null and p_photo not like 'https://%' then
    raise exception 'Photo must be an https address';
  end if;
  update public.profiles
    set full_name = nullif(trim(coalesce(p_name, '')), ''),
        title = nullif(trim(coalesce(p_title, '')), ''),
        team = nullif(trim(coalesce(p_team, '')), ''),
        photo_url = coalesce(p_photo, photo_url)
    where id = auth.uid();
end;
$$;
revoke execute on function public.update_my_profile(text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text) to authenticated;

-- ---------- posts: creative, offer tags, link to the live post ----------
alter table public.posts add column if not exists image_path text;
alter table public.posts add column if not exists is_offer boolean not null default false;
alter table public.posts add column if not exists offer_product text;
alter table public.posts add column if not exists offer_kind text;
alter table public.posts add column if not exists live_url text;

-- ---------- private client files (post creatives, brand guidelines) ----------
-- Files live under <client id>/posts/... and <client id>/brand/...
-- Nothing here is public. Pages hand out short-lived links to people allowed to see the client.
create or replace function public.try_uuid(t text) returns uuid
language plpgsql immutable as $$
begin
  return t::uuid;
exception when others then
  return null;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-files', 'client-files', false, 4194304,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists client_files_read on storage.objects;
create policy client_files_read on storage.objects for select to authenticated
  using (bucket_id = 'client-files'
         and (public.is_staff() or public.is_member(public.try_uuid((storage.foldername(name))[1]))));
drop policy if exists client_files_staff_write on storage.objects;
create policy client_files_staff_write on storage.objects for insert to authenticated
  with check (bucket_id = 'client-files' and public.is_staff());
-- Operators may add brand files for their own client, nothing else.
drop policy if exists client_files_operator_brand on storage.objects;
create policy client_files_operator_brand on storage.objects for insert to authenticated
  with check (bucket_id = 'client-files'
              and public.is_member(public.try_uuid((storage.foldername(name))[1]))
              and (storage.foldername(name))[2] = 'brand');
drop policy if exists client_files_staff_delete on storage.objects;
create policy client_files_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'client-files' and public.is_staff());

-- ---------- onboarding and client hub ----------
create table if not exists public.client_profile (
  client_id uuid primary key references public.clients on delete cascade,
  website text,
  handles text,
  brand_guidelines_url text,
  brand_guidelines_path text,
  figma_url text,
  tone_notes text,
  compliance_notes text,
  licence text,
  restricted_markets text,
  current_offers text,
  contact_name text,
  contact_email text,
  approver_name text,
  meeting_slot text,
  design_signed_off boolean not null default false,
  -- staff only
  go_live_date date,
  access_confirmed boolean not null default false,
  contract_url text,
  slack_url text,
  updated_at timestamptz not null default now()
);
alter table public.client_profile enable row level security;

drop policy if exists client_profile_read on public.client_profile;
create policy client_profile_read on public.client_profile for select to authenticated
  using (public.is_staff() or public.is_member(client_id));
drop policy if exists client_profile_staff_write on public.client_profile;
create policy client_profile_staff_write on public.client_profile for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Operators fill in their own onboarding through this. It only touches the
-- fields that are theirs to give, so they cannot confirm their own access,
-- move the go-live date or swap the contract link.
create or replace function public.save_client_profile(p_client uuid, p jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_staff() or public.is_member(p_client)) then
    raise exception 'Client not found';
  end if;
  insert into public.client_profile (client_id) values (p_client) on conflict (client_id) do nothing;
  update public.client_profile set
    website = case when p ? 'website' then nullif(trim(p->>'website'), '') else website end,
    handles = case when p ? 'handles' then nullif(trim(p->>'handles'), '') else handles end,
    brand_guidelines_url = case when p ? 'brand_guidelines_url' then nullif(trim(p->>'brand_guidelines_url'), '') else brand_guidelines_url end,
    brand_guidelines_path = case when p ? 'brand_guidelines_path' then nullif(trim(p->>'brand_guidelines_path'), '') else brand_guidelines_path end,
    figma_url = case when p ? 'figma_url' then nullif(trim(p->>'figma_url'), '') else figma_url end,
    tone_notes = case when p ? 'tone_notes' then nullif(trim(p->>'tone_notes'), '') else tone_notes end,
    compliance_notes = case when p ? 'compliance_notes' then nullif(trim(p->>'compliance_notes'), '') else compliance_notes end,
    licence = case when p ? 'licence' then nullif(trim(p->>'licence'), '') else licence end,
    restricted_markets = case when p ? 'restricted_markets' then nullif(trim(p->>'restricted_markets'), '') else restricted_markets end,
    current_offers = case when p ? 'current_offers' then nullif(trim(p->>'current_offers'), '') else current_offers end,
    contact_name = case when p ? 'contact_name' then nullif(trim(p->>'contact_name'), '') else contact_name end,
    contact_email = case when p ? 'contact_email' then nullif(trim(p->>'contact_email'), '') else contact_email end,
    approver_name = case when p ? 'approver_name' then nullif(trim(p->>'approver_name'), '') else approver_name end,
    meeting_slot = case when p ? 'meeting_slot' then nullif(trim(p->>'meeting_slot'), '') else meeting_slot end,
    design_signed_off = case when p ? 'design_signed_off' then coalesce((p->>'design_signed_off')::boolean, false) else design_signed_off end,
    updated_at = now()
  where client_id = p_client;
end;
$$;
revoke execute on function public.save_client_profile(uuid, jsonb) from public, anon;
grant execute on function public.save_client_profile(uuid, jsonb) to authenticated;

-- ---------- talent ----------
create table if not exists public.talent (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text not null,
  channel_url text,
  photo_url text,
  audience text,
  bio text,
  tags text[] not null default '{}',
  markets text[] not null default '{}',
  guide_price text,          -- staff only, never sent to operators
  active boolean not null default true,
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.talent enable row level security;
-- Only staff read the roster table directly. Operators go through talent_for_client.
drop policy if exists talent_staff on public.talent;
create policy talent_staff on public.talent for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create table if not exists public.talent_interest (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  talent_id uuid not null references public.talent on delete cascade,
  note text,
  status text not null default 'New' check (status in ('New', 'In talks', 'Proposal sent', 'Signed', 'Passed')),
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (client_id, talent_id)
);
alter table public.talent_interest enable row level security;
drop policy if exists interest_read on public.talent_interest;
create policy interest_read on public.talent_interest for select to authenticated
  using (public.is_staff() or public.is_member(client_id));
drop policy if exists interest_staff_write on public.talent_interest;
create policy interest_staff_write on public.talent_interest for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- The talent an operator is shown: active profiles that share at least one tag
-- with the client, and a market too when both sides have markets set.
-- No guide price, and nothing about which other clients a person works with.
create or replace function public.talent_for_client(p_client uuid)
returns table (id uuid, name text, platform text, channel_url text, photo_url text,
               audience text, bio text, tags text[], interest_status text)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.platform, t.channel_url, t.photo_url, t.audience, t.bio, t.tags,
         (select i.status from public.talent_interest i where i.client_id = p_client and i.talent_id = t.id)
  from public.talent t
  join public.clients c on c.id = p_client
  where t.active
    and (public.is_staff() or public.is_member(p_client))
    and t.tags && c.tags
    and (cardinality(t.markets) = 0 or cardinality(c.markets) = 0 or t.markets && c.markets)
  order by t.name;
$$;

-- An operator registers interest in someone they were shown. It can only be
-- for their own client and for talent that matches it.
create or replace function public.express_interest(p_client uuid, p_talent uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.talent_for_client(p_client) m where m.id = p_talent) then
    raise exception 'Talent not found';
  end if;
  insert into public.talent_interest (client_id, talent_id, note, created_by)
    values (p_client, p_talent, nullif(trim(coalesce(p_note, '')), ''), auth.uid())
    on conflict (client_id, talent_id) do nothing;
end;
$$;

revoke execute on function public.talent_for_client(uuid) from public, anon;
revoke execute on function public.express_interest(uuid, uuid, text) from public, anon;
grant execute on function public.talent_for_client(uuid) to authenticated;
grant execute on function public.express_interest(uuid, uuid, text) to authenticated;
