import { notFound, redirect } from "next/navigation";
import { loadWorkspace } from "@/lib/workspace";
import { askDepartment, setPlugin, setRequestStatus } from "../actions";

// What each team asks for in a brief. Teams not listed get a single message box.
const FORMATS: Record<string, string[]> = {
  video: ["Short vertical video", "X video", "YouTube video", "Stream clip", "Motion graphic", "Something else"],
  design: ["Social post image", "Offer creative", "Banner set", "Logo or brand asset", "Seasonal refresh", "Something else"],
};
const PILL: Record<string, string> = { New: "pill pink", "Picked up": "pill purple", Done: "pill good" };
type Req = { id: string; message: string; status: string; created_at: string };

export default async function Department({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; key: string }>;
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { id, key } = await params;
  if (key === "talent") redirect(`/c/${id}/talent`);
  const { error, sent } = await searchParams;
  const { supabase, isStaff } = await loadWorkspace(id);
  const [{ data: dept }, { data: have }, { data: rows }] = await Promise.all([
    supabase.from("departments").select("key, name, blurb, lead_name").eq("key", key).maybeSingle(),
    supabase.from("client_plugins").select("dept_key").eq("client_id", id).eq("dept_key", key),
    supabase.from("department_requests").select("id, message, status, created_at").eq("client_id", id).eq("dept_key", key).order("created_at", { ascending: false }),
  ]);
  if (!dept) notFound();
  const active = (have ?? []).length > 0;
  const requests = (rows ?? []) as Req[];
  const open = requests.filter((r) => r.status !== "Done");
  const done = requests.filter((r) => r.status === "Done");
  const formats = FORMATS[key];
  const list = (items: Req[]) =>
    items.map((r) => (
      <div key={r.id} className="post">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className={PILL[r.status] ?? "pill"}>{r.status === "New" ? "Sent" : r.status === "Picked up" ? "In progress" : "Delivered"}</span>
          <span className="mute small">{String(r.created_at).slice(0, 10)}</span>
        </div>
        <p className="post-body" style={{ whiteSpace: "pre-line" }}>{r.message}</p>
        {isStaff ? (
          <div className="row">
            {["New", "Picked up", "Done"].filter((s) => s !== r.status).map((s) => (
              <form key={s} action={setRequestStatus.bind(null, id, key, r.id, s)}>
                <button className="btn ghost sm">{s === "New" ? "Back to sent" : s === "Picked up" ? "Mark in progress" : "Mark delivered"}</button>
              </form>
            ))}
          </div>
        ) : null}
      </div>
    ));
  return (
    <>
      {error ? <div className="msg">{error}</div> : null}
      {sent ? <div className="msg ok">Sent to the {sent} team. They will pick it up in Slack.</div> : null}
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0 }}>{dept.name}</h2>
          {dept.blurb ? <p className="sub" style={{ margin: "6px 0 0" }}>{dept.blurb}</p> : null}
          {dept.lead_name ? <div className="mute small" style={{ marginTop: 6 }}>{isStaff ? "Lead" : "Your contact"}: {dept.lead_name}</div> : null}
        </div>
        <div className="row">
          <span className={active ? "pill good" : "pill"}>{active ? (isStaff ? "Part of their plan" : "Part of your plan") : "Available"}</span>
          {isStaff ? (
            <form action={setPlugin.bind(null, id, key, !active)}>
              <button className="btn ghost sm">{active ? "Remove from plan" : "Add to plan"}</button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid" style={{ marginTop: 28 }}>
        <div className="card">
          <form className="f" action={askDepartment.bind(null, id, key)}>
            <input type="hidden" name="from" value="page" />
            <h2>{formats ? "Send a brief" : active ? `Ask the ${dept.name} team` : `Ask about ${dept.name}`}</h2>
            {formats ? (
              <div className="brief-grid">
                <label>
                  What is it
                  <select name="format" defaultValue={formats[0]}>
                    {formats.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Needed by
                  <input type="date" name="due" />
                </label>
              </div>
            ) : null}
            <label>
              {formats ? "What it is for and what it should say" : "What do you need"}
              <textarea name="message" rows={4} required />
            </label>
            {formats ? (
              <label>
                Reference link, if you have one
                <input type="url" name="reference" placeholder="https://" />
              </label>
            ) : null}
            <div className="row">
              <button className="btn">Send to {dept.name}</button>
            </div>
          </form>
        </div>
        <div className="card">
          <h2>In progress</h2>
          {open.length ? list(open) : <p className="empty">Nothing open with this team.</p>}
          <h2 style={{ marginTop: 28 }}>Delivered</h2>
          {done.length ? list(done) : <p className="empty">Nothing delivered yet.</p>}
        </div>
      </div>
    </>
  );
}
