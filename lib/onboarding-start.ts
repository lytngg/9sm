import type { createClient } from "@/lib/supabase/server";
import { ONBOARDING_STEPS } from "@/lib/onboarding-steps";

type DB = Awaited<ReturnType<typeof createClient>>;

// Creates the team checklist for a client, once. Steps owned by a named person
// are assigned to them and they are told in their inbox. Steps owned by a role
// ("Operations", "Allocated SMM") stay open for someone to pick.
export async function startOnboarding(supabase: DB, clientId: string, clientName: string, meId: string) {
  const { count } = await supabase.from("onboarding_items").select("id", { count: "exact", head: true }).eq("client_id", clientId);
  if ((count ?? 0) > 0) return;
  const { data: staff } = await supabase.from("profiles").select("id, full_name").eq("role", "staff").not("full_name", "is", null);
  const byName = new Map((staff ?? []).map((p) => [String(p.full_name).toLowerCase(), p.id as string]));
  const rows = ONBOARDING_STEPS.map((s, position) => ({
    client_id: clientId,
    task: s.task,
    phase: s.phase,
    owner_label: s.owner,
    assignee: byName.get(s.owner.toLowerCase()) ?? null,
    position,
  }));
  const { error } = await supabase.from("onboarding_items").insert(rows);
  if (error) return;
  const perPerson = new Map<string, number>();
  rows.forEach((r) => r.assignee && perPerson.set(r.assignee, (perPerson.get(r.assignee) ?? 0) + 1));
  const notes = [...perPerson.entries()]
    .filter(([id]) => id !== meId)
    .map(([user_id, n]) => ({ user_id, body: `${clientName} is being onboarded. You have ${n} ${n === 1 ? "step" : "steps"}.`, link: `/c/${clientId}/hub#team` }));
  if (notes.length) await supabase.from("notifications").insert(notes);
}
