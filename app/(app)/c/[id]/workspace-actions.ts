"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CHANNELS, REQUEST_KINDS, STAGES, str } from "@/lib/workspace";

// Every action re-checks the role here, and the database rules check again.
function back(path: string, error?: string): never {
  revalidatePath(path);
  redirect(error ? `${path}?error=${encodeURIComponent(error)}` : path);
}

export async function addCalendarEntry(clientId: string, formData: FormData) {
  await requireStaff();
  const path = `/c/${clientId}/calendar`;
  const date = str(formData, "date");
  const text = str(formData, "text");
  if (!date || !text) back(path, "Give the entry a date and a description.");
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_entries").insert({
    client_id: clientId,
    date,
    kind: str(formData, "kind") === "note" ? "note" : "event",
    text,
  });
  back(path, error ? "Could not add that entry." : undefined);
}

export async function deleteCalendarEntry(clientId: string, entryId: string) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_entries").delete().eq("id", entryId).eq("client_id", clientId);
  back(`/c/${clientId}/calendar`, error ? "Could not remove that entry." : undefined);
}

export async function addRequest(clientId: string, formData: FormData) {
  await requireProfile();
  const path = `/c/${clientId}/requests`;
  const kind = str(formData, "kind");
  const date = str(formData, "date");
  const details = str(formData, "details");
  if (!REQUEST_KINDS.includes(kind) || !date || !details) back(path, "Fill in the type, date and details.");
  const supabase = await createClient();
  const { error } = await supabase.from("requests").insert({ client_id: clientId, for_date: date, kind, details });
  back(path, error ? "Could not send that request." : undefined);
}

export async function setRequestStatus(clientId: string, requestId: string, status: string) {
  await requireStaff();
  const path = `/c/${clientId}/requests`;
  if (!["New", "Scheduled", "Done"].includes(status)) back(path);
  const supabase = await createClient();
  const { error } = await supabase.from("requests").update({ status }).eq("id", requestId).eq("client_id", clientId);
  back(path, error ? "Could not update that request." : undefined);
}

export async function deleteRequest(clientId: string, requestId: string) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("requests").delete().eq("id", requestId).eq("client_id", clientId);
  back(`/c/${clientId}/requests`, error ? "Could not delete that request." : undefined);
}

export async function addPost(clientId: string, formData: FormData) {
  await requireStaff();
  const path = `/c/${clientId}/posts`;
  const channels = formData.getAll("channels").map(String).filter((c) => CHANNELS.includes(c));
  const body = str(formData, "body");
  const date = str(formData, "date");
  const time = str(formData, "time");
  if (!channels.length) back(path, "Pick at least one channel.");
  if (!body || !date || !time) back(path, "Write the post and set a date and time.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .insert({ client_id: clientId, channels, publish_date: date, publish_time: time, body });
  back(path, error ? "Could not save that post." : undefined);
}

export async function setPostStage(clientId: string, postId: string, status: string) {
  await requireStaff();
  const path = `/c/${clientId}/posts`;
  if (!(STAGES as readonly string[]).includes(status)) back(path);
  const supabase = await createClient();
  const { error } = await supabase.from("posts").update({ status }).eq("id", postId).eq("client_id", clientId);
  back(path, error ? "Could not move that post." : undefined);
}

export async function deletePost(clientId: string, postId: string) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("client_id", clientId);
  back(`/c/${clientId}/posts`, error ? "Could not delete that post." : undefined);
}

// Operators approve a post or send it back with a note.
export async function reviewPost(clientId: string, postId: string, approve: boolean, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_post", {
    p_post: postId,
    p_approve: approve,
    p_feedback: approve ? null : str(formData, "feedback"),
  });
  back(`/c/${clientId}/posts`, error ? "That post is no longer waiting for your review." : undefined);
}
