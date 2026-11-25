import { loadWorkspace } from "@/lib/workspace";
import { Avatar } from "@/components/avatar";
import { Tags } from "@/components/tags";
import { expressInterest } from "@/app/(app)/talent/actions";

type Match = {
  id: string;
  name: string;
  platform: string;
  channel_url: string | null;
  photo_url: string | null;
  audience: string | null;
  bio: string | null;
  tags: string[];
  interest_status: string | null;
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
  return (
    <>
      {error ? <div className="msg">{error}</div> : null}
      <p className="sub" style={{ marginTop: 0 }}>
        {isStaff
          ? "This is what the client sees: people on the roster who match their operator type."
          : "Streamers and creators we think suit your brand. Tell us who you like and our talent team takes it from there."}
      </p>
      <div className="people">
        {matches.map((t) => (
          <div key={t.id} className="person">
            <Avatar name={t.name} photoUrl={t.photo_url} size={64} />
            <div style={{ minWidth: 0, flex: 1 }}>
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
            </div>
          </div>
        ))}
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
