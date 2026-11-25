import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BRIEF_STAGES, TASK_TEAMS, teamName, today } from "@/lib/workspace";
import { PLUGINS } from "@/lib/plugins";
import { TaskBoard, type BoardTask } from "@/components/task-board";
import { addField, createBrief, removeField, setTaskStatus } from "./actions";

type Task = {
  id: string; client_id: string | null; team: string; title: string; format: string | null; due: string | null; urgent: boolean;
  status: string; assignee: string | null; requested_by: string | null; updated_at: string; fields: Record<string, string> | null;
};
type Field = { id: string; name: string; kind: string; options: string[] };
type Template = { id: string; name: string; team: string; format: string | null; details: string | null; items: string[] };
const day = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleString("en", { day: "numeric", month: "short", timeZone: "UTC" });
const PILL: Record<string, string> = { Requested: "pill", "In progress": "pill purple", "In review": "pill pink", Delivered: "pill good" };

export default async function Tasks({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; v?: string; team?: string; who?: string; m?: string; client?: string; title?: string; details?: string; due?: string; template?: string }>;
}) {
  const me = await requireStaff();
  const q = await searchParams;
  const supabase = await createClient();
  const [{ data: taskRows }, { data: clients }, { data: staff }, { data: itemRows }, { data: fieldRows }, { data: templateRows }] = await Promise.all([
    supabase.from("briefs").select("id, client_id, team, title, format, due, urgent, status, assignee, requested_by, updated_at, fields").order("urgent", { ascending: false }).order("due", { nullsFirst: false }).limit(1000),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").eq("role", "staff").not("full_name", "is", null).order("full_name"),
    supabase.from("brief_items").select("brief_id, done").limit(10000),
    supabase.from("task_fields").select("id, name, kind, options").order("position").order("name"),
    supabase.from("task_templates").select("id, name, team, format, details, items").order("name"),
  ]);
  const now = today();
  const base = new Date(now + "T00:00:00Z").getTime();
  const weekEnd = new Date(base + 7 * 86400000).toISOString().slice(0, 10);
  const recentCut = new Date(base - 14 * 86400000).toISOString();
  const all = (taskRows ?? []) as Task[];
  const fields = (fieldRows ?? []) as Field[];
  const templates = (templateRows ?? []) as Template[];
  const template = templates.find((t) => t.id === q.template);
  const clientName = new Map((clients ?? []).map((c) => [c.id as string, c.name as string]));
  const person = new Map((staff ?? []).map((s) => [s.id as string, String(s.full_name)]));
  const first = (id: string | null) => (id ? (person.get(id) ?? "Someone").split(" ")[0] : null);
  const progress = new Map<string, [number, number]>();
  (itemRows ?? []).forEach((i) => {
    const p = progress.get(i.brief_id) ?? [0, 0];
    progress.set(i.brief_id, [p[0] + (i.done ? 1 : 0), p[1] + 1]);
  });

  const view = q.v === "table" || q.v === "calendar" ? q.v : "board";
  const team = TASK_TEAMS.some((t) => t.key === q.team) ? q.team : undefined;
  const who = q.who === "mine" || q.who === "raised" ? q.who : undefined;
  const shown = all.filter(
    (b) => (!team || b.team === team) && (who === "mine" ? b.assignee === me.id : who === "raised" ? b.requested_by === me.id : true),
  );
  const href = (o: { v?: string; team?: string | null; who?: string | null; m?: string }) => {
    const p = new URLSearchParams();
    const vv = o.v ?? view;
    if (vv !== "board") p.set("v", vv);
    const tt = o.team === null ? undefined : (o.team ?? team);
    const ww = o.who === null ? undefined : (o.who ?? who);
    if (tt) p.set("team", tt);
    if (ww) p.set("who", ww);
    if (o.m) p.set("m", o.m);
    const s = p.toString();
    return s ? `/briefs?${s}` : "/briefs";
  };
  const usedTeams = TASK_TEAMS.filter((t) => all.some((b) => b.team === t.key) || ["design", "video"].includes(t.key));
  const load = usedTeams.map((d) => {
    const open = all.filter((b) => b.team === d.key && b.status !== "Delivered");
    return {
      ...d,
      open: open.length,
      waiting: open.filter((b) => b.status === "Requested").length,
      week: open.filter((b) => b.due && b.due <= weekEnd).length,
      late: open.filter((b) => b.due && b.due < now).length,
    };
  });
  const formats = [...new Set([...(PLUGINS.design.formats ?? []), ...(PLUGINS.video.formats ?? [])])];
  const prefill = Boolean(q.client || q.title || template);

  const boardTasks: BoardTask[] = shown
    .filter((b) => b.status !== "Delivered" || b.updated_at > recentCut)
    .map((b) => ({
      id: b.id,
      title: b.title,
      client: b.client_id ? (clientName.get(b.client_id) ?? null) : null,
      team: b.team,
      teamName: teamName(b.team),
      due: b.due,
      dueLabel: b.due ? day(b.due) : null,
      late: Boolean(b.due && b.due < now),
      urgent: b.urgent,
      status: b.status,
      who: `${first(b.requested_by) ?? "Someone"}${b.assignee ? ` to ${first(b.assignee)}` : ""}`,
      done: progress.get(b.id)?.[0] ?? 0,
      total: progress.get(b.id)?.[1] ?? 0,
    }));

  // Calendar view
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(q.m ?? "") ? (q.m as string) : now.slice(0, 7);
  const [y, mo] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const startDay = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  const shift = (n: number) => new Date(Date.UTC(y, mo - 1 + n, 1)).toISOString().slice(0, 7);
  const monthTitle = new Date(Date.UTC(y, mo - 1, 1)).toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <h1>Tasks</h1>
      <p className="sub">Every piece of work between the teams. Raise it, see who has it, sign it off.</p>
      {q.error ? <div className="msg">{q.error}</div> : null}

      <div className="tiles" style={{ marginTop: 18 }}>
        {load.map((d) => (
          <Link key={d.key} className="tile" href={href({ team: d.key })} style={{ textDecoration: "none", color: "inherit" }}>
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
        <summary className="btn">New task</summary>
        <div className="card" style={{ marginTop: 14, maxWidth: 720 }}>
          <div className="row" style={{ marginBottom: 12, gap: 8 }}>
            <span className="mute small">Start from a template</span>
            {templates.map((t) => (
              <Link key={t.id} className={template?.id === t.id ? "filter on" : "filter"} href={`/briefs?template=${t.id}${q.client ? `&client=${q.client}` : ""}`}>
                {t.name}
              </Link>
            ))}
          </div>
          <form className="f" action={createBrief} key={template?.id ?? "blank"}>
            {template ? <input type="hidden" name="template" value={template.id} /> : null}
            <label>
              Task
              <input type="text" name="title" defaultValue={q.title ?? (template ? `${template.name}: ` : "")} placeholder="Black Friday hero creative" required />
            </label>
            <div className="brief-grid">
              <label>
                Team
                <select name="team" defaultValue={template?.team ?? team ?? "design"}>
                  {TASK_TEAMS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Client
                <select name="client" defaultValue={q.client ?? ""}>
                  <option value="">No client, internal</option>
                  {(clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Give it to
                <select name="assignee" defaultValue="">
                  <option value="">Whoever picks it up</option>
                  {(staff ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Details
              <textarea name="details" rows={4} defaultValue={q.details ?? template?.details ?? ""} />
            </label>
            {template && template.items.length ? (
              <p className="mute small" style={{ margin: 0 }}>
                Comes with a checklist: {template.items.join(", ")}.
              </p>
            ) : null}
            <div className="brief-grid">
              <label>
                Format
                <select name="format" defaultValue={template?.format ?? ""}>
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
              <button className="btn">Create task</button>
            </div>
          </form>
        </div>
      </details>

      <div className="viewbar">
        <div className="views">
          {[
            ["board", "Board"],
            ["table", "Table"],
            ["calendar", "Calendar"],
          ].map(([k, label]) => (
            <Link key={k} className={view === k ? "on" : undefined} href={href({ v: k })}>
              {label}
            </Link>
          ))}
        </div>
        <div className="filters" style={{ margin: 0 }}>
          <Link className={!who ? "filter on" : "filter"} href={href({ who: null })}>
            Everyone
          </Link>
          <Link className={who === "mine" ? "filter on" : "filter"} href={href({ who: "mine" })}>
            Assigned to me
          </Link>
          <Link className={who === "raised" ? "filter on" : "filter"} href={href({ who: "raised" })}>
            Raised by me
          </Link>
          <span style={{ width: 8 }} />
          <Link className={!team ? "filter on" : "filter"} href={href({ team: null })}>
            Every team
          </Link>
          {usedTeams.map((d) => (
            <Link key={d.key} className={team === d.key ? "filter on" : "filter"} href={href({ team: d.key })}>
              {d.name}
            </Link>
          ))}
        </div>
      </div>

      {view === "board" ? <TaskBoard stages={[...BRIEF_STAGES]} tasks={boardTasks} move={setTaskStatus} /> : null}

      {view === "table" ? (
        <>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Client</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th>With</th>
                  <th>Needed by</th>
                  <th>Checklist</th>
                  {fields.map((f) => (
                    <th key={f.id}>{f.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((b) => {
                  const late = b.due && b.due < now && b.status !== "Delivered";
                  const p = progress.get(b.id);
                  return (
                    <tr key={b.id}>
                      <td>
                        <Link href={`/briefs/${b.id}`}>{b.title}</Link>
                        {b.urgent && b.status !== "Delivered" ? <span style={{ color: "var(--bad)" }}> urgent</span> : null}
                      </td>
                      <td className="mute">{b.client_id ? clientName.get(b.client_id) : "Internal"}</td>
                      <td>
                        <span className={`teamtag t-${b.team}`}>{teamName(b.team)}</span>
                      </td>
                      <td>
                        <span className={PILL[b.status] ?? "pill"}>{b.status}</span>
                      </td>
                      <td>{b.assignee ? person.get(b.assignee) : <span className="mute">Nobody yet</span>}</td>
                      <td style={{ color: late ? "var(--bad)" : undefined, whiteSpace: "nowrap" }}>{b.due ? day(b.due) : ""}</td>
                      <td className="mute">{p ? `${p[0]}/${p[1]}` : ""}</td>
                      {fields.map((f) => {
                        const v = b.fields?.[f.id];
                        return (
                          <td key={f.id}>
                            {v && f.kind === "link" ? (
                              <a href={v} target="_blank" rel="noreferrer">
                                Open
                              </a>
                            ) : (
                              v ?? ""
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={7 + fields.length} className="mute">
                      No tasks match that.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <section className="plug-sec">
            <h3>Fields</h3>
            <p className="mute small">Extra columns on every task. Add what your team tracks.</p>
            <div className="grid" style={{ marginTop: 14 }}>
              <div className="card">
                {fields.map((f) => (
                  <div key={f.id} className="offer" style={{ padding: "10px 0" }}>
                    <span>
                      <b>{f.name}</b>{" "}
                      <span className="mute small">
                        {f.kind === "select" ? `Choice: ${f.options.join(", ")}` : f.kind === "link" ? "Link" : f.kind === "date" ? "Date" : f.kind === "number" ? "Number" : "Text"}
                      </span>
                    </span>
                    <form action={removeField.bind(null, f.id)}>
                      <button className="btn ghost sm">Remove</button>
                    </form>
                  </div>
                ))}
                {fields.length === 0 ? <p className="empty">No extra fields yet.</p> : null}
              </div>
              <div className="card">
                <form className="f" action={addField}>
                  <h2>Add a field</h2>
                  <div className="brief-grid">
                    <label>
                      Name
                      <input type="text" name="name" placeholder="Campaign" required />
                    </label>
                    <label>
                      Type
                      <select name="kind">
                        <option value="text">Text</option>
                        <option value="select">Choice</option>
                        <option value="date">Date</option>
                        <option value="number">Number</option>
                        <option value="link">Link</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Choices, separated by commas. Only for the Choice type.
                    <input type="text" name="options" placeholder="Low, Medium, High" />
                  </label>
                  <div>
                    <button className="btn">Add field</button>
                  </div>
                </form>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {view === "calendar" ? (
        <>
          <div className="calbar">
            <div className="row">
              <b>{monthTitle}</b>
              <Link className="btn ghost sm" href={href({ m: shift(-1) })}>
                Previous
              </Link>
              <Link className="btn ghost sm" href={href({ m: shift(1) })}>
                Next
              </Link>
            </div>
            <span className="mute small">Tasks sit on the day they are needed by.</span>
          </div>
          <div className="tw">
            <div className="cal">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div className="dh" key={d}>
                  {d}
                </div>
              ))}
              {Array.from({ length: Math.ceil((startDay + days) / 7) * 7 }, (_, i) => {
                const n = i - startDay + 1;
                const inMonth = n >= 1 && n <= days;
                const date = inMonth ? `${month}-${String(n).padStart(2, "0")}` : "";
                return (
                  <div key={i} className={`day${inMonth ? "" : " out"}${date === now ? " today" : ""}`}>
                    <div className="n">{inMonth ? n : ""}</div>
                    {shown
                      .filter((b) => inMonth && b.due === date)
                      .map((b) => (
                        <Link key={b.id} href={`/briefs/${b.id}`} className={b.status === "Delivered" ? "ev good" : b.status === "In review" ? "ev wait" : "ev"} style={{ textDecoration: "none", color: "inherit" }}>
                          <span className="ev-tag">
                            {teamName(b.team)}
                            {b.assignee ? `, ${first(b.assignee)}` : ""}
                          </span>
                          <span className="ev-text">{b.title}</span>
                        </Link>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>
          {shown.some((b) => !b.due && b.status !== "Delivered") ? (
            <p className="mute small" style={{ marginTop: 12 }}>
              {shown.filter((b) => !b.due && b.status !== "Delivered").length} open tasks have no date and are not on the calendar.
            </p>
          ) : null}
        </>
      ) : null}
    </>
  );
}
