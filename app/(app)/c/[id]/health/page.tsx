import { CHANNELS, loadWorkspace, today } from "@/lib/workspace";
import { Avatar } from "@/components/avatar";
import { logNumbers, saveNote } from "./actions";

type Stat = { channel: string; week: string; followers: number };

// Growth over roughly the last four weeks: the newest entry against the oldest one within 28 days of it.
function growth(rows: Stat[]) {
  if (rows.length < 2) return null;
  const last = rows[rows.length - 1];
  const cutoff = new Date(new Date(last.week).getTime() - 28 * 86400000).toISOString().slice(0, 10);
  const base = rows.find((r) => r.week >= cutoff && r.week < last.week);
  if (!base || base.followers === 0) return null;
  return ((last.followers - base.followers) / base.followers) * 100;
}

function Spark({ values, tone }: { values: number[]; tone: string }) {
  if (values.length < 2) return <span className="mute small">One week so far</span>;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 160},${26 - ((v - min) / span) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 160 28" className="spark" role="img" aria-label={`Follower trend over ${values.length} weeks`}>
      <polyline fill="none" stroke={tone} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  );
}

// Where this client sits against the typical brand: a tick for the median and a dot for them.
function Against({ own, median, tone }: { own: number; median: number; tone: string }) {
  const x = Math.max(8, Math.min(142, 75 + (own - median) * 9));
  return (
    <svg viewBox="0 0 150 20" className="against" role="img" aria-label={`${own.toFixed(1)}% against a typical ${median.toFixed(1)}%`}>
      <line x1="5" y1="10" x2="145" y2="10" stroke="var(--line)" />
      <line x1="75" y1="4" x2="75" y2="16" stroke="var(--faint)" />
      <circle cx={x} cy="10" r="5" fill={tone} />
    </svg>
  );
}

export default async function Health({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, isStaff } = await loadWorkspace(id);
  const [{ data: statRows }, { data: notes }, { data: network }, { data: smmRows }] = await Promise.all([
    supabase.from("channel_stats").select("channel, week, followers").eq("client_id", id).order("week"),
    supabase.from("channel_notes").select("week, body").eq("client_id", id).order("week", { ascending: false }).limit(1),
    supabase.rpc("network_growth"),
    supabase.rpc("client_smm", { p_client: id }),
  ]);
  const stats = (statRows ?? []) as Stat[];
  const note = notes?.[0];
  const smm = (smmRows as { full_name: string | null; photo_url: string | null }[] | null)?.[0];
  const medians = new Map(((network ?? []) as { channel: string; median_growth: number }[]).map((n) => [n.channel, Number(n.median_growth)]));

  const rows = CHANNELS.map((channel) => {
    const series = stats.filter((s) => s.channel === channel).slice(-12);
    const g = growth(series);
    const median = medians.get(channel);
    const state: "new" | "attention" | "strong" | "steady" = g === null ? "new" : g < -0.5 ? "attention" : g >= (median ?? 2) && g > 0.5 ? "strong" : "steady";
    return { channel, series, g, median, state };
  }).filter((r) => r.series.length > 0);
  const TONE = { strong: "var(--good)", steady: "var(--mute)", attention: "var(--warn)", new: "var(--mute)" } as const;
  const WORD = { strong: "Strong", steady: "Steady", attention: "Needs attention", new: "Just started" } as const;

  return (
    <>
      {error ? <div className="msg">{error}</div> : null}

      {note ? (
        <div className="note">
          <div className="smm" style={{ marginBottom: 12 }}>
            <Avatar name={smm?.full_name ?? "9SM"} photoUrl={smm?.photo_url} size={40} />
            <div className="mute small">
              From {smm?.full_name ?? "your 9SM team"}, week of {note.week}
            </div>
          </div>
          <p className="note-body">{note.body}</p>
        </div>
      ) : (
        <p className="empty" style={{ borderTop: 0 }}>
          {isStaff ? "No weekly note yet. Write the first one below." : "Your first weekly note from the team will appear here."}
        </p>
      )}

      {rows.length ? (
        <div className="strip">
          {rows.map((r) => (
            <div key={r.channel} className="strip-row">
              <b>{r.channel}</b>
              <Spark values={r.series.map((s) => s.followers)} tone={TONE[r.state]} />
              <span>
                {r.series[r.series.length - 1].followers.toLocaleString("en")}
                <span className="mute small"> followers</span>
              </span>
              <span>
                {r.g === null ? <span className="mute small">Trend after two weeks</span> : `${r.g >= 0 ? "+" : ""}${r.g.toFixed(1)}% in 4 weeks`}
              </span>
              {r.g !== null && r.median !== undefined ? <Against own={r.g} median={r.median} tone={TONE[r.state]} /> : <span />}
              <span style={{ color: TONE[r.state] }}>{WORD[r.state]}</span>
            </div>
          ))}
          <p className="mute small" style={{ marginTop: 10 }}>
            {medians.size
              ? "The tick is the typical brand we run, the dot is you. Right of the tick is ahead."
              : "A comparison against the typical brand appears once enough brands have data."}
          </p>
        </div>
      ) : null}

      {isStaff ? (
        <div className="grid" style={{ marginTop: 36 }}>
          <div className="card">
            <h2>This week&apos;s note to the client</h2>
            <form className="f" action={saveNote.bind(null, id)}>
              <label>
                Week
                <input type="date" name="week" defaultValue={today()} required />
              </label>
              <label>
                A few plain sentences: what is working, what is steady, what needs attention
                <textarea name="body" required />
              </label>
              <div>
                <button className="btn">Publish note</button>
              </div>
            </form>
            <p className="mute small">The client reads this at the top of the page, next to your photo.</p>
          </div>
          <div className="card">
            <h2>Log follower counts</h2>
            <form className="f" action={logNumbers.bind(null, id)}>
              <label>
                Week
                <input type="date" name="week" defaultValue={today()} required />
              </label>
              <div className="row">
                {CHANNELS.map((c) => (
                  <label key={c} style={{ minWidth: 110 }}>
                    {c}
                    <input type="text" inputMode="numeric" name={`f_${c}`} placeholder="48200" />
                  </label>
                ))}
              </div>
              <div>
                <button className="btn">Save numbers</button>
              </div>
            </form>
            <p className="mute small">
              Typed in by hand for now. Once the platform connections are on, these fill in on their own and this form
              goes away.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
