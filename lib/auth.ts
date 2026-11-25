import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VIEW_CLIENT_COOKIE, VIEW_COOKIE } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export type Role = "pending" | "staff" | "operator";
// preview is true when a staff member is looking at the operator side.
// The database still treats them as staff; only the screens change.
export type Profile = { id: string; email: string; role: Role; preview?: boolean; previewClient?: string };

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
  const jar = await cookies();
  if (profile.role === "staff" && jar.get(VIEW_COOKIE)?.value === "operator") {
    return { ...(profile as Profile), role: "operator", preview: true, previewClient: jar.get(VIEW_CLIENT_COOKIE)?.value };
  }
  return profile as Profile;
}

export async function requireStaff(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "staff") redirect("/");
  return profile;
}
