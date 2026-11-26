// How each team's requests work: the form its requesters fill in and the
// statuses a ticket moves through. Taken from the 9SM operations document.
// Teams not listed here use the plain four-step flow.

export type FlowField = {
  key: string;
  label: string;
  kind: "select" | "text" | "date" | "textarea";
  options?: string[];
  hint?: string;
};
export type Bucket = "new" | "working" | "review" | "done";
export type Flow = {
  // Every status, in order, with the bucket it counts as on mixed boards.
  stages: [string, Bucket][];
  formName?: string;
  fields: FlowField[];
  // First-name matches for who a new ticket lands with when nobody is picked.
  assignTo?: string[];
  detailsLabel?: string;
  detailsDefault?: string;
};

export const PRIORITIES = ["Low", "Medium", "High", "Super Urgent"];

const TICKET: [string, Bucket][] = [
  ["New Request", "new"],
  ["In Design", "working"],
  ["In Review", "review"],
  ["Ongoing", "working"],
  ["Paused", "working"],
  ["Complete", "done"],
];
const GENERIC: Flow = {
  stages: [
    ["Requested", "new"],
    ["In progress", "working"],
    ["In review", "review"],
    ["Delivered", "done"],
  ],
  fields: [],
};

export const FLOWS: Record<string, Flow> = {
  design: {
    stages: TICKET,
    formName: "Design request",
    assignTo: ["Leonit", "Leo"],
    detailsLabel: "Notes for the Design team",
    fields: [
      { key: "platform", label: "Social platform", kind: "select", options: ["Instagram", "X", "Discord", "Telegram", "Facebook", "LinkedIn", "Other"] },
      { key: "content_type", label: "Content type", kind: "select", options: ["Asset", "Asset Calendar", "Carousel", "Emoji/Sticker Pack", "New Client Asset Pack", "Streamer Overlay", "UI Design"] },
    ],
  },
  video: {
    stages: TICKET,
    formName: "Video request",
    assignTo: ["Otto"],
    detailsLabel: "Notes for the Video team",
    fields: [
      { key: "platform", label: "Social platform", kind: "select", options: ["X", "Instagram", "Discord", "Telegram", "Facebook", "YouTube", "Other"] },
      { key: "content_type", label: "Content type", kind: "select", options: ["GIF", "Launch Video", "Streamer Clip", "Meme", "Video"] },
      { key: "other_brand", label: "Other brand", kind: "text", hint: "Only if the brand is not in the client list" },
    ],
  },
  talent: {
    stages: [
      ["New Request", "new"],
      ["Sourcing Talent", "working"],
      ["Ready for Review", "review"],
      ["Complete", "done"],
    ],
    formName: "Talent request",
    assignTo: ["Wissal"],
    detailsLabel: "Anything else the Talent team should know",
    fields: [
      { key: "potential_client", label: "Potential client", kind: "text", hint: "Only if they are not a client yet" },
      { key: "talent_type", label: "Talent type", kind: "select", options: ["Affiliate", "Ambassador", "KOL", "Influencer", "Streamer"] },
      { key: "operator_type", label: "Operator type", kind: "select", options: ["Casino", "Crypto", "Lootboxes", "Pack Opening", "Prediction Markets", "Sportsbook", "Sweeps"] },
      { key: "platform", label: "Platform", kind: "select", options: ["Discord", "Facebook", "Instagram", "Kick", "TikTok", "Twitch", "X", "YouTube"] },
      { key: "geos", label: "GEOs", kind: "text", hint: "Target countries or regions" },
      { key: "language", label: "Language", kind: "text" },
      { key: "deal_type", label: "Deal type", kind: "select", options: ["CPA", "Flat Fee", "Hybrid", "Rev Share"] },
      { key: "budget", label: "Budget", kind: "text", hint: "Amount and currency" },
      { key: "exclusivity", label: "Exclusivity", kind: "select", options: ["Exclusive", "Non-exclusive"] },
    ],
  },
  finance: {
    stages: [
      ["Open", "new"],
      ["Complete", "done"],
      ["Cancelled", "done"],
    ],
    formName: "Invoice request",
    assignTo: ["Daisy"],
    detailsLabel: "Deal details",
    detailsDefault:
      "Agreed deliverables:\nDeal duration:\nExpected go-live date:\nExclusivity:\nTalent fee before markup:\nClient price after markup:\nPayment method (fiat or crypto):\nWallet address:",
    fields: [
      { key: "talent_partner", label: "Talent partner name", kind: "text" },
      { key: "invoice_sent", label: "Invoice sent", kind: "select", options: ["No", "Yes"] },
      { key: "payment_received", label: "Payment received", kind: "select", options: ["No", "Yes"] },
      { key: "talent_paid", label: "Talent paid", kind: "select", options: ["Not yet", "50%", "In full"] },
    ],
  },
};

export const flowFor = (team: string): Flow => FLOWS[team] ?? GENERIC;
export const stagesFor = (team: string) => flowFor(team).stages.map((s) => s[0]);
export const bucketOf = (team: string, status: string): Bucket => flowFor(team).stages.find((s) => s[0] === status)?.[1] ?? "working";
export const isClosed = (team: string, status: string) => bucketOf(team, status) === "done";
// The first status a team has in a bucket. Falls forward when a team has no such step.
export function statusIn(team: string, bucket: Bucket): string {
  const stages = flowFor(team).stages;
  const order: Bucket[] = ["new", "working", "review", "done"];
  for (let i = order.indexOf(bucket); i < order.length; i++) {
    const hit = stages.find((s) => s[1] === order[i]);
    if (hit) return hit[0];
  }
  return stages[0][0];
}
export const BUCKETS: { key: Bucket; label: string; tone: string }[] = [
  { key: "new", label: "New", tone: "grey" },
  { key: "working", label: "In progress", tone: "purple" },
  { key: "review", label: "In review", tone: "pink" },
  { key: "done", label: "Done", tone: "good" },
];
export const toneOf = (team: string, status: string) =>
  status === "Paused" || status === "Cancelled" ? "grey" : (BUCKETS.find((b) => b.key === bucketOf(team, status))?.tone ?? "grey");
