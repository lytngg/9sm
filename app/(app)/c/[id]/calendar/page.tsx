import Link from "next/link";
import { loadWorkspace, REQUEST_KINDS, today } from "@/lib/workspace";
import { signedUrls } from "@/lib/files";
import { Tags } from "@/components/tags";
import { addCalendarEntry, addRequest, deleteCalendarEntry, deleteRequest, reviewPost, setRequestStatus } from "../workspace-actions";

type Item = { date: string; cls: string; text: string; tag?: string; entryId?: string; approve?: boolean };
const SHORT: Record<string, string> = { X: "X", Instagram: "IG", Facebook: "FB", TikTok: "TT", YouTube: "YT", Discord: "DC", Telegram: "TG" };
const REQ_PILL: Record<string, [string, string]> = {
  New: ["pill pink", "Sent to 9SM"],
  Scheduled: ["pill purple", "Being made"],
  Done: ["pill good", "Posted"],
};

export default async function Calendar({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string; error?: string }>;
}) {
  const { id } = await params;
  const { m, error } = await searchParams;
  const { supabase, isStaff, client } = await loadWorkspace(id);

  const now = today();
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(m ?? "") ? (m as string) : now.slice(0, 7);
  const [y, mo] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const startDay = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  const from = `${month}-01`;
  const to = `${month}-${String(days).padStart(2, "0")}`;
  const shift = (n: number) => new Date(Date.UTC(y, mo - 1 + n, 1)).toISOString().slice(0, 7);
  const title = new Date(Date.UTC(y, mo - 1, 1)).toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" });

  const level: number = client.event_level ?? 1;
  const [{ data: entries }, { data: posts }, { data: requests }, { data: shared }, { data: waiting }, { data: sent }] = await Promise.all([
    supabase.from("calendar_entries").select("id, date, kind, text").eq("client_id", id).gte("date", from).lte("date", to),
    supabase.from("posts").select("publish_date, publish_time, channels, body, status").eq("client_id", id).gte("publish_date", from).lte("publish_date", to).order("publish_time"),
    supabase.from("requests").select("for_date, kind, details").eq("client_id", id).gte("for_date", from).lte("for_date", to),
    level > 0
      ? supabase.from("global_events").select("starts, ends, title, category, regions, tier").lte("tier", level).lte("starts", to).order("tier")
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("posts").select("*").eq("client_id", id).eq("status", "Client review").order("publish_date").order("publish_time"),
    supabase.from("requests").select("*").eq("client_id", id).order("for_date", { ascending: false }).limit(30),
  ]);
  const files = await signedUrls(supabase, [...(waiting ?? []).map((p) => p.image_path), ...(sent ?? []).map((r) => r.attachment_path)]);
  // Shared sports and esports dates: only ones for this client's markets and chosen
  // categories. They sit as one quiet line per day, never more than two.
  const markets: string[] = client.markets ?? [];
  const cats: string[] = client.event_categories ?? [];
  const big = ((shared ?? []) as { starts: string; ends: string | null; title: string; category: string; regions: string[]; tier: number }[]).filter(
    (e) =>
      (e.ends ?? e.starts) >= from &&
      (cats.length === 0 || cats.includes(e.category)) &&
      (markets.length === 0 || e.regions.includes("Global") || e.regions.some((r) => markets.includes(r))),
  );
  const bigOn = (date: string) => big.filter((e) => e.starts <= date && (e.ends ?? e.starts) >= date);
  const items: Item[] = [
    ...(entries ?? []).map((e) => ({ date: e.date, cls: e.kind === "event" ? "ev event" : "ev", text: e.text, entryId: e.id })),
    ...(posts ?? []).map((p) => ({
      date: p.publish_date,
      cls: p.status === "Client review" ? "ev wait" : p.status === "Posted" || p.status === "Approved" ? "ev good" : "ev",
      tag: `${String(p.publish_time).slice(0, 5)} ${(p.channels as string[]).map((c) => SHORT[c] ?? c).join(" ")}`,
      text: p.body,
      approve: p.status === "Client review",
    })),
    ...(requests ?? []).map((r) => ({ date: r.for_date, cls: "ev req", tag: r.kind, text: r.details })),
  ];

  const cells = Math.ceil((startDay + days) / 7) * 7;
  return (
    <>
      {error ? <div className="msg">{error}</div> : null}
      <div className="calbar">
        <div className="row">
          <b>{title}</b>
          <Link className="btn ghost sm" href={`/c/${id}/calendar?m=${shift(-1)}`}>
            Previous
          </Link>
          <Link className="btn ghost sm" href={`/c/${id}/calendar?m=${shift(1)}`}>
            Next
          </Link>
        </div>
        <div className="legend">
          <span>
            <i style={{ background: "var(--good)" }} />
            Approved or posted
          </span>
          <span>
            <i style={{ background: "var(--pink)" }} />
            {isStaff ? "Waiting on the client" : "Needs your approval"}
          </span>
          <span>
            <i style={{ background: "var(--purple)" }} />
            Being written
          </span>
          <span>
            <i style={{ background: "var(--warn)" }} />
            {isStaff ? "Added by the client" : "Added by you"}
          </span>
          <span>
            <i style={{ background: "var(--blue)" }} />
            Event
          </span>
          <span>
            <i style={{ background: "transparent", border: "1px solid var(--blue)" }} />
            Sport and esports dates
          </span>
        </div>
      </div>
      <div className="tw">
        <div className="cal">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div className="dh" key={d}>
              {d}
            </div>
          ))}
          {Array.from({ length: cells }, (_, i) => {
            const n = i - startDay + 1;
            const inMonth = n >= 1 && n <= days;
            const date = inMonth ? `${month}-${String(n).padStart(2, "0")}` : "";
            return (
              <div key={i} className={`day${inMonth ? "" : " out"}${date === now ? " today" : ""}`}>
                <div className="n">{inMonth ? n : ""}</div>
                {inMonth
                  ? bigOn(date)
                      .slice(0, 2)
                      .map((e) => (
                        <div className="big" key={e.title} title={`${e.category}: ${e.title}`}>
                          {e.title}
                        </div>
                      ))
                  : null}
                {inMonth && bigOn(date).length > 2 ? <div className="big more">and {bigOn(date).length - 2} more</div> : null}
                {items
                  .filter((it) => inMonth && it.date === date)
                  .map((it, k) => (
                    <div className={it.cls} key={k} title={it.text}>
                      {it.tag ? <span className="ev-tag">{it.tag}</span> : null}
                      <span className="ev-text">{it.text}</span>
                      {it.approve ? (
                        <a className="ev-go" href="#approvals">
                          {isStaff ? "With the client" : "Review"}
                        </a>
                      ) : null}
                      {isStaff && it.entryId ? (
                        <form className="inline" action={deleteCalendarEntry.bind(null, id, it.entryId)}>
                          {" "}
                          <button className="btn ghost sm" title="Remove this entry">
                            Remove
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      <section className="plug-sec" id="approvals">
        <h3>
          {isStaff ? "Waiting on the client" : "Waiting for your approval"}
          {waiting && waiting.length ? <span className="count">{waiting.length}</span> : null}
        </h3>
        {waiting && waiting.length ? (
          <div className="approve-grid">
            {waiting.map((p) => (
              <div key={p.id} className="approve">
                <div className="mute small">
                  {p.publish_date} at {String(p.publish_time).slice(0, 5)} on {(p.channels as string[]).join(", ")}
                </div>
                {p.image_path && files[p.image_path] ? (
                  // A short-lived link to a private file, so the image optimiser is not used.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="creative" src={files[p.image_path]} alt="Creative for this post" />
                ) : null}
                <p className="post-body">{p.body}</p>
                {p.is_offer ? <Tags items={["Offer", p.offer_product, p.offer_kind].filter(Boolean)} /> : null}
                {isStaff ? (
                  <Link className="btn ghost sm" href={`/c/${id}/posts`} style={{ justifySelf: "start" }}>
                    Open in posts
                  </Link>
                ) : (
                  <>
                    <form action={reviewPost.bind(null, id, p.id, true)}>
                      <input type="hidden" name="from" value="calendar" />
                      <button className="btn" style={{ width: "100%" }}>
                        Approve
                      </button>
                    </form>
                    <form className="row" action={reviewPost.bind(null, id, p.id, false)}>
                      <input type="hidden" name="from" value="calendar" />
                      <input type="text" name="feedback" placeholder="What should change?" required style={{ flex: 1, minWidth: 140 }} />
                      <button className="btn ghost sm">Ask for changes</button>
                    </form>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">{isStaff ? "Nothing is with the client right now." : "Nothing needs you right now."}</p>
        )}
      </section>

      <section className="plug-sec">
        <div className="grid">
          <div className="card">
            <form className="f" action={addRequest.bind(null, id)}>
              <h2>{isStaff ? "Add something for the client" : "Add something for us to post about"}</h2>
              <div className="row">
                <label>
                  What is it
                  <select name="kind">
                    {REQUEST_KINDS.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Date
                  <input type="date" name="date" defaultValue={now} required />
                </label>
              </div>
              <label>
                Tell us about it
                <textarea name="details" rows={3} placeholder="The offer and its terms, the fixture, whose birthday, what is launching" required />
              </label>
              <label>
                Image or PDF, if you have one
                <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" />
              </label>
              <div>
                <button className="btn">Add to the calendar</button>
              </div>
            </form>
          </div>
          <div className="card">
            <h2>{isStaff ? "What the client has added" : "What you have added"}</h2>
            {(sent ?? []).map((r) => (
              <div key={r.id} className="post">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <b>
                    {r.kind} <span className="mute small">for {r.for_date}</span>
                  </b>
                  <span className={(REQ_PILL[r.status] ?? REQ_PILL.New)[0]}>{(REQ_PILL[r.status] ?? REQ_PILL.New)[1]}</span>
                </div>
                <p className="post-body">{r.details}</p>
                {r.attachment_path && files[r.attachment_path] ? (
                  <a className="small" href={files[r.attachment_path]} target="_blank" rel="noreferrer">
                    Open the file
                  </a>
                ) : null}
                {isStaff ? (
                  <div className="row" style={{ marginTop: 8 }}>
                    {r.status === "New" ? (
                      <form action={setRequestStatus.bind(null, id, r.id, "Scheduled")}>
                        <button className="btn sm">Start on it</button>
                      </form>
                    ) : null}
                    {r.status === "Scheduled" ? (
                      <form action={setRequestStatus.bind(null, id, r.id, "Done")}>
                        <button className="btn sm">Mark posted</button>
                      </form>
                    ) : null}
                    <Link className="btn ghost sm" href={`/briefs?client=${id}&title=${encodeURIComponent(`${r.kind} for ${r.for_date}`)}&details=${encodeURIComponent(r.details)}&due=${r.for_date}`}>
                      Brief design or video
                    </Link>
                    <form action={deleteRequest.bind(null, id, r.id)}>
                      <button className="btn ghost sm">Delete</button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
            {!sent || sent.length === 0 ? <p className="empty">Nothing added yet.</p> : null}
          </div>
        </div>
      </section>

      {isStaff ? (
        <div className="card" style={{ marginTop: 36, maxWidth: 560 }}>
          <h2>Add a 9SM note or event</h2>
          <form className="f" action={addCalendarEntry.bind(null, id)}>
            <div className="row">
              <label>
                Date
                <input type="date" name="date" defaultValue={now} required />
              </label>
              <label>
                Type
                <select name="kind">
                  <option value="event">Event</option>
                  <option value="note">Note</option>
                </select>
              </label>
            </div>
            <label>
              What is it?
              <input type="text" name="text" placeholder="Champions League night, new provider launch, promo window" required />
            </label>
            <div>
              <button className="btn">Add</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
