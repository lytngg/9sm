"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notifySlack } from "@/lib/slack";

export async function inviteOperator(clientId: string, formData: FormData) {
  await requireStaff();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect(`/c/${clientId}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_user", { p_email: email, p_role: "operator", p_client: clientId });
  if (error) redirect(`/c/${clientId}?error=` + encodeURIComponent("Could not give that person access."));
  revalidatePath(`/c/${clientId}`);
  redirect(`/c/${clientId}`);
}

export async function removeOperator(clientId: string, email: string) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_access", { p_email: email, p_client: clientId });
  if (error) redirect(`/c/${clientId}?error=` + encodeURIComponent("Could not remove that access."));
  revalidatePath(`/c/${clientId}`);
  redirect(`/c/${clientId}`);
}

export async function assignSmm(clientId: string, formData: FormData) {
  await requireStaff();
  const smm = String(formData.get("smm") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ smm_id: smm || null }).eq("id", clientId);
  if (error) redirect(`/c/${clientId}?error=` + encodeURIComponent("Could not save the social media manager."));
  revalidatePath(`/c/${clientId}`, "layout");
  redirect(`/c/${clientId}`);
}

export async function addScopeItem(clientId: string, formData: FormData) {
  await requireStaff();
  const label = String(formData.get("label") ?? "").trim();
  const target = Number(String(formData.get("target") ?? "").trim());
  if (!label || !Number.isInteger(target) || target <= 0)
    redirect(`/c/${clientId}?error=` + encodeURIComponent("Add what is promised and a whole number per month."));
  const supabase = await createClient();
  const { error } = await supabase.from("scope_items").insert({
    client_id: clientId,
    label,
    monthly_target: target,
    counts: formData.get("counts") === "posts" ? "posts" : "manual",
  });
  if (error) redirect(`/c/${clientId}?error=` + encodeURIComponent("Could not add that line."));
  revalidatePath(`/c/${clientId}`);
  redirect(`/c/${clientId}`);
}

export async function removeScopeItem(clientId: string, itemId: string) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("scope_items").delete().eq("id", itemId).eq("client_id", clientId);
  revalidatePath(`/c/${clientId}`);
  redirect(`/c/${clientId}`);
}

// Staff type in what was delivered for the lines that are not counted from posts.
export async function logDelivery(clientId: string, month: string, formData: FormData) {
  await requireStaff();
  if (!/^\d{4}-\d{2}-01$/.test(month)) redirect(`/c/${clientId}`);
  const rows: { item_id: string; client_id: string; month: string; delivered: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("d_")) continue;
    const raw = String(value).trim();
    if (raw === "") continue;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0) rows.push({ item_id: key.slice(2), client_id: clientId, month, delivered: n });
  }
  const supabase = await createClient();
  if (rows.length) {
    const { error } = await supabase.from("scope_delivery").upsert(rows);
    if (error) redirect(`/c/${clientId}?error=` + encodeURIComponent("Those numbers did not save."));
  }
  revalidatePath(`/c/${clientId}`);
  redirect(`/c/${clientId}`);
}

// Staff or the client can pause all posting, and resume it.
export async function setPause(clientId: string, on: boolean, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_client_pause", {
    p_client: clientId,
    p_on: on,
    p_reason: String(formData.get("reason") ?? ""),
  });
  if (error) redirect(`/c/${clientId}?error=` + encodeURIComponent("Could not change that. Try again."));
  if (on) {
    const { data: c } = await supabase.from("clients").select("name").eq("id", clientId).maybeSingle();
    const reason = String(formData.get("reason") ?? "").trim();
    await notifySlack(`Posting paused for ${c?.name ?? "a client"}${reason ? `: ${reason}` : ""}. Do not post until it is resumed.`);
  }
  revalidatePath(`/c/${clientId}`, "layout");
  redirect(`/c/${clientId}`);
}
