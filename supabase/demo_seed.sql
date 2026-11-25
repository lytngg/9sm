-- DEMO DATA ONLY. Every number, price, post and person's detail here is made up
-- so the screens have something to show. SirBetalot is a real brand name used
-- as the example; nothing below is its real data. Remove all of it with:
--   delete from public.clients where type = 'demo';
--   delete from public.talent where bio like 'Demo profile.%';
--   delete from auth.users where email like '%.demo@example.com';
do $$
declare
  c uuid; t1 uuid; t2 uuid; t3 uuid; t4 uuid; t5 uuid; s1 uuid; s2 uuid; s3 uuid;
  callum uuid; pat uuid; ish uuid; who record;
  other record; w date; i int; ch text; base int; n int := 0; nc uuid; g numeric; k int;
  pre text[] := array['Fennel','Gantry','Larkspur','Mossback','Quillon','Tamarind','Wexley','Yarrow','Brindle','Corbel',
                      'Dunmore','Elkhorn','Farrow','Hollin','Inglenook','Kelso','Merrow','Norcott','Ostler','Pellam'];
  suf text[] := array['Bet','Casino','Spins','Sweeps','Rips'];
begin
  -- demo staff, so clients have a named social media manager
  for who in select * from (values
      ('callum.demo@example.com', 'Callum James', 'Social Lead'),
      ('pat.demo@example.com', 'Patricio Aréchiga', 'Team Lead, North America'),
      ('ish.demo@example.com', 'Ishpal Singh', 'Head of Social')) v(email, full_name, title) loop
    if not exists (select 1 from auth.users where email = who.email) then
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                              raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
      values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', who.email, '',
              now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false);
    end if;
    insert into public.profiles (id, email, role) select id, email, 'staff' from auth.users where email = who.email
      on conflict (id) do nothing;
    update public.profiles set role = 'staff', full_name = who.full_name, title = who.title, team = 'Social' where email = who.email;
  end loop;
  select id into callum from public.profiles where email = 'callum.demo@example.com';
  select id into pat from public.profiles where email = 'pat.demo@example.com';
  select id into ish from public.profiles where email = 'ish.demo@example.com';

  select id into c from public.clients where name in ('Test Casino (demo)', 'Lucky Harbor (demo)', 'SirBetalot') limit 1;
  if c is null then insert into public.clients (name) values ('SirBetalot') returning id into c; end if;
  update public.clients set name = 'SirBetalot', type = 'demo', tags = '{"Crypto casino"}', markets = '{}',
    smm_id = callum, event_level = 1 where id = c;
  delete from public.clients where id <> c and (name like '%(demo)' or type = 'demo');

  -- start clean so this can be run twice
  delete from public.posts where client_id = c and image_path is null; delete from public.requests where client_id = c and attachment_path is null;
  update public.posts set body = replace(body, 'at the Harbor', 'at SirBetalot') where client_id = c;
  delete from public.calendar_entries where client_id = c; delete from public.scope_items where client_id = c;
  delete from public.department_requests where client_id = c; delete from public.client_plugins where client_id = c;
  delete from public.channel_stats where client_id = c;
  delete from public.talent where bio like 'Demo profile.%';

  insert into public.client_profile (client_id, website, handles, brand_guidelines_url, figma_url, tone_notes, compliance_notes,
    licence, restricted_markets, current_offers, contact_name, contact_email, approver_name, meeting_slot, design_signed_off,
    go_live_date, access_confirmed, slack_url)
  values (c, 'https://example.com', 'X @sirbetalot, Instagram @sirbetalot, TikTok @sirbetalot, Discord, Telegram', 'https://example.com/brand',
    'https://example.com/figma', 'Normal everyday language, no medieval talk. Only the team are called Sir. Players are Lord or Lady, never Sir.',
    'Always 18+ and the responsible play line. No "risk free". No talk of guaranteed wins. Nothing aimed at under 25s.',
    'Demo licence', 'No posts aimed at the Netherlands or Spain', 'Weekend reload, Wednesday cashback',
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
    (c, '{X,Instagram}', date '2026-11-03', '18:00', 'New week, new tournament. 5,000 in prizes on this week''s featured slots. 18+. Terms apply.', 'Posted', null, true, 'Casino', 'Tournament', 'https://example.com/post/4'),
    (c, '{TikTok}', date '2026-11-06', '19:00', 'We asked the Sirs for the worst bonus buy they have ever seen.', 'Posted', null, false, null, null, 'https://example.com/post/5'),
    (c, '{X}', date '2026-11-08', '12:00', 'Saturday reload. 40% back on your first deposit today, paid in crypto. 18+. Terms apply.', 'Posted', null, true, 'Casino', 'Reload', 'https://example.com/post/6'),
    (c, '{X,Telegram}', date '2026-11-11', '20:00', 'Live casino night. Sir Reginald is on the tables from 8. Come and say hello, my Lords and Ladies.', 'Posted', null, false, null, null, 'https://example.com/post/7'),
    (c, '{Instagram}', date '2026-11-14', '17:30', 'Weekend reload is back. 25 free spins when you top up. 18+. Terms apply. Play responsibly.', 'Posted', null, true, 'Casino', 'Reload', 'https://example.com/post/8'),
    (c, '{X,YouTube}', date '2026-11-17', '16:00', 'How withdrawals work here, in ninety seconds. Spoiler: fast.', 'Posted', null, false, null, null, 'https://example.com/post/9'),
    (c, '{X}', date '2026-11-19', '13:00', 'Cashback Wednesday. 10% back on net losses in live casino. 18+. Terms apply. Play responsibly.', 'Posted', null, true, 'Casino', 'Cashback', 'https://example.com/post/10'),
    (c, '{X,Instagram}', date '2026-11-21', '18:00', 'The castle vault opens Saturday. One Lord or Lady walks away with the lot. 18+. Terms apply.', 'Posted', null, true, 'Casino', 'Giveaway', 'https://example.com/post/1'),
    (c, '{X}', date '2026-11-23', '12:30', 'Sunday spins: 50 free spins on your first deposit today. 18+. Terms apply. Play responsibly.', 'Posted', null, true, 'Casino', 'Free spins', 'https://example.com/post/2'),
    (c, '{X,TikTok}', date '2026-11-24', '20:00', 'Three slots the Sirs would not touch this week, and why.', 'Posted', null, false, null, null, 'https://example.com/post/3'),
    (c, '{X,Instagram}', date '2026-11-26', '18:30', 'Midweek drops. Three mystery prizes land in the lobby at six. 18+. Terms apply.', 'Approved', null, true, 'Casino', 'Giveaway', null),
    (c, '{X,Instagram,Facebook}', date '2026-11-27', '17:00', 'Black Friday at SirBetalot. Deposit match up to 100 for one day only. 18+. Terms apply. Play responsibly.', 'Client review', null, true, 'Casino', 'Deposit match', null),
    (c, '{X}', date '2026-11-28', '19:30', 'Friday night live casino. Double points on every table from 7. 18+. Play responsibly.', 'Client review', null, true, 'Casino', 'Tournament', null),
    (c, '{Instagram,TikTok}', date '2026-11-29', '11:00', 'Meet the Sirs. This week: the Sir who answers your messages at 4am.', 'Approved', null, false, null, null, null),
    (c, '{X,Telegram}', date '2026-11-30', '15:00', 'Weekend recap. Biggest win, worst beat, best reply.', 'Team lead review', null, false, null, null, null),
    (c, '{X,Instagram,TikTok}', date '2026-12-01', '12:00', 'Four new slots land today. Here is the one we cannot stop playing.', 'Client review', null, false, null, null, null),
    (c, '{X,Discord}', date '2026-12-02', '18:00', 'December giveaway. Ten winners, drawn live on stream. 18+. Terms apply.', 'Draft', 'Client asked for the prize list before this goes out.', true, 'Casino', 'Giveaway', null),
    (c, '{YouTube}', date '2026-12-04', '16:00', 'New slot walkthrough with our host. Three minutes, no fluff.', 'Draft', null, false, null, null, null),
    (c, '{X,Discord}', date '2026-12-05', '20:00', 'Takeover night. Our streamer goes live at 8 with the new slots. 18+. Play responsibly.', 'Team lead review', null, false, null, null, null),
    (c, '{X,Instagram}', date '2026-12-09', '10:00', 'SirBetalot is two today. Birthday spins for every Lord and Lady who has ever played with us. 18+. Terms apply.', 'Draft', null, true, 'Casino', 'Free spins', null),
    (c, '{X}', date '2026-12-12', '11:30', 'Christmas at the castle starts today. A new prize behind a new door every day. 18+. Terms apply.', 'Draft', null, true, 'Casino', 'Giveaway', null),
    (c, '{Instagram,Facebook}', date '2026-12-20', '18:00', 'Christmas giveaway draw, live at six.', 'Draft', null, true, 'Casino', 'Giveaway', null),
    (c, '{X,Instagram}', date '2026-12-26', '09:00', 'Boxing Day reload. 50% back on your first deposit of the day. 18+. Terms apply. Play responsibly.', 'Draft', null, true, 'Casino', 'Reload', null);

  insert into public.calendar_entries (client_id, date, kind, text) values
    (c, date '2026-11-27', 'event', 'Black Friday campaign day'),
    (c, date '2026-12-01', 'note', 'New slots release from the product team'),
    (c, date '2026-12-05', 'event', 'Streamer takeover, 8pm UK'),
    (c, date '2026-12-12', 'note', 'Christmas brand assets go live'),
    (c, date '2026-12-20', 'event', 'Christmas giveaway draw');

  insert into public.requests (client_id, for_date, kind, details, status) values
    (c, date '2026-11-27', 'Casino offer', 'Black Friday deposit match up to 100. One day only. Terms in the brand folder.', 'Scheduled'),
    (c, date '2026-12-01', 'Product news', 'Four new slots land Monday. Assets in the brand folder.', 'New'),
    (c, date '2026-12-05', 'Event', 'Streamer takeover on Friday at 8pm UK. Please cover it live.', 'New'),
    (c, date '2026-12-09', 'Birthday or anniversary', 'SirBetalot turns two. We want to make a fuss of it.', 'New'),
    (c, date '2026-12-12', 'Casino offer', 'Christmas at the castle. A prize a day until the 25th. Full list to follow Thursday.', 'New'),
    (c, date '2026-11-20', 'Other', 'Refresh the pinned post.', 'Done');

  -- talent roster (all invented)
  insert into public.talent (name, platform, channel_url, audience, bio, tags, markets, guide_price) values
    ('NorthSideSpins', 'Kick', 'https://example.com/northsidespins', '2,400 average viewers, mostly UK and Nordics', 'Demo profile. Slots and live casino, five nights a week.', '{"Crypto casino"}', '{}', 'From €9,000 a month') returning id into t1;
  insert into public.talent (name, platform, channel_url, audience, bio, tags, markets, guide_price) values
    ('CryptoCassie', 'X', 'https://example.com/cryptocassie', '95k followers, crypto and casino', 'Demo profile. Crypto native audience, good on launches.', '{"Crypto casino"}', '{}', 'From €1,200 a post') returning id into t4;
  insert into public.talent (name, platform, channel_url, audience, bio, tags, markets, guide_price) values
    ('JadeOnTheReels', 'Instagram', 'https://example.com/jadeonthereels', '210k followers, lifestyle and casino nights', 'Demo profile. Polished reels, strong with women 25 to 40.', '{"Crypto casino"}', '{}', 'From €2,800 a reel') returning id into t5;
  insert into public.talent (name, platform, channel_url, audience, bio, tags, markets, guide_price) values
    ('MiraPlays', 'Twitch', 'https://example.com/miraplays', '1,100 average viewers, variety and casino', 'Demo profile. Calm, funny, strong chat.', '{"Crypto casino"}', '{}', 'From €5,000 a month') returning id into t2;
  insert into public.talent (name, platform, channel_url, audience, bio, tags, markets, guide_price) values
    ('BigStackBenji', 'Kick', 'https://example.com/bigstackbenji', '6,800 average viewers, high stakes slots', 'Demo profile. Loud, long sessions, big clip output.', '{"Crypto casino"}', '{}', 'From €22,000 a month'),
    ('LateNightLena', 'Twitch', 'https://example.com/latenightlena', '900 average viewers, live casino', 'Demo profile. Small but spends a lot of time with chat.', '{"Crypto casino","Hybrid casino"}', '{}', 'From €3,000 a month'),
    ('RollWithRavi', 'Kick', 'https://example.com/rollwithravi', '3,300 average viewers, bonus hunts', 'Demo profile. Runs a weekly bonus hunt with the same crowd every time.', '{"Crypto casino"}', '{}', 'From €12,000 a month'),
    ('OnChainOtto', 'X', 'https://example.com/onchainotto', '210k followers, crypto markets', 'Demo profile. Big crypto account that rarely takes casino deals.', '{"Crypto casino",Predictions}', '{}', 'From €4,000 a post'),
    ('DegenDiaries', 'X', 'https://example.com/degendiaries', '64k followers, casino threads', 'Demo profile. Long win and loss threads that get shared in group chats.', '{"Crypto casino"}', '{}', 'From €800 a post'),
    ('SpinDoctorDee', 'TikTok', 'https://example.com/spindoctordee', '260k followers, slot reactions', 'Demo profile. Short reaction clips, posts daily.', '{"Crypto casino","Sweepstakes casino"}', '{}', 'From €1,800 a video'),
    ('CastleClips', 'TikTok', 'https://example.com/castleclips', '410k followers, gaming and strategy clips', 'Demo profile. Mobile strategy game audience. A natural fit for the brand world.', '{"Crypto casino"}', '{}', 'From €2,400 a video'),
    ('LunaAfterDark', 'Instagram', 'https://example.com/lunaafterdark', '88k followers, nightlife and casino', 'Demo profile. Stories convert better than her feed.', '{"Crypto casino","Hybrid casino"}', '{}', 'From €1,100 a story set'),
    ('SlotSchool', 'YouTube', 'https://example.com/slotschool', '150k subscribers, slots explained', 'Demo profile. Calm explainers on volatility and bonus buys. Good for trust.', '{"Crypto casino"}', '{}', 'From €3,800 a video'),
    ('HighRollerHank', 'YouTube', 'https://example.com/highrollerhank', '420k subscribers, big session videos', 'Demo profile. Weekly long video, very loyal comments.', '{"Crypto casino"}', '{}', 'From €9,500 a video'),
    ('AccaAndy', 'YouTube', 'https://example.com/accaandy', '310k subscribers, football betting', 'Demo profile. Weekend football previews and bet builders.', '{Sportsbook}', '{UK}', 'From €3,500 a video'),
    ('TerraceTalk', 'X', 'https://example.com/terracetalk', '380k followers, football culture', 'Demo profile. Match-day threads that get quoted everywhere.', '{Sportsbook}', '{UK}', 'From €2,500 a week'),
    ('PackRipTom', 'TikTok', 'https://example.com/packriptom', '540k followers, card rips', 'Demo profile. Daily rips, big reactions.', '{"Card rips","Loot boxes"}', '{US}', 'From €2,000 a post');
  insert into public.talent_pitch (client_id, talent_id, headline, available_until) values
    (c, t1, 'Free in December after a contract ended. First refusal is yours.', date '2026-12-05'),
    (c, t4, 'Looking for one casino partner for the new year. Has turned two down.', date '2026-12-12'),
    (c, t5, 'Just went independent. Not working with another casino yet.', null)
    on conflict (client_id, talent_id) do update set headline = excluded.headline, available_until = excluded.available_until;
  insert into public.talent_interest (client_id, talent_id, note, status) values (c, t2, 'Keen to do a Christmas series.', 'In talks')
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

  -- channel numbers, ten weeks, some up and some down
  insert into public.channel_stats (client_id, channel, week, followers)
  select c, v.ch, (date '2026-11-23' - (9 - g.i) * 7), v.vals[g.i + 1]
  from (values
    ('X',         array[17100,17420,17380,17900,18350,18300,18920,19480,20150,20900]),
    ('Instagram', array[9400,9460,9430,9510,9480,9550,9530,9600,9580,9640]),
    ('TikTok',    array[9800,10400,10250,11300,12100,11900,13200,14100,15300,16800]),
    ('YouTube',   array[3400,3380,3390,3350,3320,3330,3280,3240,3190,3150]),
    ('Facebook',  array[6200,6180,6150,6160,6100,6050,6060,5990,5930,5880]),
    ('Discord',   array[3900,3980,4120,4090,4200,4310,4290,4380,4460,4550]),
    ('Telegram',  array[2500,2540,2610,2590,2680,2740,2720,2700,2690,2710])
  ) v(ch, vals) cross join generate_series(0, 9) g(i);

  -- ninety-five more invented brands, so the staff side looks like a real book of clients
  perform setseed(0.42);
  for i in 1..20 loop
    for k in 1..5 loop
      continue when (i * 7 + k * 3) % 20 = 0;
      n := n + 1;
      exit when n > 95;
      insert into public.clients (name, type, tags, markets, smm_id, created_at)
      values (pre[i] || case when suf[k] = 'Bet' then 'Bet' else ' ' || suf[k] end, 'demo',
              case suf[k] when 'Bet' then (case when i % 3 = 0 then '{Sportsbook,Predictions}' else '{Sportsbook}' end)::text[]
                          when 'Casino' then (case when i % 2 = 0 then '{"Hybrid casino"}' else '{"Crypto casino"}' end)::text[]
                          when 'Spins' then '{"Crypto casino"}'::text[]
                          when 'Sweeps' then '{"Sweepstakes casino"}'::text[]
                          else (case when i % 2 = 0 then '{"Card rips"}' else '{"Loot boxes","Card rips"}' end)::text[] end,
              case when suf[k] in ('Sweeps', 'Rips') then '{US}'::text[] when i % 4 = 0 then '{UK,Europe}'::text[]
                   when i % 4 = 1 then '{Europe,LatAm}'::text[] when i % 4 = 2 then '{US,Canada}'::text[] else '{Europe}'::text[] end,
              case when suf[k] in ('Sweeps', 'Rips') or i % 4 = 2 then pat when n % 9 = 0 then ish else callum end,
              now() - (case when n % 11 = 0 then (n % 5 + 2) else 40 + n * 4 end) * interval '1 day')
      on conflict (name) do nothing returning id into nc;
      continue when nc is null;
      -- most are live; every eleventh is still being onboarded, at different stages
      insert into public.client_profile (client_id, website, handles, brand_guidelines_url, contact_name, approver_name,
                                         meeting_slot, design_signed_off, access_confirmed, go_live_date)
      values (nc,
              case when n % 11 <> 0 or n % 2 = 0 then 'https://example.com' end,
              case when n % 11 <> 0 or n % 3 <> 0 then 'X, Instagram' end,
              case when n % 11 <> 0 or n % 4 <> 0 then 'https://example.com/brand' end,
              case when n % 11 <> 0 or n % 2 = 1 then 'Demo contact' end,
              case when n % 11 <> 0 or n % 2 = 1 then 'Demo contact' end,
              case when n % 11 <> 0 then 'Weekly' end,
              n % 11 <> 0, n % 11 <> 0 or n % 22 = 0,
              case when n % 11 = 0 then current_date + (n % 9 + 2) end);
      foreach ch in array array['X', 'Instagram', 'TikTok', 'Discord', 'Telegram', 'YouTube'] loop
        continue when (ch = 'YouTube' and n % 3 <> 0) or (ch in ('Discord', 'Telegram') and n % 4 = 1);
        base := (1500 + random() * 26000)::int;
        g := (random() - 0.32) * 0.05;
        for w in select (date '2026-11-23' - (9 - x) * 7) from generate_series(0, 9) x loop
          insert into public.channel_stats (client_id, channel, week, followers) values (nc, ch, w, base);
          base := greatest(200, (base * (1 + g + (random() - 0.5) * 0.02))::int);
        end loop;
      end loop;
      if n % 4 = 0 then
        insert into public.posts (client_id, channels, publish_date, publish_time, body, status)
        select nc, '{X}', current_date + x, '18:00', 'Demo post waiting for the client.', 'Client review' from generate_series(1, 1 + n % 3) x;
      end if;
    end loop;
  end loop;

  insert into public.global_events (starts, ends, title, category, regions, tier) values
    (date '2026-12-25', null, 'NBA Christmas Day games', 'Basketball', '{US,Global}', 2),
    (date '2026-12-25', null, 'NFL Christmas Day games', 'American football', '{US}', 2),
    (date '2026-12-26', null, 'Premier League Boxing Day fixtures', 'Football', '{UK,Europe,Global}', 1),
    (date '2027-02-14', null, 'Super Bowl LXI', 'American football', '{US,Global}', 1)
  on conflict (starts, title) do nothing;
end $$;
