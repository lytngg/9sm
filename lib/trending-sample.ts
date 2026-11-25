// SAMPLE FEED. Invented accounts and posts so the trending page can be shown.
// The real feed replaces this once the X connection is on: every hour it reads
// the accounts in the watchlist and scores each post against that account's
// own usual numbers (see docs/INTEGRATIONS.md, section 1).
export type TrendPost = {
  handle: string;
  segment: "Crypto casino" | "Sweepstakes casino" | "Sportsbook";
  minutesAgo: number;
  text: string;
  format: string;
  likes: number;
  reposts: number;
  views: number;
  lift: number; // how many times this account's usual engagement
  theme: string;
};

export const SAMPLE_TRENDS: TrendPost[] = [
  { handle: "@sample_emberstakes", segment: "Crypto casino", minutesAgo: 14, text: "Someone just turned 20 into 48,000 on a bonus buy and typed \"gg\" in chat. That's it. That's the tweet.", format: "Big win", likes: 4200, reposts: 610, views: 310000, lift: 9.4, theme: "Big wins" },
  { handle: "@sample_quartzcasino", segment: "Crypto casino", minutesAgo: 32, text: "Withdrawals under 60 seconds or we pay you 50. Timer starts when you click.", format: "Trust claim", likes: 2900, reposts: 880, views: 240000, lift: 7.8, theme: "Payout speed" },
  { handle: "@sample_driftsweeps", segment: "Sweepstakes casino", minutesAgo: 41, text: "Drop your favourite slot and we'll send coins to 25 of you before midnight.", format: "Giveaway", likes: 6100, reposts: 2300, views: 420000, lift: 6.9, theme: "Reply giveaways" },
  { handle: "@sample_kestrelbet", segment: "Sportsbook", minutesAgo: 47, text: "He's missed three penalties this season. He's taking this one. We've boosted it anyway.", format: "Live reaction", likes: 3800, reposts: 540, views: 290000, lift: 6.2, theme: "Tonight's match" },
  { handle: "@sample_lanterncasino", segment: "Crypto casino", minutesAgo: 55, text: "POV: you said one more spin four hours ago", format: "Meme", likes: 9800, reposts: 1900, views: 760000, lift: 5.7, theme: "Relatable memes" },
  { handle: "@sample_thistlesweeps", segment: "Sweepstakes casino", minutesAgo: 58, text: "New players keep asking if redemptions are real. Here are 40 from this morning.", format: "Proof thread", likes: 2100, reposts: 480, views: 180000, lift: 5.1, theme: "Payout speed" },
  { handle: "@sample_onyxstakes", segment: "Crypto casino", minutesAgo: 95, text: "Our CEO lost a bet with the community. He's streaming with 100 of his own tonight.", format: "Founder stunt", likes: 5200, reposts: 1100, views: 390000, lift: 4.8, theme: "Founder on camera" },
  { handle: "@sample_copperbet", segment: "Sportsbook", minutesAgo: 130, text: "Rate this acca out of 10. Wrong answers only.", format: "Engagement bait", likes: 1900, reposts: 210, views: 150000, lift: 4.1, theme: "Tonight's match" },
  { handle: "@sample_nimbussweeps", segment: "Sweepstakes casino", minutesAgo: 170, text: "We added a daily streak. Day 7 is worth showing up for.", format: "Product news", likes: 1400, reposts: 260, views: 120000, lift: 3.6, theme: "Daily streaks" },
  { handle: "@sample_marblecasino", segment: "Crypto casino", minutesAgo: 240, text: "A streamer hit max win on stream and forgot he was live. Clip below.", format: "Clip", likes: 7400, reposts: 1700, views: 610000, lift: 3.4, theme: "Big wins" },
  { handle: "@sample_pioneerbet", segment: "Sportsbook", minutesAgo: 380, text: "Every Saturday 3pm kick-off, one boosted price, no small print. Thread.", format: "Offer", likes: 1100, reposts: 190, views: 96000, lift: 2.9, theme: "Weekend offers" },
  { handle: "@sample_atlasstakes", segment: "Crypto casino", minutesAgo: 520, text: "We read every reply for a week. Here are the five things you asked for and when they ship.", format: "Listening post", likes: 3300, reposts: 720, views: 260000, lift: 2.7, theme: "Founder on camera" },
  { handle: "@sample_saffronsweeps", segment: "Sweepstakes casino", minutesAgo: 900, text: "Tag the friend who still owes you from last weekend.", format: "Engagement bait", likes: 2600, reposts: 900, views: 210000, lift: 2.3, theme: "Reply giveaways" },
  { handle: "@sample_velvetbet", segment: "Sportsbook", minutesAgo: 2100, text: "We let our followers set the odds on the weather at Sunday's game. It went badly.", format: "Stunt", likes: 4100, reposts: 830, views: 330000, lift: 2.1, theme: "Weekend offers" },
  { handle: "@sample_juniperstakes", segment: "Crypto casino", minutesAgo: 3900, text: "Monthly transparency post: deposits, withdrawals, average payout time.", format: "Trust claim", likes: 1800, reposts: 410, views: 140000, lift: 1.9, theme: "Payout speed" },
];
