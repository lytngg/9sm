import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "pending" | "staff" | "operator";
export type Profile = { id: string; email: string; role: Role };

// The signed-in user's profile, or a redirect to /login.
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) redirect("/pending");
  return profile as Profile;
}

export async function requireStaff(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "staff") redirect("/");
  return profile;
}
