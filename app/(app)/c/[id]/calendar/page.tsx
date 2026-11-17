import Link from "next/link";
import { loadWorkspace, today } from "@/lib/workspace";
import { addCalendarEntry, deleteCalendarEntry } from "../workspace-actions";

type Item = { date: string; cls: string; text: string; entryId?: string };

export default async function Calendar({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string; error?: string }>;
}) {
  const { id } = await params;
  const { m, error } = await searchParams;
  const { supabase, isStaff } = await loadWorkspace(id);

  const now = today();
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(m ?? "") ? (m as string) : now.slice(0, 7);
  const [y, mo] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const startDay = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  const from = `${month}-01`;
  const to = `${month}-${String(days).padStart(2, "0")}`;
  const shift = (n: number) => new Date(Date.UTC(y, mo - 1 + n, 1)).toISOString().slice(0, 7);
  const title = new Date(Date.UTC(y, mo - 1, 1)).toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" });

  const [{ data: entries }, { data: posts }, { data: requests }] = await Promise.all([
    supabase.from("calendar_entries").select("id, date, kind, text").eq("client_id", id).gte("date", from).lte("date", to),
    supabase.from("posts").select("publish_date, channels, body, status").eq("client_id", id).gte("publish_date", from).lte("publish_date", to),
    supabase.from("requests").select("for_date, kind, details").eq("client_id", id).gte("for_date", from).lte("for_date", to),
  ]);
  const items: Item[] = [
    ...(entries ?? []).map((e) => ({ date: e.date, cls: e.kind === "event" ? "ev event" : "ev", text: e.text, entryId: e.id })),
    ...(posts ?? []).map((p) => ({ date: p.publish_date, cls: "ev", text: `${p.channels.join(", ")}: ${p.body} (${p.status})` })),
    ...(requests ?? []).map((r) => ({ date: r.for_date, cls: "ev req", text: `${r.kind}: ${r.details}` })),
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
            <i style={{ background: "var(--purple)" }} />
            Post or note
          </span>
          <span>
            <i style={{ background: "var(--pink)" }} />
            Client request
          </span>
          <span>
            <i style={{ background: "var(--blue)" }} />
            Event
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
                {items
                  .filter((it) => inMonth && it.date === date)
                  .map((it, k) => (
                    <div className={it.cls} key={k}>
                      {it.text}
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
      <br />
      {isStaff ? (
        <div className="card">
          <h2>Add to the calendar</h2>
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
          <p className="mute" style={{ fontSize: 12 }}>
            Posts and operator requests appear on the calendar on their own.
          </p>
        </div>
      ) : (
        <p className="mute">
          Have an offer or launch coming up? <Link href={`/c/${id}/requests`}>Send it to the team.</Link>
        </p>
      )}
    </>
  );
}
