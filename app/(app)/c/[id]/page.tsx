import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { inviteOperator, removeOperator } from "./actions";

export default async function Workspace({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireProfile();
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  // The database rules return nothing if this person may not see this client.
  const { data: client } = await supabase.from("clients").select("id, name, type, smm").eq("id", id).maybeSingle();
  if (!client) notFound();
  const isStaff = profile.role === "staff";

  let access: { email: string; joined: boolean }[] = [];
  if (isStaff) {
    const [{ data: invites }, { data: members }] = await Promise.all([
      supabase.from("invites").select("email").eq("client_id", id).order("email"),
      supabase.from("client_members").select("profiles(email)").eq("client_id", id),
    ]);
    const joined = new Set(
      (members ?? []).flatMap((m) => {
        const p = m.profiles as unknown as { email: string } | { email: string }[] | null;
        return (Array.isArray(p) ? p : p ? [p] : []).map((x) => x.email.toLowerCase());
      }),
    );
    access = (invites ?? []).map((i) => ({ email: i.email, joined: joined.has(i.email.toLowerCase()) }));
  }

  return (
    <>
      <h1>{client.name}</h1>
      <p className="sub">
        {client.type}
        {client.smm ? ` · SMM: ${client.smm}` : ""}
      </p>
      {error ? <div className="msg">{error}</div> : null}
      <div className="grid">
        <div className="card">
          <h2>Workspace</h2>
          <p className="mute">
            The calendar, requests, approvals and talent for this client are the next stage of the build and will
            appear here.
          </p>
        </div>
        {isStaff ? (
          <div className="card">
            <h2>Operator access</h2>
            <div className="tw">
              <table>
                <tbody>
                  {access.map((a) => (
                    <tr key={a.email}>
                      <td>{a.email}</td>
                      <td>
                        <span className={a.joined ? "pill good" : "pill"}>{a.joined ? "Active" : "Not signed up yet"}</span>
                      </td>
                      <td>
                        <form action={removeOperator.bind(null, client.id, a.email)}>
                          <button className="btn ghost sm">Remove</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                  {access.length === 0 ? (
                    <tr>
                      <td className="mute">Nobody at this operator has access yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <form className="f" action={inviteOperator.bind(null, client.id)} style={{ marginTop: 12 }}>
              <label>
                Operator email
                <input type="email" name="email" required />
              </label>
              <div>
                <button className="btn">Give access</button>
              </div>
            </form>
            <p className="mute" style={{ fontSize: 12 }}>
              They create their own account with this email and land in this workspace only.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
