import { signIn, signUp } from "./actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  return (
    <main className="narrow">
      <h1>
        9SM <span style={{ color: "var(--purple)" }}>Platform</span>
      </h1>
      <p className="sub">Sign in with the email your account manager set up.</p>
      {error ? <div className="msg">{error}</div> : null}
      {notice ? <div className="msg ok">{notice}</div> : null}
      <div className="card">
        <form className="f">
          <label>
            Email
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <div className="row">
            <button className="btn" formAction={signIn}>
              Sign in
            </button>
            <button className="btn ghost" formAction={signUp}>
              Create account
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
