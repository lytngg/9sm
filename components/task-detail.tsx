import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BRIEF_STAGES, TASK_TEAMS, today } from "@/lib/workspace";
import { PLUGINS } from "@/lib/plugins";
import { signedUrls } from "@/lib/files";
import {
  addItem, addNote, approveBrief, askForChanges, deleteTask, removeItem, reopenBrief, saveTask, sendForReview, takeBrief, toggleItem,
} from "@/app/(app)/briefs/actions";

type Field = { id: string; name: string; kind: string; options: string[] };

// One task, in full. Shown as its own page and in the panel that slides over the board.
export async function TaskDetail({ id, meId, error, closeHref }: { id: string; meId: string; error?: string; closeHref?: string }) {
  const supabase = await createClient();
  const [{ data: b }, { data: notes }, { data: staff }, { data: items }, { data: fieldRows }, { data: clients }] = await Promise.all([
    supabase.from("briefs").select("*").eq("id", id).maybeSingle(),
    supabase.from("brief_notes").select("id, body, kind, created_by, created_at").eq("brief_id", id).order("created_at"),
    supabase.from("profiles").select("id, full_name, email").eq("role", "staff").order("full_name"),
    supabase.from("brief_items").select("id, text, done").eq("brief_id", id).order("position").order("created_at"),
    supabase.from("task_fields").select("id, name, kind, options").order("position").order("name"),
    supabase.from("clients").select("id, name").order("name"),
  ]);
  if (!b) return <p className="empty">That task no longer exists.</p>;
  const fields = (fieldRows ?? []) as Field[];
  const values = (b.fields ?? {}) as Record<string, string>;
  const person = new Map((staff ?? []).map((s) => [s.id as string, (s.full_name as string | null) ?? (s.email as string)]));
  const named = (staff ?? []).filter((s) => s.full_name);
  const files = await signedUrls(supabase, [b.attachment_path, b.delivery_path]);
  const stage = (BRIEF_STAGES as readonly string[]).indexOf(b.status);
  const late = b.due && b.due < today() && b.status !== "Delivered";
  const list = items ?? [];
  const doneCount = list.filter((i) => i.done).length;
  const formats = [...new Set([...(PLUGINS.design.formats ?? []), ...(PLUGINS.video.formats ?? [])])];
  return (
    <>
      <p className="small row" style={{ margin: 0, justifyContent: "space-between" }}>
        {closeHref ? <Link href={closeHref}>Close</Link> : <Link href="/briefs">Tasks</Link>}
        {closeHref ? <Link href={`/briefs/${id}`}>Open as a page</Link> : null}
      </p>
      {error ? <div className="msg">{error}</div> : null}
      <div className="plug-head" style={{ marginTop: 6 }}>
        <div>
          <h2>{b.title}</h2>
          <p className="mute" style={{ margin: "8px 0 0" }}>
            Raised by {person.get(b.requested_by ?? "") ?? "someone"}
            {late ? <span style={{ color: "var(--bad)", fontWeight: 600 }}>, late</span> : null}
            {b.urgent && b.status !== "Delivered" ? <span style={{ color: "var(--bad)", fontWeight: 600 }}>, urgent</span> : null}
          </p>
        </div>
        <span className={b.status === "Delivered" ? "pill good" : b.status === "In review" ? "pill pink" : "pill purple"}>{b.status}</span>
      </div>
      <div className={["rail purple", "rail purple", "rail pink", "rail good"][stage] ?? "rail"} style={{ margin: "18px 0 26px", maxWidth: 420 }} role="img" aria-label={`Stage ${stage + 1} of 4: ${b.status}`}>
        {BRIEF_STAGES.map((s, i) => (
          <i key={s} className={i <= stage ? "on" : undefined} />
        ))}
      </div>

      <div className="grid">
        <div>
          {/* what happens next */}
          <div className="card" style={{ marginBottom: 28 }}>
            {b.status === "Requested" ? (
              <form action={takeBrief.bind(null, id)}>
                <button className="btn">I&apos;ll take this</button>
              </form>
            ) : null}
            {b.status === "In progress" ? (
              <form className="f" action={sendForReview.bind(null, id)}>
                <h2>Send it for review</h2>
                <label>
                  Link to the work
                  <input type="url" name="delivery_url" defaultValue={b.delivery_url ?? ""} placeholder="Figma, Drive or Frame link" />
                </label>
                <label>
                  Or upload it
                  <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" />
                </label>
                <div className="row">
                  <button className="btn">Send for review</button>
                  {b.assignee !== meId ? (
                    <button className="btn ghost" formAction={takeBrief.bind(null, id)} formNoValidate>
                      Assign it to me
                    </button>
                  ) : null}
                </div>
              </form>
            ) : null}
            {b.status === "In review" ? (
              <div className="row" style={{ alignItems: "flex-end" }}>
                <form action={approveBrief.bind(null, id)}>
                  <button className="btn">Approve</button>
                </form>
                <form className="row" action={askForChanges.bind(null, id)} style={{ flex: 1 }}>
                  <input type="text" name="note" placeholder="What should change?" required style={{ flex: 1, minWidth: 180 }} />
                  <button className="btn ghost">Ask for changes</button>
                </form>
              </div>
            ) : null}
            {b.status === "Delivered" ? (
              <form action={reopenBrief.bind(null, id)}>
                <button className="btn ghost sm">Reopen</button>
              </form>
            ) : null}
            {b.delivery_url || b.delivery_path || b.attachment_path ? (
              <div className="row" style={{ marginTop: 14 }}>
                {b.delivery_url ? (
                  <a className="btn sm" href={b.delivery_url} target="_blank" rel="noreferrer">
                    Open the work
                  </a>
                ) : null}
                {b.delivery_path && files[b.delivery_path] ? (
                  <a className="btn sm" href={files[b.delivery_path]} target="_blank" rel="noreferrer">
                    Open the delivered file
                  </a>
                ) : null}
                {b.attachment_path && files[b.attachment_path] ? (
                  <a className="btn ghost sm" href={files[b.attachment_path]} target="_blank" rel="noreferrer">
                    Open the attached file
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="card" style={{ marginBottom: 28 }}>
            <h2>
              Checklist{" "}
              {list.length ? (
                <span className="mute" style={{ fontSize: 14, fontFamily: "inherit" }}>
                  {doneCount} of {list.length}
                </span>
              ) : null}
            </h2>
            {list.length ? (
              <div className="progress">
                <i style={{ width: `${(doneCount / list.length) * 100}%` }} />
              </div>
            ) : null}
            {list.map((i) => (
              <div key={i.id} className="checkrow">
                <form action={toggleItem.bind(null, id, i.id, !i.done)}>
                  <button className={i.done ? "checkbtn on" : "checkbtn"} aria-label={i.done ? `Untick ${i.text}` : `Tick ${i.text}`}>
                    {i.done ? "✓" : ""}
                  </button>
                </form>
                <span className={i.done ? "done" : undefined}>{i.text}</span>
                <form action={removeItem.bind(null, id, i.id)}>
                  <button className="x" aria-label={`Remove ${i.text}`}>
                    Remove
                  </button>
                </form>
              </div>
            ))}
            <form className="row" action={addItem.bind(null, id)} style={{ marginTop: 12 }}>
              <input type="text" name="text" placeholder="Add a step" required style={{ flex: 1, minWidth: 160 }} />
              <button className="btn ghost sm">Add</button>
            </form>
          </div>

          <div className="card">
            <h2>Thread</h2>
            {(notes ?? []).map((n) => (
              <div key={n.id} className={n.kind === "event" ? "note event" : n.kind === "changes" ? "note changes" : "note"}>
                <div className="mute small">
                  {person.get(n.created_by ?? "") ?? "Someone"}, {String(n.created_at).slice(0, 16).replace("T", " ")}
                  {n.kind === "changes" ? ", asked for changes" : ""}
                </div>
                <div style={{ whiteSpace: "pre-line" }}>{n.body}</div>
              </div>
            ))}
            {!notes || notes.length === 0 ? <p className="empty">Nothing said yet.</p> : null}
            <form className="row" action={addNote.bind(null, id)} style={{ marginTop: 14 }}>
              <input type="text" name="body" placeholder="Add a note. Type @ and a first name to tell someone." required style={{ flex: 1, minWidth: 180 }} />
              <button className="btn ghost sm">Add</button>
            </form>
          </div>
        </div>

        <div className="card">
          <form className="f" action={saveTask.bind(null, id)}>
            <h2>Details</h2>
            <label>
              Task
              <input type="text" name="title" defaultValue={b.title} required />
            </label>
            <div className="brief-grid">
              <label>
                Status
                <select name="status" defaultValue={b.status}>
                  {BRIEF_STAGES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                With
                <select name="assignee" defaultValue={b.assignee ?? ""}>
                  <option value="">Nobody yet</option>
                  {named.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Team
                <select name="team" defaultValue={b.team}>
                  {TASK_TEAMS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Client
                <select name="client" defaultValue={b.client_id ?? ""}>
                  <option value="">No client, internal</option>
                  {(clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Needed by
                <input type="date" name="due" defaultValue={b.due ?? ""} />
              </label>
              <label>
                Format
                <select name="format" defaultValue={b.format ?? ""}>
                  <option value="">Not set</option>
                  {formats.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
              {fields.map((f) => (
                <label key={f.id}>
                  {f.name}
                  {f.kind === "select" ? (
                    <select name={`cf_${f.id}`} defaultValue={values[f.id] ?? ""}>
                      <option value="">Not set</option>
                      {f.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.kind === "date" ? "date" : f.kind === "number" ? "number" : f.kind === "link" ? "url" : "text"}
                      name={`cf_${f.id}`}
                      defaultValue={values[f.id] ?? ""}
                      placeholder={f.kind === "link" ? "https://" : undefined}
                    />
                  )}
                </label>
              ))}
            </div>
            <label>
              Details
              <textarea name="details" rows={6} defaultValue={b.details ?? ""} />
            </label>
            <label>
              Reference link
              <input type="url" name="reference" defaultValue={b.reference_url ?? ""} placeholder="https://" />
            </label>
            <label className="check">
              <input type="checkbox" name="urgent" defaultChecked={b.urgent} />
              Urgent
            </label>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <button className="btn">Save</button>
              <button className="btn ghost sm" formAction={deleteTask.bind(null, id)} formNoValidate>
                Delete task
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
