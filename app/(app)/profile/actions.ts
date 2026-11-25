"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { str, TEAMS } from "@/lib/workspace";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 2 * 1024 * 1024;

const fail = (message: string): never => redirect("/profile?error=" + encodeURIComponent(message));

export async function saveProfile(formData: FormData) {
  const profile = await requireStaff();
  const supabase = await createClient();
  const name = str(formData, "name");
  if (!name) fail("Add your name. It is what clients see.");

  let photoUrl: string | null = null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const ext = TYPES[file.type];
    if (!ext) fail("Use a JPEG, PNG or WebP photo.");
    if (file.size > MAX_BYTES) fail("That photo is over 2 MB. Use a smaller one.");
    // Each person can only write inside their own folder, enforced by the storage rules.
    const path = `${profile.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (error) fail("The photo did not upload. Try again.");
    photoUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.rpc("update_my_profile", {
    p_name: name,
    p_title: str(formData, "title"),
    p_photo: photoUrl,
    p_team: TEAMS.includes(str(formData, "team")) ? str(formData, "team") : "",
  });
  if (error) fail("Your profile did not save.");
  revalidatePath("/", "layout");
  redirect("/profile?saved=1");
}
