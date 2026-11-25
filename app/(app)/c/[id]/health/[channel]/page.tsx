import Link from "next/link";
import { notFound } from "next/navigation";
import { CHANNELS, loadWorkspace } from "@/lib/workspace";

type Stat = { week: string; followers: number };

// A steady number from a string, so the sample figures stay the same on every load.
function seeded(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}m` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : n.toLocaleString("en"));
const day = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleString("en", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function ChannelAnalytics({ params }: { params: Promise<{ id: string; channel: string }> }) {
  const { id, channel: raw } = await params;
  const channel = decodeURIComponent(raw);
  if (!CHANNELS.includes(channel)) notFound();
  const { supabase } = await loadWorkspace(id);
  const [{ data: statRows }, { data: postRows }] = await Promise.all([
    supabase.from("channel_stats").select("week, followers").eq("client_id", id).eq("channel", channel).order("week"),
    supabase.from("posts").select("id, body, publish_date, status, live_url, channels").eq("client_id", id).eq("status", "Posted").contains("channels", [channel]).order("publish_date", { ascending: false }).limit(5),
  ]);
  const series = ((statRows ?? []) as Stat[]).slice(-12);
  if (series.length === 0) notFound();
  const last = series[series.length - 1];
  const first = series[0];
  const change = first.followers ? ((last.followers - first.followers) / first.followers) * 100 : 0;
  const up = change >= 0;
  const tone = Math.abs(change) < 0.5 ? "var(--mute)" : up ? "var(--good)" : "var(--bad)";

  // Chart geometry
  const W = 760, H = 240, L = 54, R = 12, T = 14, B = 30;
  const vals = series.map((s) => s.followers);
  const min = Math.min(...vals), max = Math.max(...vals);
  const pad = (max - min || 1) * 0.15;
  const lo = min - pad, hi = max + pad;
  const x = (i: number) => L + (series.length === 1 ? 0 : (i / (series.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const line = series.map((s, i) => `${x(i)},${y(s.followers)}`).join(" ");
  const area = `${L},${H - B} ${line} ${x(series.length - 1)},${H - B}`;
  const deltas = series.slice(1).map((s, i) => ({ week: s.week, d: s.followers - series[i].followers }));
  const dmax = Math.max(1, ...deltas.map((d) => Math.abs(d.d)));

  // Sample figures until the platform is connected.
  const rnd = seeded(`${id}${channel}`);
  const reach = Math.round(last.followers * (6 + rnd() * 9));
  const rate = 1.2 + rnd() * 3.4;
  const clicks = Math.round(reach * (0.004 + rnd() * 0.01));
  const replies = Math.round(reach * (0.0008 + rnd() * 0.002));
  const sample = [
    { label: "Impressions, last 28 days", value: short(reach), move: (rnd() - 0.4) * 30 },
    { label: "Engagement rate", value: `${rate.toFixed(1)}%`, move: (rnd() - 0.45) * 20 },
    { label: "Link clicks", value: short(clicks), move: (rnd() - 0.4) * 40 },
    { label: "Replies and comments", value: short(replies), move: (rnd() - 0.4) * 35 },
  ];
  const posts = (postRows ?? []).map((p) => {
    const views = Math.round(last.followers * (0.4 + rnd() * 2.6));
    return { ...p, views, engaged: Math.round(views * (0.01 + rnd() * 0.05)) };
  });

  return (
    <>
      <p className="small" style={{ margin: 0 }}>
        <Link href={`/c/${id}/health`}>Channel health</Link>
      </p>
      <div className="plug-head" style={{ marginTop: 6 }}>
        <h2>{channel}</h2>
        <span className="state" style={{ color: tone }}>
          <i style={{ background: tone }} />
          {up ? "+" : ""}
          {change.toFixed(1)}% over {series.length} weeks
        </span>
      </div>

      <div className="tiles">
        <div className="tile">
          <span>Followers</span>
          <b>{last.followers.toLocaleString("en")}</b>
          <em style={{ color: tone }}>
            {up ? "+" : ""}
            {(last.followers - first.followers).toLocaleString("en")} since {day(first.week)}
          </em>
        </div>
        {sample.map((t) => (
          <div key={t.label} className="tile">
            <span>
              {t.label} <i className="sample">Sample</i>
            </span>
            <b>{t.value}</b>
            <em style={{ color: t.move >= 0 ? "var(--good)" : "var(--bad)" }}>
              {t.move >= 0 ? "+" : ""}
              {t.move.toFixed(0)}% on the month before
            </em>
          </div>
        ))}
      </div>

      <section className="plug-sec">
        <h3>Followers by week</h3>
        <div className="tw">
          <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`${channel} followers from ${day(first.week)} to ${day(last.week)}`}>
            {[0, 0.5, 1].map((f) => {
              const v = lo + (hi - lo) * f;
              return (
                <g key={f}>
                  <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line-soft)" />
                  <text x={L - 8} y={y(v) + 4} textAnchor="end" className="axis">
                    {short(Math.round(v))}
                  </text>
                </g>
              );
            })}
            <polygon points={area} fill={tone} opacity="0.1" />
            <polyline points={line} fill="none" stroke={tone} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {series.map((s, i) => (
              <g key={s.week}>
                <circle cx={x(i)} cy={y(s.followers)} r="3.5" fill="var(--ink)" stroke={tone} strokeWidth="2">
                  <title>{`${day(s.week)}: ${s.followers.toLocaleString("en")}`}</title>
                </circle>
                {i % 2 === (series.length - 1) % 2 ? (
                  <text x={x(i)} y={H - 8} textAnchor="middle" className="axis">
                    {day(s.week)}
                  </text>
                ) : null}
              </g>
            ))}
          </svg>
        </div>
      </section>

      {deltas.length ? (
        <section className="plug-sec">
          <h3>Gained or lost each week</h3>
          <div className="bars">
            {deltas.map((d) => (
              <div key={d.week} className="bar-col" title={`${day(d.week)}: ${d.d >= 0 ? "+" : ""}${d.d.toLocaleString("en")}`}>
                <div className="bar-up">{d.d >= 0 ? <i style={{ height: `${(d.d / dmax) * 100}%`, background: "var(--good)" }} /> : null}</div>
                <div className="bar-down">{d.d < 0 ? <i style={{ height: `${(-d.d / dmax) * 100}%`, background: "var(--bad)" }} /> : null}</div>
                <span>{d.d >= 0 ? "+" : ""}{short(d.d)}</span>
                <small>{day(d.week)}</small>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {posts.length ? (
        <section className="plug-sec">
          <h3>
            Recent posts <i className="sample">Sample numbers</i>
          </h3>
          <div className="tw" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Posted</th>
                  <th>Post</th>
                  <th>Views</th>
                  <th>Engaged</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{day(p.publish_date)}</td>
                    <td>{p.body}</td>
                    <td>{short(p.views)}</td>
                    <td>{short(p.engaged)}</td>
                    <td>
                      {p.live_url ? (
                        <a href={p.live_url} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <p className="mute small" style={{ marginTop: 28 }}>
        Follower numbers are the ones logged for this brand. Anything marked sample is made up for now and is replaced
        by real figures once {channel} is connected.
      </p>
    </>
  );
}
