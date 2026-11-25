"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
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

// Passwordless sign-in: emails a one-time link to an existing account.
// Sent with the plain client so the link works in whichever browser opens it;
// components/link-sign-in.tsx finishes the sign-in when the link lands.
export async function sendLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) fail("Enter your email first.");
  const supabase = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error && /rate|seconds|limit/i.test(error.message)) fail("A link was sent a moment ago. Wait a minute and try again.");
  redirect(`/login?notice=${encodeURIComponent("Check your email and click the sign-in link. It works once, for an hour.")}`);
}
