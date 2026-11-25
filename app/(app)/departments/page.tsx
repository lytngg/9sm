import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveDepartment, setDeptRequestStatus } from "./actions";

type Req = { id: string; dept_key: string; message: string; status: string; created_at: string; clients: { name: string } | { name: string }[] | null };
const PILL: Record<string, string> = { New: "pill purple", "Picked up": "pill purple", Done: "pill good" };
const clientName = (v: Req["clients"]) => (Array.isArray(v) ? v[0]?.name : v?.name) ?? "";

export default async function Departments({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff();
  const { error } = await searchParams;
  const supabase = await createClient();
  const [{ data: depts }, { data: reqs }] = await Promise.all([
    supabase.from("departments").select("*").order("position"),
    supabase.from("department_requests").select("id, dept_key, message, status, created_at, clients(name)").order("created_at", { ascending: false }).limit(100),
  ]);
  const requests = (reqs ?? []) as unknown as Req[];
  const nameOf = new Map((depts ?? []).map((d) => [d.key as string, d.name as string]));
  return (
    <>
      <h1>Teams</h1>
      <p className="sub">
        Each team is offered to clients as a plugin. What you write here is what clients read. Add a Slack member ID and
        that person is tagged when a client sends the team a message.
      </p>
      {error ? <div className="msg">{error}</div> : null}

      <h2>Requests from clients</h2>
      <div className="tw" style={{ marginBottom: 36 }}>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Team</th>
              <th>Message</th>
              <th>Sent</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{clientName(r.clients)}</td>
                <td>{nameOf.get(r.dept_key) ?? r.dept_key}</td>
                <td>{r.message}</td>
                <td>{String(r.created_at).slice(0, 10)}</td>
                <td>
                  <span className={PILL[r.status] ?? "pill"}>{r.status}</span>
                </td>
                <td>
                  <div className="row">
                    {["Picked up", "Done"].filter((s) => s !== r.status).map((s) => (
                      <form key={s} action={setDeptRequestStatus.bind(null, r.id, s)}>
                        <button className="btn ghost sm">{s}</button>
                      </form>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="mute">
                  No requests yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="grid">
        {(depts ?? []).map((d) => (
          <div className="card" key={d.key}>
            <h2>{d.name}</h2>
            <form className="f" action={saveDepartment.bind(null, d.key)}>
              <label>
                What clients read about this team
                <textarea name="blurb" defaultValue={d.blurb ?? ""} style={{ minHeight: 70 }} />
              </label>
              <div className="row">
                <label>
                  Contact name
                  <input type="text" name="lead_name" defaultValue={d.lead_name ?? ""} />
                </label>
                <label>
                  Slack member ID
                  <input type="text" name="slack_member_id" defaultValue={d.slack_member_id ?? ""} placeholder="U012AB3CD" />
                </label>
              </div>
              <div>
                <button className="btn">Save</button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
