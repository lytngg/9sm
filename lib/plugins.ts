// What each plugin page says. PLACEHOLDER COPY: written so the pages can be
// shown and reacted to. Each team should replace its own section, and the
// "market" notes are meant to be rewritten every week or two.

export type Plugin = {
  tagline: string;
  does: string[];
  // Things a client can ask for with one click.
  offers: { name: string; detail: string; included?: boolean }[];
  // Short notes on what is working in the market right now.
  market: { when: string; title: string; body: string }[];
  // Options in the brief form. Teams without this get no brief form.
  formats?: string[];
};

export const PLUGINS: Record<string, Plugin> = {
  talent: {
    tagline: "Streamers and creators who already talk to your players, matched to your brand and booked by us.",
    does: [],
    offers: [],
    market: [],
  },
  clipping: {
    tagline: "Your streams and best moments cut into short clips and pushed out by a network of clippers, with every view counted.",
    does: [
      "Clip your streams, wins and reactions within hours",
      "Distribute through our clipper network on TikTok, Shorts, Reels and X",
      "Pay on views, tracked per clip",
      "Show you every clip and its numbers in one dashboard",
    ],
    offers: [
      { name: "Stream clipping", detail: "Every sponsored stream turned into clips the same day and seeded across short-form." },
      { name: "Big win campaign", detail: "One standout moment pushed hard for a week. Good around a launch or a jackpot." },
      { name: "Always-on clipping", detail: "A monthly view target with a fixed budget, topped up when clips take off." },
    ],
    market: [
      { when: "This month", title: "Reaction clips are beating gameplay clips", body: "Clips that open on the streamer's face in the first second are travelling further than clips that open on the reels." },
      { when: "This month", title: "X is paying off again for clips", body: "Short clips posted natively on X are getting picked up by betting accounts and reposted, which TikTok clips are not." },
      { when: "Watch", title: "Disclosure is being enforced harder", body: "Platforms are pulling gambling clips with no ad label. Every clip we place carries one." },
    ],
  },
  crm: {
    tagline: "Emails, push and on-site messages that bring players back, written in the same voice as your social.",
    does: [
      "Plan the lifecycle: welcome, first deposit, reactivation, VIP",
      "Write and build the campaigns in your CRM tool",
      "Match every offer on social with the message players get directly",
      "Report on what brought players back and what did not",
    ],
    offers: [
      { name: "CRM audit", detail: "We read every message a new player gets in their first 30 days and tell you what to fix first." },
      { name: "Welcome journey rebuild", detail: "The first seven days, rewritten and rebuilt. Usually the fastest win." },
      { name: "Managed CRM", detail: "We run the calendar, the copy and the builds every week alongside your social." },
    ],
    market: [
      { when: "This month", title: "Plain text is beating designed emails", body: "Short emails that read like a note from a person are getting opened and clicked more than banner-heavy ones." },
      { when: "This month", title: "Reactivation works best on a sports hook", body: "Lapsed players are coming back for a specific fixture more than for a generic bonus." },
      { when: "Watch", title: "Inbox providers are filtering bonus language", body: "Subject lines with bonus amounts are landing in promotions or spam more often. We write around it." },
    ],
  },
  design: {
    tagline: "A designer who knows your brand, turning requests round fast. Unlimited image requests are part of your plan.",
    does: [
      "Offer creatives and social post images",
      "Banner sets for site and affiliates",
      "Seasonal refreshes of your logo and avatars",
      "Brand assets kept tidy in your Figma file",
    ],
    offers: [
      { name: "Seasonal brand refresh", detail: "Logo, avatars and headers dressed for the season. Christmas is next.", included: true },
      { name: "Offer creative pack", detail: "One hero image and the cut-downs for every channel you post on.", included: true },
      { name: "Brand identity work", detail: "A new identity or a proper tidy-up of the one you have. Scoped separately." },
    ],
    market: [
      { when: "This month", title: "Less text on the image is winning", body: "Creatives with the offer in the caption and one strong visual are getting more reach than text-heavy tiles." },
      { when: "This month", title: "Brands are moving away from neon and gold", body: "The newer casino brands that are growing look calmer. Flat colour, real photography, fewer effects." },
      { when: "Coming up", title: "Christmas assets", body: "Most brands switch on 1 December. Ask now if you want yours ready." },
    ],
    formats: ["Social post image", "Offer creative", "Banner set", "Logo or brand asset", "Seasonal refresh", "Something else"],
  },
  video: {
    tagline: "Short video made for the feed, from idea to final cut. Unlimited video requests are part of your plan.",
    does: [
      "Short vertical video for TikTok, Reels and Shorts",
      "Cut-downs and captions from streams and long video",
      "Motion graphics for offers and launches",
      "Scripts and hooks written by people who post gambling content every day",
    ],
    offers: [
      { name: "Weekly short-form pack", detail: "A set of short videos each week built around your calendar.", included: true },
      { name: "Launch film", detail: "One proper piece for a new product, game or market, plus the cut-downs.", included: true },
      { name: "Host-led series", detail: "A recurring format with a face your players get to know. Scoped separately." },
    ],
    market: [
      { when: "This month", title: "The first two seconds decide everything", body: "Videos that open on a result or a reaction are holding viewers. Logo openers are losing them." },
      { when: "This month", title: "People-led video is beating graphics", body: "A trader, host or streamer talking to camera is outperforming motion graphics on every platform we post on." },
      { when: "Watch", title: "TikTok is stricter on gambling", body: "Accounts that are not whitelisted are seeing videos pulled. We can help with whitelisting." },
    ],
    formats: ["Short vertical video", "X video", "YouTube video", "Stream clip", "Motion graphic", "Something else"],
  },
  pr: {
    tagline: "Your news written up properly and placed across 500 third-party websites.",
    does: [
      "Write the story so it reads like news",
      "Distribute it across 500 third-party websites",
      "Send you every live link once it lands",
      "Time it with your social so the two back each other up",
    ],
    offers: [
      { name: "Launch announcement", detail: "A new brand, market, licence or product told once and placed widely." },
      { name: "Monthly news slot", detail: "One story a month so there is always something recent when a player searches your name." },
      { name: "Founder profile", detail: "A piece on the people behind the brand. Good for trust." },
    ],
    market: [
      { when: "This month", title: "Players search a brand before they deposit", body: "Recent, independent coverage on the first page is doing more for trust than any claim on your own site." },
      { when: "This month", title: "Licence and payout stories travel", body: "Announcements about licences, payout speed and big wins are getting picked up more than product news." },
      { when: "Watch", title: "AI answers are quoting news sites", body: "When players ask an AI assistant about a casino, it is pulling from third-party coverage. Being written about matters more than it did." },
    ],
  },
  community: {
    tagline: "A team of seven in your Discord and Telegram around the clock, so no player waits for an answer.",
    does: [
      "Answer players in Discord and Telegram at any hour",
      "Run events, giveaways and watch-alongs",
      "Flag problems to your team before they grow",
      "Report on activity, sentiment and what players keep asking",
    ],
    offers: [
      { name: "24/7 moderation", detail: "Every channel covered with no gaps, including nights and weekends.", included: true },
      { name: "Community events", detail: "A monthly calendar of events run by us, tied to your offers and the sports calendar.", included: true },
      { name: "Server setup or rebuild", detail: "Roles, channels, bots and rules done properly. Scoped separately." },
    ],
    market: [
      { when: "This month", title: "Telegram is growing faster than Discord", body: "For crypto casinos the newer players are joining Telegram first. Discord is where the regulars stay." },
      { when: "This month", title: "Watch-alongs are filling servers", body: "Live match threads with a small prize are bringing in more active members than giveaways alone." },
      { when: "Watch", title: "Fake support accounts", body: "Scammers posing as support are targeting casino communities. We ban on sight and pin the warning." },
    ],
  },
};
