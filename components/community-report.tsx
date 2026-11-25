type Stat = { channel: string; week: string; followers: number };

// A steady number from a string, so sample figures stay the same on every load.
function seeded(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// What a client with Community on their plan sees. Member counts are the
// logged ones. Everything marked sample is a stand-in until the Discord and
// Telegram bots are connected (see docs/INTEGRATIONS.md).
export function CommunityReport({ clientId, stats }: { clientId: string; stats: Stat[] }) {
  const rnd = seeded(clientId + "community");
  const places = ["Discord", "Telegram"]
    .map((channel) => {
      const series = stats.filter((s) => s.channel === channel);
      if (series.length === 0) return null;
      const last = series[series.length - 1].followers;
      const prev = series[Math.max(0, series.length - 5)].followers;
      const active = Math.round(last * (0.18 + rnd() * 0.14));
      return {
        channel,
        members: last,
        joined: last - prev,
        active,
        messages: Math.round(active * (9 + rnd() * 14)),
        reply: Math.round(40 + rnd() * 110),
      };
    })
    .filter((p) => p !== null);
  if (places.length === 0) return null;
  const answered = Math.round(180 + rnd() * 260);
  const flagged = Math.round(3 + rnd() * 6);
  const removed = Math.round(12 + rnd() * 40);
  const pos = Math.round(58 + rnd() * 20);
  const neg = Math.round(5 + rnd() * 9);
  const asks = [
    ["How long do withdrawals take?", Math.round(40 + rnd() * 50)],
    ["Where do I find the terms for this week's offer?", Math.round(25 + rnd() * 30)],
    ["Is the giveaway open in my country?", Math.round(15 + rnd() * 25)],
    ["When is the next tournament?", Math.round(10 + rnd() * 20)],
  ] as [string, number][];
  const events = [
    ["Friday", "Slot tournament with a live leaderboard"],
    ["Sunday", "Watch-along thread for the late kick-off"],
    ["Next Wednesday", "Ask the team anything, in voice chat"],
  ];
  const fmt = (n: number) => n.toLocaleString("en");
  const time = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} sec` : `${s} sec`);
  return (
    <>
      <section className="plug-sec">
        <h3>
          Your community this week <i className="sample">Sample figures</i>
        </h3>
        <div className="tiles">
          <div className="tile">
            <span>Questions answered</span>
            <b>{fmt(answered)}</b>
            <em style={{ color: "var(--good)" }}>Every one got a reply</em>
          </div>
          <div className="tile">
            <span>Typical first reply</span>
            <b>{time(Math.round(places.reduce((a, p) => a + p.reply, 0) / places.length))}</b>
            <em className="mute">Around the clock</em>
          </div>
          <div className="tile">
            <span>Scam and spam accounts removed</span>
            <b>{removed}</b>
            <em className="mute">Before most members saw them</em>
          </div>
          <div className="tile">
            <span>Raised with your team</span>
            <b>{flagged}</b>
            <em className="mute">Issues we could not close ourselves</em>
          </div>
        </div>
      </section>

      <section className="plug-sec">
        <h3>By platform</h3>
        <div className="tw" style={{ marginTop: 10 }}>
          <table>
            <thead>
              <tr>
                <th />
                <th>Members</th>
                <th>Joined, 4 weeks</th>
                <th>Active this week</th>
                <th>Messages this week</th>
                <th>Typical first reply</th>
              </tr>
            </thead>
            <tbody>
              {places.map((p) => (
                <tr key={p.channel}>
                  <td>
                    <b>{p.channel}</b>
                  </td>
                  <td>{fmt(p.members)}</td>
                  <td style={{ color: p.joined >= 0 ? "var(--good)" : "var(--bad)" }}>
                    {p.joined >= 0 ? "+" : ""}
                    {fmt(p.joined)}
                  </td>
                  <td>{fmt(p.active)}</td>
                  <td>{fmt(p.messages)}</td>
                  <td>{time(p.reply)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="plug-sec">
        <div className="grid">
          <div className="card">
            <h3 style={{ font: "19px/1.2 var(--display)", margin: 0 }}>What players are asking</h3>
            {asks.map(([q, n]) => (
              <div key={q} className="offer" style={{ padding: "12px 0" }}>
                <span>{q}</span>
                <span className="mute">{n} times</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{ font: "19px/1.2 var(--display)", margin: 0 }}>Mood</h3>
            <div className="mood" role="img" aria-label={`${pos}% positive, ${100 - pos - neg}% neutral, ${neg}% negative`}>
              <i style={{ width: `${pos}%`, background: "var(--good)" }} />
              <i style={{ width: `${100 - pos - neg}%`, background: "var(--faint)" }} />
              <i style={{ width: `${neg}%`, background: "var(--bad)" }} />
            </div>
            <div className="mute small">
              {pos}% positive, {100 - pos - neg}% neutral, {neg}% negative
            </div>
            <h3 style={{ font: "19px/1.2 var(--display)", margin: "26px 0 0" }}>Coming up in your community</h3>
            {events.map(([when, what]) => (
              <div key={what} className="offer" style={{ padding: "12px 0" }}>
                <span>{what}</span>
                <span className="mute">{when}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
