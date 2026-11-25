import { loadWorkspace } from "@/lib/workspace";
import { Avatar } from "@/components/avatar";
import { Tags } from "@/components/tags";
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

export default async function ClientTalent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, client, isStaff } = await loadWorkspace(id);
  const { data } = await supabase.rpc("talent_for_client", { p_client: id });
  const matches = (data ?? []) as Match[];
  const noTags = !client.tags || client.tags.length === 0;
  const featured = matches.filter((t) => t.pitch_headline);
  const rest = matches.filter((t) => !t.pitch_headline);
  return (
    <>
      {error ? <div className="msg">{error}</div> : null}
      <p className="sub" style={{ marginTop: 0 }}>
        {isStaff
          ? "This is what the client sees: people who match their operator type, with anyone you feature at the top."
          : "Streamers and creators we think suit your brand. Tell us who you like and our talent team takes it from there."}
      </p>
      {featured.length ? (
        <div className="spot">
          <h2>Picked for you</h2>
          {featured.map((t) => {
            const pitched = true;
            return (
          <div key={t.id} className={pitched ? "person pitched" : "person"}>
            <Avatar name={t.name} photoUrl={t.photo_url} size={pitched ? 76 : 64} />
            <div style={{ minWidth: 0, flex: 1 }}>
              {pitched ? (
                <div className="pitch-line">
                  {t.pitch_headline}
                  {t.pitch_until ? <span className="mute">, available until {t.pitch_until}</span> : null}
                </div>
              ) : null}
              <div className="row" style={{ justifyContent: "space-between" }}>
                <b className="person-name">{t.name}</b>
                {t.interest_status ? (
                  <span className={(SEEN[t.interest_status] ?? SEEN.New)[0]}>{(SEEN[t.interest_status] ?? SEEN.New)[1]}</span>
                ) : null}
              </div>
              <div className="mute small">
                {t.platform}
                {t.audience ? `, ${t.audience}` : ""}
              </div>
              {t.guide_price ? <div className="price">From {t.guide_price}</div> : null}
              {t.bio ? <p className="post-body" style={{ margin: "8px 0" }}>{t.bio}</p> : null}
              <Tags items={t.tags} />
              <div className="row" style={{ marginTop: 10 }}>
                {t.channel_url ? (
                  <a className="btn ghost sm" href={t.channel_url} target="_blank" rel="noreferrer">
                    Open their channel
                  </a>
                ) : null}
                {!t.interest_status ? (
                  <form className="row" action={expressInterest.bind(null, id, t.id)} style={{ flex: 1, minWidth: 240 }}>
                    <input type="text" name="note" placeholder="Anything we should know? Optional" style={{ flex: 1 }} />
                    <button className="btn sm">I&apos;m interested</button>
                  </form>
                ) : null}
              </div>
              {isStaff ? (
                pitched ? (
                  <form action={removePitch.bind(null, id, t.id)} style={{ marginTop: 10 }}>
                    <button className="btn ghost sm">Stop featuring</button>
                  </form>
                ) : (
                  <form className="row" action={pitchTalent.bind(null, id, t.id)} style={{ marginTop: 10 }}>
                    <input type="text" name="headline" placeholder="Why them, in one line" style={{ flex: 2, minWidth: 180 }} required />
                    <input type="date" name="until" title="Available until, if there is a real deadline" style={{ flex: 1, minWidth: 130 }} />
                    <button className="btn ghost sm">Feature for this client</button>
                  </form>
                )
              ) : null}
            </div>
          </div>
            );
          })}
        </div>
      ) : null}
      {rest.length ? <h2>{featured.length ? "Also a good fit" : "A good fit for you"}</h2> : null}
      <div className="people">
        {rest.map((t) => {
          const pitched = false;
          return (
          <div key={t.id} className={pitched ? "person pitched" : "person"}>
            <Avatar name={t.name} photoUrl={t.photo_url} size={pitched ? 76 : 64} />
            <div style={{ minWidth: 0, flex: 1 }}>
              {pitched ? (
                <div className="pitch-line">
                  {t.pitch_headline}
                  {t.pitch_until ? <span className="mute">, available until {t.pitch_until}</span> : null}
                </div>
              ) : null}
              <div className="row" style={{ justifyContent: "space-between" }}>
                <b className="person-name">{t.name}</b>
                {t.interest_status ? (
                  <span className={(SEEN[t.interest_status] ?? SEEN.New)[0]}>{(SEEN[t.interest_status] ?? SEEN.New)[1]}</span>
                ) : null}
              </div>
              <div className="mute small">
                {t.platform}
                {t.audience ? `, ${t.audience}` : ""}
              </div>
              {t.guide_price ? <div className="price">From {t.guide_price}</div> : null}
              {t.bio ? <p className="post-body" style={{ margin: "8px 0" }}>{t.bio}</p> : null}
              <Tags items={t.tags} />
              <div className="row" style={{ marginTop: 10 }}>
                {t.channel_url ? (
                  <a className="btn ghost sm" href={t.channel_url} target="_blank" rel="noreferrer">
                    Open their channel
                  </a>
                ) : null}
                {!t.interest_status ? (
                  <form className="row" action={expressInterest.bind(null, id, t.id)} style={{ flex: 1, minWidth: 240 }}>
                    <input type="text" name="note" placeholder="Anything we should know? Optional" style={{ flex: 1 }} />
                    <button className="btn sm">I&apos;m interested</button>
                  </form>
                ) : null}
              </div>
              {isStaff ? (
                pitched ? (
                  <form action={removePitch.bind(null, id, t.id)} style={{ marginTop: 10 }}>
                    <button className="btn ghost sm">Stop featuring</button>
                  </form>
                ) : (
                  <form className="row" action={pitchTalent.bind(null, id, t.id)} style={{ marginTop: 10 }}>
                    <input type="text" name="headline" placeholder="Why them, in one line" style={{ flex: 2, minWidth: 180 }} required />
                    <input type="date" name="until" title="Available until, if there is a real deadline" style={{ flex: 1, minWidth: 130 }} />
                    <button className="btn ghost sm">Feature for this client</button>
                  </form>
                )
              ) : null}
            </div>
          </div>
          );
        })}
      </div>
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
