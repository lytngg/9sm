"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/workspace";
import { notifySlack } from "@/lib/slack";

function back(clientId: string, error?: string, ok?: string, deptKey?: string): never {
  const path = deptKey ? `/c/${clientId}/plugins/${deptKey}` : `/c/${clientId}/plugins`;
  revalidatePath(`/c/${clientId}/plugins`);
  revalidatePath(path);
  revalidatePath("/departments");
  redirect(error ? `${path}?error=${encodeURIComponent(error)}` : ok ? `${path}?sent=${encodeURIComponent(ok)}` : path);
}

// A client, or staff on their behalf, sends a department a message.
export async function askDepartment(clientId: string, deptKey: string, formData: FormData) {
  await requireProfile();
  // The department pages send a fuller brief. It is stored as one message so
  // the team reads the same thing in the queue and in Slack.
  const from = formData.get("from") === "page" ? deptKey : undefined;
  const parts = [
    str(formData, "message"),
    str(formData, "format") ? `Format: ${str(formData, "format")}` : "",
    str(formData, "due") ? `Needed by: ${str(formData, "due")}` : "",
    str(formData, "reference") ? `Reference: ${str(formData, "reference")}` : "",
  ].filter(Boolean);
  const message = parts.join("\n");
  if (!str(formData, "message")) back(clientId, "Write a line on what you need.", undefined, from);
  const supabase = await createClient();
  const [{ data: dept }, { data: client }] = await Promise.all([
    supabase.from("departments").select("name, lead_name, slack_member_id").eq("key", deptKey).maybeSingle(),
    supabase.from("clients").select("name").eq("id", clientId).maybeSingle(),
  ]);
  if (!dept || !client) back(clientId, "That team could not be found.", undefined, from);
  const { error } = await supabase.from("department_requests").insert({ client_id: clientId, dept_key: deptKey, message });
  if (error) back(clientId, "That did not send. Try again.", undefined, from);
  await notifySlack(`${client!.name} has a request for ${dept!.name}: ${message}`, dept!.slack_member_id);
  back(clientId, undefined, dept!.name, from);
}

export async function setPlugin(clientId: string, deptKey: string, on: boolean) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("client_plugins").upsert({ client_id: clientId, dept_key: deptKey })
    : await supabase.from("client_plugins").delete().eq("client_id", clientId).eq("dept_key", deptKey);
  back(clientId, error ? "Could not update that plugin." : undefined);
}

// Staff move a request along from the department page.
export async function setRequestStatus(clientId: string, deptKey: string, requestId: string, status: string) {
  await requireStaff();
  if (!["New", "Picked up", "Done"].includes(status)) back(clientId, "Unknown status.", undefined, deptKey);
  const supabase = await createClient();
  const { error } = await supabase.from("department_requests").update({ status }).eq("id", requestId).eq("client_id", clientId);
  back(clientId, error ? "Could not update that request." : undefined, undefined, deptKey);
}
