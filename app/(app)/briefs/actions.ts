"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/workspace";
import { uploadClientFile } from "@/lib/files";
import { notifySlack } from "@/lib/slack";

function back(path: string, error?: string): never {
  revalidatePath("/briefs");
  redirect(error ? `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}` : path);
}
const link = (v: string) => (v && /^https:\/\//.test(v) ? v : null);

export async function createBrief(formData: FormData) {
  await requireStaff();
  const clientId = str(formData, "client");
  const team = str(formData, "team");
  const title = str(formData, "title");
  if (!clientId || !team || !title) back("/briefs", "Pick the client and the team, and give it a title.");
  const supabase = await createClient();
  const upload = await uploadClientFile(supabase, clientId, "briefs", formData.get("file"), true);
  if (upload.error) back("/briefs", upload.error);
  const { data, error } = await supabase
    .from("briefs")
    .insert({
      client_id: clientId,
      team,
      title,
      details: str(formData, "details") || null,
      format: str(formData, "format") || null,
      due: str(formData, "due") || null,
      urgent: formData.get("urgent") === "on",
      reference_url: link(str(formData, "reference")),
      attachment_path: upload.path,
    })
    .select("id, clients(name), departments(name, slack_member_id)")
    .single();
  if (error || !data) back("/briefs", "That brief did not save. Try again.");
  const dept = data!.departments as unknown as { name: string; slack_member_id: string | null } | null;
  const client = data!.clients as unknown as { name: string } | null;
  await notifySlack(`New ${dept?.name ?? team} brief for ${client?.name ?? "a client"}: ${title}`, dept?.slack_member_id);
  back(`/briefs/${data!.id}`);
}

// Every move a brief makes is written into its thread, so the history is in one place.
async function move(id: string, patch: Record<string, unknown>, event: string, kind: "event" | "changes" = "event") {
  const supabase = await createClient();
  const { error } = await supabase.from("briefs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) back(`/briefs/${id}`, "Could not update that brief.");
  await supabase.from("brief_notes").insert({ brief_id: id, body: event, kind });
  back(`/briefs/${id}`);
}

export async function takeBrief(id: string) {
  const me = await requireStaff();
  await move(id, { assignee: me.id, status: "In progress" }, "Picked this up.");
}

export async function sendForReview(id: string, formData: FormData) {
  await requireStaff();
  const supabase = await createClient();
  const { data: brief } = await supabase.from("briefs").select("client_id").eq("id", id).maybeSingle();
  if (!brief) back("/briefs", "That brief could not be found.");
  const url = link(str(formData, "delivery_url"));
  const upload = await uploadClientFile(supabase, brief!.client_id, "briefs", formData.get("file"), true);
  if (upload.error) back(`/briefs/${id}`, upload.error);
  if (!url && !upload.path) back(`/briefs/${id}`, "Add a link to the work or upload the file.");
  const patch: Record<string, unknown> = { status: "In review" };
  if (url) patch.delivery_url = url;
  if (upload.path) patch.delivery_path = upload.path;
  await move(id, patch, "Sent for review.");
}

export async function approveBrief(id: string) {
  await requireStaff();
  await move(id, { status: "Delivered" }, "Approved. Delivered.");
}

export async function askForChanges(id: string, formData: FormData) {
  await requireStaff();
  const note = str(formData, "note");
  if (!note) back(`/briefs/${id}`, "Say what should change.");
  await move(id, { status: "In progress" }, note, "changes");
}

export async function reopenBrief(id: string) {
  await requireStaff();
  await move(id, { status: "In progress" }, "Reopened.");
}

export async function addNote(id: string, formData: FormData) {
  await requireStaff();
  const body = str(formData, "body");
  if (!body) back(`/briefs/${id}`);
  const supabase = await createClient();
  const { error } = await supabase.from("brief_notes").insert({ brief_id: id, body });
  back(`/briefs/${id}`, error ? "That note did not save." : undefined);
}
