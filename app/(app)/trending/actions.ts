"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OPERATOR_TAGS, str } from "@/lib/workspace";

function back(error?: string): never {
  revalidatePath("/trending");
  redirect(error ? `/trending?error=${encodeURIComponent(error)}#watchlist` : "/trending#watchlist");
}

export async function addWatch(formData: FormData) {
  await requireStaff();
  const handle = str(formData, "handle").replace(/^@+/, "").replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "").split(/[/?]/)[0];
  const segment = str(formData, "segment");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) back("Type the X handle, like @brandname.");
  if (!OPERATOR_TAGS.includes(segment)) back("Pick what kind of brand it is.");
  const supabase = await createClient();
  const { error } = await supabase.from("watch_accounts").insert({ platform: "X", handle, segment });
  back(error ? "That account is already on the list." : undefined);
}

export async function removeWatch(id: string) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("watch_accounts").delete().eq("id", id);
  back();
}
