"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const fail = (message: string) => redirect(`/login?error=${encodeURIComponent(message)}`);

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) fail("That email and password did not match.");
  redirect("/");
}

export async function signUp(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 10) fail("Use a password of at least 10 characters.");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? "").trim(),
    password,
  });
  if (error) fail("Could not create that account. If you already have one, sign in.");
  if (!data.session) redirect(`/login?notice=${encodeURIComponent("Check your email to confirm the account, then sign in.")}`);
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
