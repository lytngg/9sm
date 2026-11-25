"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BRIEF_STAGES, str, TASK_TEAMS, teamName } from "@/lib/workspace";
import { uploadClientFile } from "@/lib/files";
import { notifySlack } from "@/lib/slack";

type DB = Awaited<ReturnType<typeof createClient>>;

function back(path: string, error?: string): never {
  revalidatePath("/briefs");
  redirect(error ? `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}` : path);
}
const link = (v: string) => (v && /^https:\/\//.test(v) ? v : null);

// Tells someone inside the tool. Never tells a person about their own action.
async function notify(supabase: DB, me: string, userId: string | null | undefined, body: string, taskId: string) {
  if (!userId || userId === me) return;
  await supabase.from("notifications").insert({ user_id: userId, body, link: `/briefs/${taskId}` });
}

// "@Callum" or "@Callum James" in a note reaches that person's inbox.
async function mentions(supabase: DB, me: string, text: string, title: string, taskId: string) {
  if (!text.includes("@")) return;
  const { data: staff } = await supabase.from("profiles").select("id, full_name").eq("role", "staff").not("full_name", "is", null);
  const lower = text.toLowerCase();
  for (const s of staff ?? []) {
    const full = String(s.full_name).toLowerCase();
    const first = full.split(" ")[0];
    if (lower.includes(`@${full}`) || new RegExp(`@${first.replace(/[^a-z0-9]/g, "")}\\b`).test(lower)) {
      await notify(supabase, me, s.id, `You were mentioned on "${title}"`, taskId);
    }
  }
}

function customFields(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("cf_") && typeof value === "string" && value.trim()) out[key.slice(3)] = value.trim().slice(0, 300);
  }
  return out;
}

export async function createBrief(formData: FormData) {
  const me = await requireStaff();
  const clientId = str(formData, "client") || null;
  const team = str(formData, "team");
  const title = str(formData, "title");
  if (!TASK_TEAMS.some((t) => t.key === team) || !title) back("/briefs", "Pick the team and give the task a title.");
  const supabase = await createClient();
  const upload = await uploadClientFile(supabase, clientId ?? "internal", "briefs", formData.get("file"), true);
  if (upload.error) back("/briefs", upload.error);
  const assignee = str(formData, "assignee") || null;
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
      assignee,
      status: assignee ? "In progress" : "Requested",
    })
    .select("id")
    .single();
  if (error || !data) back("/briefs", "That task did not save. Try again.");
  const id = data!.id as string;
  const templateId = str(formData, "template");
  if (templateId) {
    const { data: tpl } = await supabase.from("task_templates").select("items").eq("id", templateId).maybeSingle();
    const items = ((tpl?.items ?? []) as string[]).map((text, position) => ({ brief_id: id, text, position }));
    if (items.length) await supabase.from("brief_items").insert(items);
  }
  await notify(supabase, me.id, assignee, `You were given "${title}"`, id);
  const { data: dept } = await supabase.from("departments").select("slack_member_id").eq("key", team).maybeSingle();
  await notifySlack(`New ${teamName(team)} task: ${title}`, dept?.slack_member_id);
  back(`/briefs/${id}`);
}

// Every move a task makes is written into its thread, so the history is in one place.
async function move(id: string, patch: Record<string, unknown>, event: string, kind: "event" | "changes" = "event", stay = false) {
  const supabase = await createClient();
  const { error } = await supabase.from("briefs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) back(`/briefs/${id}`, "Could not update that task.");
  await supabase.from("brief_notes").insert({ brief_id: id, body: event, kind });
  if (stay) {
    revalidatePath("/briefs");
    return supabase;
  }
  back(`/briefs/${id}`);
}

export async function takeBrief(id: string) {
  const me = await requireStaff();
  await move(id, { assignee: me.id, status: "In progress" }, "Picked this up.");
}

// Dragging a card on the board.
export async function setTaskStatus(id: string, status: string) {
  await requireStaff();
  if (!(BRIEF_STAGES as readonly string[]).includes(status)) return;
  await move(id, { status }, `Moved to ${status}.`, "event", true);
}

export async function saveTask(id: string, formData: FormData) {
  const me = await requireStaff();
  const title = str(formData, "title");
  const team = str(formData, "team");
  const status = str(formData, "status");
  if (!title || !TASK_TEAMS.some((t) => t.key === team) || !(BRIEF_STAGES as readonly string[]).includes(status)) {
    back(`/briefs/${id}`, "A task needs a title, a team and a status.");
  }
  const supabase = await createClient();
  const { data: before } = await supabase.from("briefs").select("assignee, status").eq("id", id).maybeSingle();
  const assignee = str(formData, "assignee") || null;
  const { error } = await supabase
    .from("briefs")
    .update({
      title,
      team,
      status,
      assignee,
      client_id: str(formData, "client") || null,
      due: str(formData, "due") || null,
      format: str(formData, "format") || null,
      urgent: formData.get("urgent") === "on",
      details: str(formData, "details") || null,
      reference_url: link(str(formData, "reference")),
      fields: customFields(formData),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) back(`/briefs/${id}`, "Could not save that.");
  if (before && before.assignee !== assignee) await notify(supabase, me.id, assignee, `You were given "${title}"`, id);
  if (before && before.status !== status) await supabase.from("brief_notes").insert({ brief_id: id, body: `Moved to ${status}.`, kind: "event" });
  back(`/briefs/${id}`);
}

export async function sendForReview(id: string, formData: FormData) {
  const me = await requireStaff();
  const supabase = await createClient();
  const { data: brief } = await supabase.from("briefs").select("client_id, title, requested_by").eq("id", id).maybeSingle();
  if (!brief) back("/briefs", "That task could not be found.");
  const url = link(str(formData, "delivery_url"));
  const upload = await uploadClientFile(supabase, brief!.client_id ?? "internal", "briefs", formData.get("file"), true);
  if (upload.error) back(`/briefs/${id}`, upload.error);
  if (!url && !upload.path) back(`/briefs/${id}`, "Add a link to the work or upload the file.");
  const patch: Record<string, unknown> = { status: "In review" };
  if (url) patch.delivery_url = url;
  if (upload.path) patch.delivery_path = upload.path;
  await notify(supabase, me.id, brief!.requested_by, `"${brief!.title}" is ready for you to review`, id);
  await move(id, patch, "Sent for review.");
}

export async function approveBrief(id: string) {
  const me = await requireStaff();
  const supabase = await createClient();
  const { data: brief } = await supabase.from("briefs").select("title, assignee").eq("id", id).maybeSingle();
  await notify(supabase, me.id, brief?.assignee, `"${brief?.title}" was approved`, id);
  await move(id, { status: "Delivered" }, "Approved. Delivered.");
}

export async function askForChanges(id: string, formData: FormData) {
  const me = await requireStaff();
  const note = str(formData, "note");
  if (!note) back(`/briefs/${id}`, "Say what should change.");
  const supabase = await createClient();
  const { data: brief } = await supabase.from("briefs").select("title, assignee").eq("id", id).maybeSingle();
  await notify(supabase, me.id, brief?.assignee, `Changes asked on "${brief?.title}"`, id);
  await move(id, { status: "In progress" }, note, "changes");
}

export async function reopenBrief(id: string) {
  await requireStaff();
  await move(id, { status: "In progress" }, "Reopened.");
}

export async function addNote(id: string, formData: FormData) {
  const me = await requireStaff();
  const body = str(formData, "body");
  if (!body) back(`/briefs/${id}`);
  const supabase = await createClient();
  const { error } = await supabase.from("brief_notes").insert({ brief_id: id, body });
  if (!error) {
    const { data: brief } = await supabase.from("briefs").select("title").eq("id", id).maybeSingle();
    await mentions(supabase, me.id, body, brief?.title ?? "a task", id);
  }
  back(`/briefs/${id}`, error ? "That note did not save." : undefined);
}

export async function deleteTask(id: string) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("briefs").delete().eq("id", id);
  back(error ? `/briefs/${id}` : "/briefs", error ? "Could not delete that task." : undefined);
}

// ---------- checklist ----------
export async function addItem(id: string, formData: FormData) {
  await requireStaff();
  const text = str(formData, "text");
  if (!text) back(`/briefs/${id}`);
  const supabase = await createClient();
  const { count } = await supabase.from("brief_items").select("id", { count: "exact", head: true }).eq("brief_id", id);
  await supabase.from("brief_items").insert({ brief_id: id, text, position: count ?? 0 });
  back(`/briefs/${id}`);
}
export async function toggleItem(id: string, itemId: string, done: boolean) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("brief_items").update({ done }).eq("id", itemId).eq("brief_id", id);
  back(`/briefs/${id}`);
}
export async function removeItem(id: string, itemId: string) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("brief_items").delete().eq("id", itemId).eq("brief_id", id);
  back(`/briefs/${id}`);
}

// ---------- custom fields ----------
export async function addField(formData: FormData) {
  await requireStaff();
  const name = str(formData, "name");
  const kind = str(formData, "kind");
  if (!name || !["text", "select", "date", "number", "link"].includes(kind)) back("/briefs?v=table", "Give the field a name and a type.");
  const options = str(formData, "options").split(",").map((o) => o.trim()).filter(Boolean).slice(0, 30);
  if (kind === "select" && options.length === 0) back("/briefs?v=table", "List the choices, separated by commas.");
  const supabase = await createClient();
  const { error } = await supabase.from("task_fields").insert({ name, kind, options, position: 99 });
  back("/briefs?v=table", error ? "There is already a field with that name." : undefined);
}
export async function removeField(fieldId: string) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("task_fields").delete().eq("id", fieldId);
  back("/briefs?v=table");
}

// ---------- inbox ----------
export async function markAllRead() {
  const me = await requireStaff();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", me.id).is("read_at", null);
  revalidatePath("/inbox");
  redirect("/inbox");
}
