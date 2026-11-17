import { signOut } from "@/app/login/actions";

export default function Pending() {
  return (
    <main className="narrow">
      <h1>No access yet</h1>
      <p className="sub">
        Your account exists but has not been given access to a workspace. Ask your 9SM contact to
        add this email, then sign in again.
      </p>
      <form action={signOut}>
        <button className="btn ghost">Sign out</button>
      </form>
    </main>
  );
}
