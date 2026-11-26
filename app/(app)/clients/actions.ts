"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { startOnboarding } from "@/lib/onboarding-start";
import { createClient } from "@/lib/supabase/server";
import { MARKETS, OPERATOR_TAGS, pick } from "@/lib/workspace";

export async function addClient(formData: FormData) {
  const me = await requireStaff();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/clients?error=" + encodeURIComponent("Give the client a name."));
  const supabase = await createClient();
  const { data: made, error } = await supabase
    .from("clients")
    .insert({
      name,
      tags: pick(formData, "tags", OPERATOR_TAGS),
      markets: pick(formData, "markets", MARKETS),
      type: pick(formData, "tags", OPERATOR_TAGS).join(", "),
    })
    .select("id")
    .single();
  if (error) {
    const message = error.code === "23505" ? "That client is already on the list." : "Could not add the client.";
    redirect("/clients?error=" + encodeURIComponent(message));
  }
  // Every new client starts with the team onboarding checklist.
  if (made) await startOnboarding(supabase, made.id, name, me.id);
  revalidatePath("/clients");
  redirect(made ? `/c/${made.id}/hub` : "/clients");
}

export async function addStaff(formData: FormData) {
  await requireStaff();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/clients");
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_user", { p_email: email, p_role: "staff" });
  if (error) redirect("/clients?error=" + encodeURIComponent("Could not add that staff member."));
  revalidatePath("/clients");
  redirect("/clients");
}
