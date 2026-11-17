"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
