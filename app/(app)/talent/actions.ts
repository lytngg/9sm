"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { INTEREST_STAGES, MARKETS, OPERATOR_TAGS, pick, str, TALENT_PLATFORMS } from "@/lib/workspace";

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function back(path: string, error?: string): never {
  revalidatePath(path);
  redirect(error ? `${path}?error=${encodeURIComponent(error)}` : path);
}

export async function addTalent(formData: FormData) {
  const me = await requireStaff();
  const name = str(formData, "name");
  const platform = str(formData, "platform");
  const tags = pick(formData, "tags", OPERATOR_TAGS);
  if (!name || !TALENT_PLATFORMS.includes(platform)) back("/talent", "Add a name and a platform.");
  if (tags.length === 0) back("/talent", "Pick at least one operator type, or no client will ever be shown this person.");
  const url = str(formData, "channel_url");
  if (url && !/^https:\/\//.test(url)) back("/talent", "The channel link should start with https://");

  const supabase = await createClient();
  let photoUrl: string | null = null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const ext = PHOTO_TYPES[file.type];
    if (!ext) back("/talent", "Use a JPEG, PNG or WebP photo.");
    if (file.size > 2 * 1024 * 1024) back("/talent", "That photo is over 2 MB. Use a smaller one.");
    // Profile photos are public by address, like staff photos, and sit in the uploader's own folder.
    const path = `${me.id}/talent-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (error) back("/talent", "The photo did not upload. Try again.");
    photoUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("talent").insert({
    name,
    platform,
    channel_url: url || null,
    photo_url: photoUrl,
    audience: str(formData, "audience") || null,
    bio: str(formData, "bio") || null,
    tags,
    markets: pick(formData, "markets", MARKETS),
    guide_price: str(formData, "guide_price") || null,
  });
  back("/talent", error ? "Could not add that person." : undefined);
}

export async function setTalentActive(talentId: string, active: boolean) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("talent").update({ active }).eq("id", talentId);
  back("/talent", error ? "Could not update that person." : undefined);
}

export async function setInterestStatus(interestId: string, status: string) {
  await requireStaff();
  if (!INTEREST_STAGES.includes(status)) back("/talent");
  const supabase = await createClient();
  const { error } = await supabase.from("talent_interest").update({ status }).eq("id", interestId);
  revalidatePath("/c", "layout");
  back("/talent", error ? "Could not update that request." : undefined);
}

// An operator, or staff on their behalf, says they are interested in someone they were shown.
export async function expressInterest(clientId: string, talentId: string, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("express_interest", {
    p_client: clientId,
    p_talent: talentId,
    p_note: str(formData, "note"),
  });
  revalidatePath("/talent");
  back(`/c/${clientId}/talent`, error ? "Could not send that. Try again." : undefined);
}
