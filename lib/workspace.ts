import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const CHANNELS = ["X", "Instagram", "Facebook", "TikTok", "YouTube", "Discord", "Telegram"];
export const STAGES = ["Draft", "Team lead review", "Client review", "Approved", "Posted"] as const;
export const REQUEST_KINDS = ["Offer", "Product news", "Event", "Other"];

// Loads the signed-in person and the client workspace they asked for.
// The database rules return nothing if they may not see it.
export async function loadWorkspace(id: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("id, name, type, smm").eq("id", id).maybeSingle();
  if (!client) notFound();
  return { profile, supabase, client, isStaff: profile.role === "staff" };
}

export const today = () => new Date().toISOString().slice(0, 10);
export const str = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
