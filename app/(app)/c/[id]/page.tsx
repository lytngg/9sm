import Link from "next/link";
import { loadWorkspace } from "@/lib/workspace";
import { inviteOperator, removeOperator } from "./actions";

export default async function Workspace({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, client, isStaff } = await loadWorkspace(id);
  const [{ count: waiting }, { count: newRequests }] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("client_id", id).eq("status", "Client review"),
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("client_id", id).eq("status", "New"),
  ]);

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
      {error ? <div className="msg">{error}</div> : null}
      <div className="stats">
        <Link className="stat k" href={`/c/${id}/posts`}>
          <b>{waiting ?? 0}</b>
          <span>Posts waiting on the client</span>
        </Link>
        <Link className="stat p" href={`/c/${id}/requests`}>
          <b>{newRequests ?? 0}</b>
          <span>New requests for 9SM</span>
        </Link>
      </div>
      <div className="grid">
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
