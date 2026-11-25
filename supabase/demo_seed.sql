-- DEMO DATA ONLY. Every brand, person, price and number here is made up so the
-- screens have something to show. Remove it with:
--   delete from public.clients where name like '%(demo)';
--   delete from public.talent where bio like 'Demo profile.%';
do $$
declare
  c uuid; t1 uuid; t2 uuid; t3 uuid; t4 uuid; t5 uuid; s1 uuid; s2 uuid; s3 uuid;
  harry uuid := (select id from public.profiles where email = 'harry@9thstreet.media');
  other record; w date; i int; ch text; base int; n int := 0;
begin
  select id into c from public.clients where name in ('Test Casino (demo)', 'Lucky Harbor (demo)') limit 1;
  if c is null then insert into public.clients (name) values ('Lucky Harbor (demo)') returning id into c; end if;
  update public.clients set name = 'Lucky Harbor (demo)', tags = '{Sportsbook,"Crypto casino"}', markets = '{UK,Europe,US}',
    smm_id = harry, event_level = 2 where id = c;
  update public.profiles set full_name = coalesce(full_name, 'Harry'), title = coalesce(title, 'Founder and CEO') where id = harry;

  -- start clean so this can be run twice
  delete from public.posts where client_id = c; delete from public.requests where client_id = c;
  delete from public.calendar_entries where client_id = c; delete from public.scope_items where client_id = c;
  delete from public.department_requests where client_id = c; delete from public.client_plugins where client_id = c;
  delete from public.channel_stats where client_id = c;
  delete from public.talent where bio like 'Demo profile.%';

  insert into public.client_profile (client_id, website, handles, brand_guidelines_url, figma_url, tone_notes, compliance_notes,
    licence, restricted_markets, current_offers, contact_name, contact_email, approver_name, meeting_slot, design_signed_off,
    go_live_date, access_confirmed, slack_url)
  values (c, 'https://example.com', 'X @luckyharbor, Instagram @luckyharbor, TikTok @luckyharbor', 'https://example.com/brand',
    'https://example.com/figma', 'Dry, confident, never shouty. Talks like a regular at the bar, not a bookmaker.',
    'Always 18+ and the responsible play line. No "risk free". No talk of guaranteed wins. Nothing aimed at under 25s.',
    'Demo licence', 'No posts aimed at the Netherlands or Spain', 'Weekend reload, Saturday odds boost',
    'Dana Reyes', 'dana@example.com', 'Dana Reyes', 'Tuesdays 2pm UK', true, date '2026-10-05', true, 'https://example.com/slack')
  on conflict (client_id) do update set website = excluded.website, handles = excluded.handles,
    brand_guidelines_url = excluded.brand_guidelines_url, figma_url = excluded.figma_url, tone_notes = excluded.tone_notes,
    compliance_notes = excluded.compliance_notes, licence = excluded.licence, restricted_markets = excluded.restricted_markets,
    current_offers = excluded.current_offers, contact_name = excluded.contact_name, contact_email = excluded.contact_email,
    approver_name = excluded.approver_name, meeting_slot = excluded.meeting_slot, design_signed_off = true,
    go_live_date = excluded.go_live_date, access_confirmed = true, slack_url = excluded.slack_url;

  -- scope against delivery
  insert into public.scope_items (client_id, label, monthly_target) values (c, 'Posts', 60) returning id into s1;
  insert into public.scope_items (client_id, label, monthly_target) values (c, 'Videos', 8) returning id into s2;
  insert into public.scope_items (client_id, label, monthly_target) values (c, 'Images', 20) returning id into s3;
  insert into public.scope_delivery (item_id, client_id, month, delivered) values
    (s1, c, date '2026-10-01', 71), (s2, c, date '2026-10-01', 10), (s3, c, date '2026-10-01', 26),
    (s1, c, date '2026-11-01', 64), (s2, c, date '2026-11-01', 9),  (s3, c, date '2026-11-01', 23);

  -- posts at every stage
  insert into public.posts (client_id, channels, publish_date, publish_time, body, status, feedback, is_offer, offer_product, offer_kind, live_url) values
    (c, '{X,Instagram}', date '2026-11-21', '18:00', 'Saturday boost is live. Pick any Premier League match and we lift the odds on your first bet. 18+. Play responsibly.', 'Posted', null, true, 'Sports', 'Odds boost', 'https://example.com/post/1'),
    (c, '{X}', date '2026-11-23', '12:30', 'Sunday reload: 50 free spins on your first deposit today. 18+. Terms apply. Play responsibly.', 'Posted', null, true, 'Casino', 'Free spins', 'https://example.com/post/2'),
    (c, '{X,TikTok}', date '2026-11-24', '20:00', 'Three bets our traders would not touch this week, and why.', 'Posted', null, false, null, null, 'https://example.com/post/3'),
    (c, '{X,Instagram,Facebook}', date '2026-11-27', '17:00', 'Black Friday at the Harbor. Deposit match up to 100 for one day only. 18+. Terms apply. Play responsibly.', 'Client review', null, true, 'Casino', 'Deposit match', null),
    (c, '{X}', date '2026-11-28', '19:30', 'Friday night football. Our price boost on both teams to score lands at 7. 18+. Play responsibly.', 'Client review', null, true, 'Sports', 'Odds boost', null),
    (c, '{Instagram,TikTok}', date '2026-11-29', '11:00', 'Meet the people behind the Harbor. This week: the trader who sets your Saturday prices.', 'Approved', null, false, null, null, null),
    (c, '{X,Telegram}', date '2026-11-30', '15:00', 'Weekend recap. Biggest win, worst beat, best reply.', 'Team lead review', null, false, null, null, null),
    (c, '{X,Discord}', date '2026-12-02', '18:00', 'December giveaway. Ten winners, drawn live on stream. 18+. Terms apply.', 'Draft', 'Client asked for the prize list before this goes out.', true, 'Casino', 'Giveaway', null),
    (c, '{YouTube}', date '2026-12-04', '16:00', 'New slot walkthrough with our host. Three minutes, no fluff.', 'Draft', null, false, null, null, null);

  insert into public.calendar_entries (client_id, date, kind, text) values
    (c, date '2026-11-27', 'event', 'Black Friday campaign day'),
    (c, date '2026-12-01', 'note', 'New slots release from the product team'),
    (c, date '2026-12-05', 'event', 'Streamer takeover, 8pm UK'),
    (c, date '2026-12-12', 'note', 'Christmas brand assets go live'),
    (c, date '2026-12-20', 'event', 'Christmas giveaway draw');

  insert into public.requests (client_id, for_date, kind, details, status) values
    (c, date '2026-11-27', 'Offer', 'Black Friday deposit match. Needs a hero creative and three follow-ups.', 'Scheduled'),
    (c, date '2026-12-01', 'Product news', 'Four new slots land Monday. Assets in the brand folder.', 'New'),
    (c, date '2026-12-05', 'Event', 'Streamer takeover on Friday. Please cover it live.', 'New'),
    (c, date '2026-11-20', 'Other', 'Refresh the pinned post.', 'Done');

  -- talent roster (all invented)
  insert into public.talent (name, platform, channel_url, audience, bio, tags, markets, guide_price) values
    ('NorthSideSpins', 'Kick', 'https://example.com/northsidespins', '2,400 average viewers, mostly UK and Nordics', 'Demo profile. Slots and live casino, five nights a week.', '{"Crypto casino","Hybrid casino"}', '{UK,Europe}', 'From €9,000 a month') returning id into t1;
  insert into public.talent (name, platform, channel_url, audience, bio, tags, markets, guide_price) values
    ('AccaAndy', 'YouTube', 'https://example.com/accaandy', '310k subscribers, football betting', 'Demo profile. Weekend football previews and bet builders.', '{Sportsbook,Predictions}', '{UK}', 'From €3,500 a video') returning id into t2;
  insert into public.talent (name, platform, channel_url, audience, bio, tags, markets, guide_price) values
    ('MiraPlays', 'Twitch', 'https://example.com/miraplays', '1,100 average viewers, variety and casino', 'Demo profile. Calm, funny, strong chat.', '{"Crypto casino","Sweepstakes casino"}', '{Europe,US}', 'From €5,000 a month') returning id into t3;
  insert into public.talent (name, platform, channel_url, audience, bio, tags, markets, guide_price) values
    ('PackRipTom', 'TikTok', 'https://example.com/packriptom', '540k followers, card rips', 'Demo profile. Daily rips, big reactions.', '{"Card rips","Loot boxes"}', '{US}', 'From €2,000 a post') returning id into t4;
  insert into public.talent (name, platform, channel_url, audience, bio, tags, markets, guide_price) values
    ('LineMoveLuca', 'X', 'https://example.com/linemoveluca', '120k followers, sharp sports takes', 'Demo profile. Daily picks thread, high reply rate.', '{Sportsbook}', '{UK,Europe,US}', 'From €1,500 a week') returning id into t5;
  insert into public.talent_pitch (client_id, talent_id, headline, available_until) values
    (c, t1, 'Free in December after a contract ended. First refusal is yours.', date '2026-12-05')
    on conflict (client_id, talent_id) do update set headline = excluded.headline, available_until = excluded.available_until;
  insert into public.talent_interest (client_id, talent_id, note, status) values (c, t2, 'Keen for the Christmas fixtures.', 'In talks')
    on conflict (client_id, talent_id) do update set status = excluded.status;

  -- plugins
  update public.departments set blurb = 'Streamers and creators matched to your brand.' where key = 'talent' and blurb is null;
  update public.departments set blurb = '9SM clipping, with its own dashboard.' where key = 'clipping' and blurb is null;
  update public.departments set blurb = 'Unlimited image requests.' where key = 'design' and blurb is null;
  update public.departments set blurb = 'Unlimited video requests.' where key = 'video' and blurb is null;
  update public.departments set blurb = 'A team of seven covering your channels around the clock.' where key = 'community' and blurb is null;
  insert into public.client_plugins (client_id, dept_key) values (c, 'talent'), (c, 'design'), (c, 'video'), (c, 'community');
  insert into public.department_requests (client_id, dept_key, message, status, created_at) values
    (c, 'design', E'Black Friday hero creative\nFormat: Offer creative\nNeeded by: 2026-11-26', 'Done', now() - interval '6 days'),
    (c, 'design', E'Christmas logo and avatar set\nFormat: Seasonal refresh\nNeeded by: 2026-12-10', 'Picked up', now() - interval '2 days'),
    (c, 'design', E'Banner set for the December giveaway\nFormat: Banner set\nNeeded by: 2026-12-01', 'New', now() - interval '3 hours'),
    (c, 'video', E'Trader interview cut for Reels and TikTok\nFormat: Short vertical video\nNeeded by: 2026-11-28', 'Done', now() - interval '5 days'),
    (c, 'video', E'New slot walkthrough with the host\nFormat: YouTube video\nNeeded by: 2026-12-03', 'Picked up', now() - interval '1 day'),
    (c, 'video', E'Weekend recap, 30 seconds\nFormat: X video\nNeeded by: 2026-11-30', 'New', now() - interval '5 hours'),
    (c, 'pr', 'We would like a launch story for the new slots. What do you need from us?', 'New', now() - interval '1 day'),
    (c, 'community', 'Please add the giveaway rules to the Discord FAQ.', 'Done', now() - interval '4 days'),
    (c, 'clipping', 'Can we get clips from the Friday takeover stream?', 'New', now() - interval '2 hours');

  -- channel numbers, eight weeks
  foreach ch in array array['X','Instagram','TikTok','YouTube','Discord','Telegram'] loop
    base := case ch when 'X' then 18200 when 'Instagram' then 9400 when 'TikTok' then 12100 when 'YouTube' then 3100 when 'Discord' then 4200 else 2600 end;
    for i in 0..7 loop
      w := (date_trunc('week', date '2026-11-23') - (7 - i) * interval '7 days')::date;
      insert into public.channel_stats (client_id, channel, week, followers)
        values (c, ch, w, (base * (1 + i * (case ch when 'TikTok' then 0.031 when 'X' then 0.018 when 'Discord' then 0.012 else 0.009 end)))::int);
    end loop;
  end loop;

  -- four lighter demo clients so lists, the onboarding board and the benchmark have company
  for other in select * from (values
      ('Riverline Bet (demo)', '{Sportsbook}'::text[], '{UK}'::text[], 0.006),
      ('Coppergate Casino (demo)', '{"Hybrid casino"}'::text[], '{Europe}'::text[], 0.011),
      ('Pinewood Sweeps (demo)', '{"Sweepstakes casino"}'::text[], '{US}'::text[], 0.014),
      ('Tidal Rips (demo)', '{"Card rips","Loot boxes"}'::text[], '{US,Canada}'::text[], 0.022)) v(name, tags, markets, g) loop
    n := n + 1;
    insert into public.clients (name, tags, markets, smm_id) values (other.name, other.tags, other.markets, harry)
      on conflict (name) do update set tags = excluded.tags, markets = excluded.markets returning id into t5;
    delete from public.channel_stats where client_id = t5;
    foreach ch in array array['X','Instagram','TikTok','YouTube','Discord','Telegram'] loop
      for i in 0..7 loop
        w := (date_trunc('week', date '2026-11-23') - (7 - i) * interval '7 days')::date;
        insert into public.channel_stats (client_id, channel, week, followers) values (t5, ch, w, ((4000 + n * 2500) * (1 + i * other.g))::int);
      end loop;
    end loop;
    insert into public.client_profile (client_id, website, contact_name, brand_guidelines_url, access_confirmed, design_signed_off)
      values (t5, case when n > 1 then 'https://example.com' end, case when n > 2 then 'Demo contact' end,
              case when n > 2 then 'https://example.com/brand' end, n > 3, false)
      on conflict (client_id) do nothing;
  end loop;

  insert into public.global_events (starts, ends, title, category, regions, tier) values
    (date '2026-12-25', null, 'NBA Christmas Day games', 'Basketball', '{US,Global}', 2),
    (date '2026-12-25', null, 'NFL Christmas Day games', 'American football', '{US}', 2),
    (date '2026-12-26', null, 'Premier League Boxing Day fixtures', 'Football', '{UK,Europe,Global}', 1),
    (date '2027-02-14', null, 'Super Bowl LXI', 'American football', '{US,Global}', 1)
  on conflict (starts, title) do nothing;
end $$;
