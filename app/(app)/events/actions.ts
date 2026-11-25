"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/workspace";
import { EVENT_CATEGORIES, EVENT_REGIONS } from "@/lib/scope";

function back(error?: string, note?: string): never {
  revalidatePath("/events");
  revalidatePath("/c", "layout");
  redirect(error ? `/events?error=${encodeURIComponent(error)}` : note ? `/events?note=${encodeURIComponent(note)}` : "/events");
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + "T00:00:00Z").getTime());

// One event per line: date | title | category | regions | tier
// Optional end date after the first one: 2026-06-11..2026-07-19 | World Cup | Football | Global | 1
export async function importEvents(formData: FormData) {
  await requireStaff();
  const lines = str(formData, "lines").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) back("Paste at least one line.");
  const rows: { starts: string; ends: string | null; title: string; category: string; regions: string[]; tier: number }[] = [];
  const bad: number[] = [];
  lines.forEach((line, i) => {
    const [when = "", title = "", category = "", regions = "", tier = ""] = line.split("|").map((p) => p.trim());
    const [starts, ends = ""] = when.split("..").map((p) => p.trim());
    const cat = EVENT_CATEGORIES.find((c) => c.toLowerCase() === category.toLowerCase());
    const regs = regions
      .split(",")
      .map((r) => EVENT_REGIONS.find((x) => x.toLowerCase() === r.trim().toLowerCase()))
      .filter((r): r is string => Boolean(r));
    const t = Number(tier || "2");
    if (!isDate(starts) || (ends && !isDate(ends)) || !title || !cat || ![1, 2, 3].includes(t)) bad.push(i + 1);
    else rows.push({ starts, ends: ends || null, title, category: cat, regions: regs.length ? regs : ["Global"], tier: t });
  });
  if (bad.length) back(`Could not read line ${bad.slice(0, 8).join(", ")}. Nothing was added. Check the date, category and tier.`);
  const supabase = await createClient();
  const { error } = await supabase.from("global_events").upsert(rows, { onConflict: "starts,title" });
  back(error ? "The events did not save." : undefined, `${rows.length} events saved.`);
}

export async function deleteEvent(eventId: string) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("global_events").delete().eq("id", eventId);
  back(error ? "Could not remove that event." : undefined);
}
