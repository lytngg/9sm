import { notFound, redirect } from "next/navigation";
import { loadWorkspace } from "@/lib/workspace";
import { PLUGINS } from "@/lib/plugins";
import { Avatar } from "@/components/avatar";
import { CommunityReport } from "@/components/community-report";
import { askDepartment, setPlugin, setRequestStatus } from "../actions";

const PILL: Record<string, string> = { New: "pill pink", "Picked up": "pill purple", Done: "pill good" };
const WORD: Record<string, string> = { New: "Sent", "Picked up": "In progress", Done: "Delivered" };
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
  const info = PLUGINS[key];
  const active = (have ?? []).length > 0;
  const { data: community } =
    key === "community" && active
      ? await supabase.from("channel_stats").select("channel, week, followers").eq("client_id", id).in("channel", ["Discord", "Telegram"]).order("week")
      : { data: null };
  const requests = (rows ?? []) as Req[];
  const open = requests.filter((r) => r.status !== "Done");
  const done = requests.filter((r) => r.status === "Done");
  const asked = new Set(requests.map((r) => r.message.split("\n")[0]));
  const list = (items: Req[]) =>
    items.map((r) => {
      const [title, ...rest] = r.message.split("\n");
      return (
        <div key={r.id} className="post">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <b>{title}</b>
            <span className={PILL[r.status] ?? "pill"}>{WORD[r.status] ?? r.status}</span>
          </div>
          {rest.length ? <div className="mute small">{rest.join(" · ")}</div> : null}
          <div className="mute small">{String(r.created_at).slice(0, 10)}</div>
          {isStaff ? (
            <div className="row" style={{ marginTop: 8 }}>
              {["New", "Picked up", "Done"].filter((s) => s !== r.status).map((s) => (
                <form key={s} action={setRequestStatus.bind(null, id, key, r.id, s)}>
                  <button className="btn ghost sm">{s === "New" ? "Back to sent" : s === "Picked up" ? "Mark in progress" : "Mark delivered"}</button>
                </form>
              ))}
            </div>
          ) : null}
        </div>
      );
    });

  return (
    <>
      {error ? <div className="msg">{error}</div> : null}
      {sent ? <div className="msg ok">Done. The {sent} team has it and will come back to you.</div> : null}

      <div className="plug-head">
        <div>
          <h2>{dept.name}</h2>
          <p className="plug-tag">{info?.tagline ?? dept.blurb}</p>
        </div>
        <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
          <span className={active ? "pill good" : "pill"}>{active ? (isStaff ? "Part of their plan" : "Part of your plan") : "Not on your plan yet"}</span>
          {dept.lead_name ? (
            <div className="smm">
              <Avatar name={dept.lead_name} photoUrl={null} />
              <div>
                <div className="mute small">{isStaff ? "Team lead" : "Your contact"}</div>
                <div className="smm-name">{dept.lead_name}</div>
              </div>
            </div>
          ) : null}
          {isStaff ? (
            <form action={setPlugin.bind(null, id, key, !active)}>
              <button className="btn ghost sm">{active ? "Remove from plan" : "Add to plan"}</button>
            </form>
          ) : null}
        </div>
      </div>

      {community && community.length ? <CommunityReport clientId={id} stats={community} /> : null}

      {info?.market.length ? (
        <section className="plug-sec">
          <h3>What is working right now</h3>
          <p className="mute small">Notes from the {dept.name} team on what they are seeing across gambling brands.</p>
          <div className="pulse">
            {info.market.map((m) => (
              <div key={m.title} className="pulse-card">
                <span className="pulse-when">{m.when}</span>
                <b>{m.title}</b>
                <p>{m.body}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {open.length || done.length ? (
        <section className="plug-sec">
          <h3>{isStaff ? "Their work with this team" : "Your work with this team"}</h3>
          <div className="grid" style={{ marginTop: 14 }}>
            <div className="card">
              <div className="mute small">In progress</div>
              {open.length ? list(open) : <p className="empty">Nothing open.</p>}
            </div>
            <div className="card">
              <div className="mute small">Delivered</div>
              {done.length ? list(done) : <p className="empty">Nothing delivered yet.</p>}
            </div>
          </div>
        </section>
      ) : null}

      {info?.offers.length ? (
        <section className="plug-sec">
          <h3>What you can get</h3>
          <div style={{ marginTop: 14 }}>
            {info.offers.map((o) => (
              <div key={o.name} className="offer">
                <div>
                  <b>{o.name}</b> {o.included && active ? <span className="inc">Included in your plan</span> : null}
                  <p>{o.detail}</p>
                </div>
                {asked.has(o.name) ? (
                  <span className="pill good">Asked for</span>
                ) : (
                  <form action={askDepartment.bind(null, id, key)}>
                    <input type="hidden" name="from" value="page" />
                    <input type="hidden" name="message" value={o.name} />
                    <button className={o.included && active ? "btn sm" : "btn ghost sm"}>{o.included && active ? "Start one" : "I want this"}</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {info?.does.length ? (
        <section className="plug-sec">
          <h3>What the team does</h3>
          <ul className="does">
            {info.does.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {info?.formats ? (
        <section className="plug-sec">
          <div className="card" style={{ maxWidth: 640 }}>
            <form className="f" action={askDepartment.bind(null, id, key)}>
              <input type="hidden" name="from" value="page" />
              <h2>Send a brief</h2>
              <label>
                What it is for and what it should say
                <textarea name="message" rows={3} required />
              </label>
              <div className="brief-grid">
                <label>
                  What is it
                  <select name="format" defaultValue={info.formats[0]}>
                    {info.formats.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Needed by
                  <input type="date" name="due" />
                </label>
              </div>
              <label>
                Reference link, if you have one
                <input type="url" name="reference" placeholder="https://" />
              </label>
              <div className="row">
                <button className="btn">Send brief</button>
              </div>
            </form>
          </div>
        </section>
      ) : null}
    </>
  );
}
