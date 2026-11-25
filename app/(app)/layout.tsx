import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { SideNav } from "@/components/side-nav";
import { DEMO_OPEN } from "@/lib/demo";
import { setView } from "./view-actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();
  // Staff get every client here. Operators get only their own, by the database rules.
  const [{ data: clients }, { data: depts }] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("departments").select("key, name").order("position"),
  ]);
  const isStaff = profile.role === "staff";
  return (
    <div className="shell">
      <aside className="side">
        <Link href="/" className="wordmark">
          9SM Platform
        </Link>
        <div className="stripe" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <SideNav isStaff={isStaff} clients={clients ?? []} depts={depts ?? []} />
        <div className="side-foot">
          <div className="who">
            <span className="signed">Signed in</span>
            <b>{profile.email}</b>
            {isStaff ? "9SM staff" : profile.preview ? "Operator view" : "Operator"}
          </div>
          {isStaff || profile.preview ? (
            <form action={setView} style={{ marginBottom: 8 }}>
              <input type="hidden" name="view" value={isStaff ? "operator" : "staff"} />
              <button className="btn sm" style={{ width: "100%" }}>
                {isStaff ? "See the operator side" : "Back to the staff side"}
              </button>
            </form>
          ) : null}
          <div className="row">
            {isStaff ? (
              <Link className="btn ghost sm" href="/profile">
                Your profile
              </Link>
            ) : null}
            {DEMO_OPEN ? null : (
              <form action={signOut}>
                <button className="btn ghost sm">Sign out</button>
              </form>
            )}
          </div>
        </div>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
