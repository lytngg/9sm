import { cookies } from "next/headers";
import { cancelCode, sendCode, signIn, signUp, verifyCode } from "./actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  const codeEmail = (await cookies()).get("login_email")?.value;
  return (
    <main className="narrow">
      <h1>9SM Platform</h1>
      <div className="stripe" aria-hidden="true" style={{ margin: "14px 0 0", maxWidth: 120 }}>
        <i />
        <i />
        <i />
      </div>
      <p className="sub" style={{ marginTop: 18 }}>
        {codeEmail
          ? `We sent a code to ${codeEmail}. It works for 15 minutes.`
          : "Sign in with the email your 9SM contact set up."}
      </p>
      {error ? <div className="msg">{error}</div> : null}
      {notice ? <div className="msg ok">{notice}</div> : null}
      {codeEmail ? (
        <div className="card">
          <form className="f">
            <label>
              Code from the email
              <input name="code" inputMode="numeric" autoComplete="one-time-code" autoFocus required />
            </label>
            <div className="row">
              <button className="btn" formAction={verifyCode}>
                Sign in
              </button>
              <button className="btn ghost" formAction={cancelCode} formNoValidate>
                Use a different email
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="card">
            <form className="f">
              <label>
                Email
                <input type="email" name="email" autoComplete="email" required />
              </label>
              <div className="row">
                <button className="btn" formAction={sendCode}>
                  Email me a sign-in code
                </button>
              </div>
            </form>
          </div>
          <details style={{ marginTop: 18 }}>
            <summary className="mute small">Use a password instead</summary>
            <div className="card" style={{ marginTop: 12 }}>
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
          </details>
        </>
      )}
    </main>
  );
}
