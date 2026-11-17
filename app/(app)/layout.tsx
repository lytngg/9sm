import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  return (
    <>
      <header className="top">
        <Link href="/" className="brand">
          9SM <span>Platform</span>
        </Link>
        <nav>
          {profile.role === "staff" ? <Link href="/clients">Clients</Link> : null}
          <span>
            {profile.email} · {profile.role === "staff" ? "9SM staff" : "Operator"}
          </span>
          <form action={signOut}>
            <button className="btn ghost sm">Sign out</button>
          </form>
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
