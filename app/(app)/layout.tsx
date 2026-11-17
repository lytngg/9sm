import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { NavLink } from "@/components/nav-link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();
  // Staff get every client here. Operators get only their own, by the database rules.
  const { data: clients } = await supabase.from("clients").select("id, name").order("name");
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
        <nav className="side-scroll">
          {isStaff ? (
            <NavLink href="/clients" exact>
              All clients
            </NavLink>
          ) : null}
          <div className="side-label">{isStaff ? "Clients" : "Your workspaces"}</div>
          {(clients ?? []).map((c) => (
            <NavLink key={c.id} href={`/c/${c.id}`}>
              {c.name}
            </NavLink>
          ))}
          {!clients || clients.length === 0 ? <div className="side-label">None yet</div> : null}
        </nav>
        <div className="side-foot">
          <div className="who">
            <b>{profile.email}</b>
            {isStaff ? "9SM staff" : "Operator"}
          </div>
          <form action={signOut}>
            <button className="btn ghost sm">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
