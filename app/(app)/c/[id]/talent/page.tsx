import Link from "next/link";
import { loadWorkspace } from "@/lib/workspace";
import { Avatar } from "@/components/avatar";
import { expressInterest, pitchTalent, removePitch } from "@/app/(app)/talent/actions";

type Match = {
  id: string;
  name: string;
  platform: string;
  channel_url: string | null;
  photo_url: string | null;
  audience: string | null;
  bio: string | null;
  tags: string[];
  guide_price?: string | null;
  interest_status: string | null;
  pitch_headline?: string | null;
  pitch_until?: string | null;
};

// What the client reads for each stage. Internal stage names stay internal.
const SEEN: Record<string, [string, string]> = {
  New: ["pill purple", "Request received"],
  "In talks": ["pill purple", "We are talking to them"],
  "Proposal sent": ["pill pink", "Proposal with you"],
  Signed: ["pill good", "Signed"],
  Passed: ["pill", "Not going ahead"],
};

// What kind of talent someone is comes from where they are. This is how a client reads them.
const KIND: Record<string, { word: string; group: string }> = {
  Kick: { word: "streamer", group: "Streamers" },
  Twitch: { word: "streamer", group: "Streamers" },
  YouTube: { word: "creator", group: "YouTube creators" },
  Instagram: { word: "creator", group: "Instagram creators" },
  TikTok: { word: "creator", group: "TikTok creators" },
  X: { word: "KOL", group: "X KOLs" },
};
const GROUPS = ["Streamers", "X KOLs", "Instagram creators", "TikTok creators", "YouTube creators"];

// Simple marks for the kind of talent. Not the platforms' own logos.
function KindIcon({ platform }: { platform: string }) {
  const word = KIND[platform]?.word;
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      {word === "streamer" ? (
        <>
          <circle cx="12" cy="12" r="2.2" {...p} />
          <path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9M4.5 4.5a10.6 10.6 0 0 0 0 15M19.5 4.5a10.6 10.6 0 0 1 0 15" {...p} />
        </>
      ) : word === "KOL" ? (
        <path d="M4 10v4h3l6 4V6l-6 4H4zM16.5 9a4.2 4.2 0 0 1 0 6M19 6.5a7.8 7.8 0 0 1 0 11" {...p} />
      ) : (
        <>
          <rect x="3.5" y="6.5" width="17" height="12" rx="2.5" {...p} />
          <circle cx="12" cy="12.5" r="3.2" {...p} />
          <path d="M8.5 6.5l1.2-2h4.6l1.2 2" {...p} />
        </>
      )}
    </svg>
  );
}

function Badge({ platform }: { platform: string }) {
  return (
    <span className={`plat plat-${platform.toLowerCase()}`}>
      <KindIcon platform={platform} />
      {platform} {KIND[platform]?.word ?? "creator"}
    </span>
  );
}

export default async function ClientTalent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; t?: string }>;
}) {
  const { id } = await params;
  const { error, t: pick } = await searchParams;
  const { supabase, client, isStaff } = await loadWorkspace(id);
  const { data } = await supabase.rpc("talent_for_client", { p_client: id });
  const matches = (data ?? []) as Match[];
  const noTags = !client.tags || client.tags.length === 0;
  const groupOf = (m: Match) => KIND[m.platform]?.group ?? "Other";
  const groups = GROUPS.filter((g) => matches.some((m) => groupOf(m) === g));
  const group = groups.includes(pick ?? "") ? pick : undefined;
  const shown = group ? matches.filter((m) => groupOf(m) === group) : matches;
  const featured = shown.filter((m) => m.pitch_headline);
  const rest = shown.filter((m) => !m.pitch_headline);

  const card = (t: Match, pitched: boolean) => {
    const seen = t.interest_status ? (SEEN[t.interest_status] ?? SEEN.New) : null;
    return (
      <div key={t.id} className={pitched ? "person pitched" : "person"}>
        <Avatar name={t.name} photoUrl={t.photo_url} size={pitched ? 76 : 60} />
        <div style={{ minWidth: 0, flex: 1 }}>
          {pitched ? (
            <div className="pitch-line">
              {t.pitch_headline}
              {t.pitch_until ? <span className="mute">, available until {t.pitch_until}</span> : null}
            </div>
          ) : null}
          <div className="row" style={{ justifyContent: "space-between" }}>
            <b className="person-name">{t.name}</b>
            {seen ? <span className={seen[0]}>{seen[1]}</span> : null}
          </div>
          <div className="row" style={{ gap: 8, margin: "6px 0" }}>
            <Badge platform={t.platform} />
            {t.tags.map((tag) => (
              <span key={tag} className="fit">
                {tag}
              </span>
            ))}
          </div>
          {t.audience ? <div className="mute small">{t.audience}</div> : null}
          {t.bio ? <p className="post-body" style={{ margin: "6px 0" }}>{t.bio}</p> : null}
          {t.guide_price ? <div className="price">{t.guide_price}</div> : null}
          <div className="row" style={{ marginTop: 10 }}>
            {!t.interest_status ? (
              <form action={expressInterest.bind(null, id, t.id)}>
                <button className="btn sm">I&apos;m interested</button>
              </form>
            ) : null}
            {t.channel_url ? (
              <a className="btn ghost sm" href={t.channel_url} target="_blank" rel="noreferrer">
                Open their channel
              </a>
            ) : null}
          </div>
          {isStaff ? (
            pitched ? (
              <form action={removePitch.bind(null, id, t.id)} style={{ marginTop: 10 }}>
                <button className="btn ghost sm">Stop featuring</button>
              </form>
            ) : (
              <form className="row" action={pitchTalent.bind(null, id, t.id)} style={{ marginTop: 10 }}>
                <input type="text" name="headline" placeholder="Why them, in one line" style={{ flex: 2, minWidth: 160 }} required />
                <input type="date" name="until" title="Available until, if there is a real deadline" style={{ flex: 1, minWidth: 130 }} />
                <button className="btn ghost sm">Feature</button>
              </form>
            )
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <>
      {error ? <div className="msg">{error}</div> : null}
      <div className="plug-head">
        <div>
          <h2>Talent</h2>
          <p className="plug-tag">
            {isStaff
              ? "This is what the client sees: people who fit their operator type, with anyone you feature at the top."
              : "Streamers, creators and KOLs who fit your brand. Tell us who you like and the talent team takes it from there."}
          </p>
        </div>
      </div>
      {groups.length > 1 ? (
        <div className="filters">
          <Link className={group ? "filter" : "filter on"} href={`/c/${id}/talent`}>
            Everyone <span>{matches.length}</span>
          </Link>
          {groups.map((g) => (
            <Link key={g} className={group === g ? "filter on" : "filter"} href={`/c/${id}/talent?t=${encodeURIComponent(g)}`}>
              {g} <span>{matches.filter((m) => groupOf(m) === g).length}</span>
            </Link>
          ))}
        </div>
      ) : null}
      {featured.length ? (
        <div className="spot">
          <h2>Picked for you</h2>
          {featured.map((t) => card(t, true))}
        </div>
      ) : null}
      {rest.length ? <h2>{featured.length ? "Also a good fit" : "A good fit for you"}</h2> : null}
      <div className="people">{rest.map((t) => card(t, false))}</div>
      {matches.length === 0 ? (
        <p className="empty">
          {noTags && isStaff
            ? "This client has no operator type set, so nobody matches. Set it under Onboarding and hub."
            : "Nobody to show yet. We will add people here as we find a good fit."}
        </p>
      ) : null}
    </>
  );
}
