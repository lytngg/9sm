-- DEMO DATA ONLY. Every number, price, post and person's detail here is made up
-- so the screens have something to show. SirBetalot is a real brand name used
-- as the example; nothing below is its real data. Remove all of it with:
--   delete from public.channel_stats where client_id in (select id from public.clients where type = 'real');
--   delete from public.client_profile where client_id in (select id from public.clients where type = 'real');
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
  -- the 9SM team, as placeholder profiles. The emails are not real, so nobody can sign in as them.
  for who in select * from (values
      ('callum.demo@example.com', 'Callum James', 'Senior SMM', 'Social'),
      ('cathrine.demo@example.com', 'Cathrine Simpson', 'Head of Ops', 'Operations'),
      ('daniel.e.demo@example.com', 'Daniel E', 'Talent Manager', 'Talent'),
      ('daniel.goodluck.demo@example.com', 'Daniel Goodluck', 'SMM', 'Social'),
      ('ish.demo@example.com', 'Ishpal Singh', 'Head of Social', 'Social'),
      ('pat.demo@example.com', 'Patricio Riveroll', 'Senior SMM', 'Social'),
      ('renaldo.demo@example.com', 'Renaldo Abrahams', 'SMM', 'Social'),
      ('leo.demo@example.com', 'Leonit Gashi', 'Head of Design', 'Design'),
      ('daisy.demo@example.com', 'Daisy Jacob', 'Operations Manager', 'Operations'),
      ('erolinda.demo@example.com', 'Erolinda Osmanaj', 'Designer', 'Design'),
      ('otto.demo@example.com', 'Otto Kitsik', 'Video Editor', 'Video'),
      ('robbie.demo@example.com', 'Robbie Singh', 'Head of Paid Media', 'Paid Media'),
      ('stergios.demo@example.com', 'Stergios', 'Paid Media Specialist', 'Paid Media'),
      ('miguel.demo@example.com', 'Miguel Fernandez', 'Community Lead', 'Community'),
      ('wissal.demo@example.com', 'Wissal Mohamed', 'Talent Manager', 'Talent'),
      ('daniel.umana.demo@example.com', 'Daniel Umana', 'Community Manager', 'Community'),
      ('alvaro.demo@example.com', 'Alvaro Aicardo', 'Community Manager', 'Community'),
      ('divine.demo@example.com', 'Divine Akudihor', 'Community Manager', 'Community'),
      ('julia.demo@example.com', 'Julia Fernandez', 'Community Manager', 'Community'),
      ('mateo.demo@example.com', 'Mateo Espindola', 'Community Manager', 'Community'),
      ('pedro.demo@example.com', 'Pedro Carvalho', 'SMM', 'Social'),
      ('emilio.demo@example.com', 'Emilio E', 'Junior SMM', 'Social'),
      ('liezl.demo@example.com', 'Liezl Leine Perez', 'SMM', 'Social'),
      ('antony.demo@example.com', 'Antony Micheal', 'SMM', 'Social'),
      ('johnny.demo@example.com', 'Johnny Dysoco', 'Community Manager', 'Community'),
      ('diogo.demo@example.com', 'Diogo Tavares', 'SMM', 'Social')) v(email, full_name, title, team) loop
    if not exists (select 1 from auth.users where email = who.email) then
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                              raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
      values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', who.email, '',
              now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false);
    end if;
    insert into public.profiles (id, email, role) select id, email, 'staff' from auth.users where email = who.email
      on conflict (id) do nothing;
    update public.profiles set role = 'staff', full_name = who.full_name, title = who.title, team = who.team where email = who.email;
  end loop;
  update public.departments set lead_name = 'Leonit Gashi' where key = 'design';
  update public.departments set lead_name = 'Otto Kitsik' where key = 'video';
  update public.departments set lead_name = 'Miguel Fernandez' where key = 'community';
  select id into callum from public.profiles where email = 'callum.demo@example.com';
  select id into pat from public.profiles where email = 'pat.demo@example.com';
  select id into ish from public.profiles where email = 'ish.demo@example.com';

  select id into c from public.clients where name in ('Test Casino (demo)', 'Lucky Harbor (demo)', 'SirBetalot') limit 1;
  if c is null then insert into public.clients (name) values ('SirBetalot') returning id into c; end if;
  update public.clients set name = 'SirBetalot', type = 'real', tags = '{"Crypto casino"}', markets = '{}',
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

  perform setseed(0.42);

  -- 9SM's actual clients, by name only. Their numbers below are made up like everything else here.
  -- Type is set only where it is known. No manager is assigned.
  for other in select * from (values
      ('96.com', '{"Crypto casino"}'::text[]), ('B2', '{"Sweepstakes casino"}'::text[]), ('Metaspins/Dailyspins', '{}'::text[]),
      ('Bombastic', '{}'::text[]), ('Zoot', '{}'::text[]), ('Go Go Gold', '{}'::text[]), ('PUBS', '{"Crypto casino"}'::text[]),
      ('Dara Casino', '{}'::text[]), ('MINT', '{"Crypto casino"}'::text[]), ('VictoryRush', '{}'::text[]), ('Spino', '{}'::text[]),
      ('Betya', '{}'::text[]), ('Luckycoin', '{}'::text[]), ('Wisespin', '{}'::text[]), ('Rexbet', '{}'::text[]),
      ('Dooble', '{}'::text[]), ('Safebets', '{}'::text[]), ('Arena365', '{Sportsbook}'::text[]), ('Kickback Casino', '{}'::text[]),
      ('FastRips', '{"Card rips"}'::text[]), ('Oracle 7', '{}'::text[]), ('Wombet', '{}'::text[]), ('Bit9ja', '{}'::text[]),
      ('Bolabet', '{}'::text[]), ('Rocketbet', '{Sportsbook}'::text[]), ('Cazzy Games', '{}'::text[])) v(name, tags) loop
    insert into public.clients (name, type, tags, created_at) values (other.name, 'real', other.tags, now() - interval '200 days')
      on conflict (name) do nothing;
    select id into nc from public.clients where name = other.name;
    insert into public.client_profile (client_id, website, handles, brand_guidelines_url, contact_name, approver_name,
                                       meeting_slot, design_signed_off, access_confirmed)
    values (nc, 'https://example.com', 'X, Instagram', 'https://example.com/brand', 'Demo contact', 'Demo contact', 'Weekly', true, true)
      on conflict (client_id) do nothing;
    delete from public.channel_stats where client_id = nc;
    foreach ch in array array['X', 'Instagram', 'TikTok', 'Discord', 'Telegram'] loop
      base := (2500 + random() * 30000)::int;
      g := (random() - 0.32) * 0.05;
      for w in select (date '2026-11-23' - (9 - x) * 7) from generate_series(0, 9) x loop
        insert into public.channel_stats (client_id, channel, week, followers) values (nc, ch, w, base);
        base := greatest(200, (base * (1 + g + (random() - 0.5) * 0.02))::int);
      end loop;
    end loop;
  end loop;

  -- internal briefs between the teams
  delete from public.briefs where client_id is null or client_id in (select id from public.clients where type = 'real');
  insert into public.briefs (client_id, team, title, details, format, due, urgent, status, assignee, requested_by, delivery_url, updated_at)
  select cl.id, v.team, v.title, v.details, v.format, current_date + v.due_in, v.urgent, v.status,
         case when v.status = 'Requested' then null when v.team = 'design' then (select id from public.profiles where email = 'leo.demo@example.com')
              else (select id from public.profiles where email = 'otto.demo@example.com') end,
         case when v.by = 'pat' then pat else callum end,
         case when v.status in ('In review', 'Delivered') then 'https://example.com/work' end,
         now() - (v.age || ' hours')::interval
  from (values
    ('SirBetalot', 'design', 'Black Friday hero creative', 'Deposit match up to 100. One hero and cut-downs for X, Instagram and Facebook.', 'Offer creative', 1, true, 'In review', 'callum', 5),
    ('SirBetalot', 'design', 'Christmas at the castle, 14 daily tiles', 'One tile per day from the 12th. Same frame, new prize each day.', 'Social post image', 12, false, 'In progress', 'callum', 30),
    ('SirBetalot', 'video', 'Meet the Sirs, episode 3', 'The Sir who answers messages at 4am. 40 seconds, vertical.', 'Short vertical video', 3, false, 'In progress', 'callum', 20),
    ('SirBetalot', 'video', 'New slots walkthrough', 'Three minutes with the host. Horizontal for YouTube, plus a vertical cut.', 'YouTube video', 8, false, 'Requested', 'callum', 3),
    ('SirBetalot', 'design', 'Second birthday logo and avatars', 'Birthday dress for the logo, avatar and headers. Live on the 9th.', 'Seasonal refresh', 10, false, 'Requested', 'callum', 2),
    ('96.com', 'design', 'Tournament leaderboard graphic', 'Weekly top ten template we can update ourselves.', 'Social post image', 4, false, 'Requested', 'callum', 6),
    ('PUBS', 'design', 'Christmas pub quiz assets', 'Five question cards and a winner card.', 'Social post image', 6, false, 'In progress', 'callum', 26),
    ('MINT', 'video', 'Token explainer, 30 seconds', 'What the token does for a player, in plain words.', 'Motion graphic', -1, false, 'In progress', 'callum', 70),
    ('B2', 'design', 'Daily streak banner set', 'Site and affiliate sizes.', 'Banner set', 5, false, 'In review', 'pat', 9),
    ('FastRips', 'video', 'Rip of the week cut', 'Best pull from this week, 20 seconds.', 'Short vertical video', 2, true, 'Requested', 'pat', 1),
    ('Arena365', 'design', 'Boxing Day fixtures card', 'All the kick-offs on one image.', 'Social post image', 20, false, 'Requested', 'callum', 12),
    ('Rocketbet', 'video', 'Weekend recap template', 'A template we can refill every Monday.', 'X video', 9, false, 'Delivered', 'callum', 50),
    ('Wombet', 'design', 'New avatar set', 'Three options on the current mark.', 'Logo or brand asset', -3, false, 'Delivered', 'callum', 90),
    ('Spino', 'design', 'Welcome offer creative', 'Hero and two cut-downs.', 'Offer creative', 2, false, 'Delivered', 'callum', 120)
  ) v(client, team, title, details, format, due_in, urgent, status, by, age)
  join public.clients cl on cl.name = v.client;
  insert into public.brief_notes (brief_id, body, kind, created_by)
  select b.id, 'Can we get the terms line bigger? Compliance flagged it last time.', 'note', callum
  from public.briefs b where b.title = 'Black Friday hero creative';

  insert into public.briefs (client_id, team, title, details, due, status, assignee, requested_by) values
    (null, 'ops', 'New client onboarding: Cazzy Games', E'Go-live date: to confirm\nMain contact: to confirm', current_date + 6, 'In progress',
     (select id from public.profiles where email = 'cathrine.demo@example.com'), (select id from public.profiles where email = 'daisy.demo@example.com')),
    (c, 'community', 'Run the December giveaway draw in Discord', 'Ten winners, drawn live. Rules pinned the day before.', current_date + 7, 'Requested', null, callum),
    (c, 'social', 'Captions for Christmas at the castle', 'Fourteen captions to go with the daily tiles.', current_date + 9, 'In progress', callum, ish),
    (null, 'social', 'Update the offer post checklist', 'Add the new terms line rule.', current_date + 14, 'Requested', null, ish);
  insert into public.brief_items (brief_id, text, position, done)
  select b.id, x.text, x.ord - 1,
         b.status in ('In review', 'Delivered') or (b.status = 'In progress' and x.ord <= 2)
  from public.briefs b
  join public.task_templates t on (t.name = 'New client onboarding' and b.title like 'New client onboarding%')
                               or (t.name <> 'New client onboarding' and t.format = b.format)
  cross join lateral unnest(t.items) with ordinality x(text, ord);

  -- a spread of owners, so the by-person view has something to show
  update public.briefs set assignee = (select id from public.profiles where email = 'erolinda.demo@example.com')
    where team = 'design' and status = 'In progress' and title like 'Christmas%';
  insert into public.briefs (client_id, team, title, due, status, assignee, requested_by)
  select cl.id, 'social', v.title, current_date + v.due_in, v.status,
         (select id from public.profiles where email = v.who || '.demo@example.com'), ish
  from (values
    ('Betya', 'Monthly report for October', -6, 'In progress', 'callum'),
    ('Wombet', 'Reply to the client on the giveaway terms', -2, 'In progress', 'callum'),
    ('MINT', 'December content plan', -1, 'In progress', 'callum'),
    ('96.com', 'Sign off the tournament creative', 2, 'In review', 'ish'),
    ('PUBS', 'Review the Christmas quiz copy', 3, 'In review', 'ish'),
    ('B2', 'December content plan', 4, 'In progress', 'pat'),
    ('FastRips', 'Weekly rip schedule', 1, 'In progress', 'pat'),
    ('Go Go Gold', 'Black Friday recap thread', 2, 'In progress', 'pat'),
    ('Luckycoin', 'Pinned post refresh', 5, 'Requested', 'pat'),
    ('VictoryRush', 'New follower welcome reply', 6, 'Requested', 'pat'),
    ('Kickback Casino', 'Competitor round-up', 8, 'Requested', 'pat'),
    ('Oracle 7', 'Monthly report for November', 10, 'Requested', 'pat'),
    ('Dara Casino', 'Brand voice notes for the new SMM', -1, 'In progress', 'pat')
  ) v(client, title, due_in, status, who)
  join public.clients cl on cl.name = v.client;

  -- design and video use their own statuses
  update public.briefs set status = case status when 'Requested' then 'New Request' when 'In progress' then 'In Design'
    when 'In review' then 'In Review' when 'Delivered' then 'Complete' else status end
    where team in ('design', 'video');
  update public.briefs set priority = 'Super Urgent' where urgent;
  update public.briefs set fields = jsonb_build_object('platform', 'X', 'content_type', 'Asset') where team = 'design' and fields = '{}';
  update public.briefs set fields = jsonb_build_object('platform', 'Instagram', 'content_type', 'Video') where team = 'video' and fields = '{}';
  -- talent and invoice requests
  insert into public.briefs (client_id, team, title, details, due, status, priority, assignee, requested_by, fields)
  select cl.id, v.team, v.title, v.details, current_date + v.due_in, v.status, v.priority,
         (select id from public.profiles where email = v.who || '.demo@example.com'), callum, v.fields::jsonb
  from (values
    ('SirBetalot', 'talent', 'Kick streamer for the Christmas series', 'Slots focused, comfortable on camera with the brand world.', 9, 'Sourcing Talent', 'High', 'wissal',
     '{"talent_type":"Streamer","operator_type":"Crypto","platform":"Kick","geos":"UK, Nordics","deal_type":"Flat Fee","budget":"Demo budget","exclusivity":"Exclusive"}'),
    ('B2', 'talent', 'Three TikTok creators for January', 'Sweeps friendly, US only.', 20, 'New Request', 'Medium', 'daniel.umana',
     '{"talent_type":"Influencer","operator_type":"Sweeps","platform":"TikTok","geos":"US","deal_type":"Hybrid","budget":"Demo budget","exclusivity":"Non-exclusive"}'),
    ('96.com', 'talent', 'X KOLs for the tournament launch', 'Crypto native accounts.', 5, 'Ready for Review', 'High', 'wissal',
     '{"talent_type":"KOL","operator_type":"Crypto","platform":"X","geos":"Global","deal_type":"Flat Fee","budget":"Demo budget","exclusivity":"Non-exclusive"}'),
    ('SirBetalot', 'finance', 'Invoice request', E'Agreed deliverables: demo\nDeal duration: demo\nExpected go-live date: demo', 3, 'Open', 'Medium', 'daisy',
     '{"talent_partner":"NorthSideSpins","invoice_sent":"Yes","payment_received":"No","talent_paid":"Not yet"}'),
    ('96.com', 'finance', 'Invoice request', E'Agreed deliverables: demo\nDeal duration: demo', -4, 'Complete', 'Medium', 'daisy',
     '{"talent_partner":"CryptoCassie","invoice_sent":"Yes","payment_received":"Yes","talent_paid":"In full"}')
  ) v(client, team, title, details, due_in, status, priority, who, fields)
  join public.clients cl on cl.name = v.client;

  insert into public.global_events (starts, ends, title, category, regions, tier) values
    (date '2026-12-25', null, 'NBA Christmas Day games', 'Basketball', '{US,Global}', 2),
    (date '2026-12-25', null, 'NFL Christmas Day games', 'American football', '{US}', 2),
    (date '2026-12-26', null, 'Premier League Boxing Day fixtures', 'Football', '{UK,Europe,Global}', 1),
    (date '2027-02-14', null, 'Super Bowl LXI', 'American football', '{US,Global}', 1)
  on conflict (starts, title) do nothing;
end $$;
