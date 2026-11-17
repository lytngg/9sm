import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Sends each person to the right place for their role.
export default async function Home() {
  const profile = await requireProfile();
  if (profile.role === "staff") redirect("/clients");
  if (profile.role === "operator") {
    const supabase = await createClient();
    const { data } = await supabase.from("clients").select("id").order("name").limit(1);
    if (data && data[0]) redirect(`/c/${data[0].id}`);
  }
  redirect("/pending");
}
