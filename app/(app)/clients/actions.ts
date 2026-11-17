"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addClient(formData: FormData) {
  await requireStaff();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/clients?error=" + encodeURIComponent("Give the client a name."));
  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert({
    name,
    type: String(formData.get("type") ?? ""),
    smm: String(formData.get("smm") ?? "").trim(),
  });
  if (error) {
    const message = error.code === "23505" ? "That client is already on the list." : "Could not add the client.";
    redirect("/clients?error=" + encodeURIComponent(message));
  }
  revalidatePath("/clients");
  redirect("/clients");
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
