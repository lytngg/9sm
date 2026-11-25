import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BRIEF_STAGES, today } from "@/lib/workspace";
import { PLUGINS } from "@/lib/plugins";
import { createBrief } from "./actions";

type Brief = {
  id: string; client_id: string; team: string; title: string; format: string | null; due: string | null; urgent: boolean;
  status: string; assignee: string | null; requested_by: string | null; updated_at: string;
};
const day = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleString("en", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function Briefs({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; team?: string; who?: string; client?: string; title?: string; details?: string; due?: string }>;
}) {
  const me = await requireStaff();
  const q = await searchParams;
  const supabase = await createClient();
  const [{ data: briefRows }, { data: clients }, { data: depts }, { data: staff }] = await Promise.all([
    supabase.from("briefs").select("id, client_id, team, title, format, due, urgent, status, assignee, requested_by, updated_at").order("urgent", { ascending: false }).order("due", { nullsFirst: false }).limit(500),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("departments").select("key, name").order("position"),
    supabase.from("profiles").select("id, full_name, email").eq("role", "staff"),
  ]);
  const now = today();
  const base = new Date(now + "T00:00:00Z").getTime();
  const weekEnd = new Date(base + 7 * 86400000).toISOString().slice(0, 10);
  const all = (briefRows ?? []) as Brief[];
  const clientName = new Map((clients ?? []).map((c) => [c.id as string, c.name as string]));
  const deptName = new Map((depts ?? []).map((d) => [d.key as string, d.name as string]));
  const person = new Map((staff ?? []).map((s) => [s.id as string, ((s.full_name as string | null) ?? (s.email as string)).split(" ")[0]]));
  const teams = (depts ?? []).filter((d) => d.key !== "talent");
  const team = teams.some((d) => d.key === q.team) ? q.team : undefined;
  const who = q.who === "mine" || q.who === "raised" ? q.who : undefined;
  const shown = all.filter(
    (b) => (!team || b.team === team) && (who === "mine" ? b.assignee === me.id : who === "raised" ? b.requested_by === me.id : true),
  );
  const recentCut = new Date(base - 14 * 86400000).toISOString();
  const col = (status: string) => shown.filter((b) => b.status === status && (status !== "Delivered" || b.updated_at > recentCut));
  const href = (t?: string, w?: string) => {
    const p = new URLSearchParams();
    if (t) p.set("team", t);
    if (w) p.set("who", w);
    const s = p.toString();
    return s ? `/briefs?${s}` : "/briefs";
  };
  // How loaded each team is, so nobody has to ask in Slack.
  const load = teams
    .map((d) => {
      const open = all.filter((b) => b.team === d.key && b.status !== "Delivered");
      return {
        ...d,
        open: open.length,
        waiting: open.filter((b) => b.status === "Requested").length,
        week: open.filter((b) => b.due && b.due <= weekEnd).length,
        late: open.filter((b) => b.due && b.due < now).length,
      };
    })
    .filter((d) => d.open > 0 || d.key === "design" || d.key === "video");
  const prefill = Boolean(q.client || q.title);
  const formats = [...new Set([...(PLUGINS.design.formats ?? []), ...(PLUGINS.video.formats ?? [])])];

  return (
    <>
      <h1>Briefs</h1>
      <p className="sub">Ask another team for something, see who has it, and sign it off. This replaces the Slack threads.</p>
      {q.error ? <div className="msg">{q.error}</div> : null}

      <div className="tiles" style={{ marginTop: 18 }}>
        {load.map((d) => (
          <Link key={d.key} className="tile" href={href(d.key, who)} style={{ textDecoration: "none", color: "inherit" }}>
            <span>{d.name}</span>
            <b>{d.open}</b>
            <em className="mute">
              {d.waiting} not picked up, {d.week} due in 7 days
              {d.late ? <span style={{ color: "var(--bad)" }}>, {d.late} late</span> : null}
            </em>
          </Link>
        ))}
      </div>

      <details className="newbrief" open={prefill}>
        <summary className="btn">New brief</summary>
        <div className="card" style={{ marginTop: 14, maxWidth: 720 }}>
          <form className="f" action={createBrief}>
            <div className="brief-grid">
              <label>
                Client
                <select name="client" defaultValue={q.client ?? ""} required>
                  <option value="" disabled>
                    Pick a client
                  </option>
                  {(clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Team
                <select name="team" defaultValue={team ?? "design"}>
                  {teams.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              What do you need
              <input type="text" name="title" defaultValue={q.title ?? ""} placeholder="Black Friday hero creative" required />
            </label>
            <label>
              Details: what it is for, what it should say, sizes
              <textarea name="details" rows={4} defaultValue={q.details ?? ""} />
            </label>
            <div className="brief-grid">
              <label>
                Format
                <select name="format" defaultValue="">
                  <option value="">Not set</option>
                  {formats.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
              <label>
                Needed by
                <input type="date" name="due" defaultValue={q.due ?? ""} />
              </label>
            </div>
            <label>
              Reference link
              <input type="url" name="reference" placeholder="https://" />
            </label>
            <label>
              Image or PDF
              <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" />
            </label>
            <label className="check">
              <input type="checkbox" name="urgent" />
              Urgent. Use this sparingly.
            </label>
            <div>
              <button className="btn">Send brief</button>
            </div>
          </form>
        </div>
      </details>

      <div className="filters">
        <Link className={!team ? "filter on" : "filter"} href={href(undefined, who)}>
          Every team
        </Link>
        {teams.map((d) => (
          <Link key={d.key} className={team === d.key ? "filter on" : "filter"} href={href(d.key, who)}>
            {d.name}
          </Link>
        ))}
        <span style={{ width: 12 }} />
        <Link className={!who ? "filter on" : "filter"} href={href(team)}>
          Everyone
        </Link>
        <Link className={who === "mine" ? "filter on" : "filter"} href={href(team, "mine")}>
          Assigned to me
        </Link>
        <Link className={who === "raised" ? "filter on" : "filter"} href={href(team, "raised")}>
          Raised by me
        </Link>
      </div>

      <div className="board">
        {BRIEF_STAGES.map((stage) => {
          const items = col(stage);
          return (
            <div key={stage} className="board-col">
              <div className="board-head">
                {stage === "Delivered" ? "Delivered, last 14 days" : stage} <span>{items.length}</span>
              </div>
              {items.map((b) => {
                const late = b.due && b.due < now && b.status !== "Delivered";
                return (
                  <Link key={b.id} href={`/briefs/${b.id}`} className={b.urgent && b.status !== "Delivered" ? "brief urgent" : "brief"}>
                    <b>{b.title}</b>
                    <span className="mute small">{clientName.get(b.client_id) ?? "Client"}</span>
                    <span className="brief-meta">
                      <span className={`teamtag t-${b.team}`}>{deptName.get(b.team) ?? b.team}</span>
                      {b.due ? <span style={{ color: late ? "var(--bad)" : undefined }}>{late ? "Late, " : ""}{day(b.due)}</span> : null}
                      <span className="mute">
                        {person.get(b.requested_by ?? "") ?? "Someone"}
                        {b.assignee ? ` to ${person.get(b.assignee) ?? "someone"}` : ""}
                      </span>
                    </span>
                  </Link>
                );
              })}
              {items.length === 0 ? <p className="mute small" style={{ padding: "6px 2px" }}>Nothing here.</p> : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
