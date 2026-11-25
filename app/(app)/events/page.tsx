import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { today } from "@/lib/workspace";
import { EVENT_CATEGORIES, EVENT_REGIONS } from "@/lib/scope";
import { Tags } from "@/components/tags";
import { deleteEvent, importEvents } from "./actions";

const TIER = ["", "Biggest", "Big", "Everything else"];

export default async function Events({ searchParams }: { searchParams: Promise<{ error?: string; note?: string }> }) {
  await requireStaff();
  const { error, note } = await searchParams;
  const supabase = await createClient();
  const { data: events } = await supabase.from("global_events").select("*").gte("starts", today()).order("starts").limit(300);
  return (
    <>
      <h1>Events</h1>
      <p className="sub">
        One list of sports and esports dates for every client. Each client&apos;s calendar only shows the ones that fit
        their markets and the level set for them, so a casino sees a handful and a sportsbook sees more.
      </p>
      {error ? <div className="msg">{error}</div> : null}
      {note ? <div className="msg ok">{note}</div> : null}
      <div className="grid">
        <div className="card">
          <h2>Add events</h2>
          <form className="f" action={importEvents}>
            <label>
              One per line: date | title | category | regions | tier
              <textarea
                name="lines"
                style={{ minHeight: 160, fontFamily: "ui-monospace, monospace", fontSize: 13 }}
                placeholder={"2027-02-14 | Super Bowl LXI | American football | US, Global | 1\n2026-12-26 | Boxing Day fixtures | Football | UK | 2\n2027-05-01..2027-05-17 | Example Major | Esports | Global | 2"}
                required
              />
            </label>
            <div>
              <button className="btn">Save events</button>
            </div>
          </form>
          <p className="mute small">
            Tier 1 is the handful everybody knows. Tier 2 is big. Tier 3 is everything else. For a run of days, put two
            dots between the start and end date.
          </p>
          <p className="mute small">Categories: {EVENT_CATEGORIES.join(", ")}.</p>
          <p className="mute small">Regions: {EVENT_REGIONS.join(", ")}.</p>
        </div>
        <div className="card">
          <h2>Coming up</h2>
          <div className="tw">
            <table>
              <tbody>
                {(events ?? []).map((e) => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {e.starts}
                      {e.ends ? ` to ${e.ends}` : ""}
                    </td>
                    <td>
                      <b>{e.title}</b>
                      <div className="mute small">
                        {e.category}, {TIER[e.tier]}
                      </div>
                      <Tags items={e.regions} />
                    </td>
                    <td>
                      <form action={deleteEvent.bind(null, e.id)}>
                        <button className="btn ghost sm">Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
                {!events || events.length === 0 ? (
                  <tr>
                    <td className="mute">No events yet. Paste the first batch.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
