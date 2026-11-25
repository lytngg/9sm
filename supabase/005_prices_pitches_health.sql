-- 9SM Platform, stage 5: guide prices shown to clients, talent pitches, and channel health.
-- Run this in the Supabase SQL editor after 004_tags_offers_talent_onboarding.sql.

-- ---------- talent pitches ----------
-- Staff put a specific person in front of a specific client, with a line on why
-- and, when it is true, the date the offer runs out.
create table if not exists public.talent_pitch (
  client_id uuid not null references public.clients on delete cascade,
  talent_id uuid not null references public.talent on delete cascade,
  headline text not null,
  available_until date,
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (client_id, talent_id)
);
alter table public.talent_pitch enable row level security;
drop policy if exists pitch_staff on public.talent_pitch;
create policy pitch_staff on public.talent_pitch for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Clients now see the guide price, and pitched people show even without a tag match.
-- Still nothing about which other clients a person works with.
drop function if exists public.talent_for_client(uuid);
create function public.talent_for_client(p_client uuid)
returns table (id uuid, name text, platform text, channel_url text, photo_url text,
               audience text, bio text, tags text[], guide_price text,
               interest_status text, pitch_headline text, pitch_until date)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.platform, t.channel_url, t.photo_url, t.audience, t.bio, t.tags, t.guide_price,
         (select i.status from public.talent_interest i where i.client_id = p_client and i.talent_id = t.id),
         tp.headline, tp.available_until
  from public.talent t
  join public.clients c on c.id = p_client
  left join public.talent_pitch tp
    on tp.client_id = p_client and tp.talent_id = t.id
   and (tp.available_until is null or tp.available_until >= current_date)
  where t.active
    and (public.is_staff() or public.is_member(p_client))
    and (
      tp.talent_id is not null
      or (t.tags && c.tags
          and (cardinality(t.markets) = 0 or cardinality(c.markets) = 0 or t.markets && c.markets))
    )
  order by (tp.talent_id is null), t.name;
$$;
revoke execute on function public.talent_for_client(uuid) from public, anon;
grant execute on function public.talent_for_client(uuid) to authenticated;

-- ---------- channel health ----------
-- One row per client, channel and week. Filled in by hand today. The platform
-- connections will write to this same table later, so nothing else has to change.
create table if not exists public.channel_stats (
  client_id uuid not null references public.clients on delete cascade,
  channel text not null,
  week date not null,
  followers integer not null check (followers >= 0),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  primary key (client_id, channel, week)
);
alter table public.channel_stats enable row level security;
drop policy if exists stats_read on public.channel_stats;
create policy stats_read on public.channel_stats for select to authenticated
  using (public.is_staff() or public.is_member(client_id));
drop policy if exists stats_staff_write on public.channel_stats;
create policy stats_staff_write on public.channel_stats for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- The weekly note the social media manager writes for the client.
create table if not exists public.channel_notes (
  client_id uuid not null references public.clients on delete cascade,
  week date not null,
  body text not null,
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (client_id, week)
);
alter table public.channel_notes enable row level security;
drop policy if exists notes_read on public.channel_notes;
create policy notes_read on public.channel_notes for select to authenticated
  using (public.is_staff() or public.is_member(client_id));
drop policy if exists notes_staff_write on public.channel_notes;
create policy notes_staff_write on public.channel_notes for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Typical four-week follower growth per channel across every client, as one
-- number with no names. Only reported once five clients have data for that
-- channel, so nobody can work out a single competitor's figure from it.
create or replace function public.network_growth()
returns table (channel text, median_growth numeric, clients integer)
language sql stable security definer set search_path = public as $$
  with last as (
    select distinct on (client_id, channel) client_id, channel, week, followers
    from public.channel_stats order by client_id, channel, week desc
  ), base as (
    select distinct on (s.client_id, s.channel) s.client_id, s.channel, s.followers
    from public.channel_stats s
    join last l on l.client_id = s.client_id and l.channel = s.channel
    where s.week >= l.week - 28 and s.week < l.week
    order by s.client_id, s.channel, s.week asc
  )
  select l.channel,
         round((percentile_cont(0.5) within group (
           order by (l.followers - b.followers)::numeric / nullif(b.followers, 0) * 100))::numeric, 1),
         count(*)::integer
  from last l join base b on b.client_id = l.client_id and b.channel = l.channel
  where b.followers > 0
  group by l.channel
  having count(*) >= 5;
$$;
revoke execute on function public.network_growth() from public, anon;
grant execute on function public.network_growth() to authenticated;
