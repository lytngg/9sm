"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/workspace";
import { notifySlack } from "@/lib/slack";

function back(clientId: string, error?: string, ok?: string): never {
  const path = `/c/${clientId}/plugins`;
  revalidatePath(path);
  revalidatePath("/departments");
  redirect(error ? `${path}?error=${encodeURIComponent(error)}` : ok ? `${path}?sent=${encodeURIComponent(ok)}` : path);
}

// A client, or staff on their behalf, sends a department a message.
export async function askDepartment(clientId: string, deptKey: string, formData: FormData) {
  await requireProfile();
  const message = str(formData, "message");
  if (!message) back(clientId, "Write a line on what you need.");
  const supabase = await createClient();
  const [{ data: dept }, { data: client }] = await Promise.all([
    supabase.from("departments").select("name, lead_name, slack_member_id").eq("key", deptKey).maybeSingle(),
    supabase.from("clients").select("name").eq("id", clientId).maybeSingle(),
  ]);
  if (!dept || !client) back(clientId, "That team could not be found.");
  const { error } = await supabase.from("department_requests").insert({ client_id: clientId, dept_key: deptKey, message });
  if (error) back(clientId, "That did not send. Try again.");
  await notifySlack(`${client!.name} has a request for ${dept!.name}: ${message}`, dept!.slack_member_id);
  back(clientId, undefined, dept!.name);
}

export async function setPlugin(clientId: string, deptKey: string, on: boolean) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("client_plugins").upsert({ client_id: clientId, dept_key: deptKey })
    : await supabase.from("client_plugins").delete().eq("client_id", clientId).eq("dept_key", deptKey);
  back(clientId, error ? "Could not update that plugin." : undefined);
}
