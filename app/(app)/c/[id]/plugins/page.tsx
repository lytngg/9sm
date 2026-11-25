import Link from "next/link";
import { loadWorkspace } from "@/lib/workspace";
import { askDepartment, setPlugin } from "./actions";

type Dept = { key: string; name: string; blurb: string | null; lead_name: string | null };
const PILL: Record<string, string> = { New: "pill purple", "Picked up": "pill purple", Done: "pill good" };

export default async function Plugins({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { id } = await params;
  const { error, sent } = await searchParams;
  const { supabase, isStaff } = await loadWorkspace(id);
  const [{ data: depts }, { data: have }, { data: requests }] = await Promise.all([
    supabase.from("departments").select("key, name, blurb, lead_name").order("position"),
    supabase.from("client_plugins").select("dept_key").eq("client_id", id),
    supabase.from("department_requests").select("id, dept_key, message, status, created_at").eq("client_id", id).order("created_at", { ascending: false }),
  ]);
  const active = new Set((have ?? []).map((h) => h.dept_key));
  const list = (depts ?? []) as Dept[];
  const nameOf = new Map(list.map((d) => [d.key, d.name]));
  return (
    <>
      {error ? <div className="msg">{error}</div> : null}
      {sent ? <div className="msg ok">Sent to the {sent} team. They will pick it up in Slack.</div> : null}
      <p className="sub" style={{ marginTop: 0 }}>
        {isStaff
          ? "The 9SM teams this client can use. Tick the ones they already have."
          : "Everything else 9SM can do for you. Send any team a message and they will pick it up in Slack."}
      </p>
      <div className="people">
        {list.map((d) => (
          <div key={d.key} className="person" style={{ display: "block" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <b className="person-name">{d.name}</b>
              <span className={active.has(d.key) ? "pill good" : "pill"}>{active.has(d.key) ? "Part of your plan" : "Available"}</span>
            </div>
            {d.blurb ? <p className="post-body" style={{ margin: "6px 0" }}>{d.blurb}</p> : null}
            {d.lead_name ? <div className="mute small">Your contact is {d.lead_name}</div> : null}
            {d.key === "talent" ? (
              <p className="small" style={{ margin: "8px 0 0" }}>
                <Link href={`/c/${id}/talent`}>See talent picked for you</Link>
              </p>
            ) : null}
            <form className="row" action={askDepartment.bind(null, id, d.key)} style={{ marginTop: 10 }}>
              <input type="text" name="message" placeholder={`What do you need from ${d.name}?`} style={{ flex: 1, minWidth: 200 }} required />
              <button className="btn sm">Send</button>
            </form>
            {isStaff ? (
              <form action={setPlugin.bind(null, id, d.key, !active.has(d.key))} style={{ marginTop: 8 }}>
                <button className="btn ghost sm">{active.has(d.key) ? "Remove from their plan" : "Mark as part of their plan"}</button>
              </form>
            ) : null}
          </div>
        ))}
      </div>
      {list.length === 0 ? <p className="empty">Nothing to show yet.</p> : null}

      {requests && requests.length ? (
        <>
          <h2 style={{ marginTop: 36 }}>{isStaff ? "Requests from this client" : "What you have asked for"}</h2>
          <div className="tw">
            <table>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>{nameOf.get(r.dept_key) ?? r.dept_key}</td>
                    <td>{r.message}</td>
                    <td>{String(r.created_at).slice(0, 10)}</td>
                    <td>
                      <span className={PILL[r.status] ?? "pill"}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}
