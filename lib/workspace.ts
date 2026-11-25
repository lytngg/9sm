import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const CHANNELS = ["X", "Instagram", "Facebook", "TikTok", "YouTube", "Discord", "Telegram"];
export const STAGES = ["Draft", "Team lead review", "Client review", "Approved", "Posted"] as const;
// Operator types. A client can carry more than one. Talent uses the same list, which is what makes matching work.
export const OPERATOR_TAGS = [
  "Sportsbook",
  "Predictions",
  "Crypto casino",
  "Hybrid casino",
  "Sweepstakes casino",
  "Loot boxes",
  "Card rips",
];
export const MARKETS = ["US", "Canada", "UK", "Europe", "LatAm", "Brazil", "Asia", "Africa", "Middle East"];
export const OFFER_PRODUCTS = ["Sports", "Casino", "Predictions", "Loot boxes", "Card rips"];
// A first guess at the list. Edit freely.
export const OFFER_KINDS = ["Free spins", "Reload", "Deposit match", "Odds boost", "Free bet", "Cashback", "Giveaway", "Tournament"];
export const TALENT_PLATFORMS = ["Kick", "Twitch", "YouTube", "X", "TikTok", "Instagram"];
export const INTEREST_STAGES = ["New", "In talks", "Proposal sent", "Signed", "Passed"];
export const TEAMS = ["Social", "Talent", "Operations", "Design", "Video", "Paid Media", "Community", "CRM", "PR", "Clipping"];
export const BRIEF_STAGES = ["Requested", "In progress", "In review", "Delivered"] as const;
export const FILES_BUCKET = "client-files";
export const MAX_UPLOAD = 4 * 1024 * 1024;

export const pick = (formData: FormData, key: string, allowed: string[]) =>
  formData.getAll(key).map(String).filter((v) => allowed.includes(v));

// What a client can put on the calendar for us to post about.
export const REQUEST_KINDS = ["Casino offer", "Sports offer", "Event", "Birthday or anniversary", "Product news", "Other"];

// Loads the signed-in person and the client workspace they asked for.
// The database rules return nothing if they may not see it.
export async function loadWorkspace(id: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (!client) notFound();
  return { profile, supabase, client, isStaff: profile.role === "staff" };
}

export const today = () => new Date().toISOString().slice(0, 10);
export const str = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

// Who a task can be for. Wider than the plugins list, since tasks are internal.
export const TASK_TEAMS: { key: string; name: string }[] = [
  { key: "social", name: "Social" },
  { key: "design", name: "Design" },
  { key: "video", name: "Video" },
  { key: "community", name: "Community" },
  { key: "talent", name: "Talent" },
  { key: "ops", name: "Operations" },
  { key: "paid", name: "Paid Media" },
  { key: "crm", name: "CRM" },
  { key: "pr", name: "PR" },
  { key: "clipping", name: "Clipping" },
];
export const teamName = (key: string) => TASK_TEAMS.find((t) => t.key === key)?.name ?? key;
