"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";

// Finishes an emailed sign-in link. The link lands with the session in the
// address after the #, which only the browser can read, so this stores it in
// the same cookies the server uses and then loads the app.
export function LinkSignIn() {
  const [state, setState] = useState<"idle" | "working" | "failed">("idle");
  useEffect(() => {
    // The address is only readable in the browser, so state has to be set here.
    /* eslint-disable react-hooks/set-state-in-effect */
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    const failed = hash.get("error_description");
    if (!access_token || !refresh_token) {
      if (failed) {
        history.replaceState(null, "", window.location.pathname);
        setState("failed");
      }
      return;
    }
    setState("working");
    history.replaceState(null, "", window.location.pathname);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { detectSessionInUrl: false, autoRefreshToken: false } },
    );
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) setState("failed");
      else window.location.replace("/");
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  if (state === "working") return <div className="msg ok">Signing you in.</div>;
  if (state === "failed") return <div className="msg">That link has expired or was already used. Ask for a new one.</div>;
  return null;
}
