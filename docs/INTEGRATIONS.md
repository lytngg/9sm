# Integrations

Everything in the platform that needs an outside service: what it is for, what we call, what calls us, where the data lands, and what has to be in place before it can be switched on.

Nothing here is live yet. The platform runs today on what people type in. Each integration is meant to fill the same tables the manual forms fill, so screens do not change when one is switched on.

Endpoint and permission names below are from memory and earlier research. Check each against the provider's current documentation when it is built.

## Status key

- **Table ready**: the place the data lands exists and a screen already reads it.
- **Not built**: needs code, keys and testing.

## 1. X

| Feature | We call | Trigger | Lands in | Status |
|---|---|---|---|---|
| Follower counts for channel health | User lookup for each connected account | Weekly job | `channel_stats` | Table ready |
| Publish approved posts | Create post, media upload | When a post is due | `posts.live_url` | Table ready |
| Find posts made outside the tool | Account timeline | Hourly job | `posts`, flagged for the SMM to confirm as offers | Not built |
| Views, clicks, replies per post | Post lookup with metrics | Daily job for 30 days | `post_metrics` (new) | Not built |
| Inbox: mentions and replies | Mentions timeline | Every few minutes | `inbox_items` (new) | Not built |
| Benchmarks, competitors, trust | Recent search on other accounts | Daily job | `mentions` (new) | Not built |

- **Sign-in:** each client account connects once through X's own sign-in. We store a refresh token, never a password.
- **Cost:** pay per call. Posting is cents. Reading other people's posts is the expensive part.
- **Approval:** none. A developer account with billing is enough.
- **Webhooks:** X's push product is priced for enterprise, so we poll.

## 2. Instagram and Facebook

| Feature | We call | Trigger | Lands in | Status |
|---|---|---|---|---|
| Follower counts | Account insights | Weekly job | `channel_stats` | Table ready |
| Publish posts, reels, carousels | Media container, then publish | When a post is due | `posts.live_url` | Table ready |
| Reach and engagement per post | Media insights | Daily job | `post_metrics` (new) | Not built |
| Inbox: comments, mentions, messages | Meta sends them to us | Webhook `/api/hooks/meta` | `inbox_items` (new) | Not built |
| Show a post as it appears | oEmbed | On page view | Nothing stored | Not built |

- **Sign-in:** the client connects a Business or Creator account linked to a Facebook Page.
- **Approval:** Meta App Review for each permission, plus business verification. Weeks, and the review of a gambling-focused tool is a risk to test early.
- **Cost:** free.

## 3. TikTok

| Feature | We call | Trigger | Lands in | Status |
|---|---|---|---|---|
| Follower counts, video stats | Display API | Weekly and daily jobs | `channel_stats`, `post_metrics` | Table ready for followers |
| Publish videos | Content Posting API | When a post is due | `posts.live_url` | Table ready |

- **Approval:** an audit. Until it passes, posts are private. Internal tools are refused, so apply as a product for social teams.
- **Cost:** free.

## 4. YouTube

| Feature | We call | Trigger | Lands in | Status |
|---|---|---|---|---|
| Subscriber counts, video stats | Data API, Analytics API | Weekly and daily jobs | `channel_stats`, `post_metrics` | Table ready for followers |
| Upload videos | Data API upload | When a post is due | `posts.live_url` | Table ready |
| Inbox: comments | Comment threads | Every few minutes | `inbox_items` (new) | Not built |

- **Approval:** an audit for the upload permission. A free daily quota applies.

## 5. Discord

| Feature | How | Trigger | Lands in | Status |
|---|---|---|---|---|
| Member count, active members | A 9SM bot in the client's server | Live events, daily roll-up | `channel_stats`, `community_stats` (new) | Table ready for members |
| Inbox and reply timing | Bot reads messages in support channels | Live events | `inbox_items` (new) | Not built |
| Owned audience | Members link their casino account through Discord sign-in | When a player links | `player_links` (new) | Not built |
| Post announcements | Bot posts to a channel | When a post is due | `posts.live_url` | Table ready |

- **Needs:** the client to add the bot. A bot keeps a permanent connection open, so it needs a small always-on server. Vercel cannot host it.

## 6. Telegram

| Feature | How | Trigger | Lands in | Status |
|---|---|---|---|---|
| Member count | Bot API | Daily job | `channel_stats` | Table ready |
| Post to a channel | Bot added as channel admin | When a post is due | `posts.live_url` | Table ready |
| Inbox for groups | Telegram sends messages to us | Webhook `/api/hooks/telegram` | `inbox_items` (new) | Not built |

- **Approval:** none. Free.

## 7. Kick and Twitch

| Feature | We call | Trigger | Lands in | Status |
|---|---|---|---|---|
| Who is live, viewers | Livestream lookup | Every 1 to 5 minutes | `stream_sessions` (new) | Not built |
| Hours and streams against contract | Worked out from the above | As sessions end | `talent_contracts` (new) | Not built |
| Go-live alerts | Platform sends them to us | Webhooks `/api/hooks/kick`, `/api/hooks/twitch` | `stream_sessions` | Not built |
| Chat activity check | Chat events | Webhook | `stream_sessions` | Not built |

- **Sign-in:** viewer numbers need nothing from the streamer. Chat on Kick needs the streamer to sign in to our app once, so make that a contract term.
- **Cost:** free.

## 8. Operator data feed

This is what turns social into registrations and deposits. It is different for every operator.

| Feature | How | Trigger | Lands in | Status |
|---|---|---|---|---|
| Registrations, FTDs, deposits per code and link | Daily file upload, or their affiliate platform or back office sends it | Daily, or webhook `/api/hooks/operator-feed` | `conversions` (new) | Not built |
| Players in the community | Player IDs matched to linked Discord, Telegram and X accounts | Daily | `player_links` (new) | Not built |

- **Needs:** a data agreement with each operator, a secret key per operator, and a decision on the minimum fields. Start with a CSV upload so no operator is blocked on engineering.

## 9. Tracked links and codes

Our own, no outside service. A short link per post or streamer that records the click and forwards to the operator's site.

| Feature | How | Lands in | Status |
|---|---|---|---|
| Clicks per post, offer or streamer | `/r/<code>` redirect that logs the visit | `link_clicks` (new) | Not built |
| Codes per offer and streamer | Generated in the tool, redeemed on the operator side | `codes` (new), matched through the operator feed | Not built |

## 10. Slack

The simple version is built and dormant. Set `SLACK_WEBHOOK_URL` in Vercel to an incoming webhook for a 9SM channel and it starts posting. Add a Slack member ID to a team on the Teams page and that person is tagged.

| Feature | How | Trigger | Status |
|---|---|---|---|
| Tell the talent team about a new request | Incoming webhook to a channel | When a client clicks "I'm interested" | Built, needs the webhook address |
| Tell a department a client has a request | Incoming webhook, tagging the team's contact | When a client messages a team from Plugins | Built, needs the webhook address |
| Tell everyone posting is paused | Incoming webhook | When anyone presses pause | Built, needs the webhook address |
| Tell the SMM about a new client request | Incoming webhook | When a request is sent | Not built |
| Approve a post from Slack | Slack app with buttons that call `/api/hooks/slack` | When a post reaches client review | Not built |

- **Needs:** a Slack app in the 9SM workspace. Shared client channels need the app added there too.

## 11. Email

| Feature | How | Trigger | Status |
|---|---|---|---|
| Invites and sign-in links | Resend | On invite | Not built, Supabase's own email is used today |
| "Waiting on you" with approve links | Resend | When a post reaches client review | Not built |
| The weekly note | Resend | When the SMM publishes it | Not built |
| Bounces and complaints | Resend calls `/api/hooks/resend` | Webhook | Not built |

- **Needs:** a sending domain with DNS records set.

## 12. Meetings

Booking the intro call and the weekly slot. Start with a booking link stored on the client hub. A calendar integration is only worth building if people ask for it.

## 13. Trust and reputation

Mentions on X come from the X integration above. Reddit has an API. Review sites mostly do not offer one for reading other companies' reviews, and scraping them breaks their terms. Start with the community team logging complaints by hand, by theme.

## 14. Sports and esports dates

The shared events list is typed or pasted in by staff today. It can be filled automatically later.

| Feature | Source | Trigger | Lands in | Status |
|---|---|---|---|---|
| Esports tournaments and matches | PandaScore, whose free plan includes fixtures | Daily job | `global_events` | Table ready |
| Football fixtures and finals | API-Football or football-data.org | Daily job | `global_events` | Table ready |
| Other sports | TheSportsDB, which has a free tier | Daily job | `global_events` | Table ready |

- **The hard part is not the data.** A feed returns thousands of fixtures. Someone still has to decide which few are tier 1. The job should bring events in as tier 3 and let staff promote the ones that matter.
- **Check each provider's terms** for commercial use before relying on a free plan.

## What every integration shares

These get built once, before the first integration is switched on.

- **`connections` table.** One row per client and platform: who connected it, when, what it may do, and when it last worked. Tokens are stored encrypted with Supabase Vault and never reach a browser.
- **Scheduled jobs.** Routes under `/api/cron/*`, each protected by a secret. Vercel's free plan runs scheduled jobs once a day at most, so anything more frequent needs the Pro plan or Supabase's own scheduler.
- **Webhook endpoints.** Routes under `/api/hooks/*`. Each one checks the sender's signature before trusting anything, stores the raw event in `webhook_events`, and processes it after replying.
- **A switch per integration.** An environment variable per provider, so the code can be deployed dormant and turned on when the account, keys and approvals exist.
- **A health screen for staff.** Which connections are working, which have expired, and when each job last ran.
- **A server key.** Jobs and webhooks have no signed-in user, so they use Supabase's service role key. It lives only in Vercel's settings.

## Order to switch things on

1. X follower counts and post metrics. No approval, and it replaces the manual number entry.
2. Telegram and Discord member counts. No approval.
3. Kick and Twitch live tracking.
4. Slack and email notifications.
5. Tracked links and codes, then the first operator data feed.
6. Meta and TikTok, whenever their reviews pass. Start those applications early because they are the long wait.
