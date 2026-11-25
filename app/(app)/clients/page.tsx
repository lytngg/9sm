import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addClient, addStaff } from "./actions";
import { MARKETS, OPERATOR_TAGS } from "@/lib/workspace";
import { TagPicker, Tags } from "@/components/tags";


export default async function Clients({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff();
  const { error } = await searchParams;
  const supabase = await createClient();
  const [{ data: clients }, { data: staff }, { data: staffInvites }] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("profiles").select("email").eq("role", "staff").order("email"),
    supabase.from("invites").select("email").eq("role", "staff").order("email"),
  ]);
  const joined = new Set((staff ?? []).map((s) => s.email.toLowerCase()));
  const waiting = (staffInvites ?? []).filter((i) => !joined.has(i.email.toLowerCase()));
  return (
    <>
      <h1>Clients</h1>
      <p className="sub">Each client has its own workspace. Operators only ever see their own.</p>
      {error ? <div className="msg">{error}</div> : null}
      <div className="grid">
        <div className="card">
          <h2>Client list</h2>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {(clients ?? []).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/c/${c.id}`}>{c.name}</Link>
                    </td>
                    <td>{c.tags && c.tags.length ? <Tags items={c.tags} /> : c.type}</td>
                  </tr>
                ))}
                {!clients || clients.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="mute">
                      No clients yet. Add the first one.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2>Add a client</h2>
          <form className="f" action={addClient}>
            <label>
              Brand name
              <input type="text" name="name" required />
            </label>
            <div>
              <div className="mute small" style={{ marginBottom: 4 }}>
                What they are. Pick every one that applies.
              </div>
              <TagPicker name="tags" options={OPERATOR_TAGS} />
            </div>
            <div>
              <div className="mute small" style={{ marginBottom: 4 }}>
                Markets, if it matters for talent
              </div>
              <TagPicker name="markets" options={MARKETS} />
            </div>
            <div>
              <button className="btn">Add client</button>
            </div>
          </form>
        </div>
        <div className="card">
          <h2>9SM staff</h2>
          <div className="tw">
            <table>
              <tbody>
                {(staff ?? []).map((s) => (
                  <tr key={s.email}>
                    <td>{s.email}</td>
                    <td>
                      <span className="pill good">Active</span>
                    </td>
                  </tr>
                ))}
                {waiting.map((i) => (
                  <tr key={i.email}>
                    <td>{i.email}</td>
                    <td>
                      <span className="pill">Not signed up yet</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form className="f" action={addStaff} style={{ marginTop: 12 }}>
            <label>
              Staff email
              <input type="email" name="email" required />
            </label>
            <div>
              <button className="btn">Give staff access</button>
            </div>
          </form>
          <p className="mute" style={{ fontSize: 12 }}>
            Staff see every client. They create their own account with this email.
          </p>
        </div>
      </div>
    </>
  );
}
