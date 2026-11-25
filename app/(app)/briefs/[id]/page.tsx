import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BRIEF_STAGES, today } from "@/lib/workspace";
import { signedUrls } from "@/lib/files";
import { addNote, approveBrief, askForChanges, reopenBrief, sendForReview, takeBrief } from "../actions";

export default async function BriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await requireStaff();
  const { id } = await params;
  const { error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: b }, { data: notes }, { data: staff }] = await Promise.all([
    supabase.from("briefs").select("*, clients(name), departments(name)").eq("id", id).maybeSingle(),
    supabase.from("brief_notes").select("id, body, kind, created_by, created_at").eq("brief_id", id).order("created_at"),
    supabase.from("profiles").select("id, full_name, email").eq("role", "staff"),
  ]);
  if (!b) notFound();
  const person = new Map((staff ?? []).map((s) => [s.id as string, (s.full_name as string | null) ?? (s.email as string)]));
  const files = await signedUrls(supabase, [b.attachment_path, b.delivery_path]);
  const stage = (BRIEF_STAGES as readonly string[]).indexOf(b.status);
  const late = b.due && b.due < today() && b.status !== "Delivered";
  const client = (b.clients as { name: string } | null)?.name ?? "Client";
  const team = (b.departments as { name: string } | null)?.name ?? b.team;
  return (
    <>
      <p className="small" style={{ margin: 0 }}>
        <Link href="/briefs">Briefs</Link>
      </p>
      {error ? <div className="msg">{error}</div> : null}
      <div className="plug-head" style={{ marginTop: 6 }}>
        <div>
          <h2>{b.title}</h2>
          <p className="mute" style={{ margin: "8px 0 0" }}>
            <Link href={`/c/${b.client_id}`}>{client}</Link>, for the {team} team
            {b.urgent ? <span style={{ color: "var(--bad)", fontWeight: 600 }}>, urgent</span> : null}
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
        <div className="card">
          <dl className="facts">
            <dt>Asked by</dt>
            <dd>{person.get(b.requested_by ?? "") ?? "Unknown"}</dd>
            <dt>With</dt>
            <dd>{b.assignee ? person.get(b.assignee) ?? "Someone" : "Nobody yet"}</dd>
            {b.format ? (
              <>
                <dt>Format</dt>
                <dd>{b.format}</dd>
              </>
            ) : null}
            <dt>Needed by</dt>
            <dd style={{ color: late ? "var(--bad)" : undefined }}>{b.due ? `${b.due}${late ? ", late" : ""}` : "No date"}</dd>
          </dl>
          {b.details ? <p className="post-body" style={{ whiteSpace: "pre-line" }}>{b.details}</p> : null}
          <div className="row">
            {b.reference_url ? (
              <a className="btn ghost sm" href={b.reference_url} target="_blank" rel="noreferrer">
                Open the reference
              </a>
            ) : null}
            {b.attachment_path && files[b.attachment_path] ? (
              <a className="btn ghost sm" href={files[b.attachment_path]} target="_blank" rel="noreferrer">
                Open the attached file
              </a>
            ) : null}
          </div>

          {b.delivery_url || b.delivery_path ? (
            <div className="rules" style={{ marginTop: 18 }}>
              <b>The work</b>
              <div className="row" style={{ marginTop: 8 }}>
                {b.delivery_url ? (
                  <a className="btn sm" href={b.delivery_url} target="_blank" rel="noreferrer">
                    Open the link
                  </a>
                ) : null}
                {b.delivery_path && files[b.delivery_path] ? (
                  <a className="btn sm" href={files[b.delivery_path]} target="_blank" rel="noreferrer">
                    Open the file
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 22 }}>
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
                  {b.assignee !== me.id ? <button className="btn ghost" formAction={takeBrief.bind(null, id)} formNoValidate>Assign it to me</button> : null}
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
          </div>
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
            <input type="text" name="body" placeholder="Add a note or a question" required style={{ flex: 1, minWidth: 180 }} />
            <button className="btn ghost sm">Add</button>
          </form>
        </div>
      </div>
    </>
  );
}
