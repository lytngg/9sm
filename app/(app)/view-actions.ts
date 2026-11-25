"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VIEW_COOKIE } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

// Switches a staff member between the staff side and the operator side.
// Only the real role in the database counts, so an operator gains nothing by
// setting this cookie themselves.
export async function setView(formData: FormData) {
  const jar = await cookies();
  if (formData.get("view") === "operator") {
    const supabase = await createClient();
    const { data } = await supabase.from("clients").select("id").order("name").limit(1);
    if (!data || !data[0]) redirect(`/clients?error=${encodeURIComponent("Add a client first, then you can view its operator side.")}`);
    jar.set(VIEW_COOKIE, "operator", { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    const target = String(formData.get("client") ?? "") || data![0].id;
    redirect(`/c/${target}`);
  }
  jar.delete(VIEW_COOKIE);
  redirect("/clients");
}
