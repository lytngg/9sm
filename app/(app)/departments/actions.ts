"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/workspace";

function back(error?: string): never {
  revalidatePath("/departments");
  redirect(error ? `/departments?error=${encodeURIComponent(error)}` : "/departments");
}

export async function saveDepartment(key: string, formData: FormData) {
  await requireStaff();
  const slack = str(formData, "slack_member_id");
  if (slack && !/^[UW][A-Z0-9]+$/.test(slack)) back("A Slack member ID looks like U012AB3CD. Find it on the person's Slack profile under More.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ blurb: str(formData, "blurb") || null, lead_name: str(formData, "lead_name") || null, slack_member_id: slack || null })
    .eq("key", key);
  back(error ? "Could not save that team." : undefined);
}

export async function setDeptRequestStatus(requestId: string, status: string) {
  await requireStaff();
  if (!["New", "Picked up", "Done"].includes(status)) back();
  const supabase = await createClient();
  const { error } = await supabase.from("department_requests").update({ status }).eq("id", requestId);
  revalidatePath("/c", "layout");
  back(error ? "Could not update that request." : undefined);
}
