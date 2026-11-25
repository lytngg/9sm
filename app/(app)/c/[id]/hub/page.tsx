import { loadWorkspace, MARKETS, OPERATOR_TAGS } from "@/lib/workspace";
import { doneCount, onboardingSteps, type ClientProfile } from "@/lib/onboarding";
import { signedUrls } from "@/lib/files";
import { TagPicker } from "@/components/tags";
import { EVENT_CATEGORIES, EVENT_LEVELS } from "@/lib/scope";
import { saveHub, saveHubStaff } from "./actions";

const STATE = { done: ["pill good", "Done"], client: ["pill pink", "With the client"], "9sm": ["pill purple", "With 9SM"] } as const;

export default async function Hub({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const { supabase, client, isStaff } = await loadWorkspace(id);
  const { data } = await supabase.from("client_profile").select("*").eq("client_id", id).maybeSingle();
  const p = data as ClientProfile | null;
  const steps = onboardingSteps(p);
  const n = doneCount(steps);
  const files = await signedUrls(supabase, [p?.brand_guidelines_path]);
  const guidelines = p?.brand_guidelines_path ? files[p.brand_guidelines_path] : null;
  const v = (k: keyof ClientProfile) => (p?.[k] as string | null) ?? "";
  const save = saveHub.bind(null, id);

  return (
    <>
      {error ? <div className="msg">{error}</div> : null}
      {saved ? <div className="msg ok">Saved.</div> : null}

      <div className="onb">
        <div className="onb-head">
          <div>
            <h2 style={{ margin: 0 }}>{n === steps.length ? "Onboarding complete" : `Onboarding, ${n} of ${steps.length} done`}</h2>
            <div className="mute small">
              {p?.go_live_date ? `Go-live date ${p.go_live_date}` : "Go-live date not set yet"}
            </div>
          </div>
          <div className="key" style={{ margin: 0 }}>
            <span className="pill pink">With the client</span>
            <span className="pill purple">With 9SM</span>
          </div>
        </div>
        <div className="onb-bar" role="img" aria-label={`${n} of ${steps.length} onboarding steps done`}>
          {steps.map((s) => (
            <i key={s.key} className={s.state === "done" ? "on" : s.state === "9sm" ? "p" : "k"} />
          ))}
        </div>
        <ol className="onb-steps">
          {steps.map((s) => (
            <li key={s.key}>
              <b>{s.label}</b>
              <span className="mute small">{s.hint}</span>
              <span className={STATE[s.state][0]}>{STATE[s.state][1]}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Brand</h2>
          <form className="f" action={save}>
            <label>
              Brand guidelines link
              <input type="url" name="brand_guidelines_url" defaultValue={v("brand_guidelines_url")} placeholder="https://" />
            </label>
            <label>
              Or upload the file
              <input type="file" name="brand_file" accept="application/pdf,image/jpeg,image/png,image/webp" />
            </label>
            {guidelines ? (
              <p className="small" style={{ margin: 0 }}>
                <a href={guidelines} target="_blank" rel="noreferrer">
                  Open the uploaded guidelines
                </a>
              </p>
            ) : null}
            <label>
              Figma link
              <input type="url" name="figma_url" defaultValue={v("figma_url")} placeholder="https://" />
            </label>
            <label>
              Tone of voice, and anything we should never say
              <textarea name="tone_notes" defaultValue={v("tone_notes")} />
            </label>
            <div>
              <button className="btn">Save brand</button>
            </div>
          </form>
          <p className="mute small">Files up to 4 MB. For anything bigger, paste a link.</p>
        </div>

        <div className="card">
          <h2>Accounts and product</h2>
          <form className="f" action={save}>
            <label>
              Social handles, one per line
              <textarea name="handles" defaultValue={v("handles")} placeholder={"X: @yourbrand\nInstagram: @yourbrand"} />
            </label>
            <label>
              Website
              <input type="url" name="website" defaultValue={v("website")} placeholder="https://" />
            </label>
            <div className="row">
              <label>
                Licence
                <input type="text" name="licence" defaultValue={v("licence")} />
              </label>
              <label>
                Countries you cannot take players from
                <input type="text" name="restricted_markets" defaultValue={v("restricted_markets")} />
              </label>
            </div>
            <label>
              Compliance rules for what can and cannot be posted
              <textarea name="compliance_notes" defaultValue={v("compliance_notes")} />
            </label>
            <label>
              Current offers
              <textarea name="current_offers" defaultValue={v("current_offers")} />
            </label>
            <div>
              <button className="btn">Save accounts and product</button>
            </div>
          </form>
          <p className="mute small">
            Never send passwords. Add 9SM through each platform&apos;s own team or delegate access, and we confirm it here.
          </p>
        </div>

        <div className="card">
          <h2>People, meetings and sign-off</h2>
          <form className="f" action={save}>
            <input type="hidden" name="signoff_shown" value="1" />
            <div className="row">
              <label>
                Main contact
                <input type="text" name="contact_name" defaultValue={v("contact_name")} />
              </label>
              <label>
                Contact email
                <input type="email" name="contact_email" defaultValue={v("contact_email")} />
              </label>
            </div>
            <label>
              Who approves posts
              <input type="text" name="approver_name" defaultValue={v("approver_name")} />
            </label>
            <label>
              Weekly meeting, day and time
              <input type="text" name="meeting_slot" defaultValue={v("meeting_slot")} placeholder="Tuesdays 14:00 UK" />
            </label>
            <label className="check">
              <input type="checkbox" name="design_signed_off" defaultChecked={Boolean(p?.design_signed_off)} />
              The first designs and graphics are approved
            </label>
            <div>
              <button className="btn">Save</button>
            </div>
          </form>
          {p?.slack_url || p?.contract_url ? (
            <p className="small">
              {p?.slack_url ? (
                <a href={p.slack_url} target="_blank" rel="noreferrer">
                  Join the Slack channel
                </a>
              ) : null}
              {p?.slack_url && p?.contract_url ? ", " : ""}
              {p?.contract_url ? (
                <a href={p.contract_url} target="_blank" rel="noreferrer">
                  View the contract
                </a>
              ) : null}
            </p>
          ) : null}
        </div>

        {isStaff ? (
          <div className="card">
            <h2>9SM only</h2>
            <form className="f" action={saveHubStaff.bind(null, id)}>
              <div>
                <div className="mute small" style={{ marginBottom: 4 }}>
                  Operator type
                </div>
                <TagPicker name="tags" options={OPERATOR_TAGS} selected={client.tags ?? []} />
              </div>
              <div>
                <div className="mute small" style={{ marginBottom: 4 }}>
                  Markets
                </div>
                <TagPicker name="markets" options={MARKETS} selected={client.markets ?? []} />
              </div>
              <label>
                Sport and esports dates on their calendar
                <select name="event_level" defaultValue={String(client.event_level ?? 1)}>
                  {EVENT_LEVELS.map((l, i) => (
                    <option key={l} value={i}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <div className="mute small" style={{ marginBottom: 4 }}>
                  Only these sports. Leave empty for all.
                </div>
                <TagPicker name="event_categories" options={EVENT_CATEGORIES} selected={client.event_categories ?? []} />
              </div>
              <div className="row">
                <label>
                  Go-live date
                  <input type="date" name="go_live_date" defaultValue={p?.go_live_date ?? ""} />
                </label>
              </div>
              <label>
                Contract link
                <input type="url" name="contract_url" defaultValue={v("contract_url")} placeholder="https://" />
              </label>
              <label>
                Slack channel join link
                <input type="url" name="slack_url" defaultValue={v("slack_url")} placeholder="https://" />
              </label>
              <label className="check">
                <input type="checkbox" name="access_confirmed" defaultChecked={Boolean(p?.access_confirmed)} />
                9SM has access to their accounts
              </label>
              <div>
                <button className="btn">Save</button>
              </div>
            </form>
            <p className="mute small">The client sees the Slack and contract links, and nothing else on this form.</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
