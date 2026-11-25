"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CHANNELS, str } from "@/lib/workspace";

function back(clientId: string, error?: string): never {
  const path = `/c/${clientId}/health`;
  revalidatePath(path);
  redirect(error ? `${path}?error=${encodeURIComponent(error)}` : path);
}

// Monday of the week a date falls in, so every entry for a week lands on the same row.
function weekOf(date: string) {
  const d = new Date(date + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export async function logNumbers(clientId: string, formData: FormData) {
  await requireStaff();
  const week = weekOf(str(formData, "week"));
  if (!week) back(clientId, "Pick the week these numbers are for.");
  const rows = CHANNELS.flatMap((channel) => {
    const raw = str(formData, `f_${channel}`).replace(/[,\s]/g, "");
    if (!raw) return [];
    const followers = Number(raw);
    return Number.isInteger(followers) && followers >= 0 ? [{ client_id: clientId, channel, week, followers }] : [];
  });
  if (rows.length === 0) back(clientId, "Enter a follower count for at least one channel, as a whole number.");
  const supabase = await createClient();
  const { error } = await supabase.from("channel_stats").upsert(rows);
  back(clientId, error ? "The numbers did not save." : undefined);
}
