"use server";

import { cookies } from "next/headers";
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

const CODE_EMAIL = "login_email";

// Passwordless sign-in: emails a one-time code to an existing account.
// The email is kept in a short-lived cookie so it never sits in the URL.
export async function sendCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) fail("Enter your email first.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error && /rate|seconds|limit/i.test(error.message)) fail("A code was sent a moment ago. Wait a minute and try again.");
  (await cookies()).set(CODE_EMAIL, email, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 900, path: "/login" });
  redirect("/login");
}

export async function verifyCode(formData: FormData) {
  const jar = await cookies();
  const email = jar.get(CODE_EMAIL)?.value;
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!email) fail("Ask for a new code.");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email!, token, type: "email" });
  if (error) fail("That code did not work. Check it or ask for a new one.");
  jar.delete({ name: CODE_EMAIL, path: "/login" });
  redirect("/");
}

export async function cancelCode() {
  (await cookies()).delete({ name: CODE_EMAIL, path: "/login" });
  redirect("/login");
}
