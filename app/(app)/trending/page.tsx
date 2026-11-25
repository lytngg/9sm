import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OPERATOR_TAGS } from "@/lib/workspace";
import { SAMPLE_TRENDS } from "@/lib/trending-sample";
import { addWatch, removeWatch } from "./actions";

const WINDOWS: [string, string, number][] = [
  ["hour", "Last hour", 60],
  ["day", "Today", 1440],
  ["week", "This week", 10080],
];
const SEGMENTS = ["Crypto casino", "Sweepstakes casino", "Sportsbook"];
const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}m` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));
const ago = (m: number) => (m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} hr ago` : `${Math.round(m / 1440)} days ago`);

export default async function Trending({ searchParams }: { searchParams: Promise<{ w?: string; s?: string; error?: string }> }) {
  await requireStaff();
  const { w, s, error } = await searchParams;
  const supabase = await createClient();
  const { data: watch } = await supabase.from("watch_accounts").select("id, handle, segment").order("segment").order("handle");
  const win = WINDOWS.find((x) => x[0] === w) ?? WINDOWS[0];
  const seg = SEGMENTS.includes(s ?? "") ? s : undefined;
  const posts = SAMPLE_TRENDS.filter((p) => p.minutesAgo <= win[2] && (!seg || p.segment === seg)).sort((a, b) => b.lift - a.lift);
  const count = (key: "theme" | "format") => {
    const m = new Map<string, number>();
    posts.forEach((p) => m.set(p[key], (m.get(p[key]) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const href = (ww: string, ss?: string) => `/trending?w=${ww}${ss ? `&s=${encodeURIComponent(ss)}` : ""}`;
  return (
    <>
      <h1>Trending</h1>
      <p className="sub">What other gambling brands are posting that is doing better than their usual. Somewhere to look before you write today.</p>
      <div className="rules" style={{ marginTop: 14 }}>
        <b>This is a sample feed</b>
        <p>
          The accounts and posts below are invented to show how the page works. It goes live once the X connection is
          on, reading the accounts in the watchlist at the bottom every hour.
        </p>
      </div>
      {error ? <div className="msg">{error}</div> : null}

      <div className="filters">
        {WINDOWS.map((x) => (
          <Link key={x[0]} className={win[0] === x[0] ? "filter on" : "filter"} href={href(x[0], seg)}>
            {x[1]}
          </Link>
        ))}
        <span style={{ width: 12 }} />
        <Link className={!seg ? "filter on" : "filter"} href={href(win[0])}>
          Every type
        </Link>
        {SEGMENTS.map((x) => (
          <Link key={x} className={seg === x ? "filter on" : "filter"} href={href(win[0], x)}>
            {x}
          </Link>
        ))}
      </div>

      {posts.length ? (
        <div className="row" style={{ gap: 28, alignItems: "flex-start", marginBottom: 26 }}>
          <div>
            <div className="mute small" style={{ marginBottom: 6 }}>What they are talking about</div>
            <div className="row" style={{ gap: 8 }}>
              {count("theme").map(([t, n]) => (
                <span key={t} className="chip">
                  {t} <b>{n}</b>
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="mute small" style={{ marginBottom: 6 }}>Formats that are landing</div>
            <div className="row" style={{ gap: 8 }}>
              {count("format").map(([t, n]) => (
                <span key={t} className="chip">
                  {t} <b>{n}</b>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="trend-grid">
        {posts.map((p) => (
          <div key={p.handle + p.minutesAgo} className="trend">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>
                <b>{p.handle}</b> <span className="mute small">{p.segment}</span>
              </span>
              <span className="lift">{p.lift.toFixed(1)}x their usual</span>
            </div>
            <p className="post-body" style={{ margin: "10px 0" }}>{p.text}</p>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mute small">
                {ago(p.minutesAgo)}, {short(p.views)} views, {short(p.likes)} likes, {short(p.reposts)} reposts
              </span>
              <span className="chip">{p.format}</span>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <Link
                className="btn ghost sm"
                href={`/briefs?title=${encodeURIComponent(`Our take on: ${p.theme.toLowerCase()}`)}&details=${encodeURIComponent(`Inspired by a ${p.format.toLowerCase()} post from ${p.handle}: "${p.text}"`)}`}
              >
                Make it a task
              </Link>
            </div>
          </div>
        ))}
      </div>
      {posts.length === 0 ? <p className="empty">Nothing above the usual in that window. Try a wider one.</p> : null}

      <section className="plug-sec" id="watchlist">
        <h3>Watchlist</h3>
        <p className="mute small">The accounts the feed will read. Add competitors and brands worth learning from.</p>
        <div className="grid" style={{ marginTop: 14 }}>
          <div className="card">
            {(watch ?? []).map((a) => (
              <div key={a.id} className="offer" style={{ padding: "10px 0" }}>
                <span>
                  <b>@{a.handle}</b> <span className="mute small">{a.segment}</span>
                </span>
                <form action={removeWatch.bind(null, a.id)}>
                  <button className="btn ghost sm">Remove</button>
                </form>
              </div>
            ))}
            {!watch || watch.length === 0 ? <p className="empty">Nobody on the list yet.</p> : null}
          </div>
          <div className="card">
            <form className="f" action={addWatch}>
              <h2>Add an account</h2>
              <label>
                X handle
                <input type="text" name="handle" placeholder="@brandname" required />
              </label>
              <label>
                What kind of brand
                <select name="segment">
                  {OPERATOR_TAGS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <div>
                <button className="btn">Add to the watchlist</button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
