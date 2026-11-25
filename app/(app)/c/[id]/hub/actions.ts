"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MARKETS, OPERATOR_TAGS, pick, str } from "@/lib/workspace";
import { uploadClientFile } from "@/lib/files";
import { EVENT_CATEGORIES } from "@/lib/scope";

const FIELDS = [
  "website",
  "handles",
  "brand_guidelines_url",
  "figma_url",
  "tone_notes",
  "compliance_notes",
  "licence",
  "restricted_markets",
  "current_offers",
  "contact_name",
  "contact_email",
  "approver_name",
  "meeting_slot",
];

function done(clientId: string, error?: string): never {
  revalidatePath(`/c/${clientId}`, "layout");
  revalidatePath("/onboarding");
  redirect(`/c/${clientId}/hub` + (error ? `?error=${encodeURIComponent(error)}` : "?saved=1"));
}

// Used by operators and staff. Only the fields present in the submitted form are changed,
// and the database function ignores anything an operator is not allowed to set.
export async function saveHub(clientId: string, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();
  const payload: Record<string, string> = {};
  for (const f of FIELDS) if (formData.has(f)) payload[f] = str(formData, f);
  if (formData.has("signoff_shown")) payload.design_signed_off = formData.get("design_signed_off") === "on" ? "true" : "false";

  const upload = await uploadClientFile(supabase, clientId, "brand", formData.get("brand_file"), true);
  if (upload.error) done(clientId, upload.error);
  if (upload.path) payload.brand_guidelines_path = upload.path;

  const { error } = await supabase.rpc("save_client_profile", { p_client: clientId, p: payload });
  done(clientId, error ? "That did not save. Try again." : undefined);
}

// Staff-only details: tags, go-live date, access, contract and Slack links.
export async function saveHubStaff(clientId: string, formData: FormData) {
  await requireStaff();
  const supabase = await createClient();
  const tags = pick(formData, "tags", OPERATOR_TAGS);
  const { error: e1 } = await supabase
    .from("clients")
    .update({
      tags,
      markets: pick(formData, "markets", MARKETS),
      type: tags.join(", "),
      event_level: Math.min(3, Math.max(0, Number(str(formData, "event_level") || "1") || 0)),
      event_categories: pick(formData, "event_categories", EVENT_CATEGORIES),
    })
    .eq("id", clientId);
  const { error: e2 } = await supabase.from("client_profile").upsert({
    client_id: clientId,
    go_live_date: str(formData, "go_live_date") || null,
    access_confirmed: formData.get("access_confirmed") === "on",
    contract_url: str(formData, "contract_url") || null,
    slack_url: str(formData, "slack_url") || null,
  });
  done(clientId, e1 || e2 ? "That did not save. Try again." : undefined);
}
