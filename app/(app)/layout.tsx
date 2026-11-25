import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { SideNav } from "@/components/side-nav";
import { ViewSwitch } from "@/components/view-switch";
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
  // Looking at the operator side as staff: show the one brand, as that client would see it.
  const shown = (clients ?? []).filter((c) => !profile.previewClient || c.id === profile.previewClient);
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
        <SideNav isStaff={isStaff} clients={shown} depts={depts ?? []} />
        <div className="side-foot">
          <div className="who">
            <span className="signed">Signed in</span>
            <b>{profile.email}</b>
            {isStaff ? "9SM staff" : profile.preview ? "Operator view" : "Operator"}
          </div>
          {isStaff || profile.preview ? (
            <ViewSwitch action={setView} toOperator={isStaff} />
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
