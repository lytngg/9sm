export type ClientProfile = {
  website: string | null;
  handles: string | null;
  brand_guidelines_url: string | null;
  brand_guidelines_path: string | null;
  figma_url: string | null;
  tone_notes: string | null;
  compliance_notes: string | null;
  licence: string | null;
  restricted_markets: string | null;
  current_offers: string | null;
  contact_name: string | null;
  contact_email: string | null;
  approver_name: string | null;
  meeting_slot: string | null;
  design_signed_off: boolean;
  go_live_date: string | null;
  access_confirmed: boolean;
  contract_url: string | null;
  slack_url: string | null;
};

// Whose move a step is: the client's, 9SM's, or nobody's because it is done.
export type StepState = "done" | "client" | "9sm";
export type Step = { key: string; label: string; state: StepState; hint: string };

// Steps are worked out from what has been filled in, so nobody ticks boxes by hand.
export function onboardingSteps(p: ClientProfile | null): Step[] {
  const has = (v: string | null | undefined) => Boolean(v && v.trim());
  const brand = has(p?.brand_guidelines_url) || has(p?.brand_guidelines_path) || has(p?.figma_url);
  const handles = has(p?.handles);
  const s = (ok: boolean): StepState => (ok ? "done" : "client");
  return [
    { key: "brand", label: "Brand", state: s(brand), hint: "Guidelines, logos or a Figma link" },
    {
      key: "accounts",
      label: "Accounts",
      state: !handles ? "client" : p?.access_confirmed ? "done" : "9sm",
      hint: "Your handles, then 9SM confirms access",
    },
    { key: "product", label: "Product", state: s(has(p?.website)), hint: "Your site, licence and what cannot be said" },
    { key: "people", label: "People", state: s(has(p?.contact_name) && has(p?.approver_name)), hint: "Main contact and who approves posts" },
    { key: "meetings", label: "Meetings", state: s(has(p?.meeting_slot)), hint: "A weekly slot that suits you" },
    { key: "signoff", label: "Sign-off", state: s(Boolean(p?.design_signed_off)), hint: "Approve the first designs" },
  ];
}

export const doneCount = (steps: Step[]) => steps.filter((s) => s.state === "done").length;
