"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VIEW_CLIENT_COOKIE, VIEW_COOKIE } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

// Switches a staff member between the staff side and the operator side.
// Only the real role in the database counts, so an operator gains nothing by
// setting this cookie themselves.
export async function setView(formData: FormData) {
  const jar = await cookies();
  if (formData.get("view") === "operator") {
    const supabase = await createClient();
    const { data } = await supabase.from("clients").select("id").order("name");
    if (!data || !data[0]) redirect(`/clients?error=${encodeURIComponent("Add a client first, then you can view its operator side.")}`);
    // The client that is open, or failing that the one with the most going on.
    let target = String(formData.get("client") ?? "");
    if (!data!.some((c) => c.id === target)) {
      const { data: posts } = await supabase.from("posts").select("client_id").limit(2000);
      const counts = new Map<string, number>();
      (posts ?? []).forEach((p) => counts.set(p.client_id, (counts.get(p.client_id) ?? 0) + 1));
      target = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? data![0].id;
    }
    const opts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
    jar.set(VIEW_COOKIE, "operator", opts);
    jar.set(VIEW_CLIENT_COOKIE, target, opts);
    redirect(`/c/${target}`);
  }
  const back = jar.get(VIEW_CLIENT_COOKIE)?.value;
  jar.delete(VIEW_COOKIE);
  jar.delete(VIEW_CLIENT_COOKIE);
  redirect(back ? `/c/${back}` : "/clients");
}
