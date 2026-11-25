import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { INTEREST_STAGES, MARKETS, OPERATOR_TAGS, TALENT_PLATFORMS } from "@/lib/workspace";
import { Avatar } from "@/components/avatar";
import { TagPicker, Tags } from "@/components/tags";
import { addTalent, setInterestStatus, setTalentActive } from "./actions";

const STAGE_PILL: Record<string, string> = {
  New: "pill purple",
  "In talks": "pill purple",
  "Proposal sent": "pill pink",
  Signed: "pill good",
  Passed: "pill",
};

type Interest = {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
  clients: { name: string } | { name: string }[] | null;
  talent: { name: string } | { name: string }[] | null;
};
const one = (v: { name: string } | { name: string }[] | null) => (Array.isArray(v) ? v[0]?.name : v?.name) ?? "";

export default async function Talent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff();
  const { error } = await searchParams;
  const supabase = await createClient();
  const [{ data: roster }, { data: interest }] = await Promise.all([
    supabase.from("talent").select("*").order("name"),
    supabase.from("talent_interest").select("id, status, note, created_at, clients(name), talent(name)").order("created_at", { ascending: false }),
  ]);
  const requests = (interest ?? []) as unknown as Interest[];
  return (
    <>
      <h1>Talent</h1>
      <p className="sub">
        Clients are shown people whose operator types match theirs. They never see guide prices or who else someone
        works with.
      </p>
      {error ? <div className="msg">{error}</div> : null}

      <h2>Requests from clients</h2>
      <div className="tw" style={{ marginBottom: 36 }}>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Wants</th>
              <th>Note</th>
              <th>Status</th>
              <th>Move to</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{one(r.clients)}</td>
                <td>{one(r.talent)}</td>
                <td>{r.note}</td>
                <td>
                  <span className={STAGE_PILL[r.status] ?? "pill"}>{r.status}</span>
                </td>
                <td>
                  <div className="row">
                    {INTEREST_STAGES.filter((s) => s !== r.status && s !== "New").map((s) => (
                      <form key={s} action={setInterestStatus.bind(null, r.id, s)}>
                        <button className="btn ghost sm">{s}</button>
                      </form>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="mute">
                  No client has asked about anyone yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Roster</h2>
          <div className="stack">
            {(roster ?? []).map((t) => (
              <div key={t.id} className="person">
                <Avatar name={t.name} photoUrl={t.photo_url} size={48} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <b>{t.name}</b>
                    <form action={setTalentActive.bind(null, t.id, !t.active)}>
                      <button className="btn ghost sm">{t.active ? "Hide from clients" : "Show to clients"}</button>
                    </form>
                  </div>
                  <div className="mute small">
                    {[t.platform, t.audience, t.guide_price ? `Guide ${t.guide_price}` : "", t.active ? "" : "Hidden"]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <Tags items={[...(t.tags ?? []), ...(t.markets ?? [])]} />
                  </div>
                </div>
              </div>
            ))}
            {!roster || roster.length === 0 ? <p className="empty">Nobody on the roster yet.</p> : null}
          </div>
        </div>

        <div className="card">
          <h2>Add to the roster</h2>
          <form className="f" action={addTalent}>
            <div className="row">
              <label>
                Name
                <input type="text" name="name" required />
              </label>
              <label>
                Platform
                <select name="platform">
                  {TALENT_PLATFORMS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Channel link
              <input type="url" name="channel_url" placeholder="https://kick.com/name" />
            </label>
            <label>
              Photo
              <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" />
            </label>
            <label>
              Audience, in your own words
              <input type="text" name="audience" placeholder="4,000 average viewers, mostly slots" />
            </label>
            <label>
              What clients should know about them
              <textarea name="bio" />
            </label>
            <div>
              <div className="mute small" style={{ marginBottom: 4 }}>
                Good fit for these operator types
              </div>
              <TagPicker name="tags" options={OPERATOR_TAGS} />
            </div>
            <div>
              <div className="mute small" style={{ marginBottom: 4 }}>
                Markets. Leave empty for any.
              </div>
              <TagPicker name="markets" options={MARKETS} />
            </div>
            <label>
              Guide price, staff only
              <input type="text" name="guide_price" />
            </label>
            <div>
              <button className="btn">Add to roster</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
