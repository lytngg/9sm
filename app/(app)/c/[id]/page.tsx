import Link from "next/link";
import { loadWorkspace } from "@/lib/workspace";
import { addScopeItem, assignSmm, inviteOperator, logDelivery, removeOperator, removeScopeItem, setPause } from "./actions";
import { monthName, monthStart, overBy, prevMonthStart } from "@/lib/scope";

export default async function Workspace({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, client, isStaff } = await loadWorkspace(id);
  const [{ count: waiting }, { count: newRequests }] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("client_id", id).eq("status", "Client review"),
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("client_id", id).eq("status", "New"),
  ]);

  // Scope against delivery, for this month and the last full one.
  // The page is rendered per request, so reading the date here is fine.
  const nowDate = new Date();
  const thisMonth = monthStart(nowDate);
  const lastMonth = prevMonthStart(nowDate);
  const [{ data: scope }, { data: delivered }, { data: posted }] = await Promise.all([
    supabase.from("scope_items").select("id, label, monthly_target, counts").eq("client_id", id).order("created_at"),
    supabase.from("scope_delivery").select("item_id, month, delivered").eq("client_id", id).gte("month", lastMonth),
    supabase.from("posts").select("publish_date").eq("client_id", id).eq("status", "Posted").gte("publish_date", lastMonth),
  ]);
  const postsIn = (month: string) => (posted ?? []).filter((p) => String(p.publish_date).slice(0, 7) === month.slice(0, 7)).length;
  const manual = (itemId: string, month: string) =>
    (delivered ?? []).find((d) => d.item_id === itemId && String(d.month) === month)?.delivered ?? 0;
  const lines = (scope ?? []).map((it) => ({
    ...it,
    now: it.counts === "posts" ? postsIn(thisMonth) : manual(it.id, thisMonth),
    last: it.counts === "posts" ? postsIn(lastMonth) : manual(it.id, lastMonth),
  }));

  let access: { email: string; joined: boolean }[] = [];
  let staff: { id: string; email: string; full_name: string | null }[] = [];
  let smmId = "";
  if (isStaff) {
    const [{ data: staffRows }, { data: current }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name").eq("role", "staff").order("email"),
      supabase.from("clients").select("smm_id").eq("id", id).maybeSingle(),
    ]);
    staff = staffRows ?? [];
    smmId = current?.smm_id ?? "";
    const [{ data: invites }, { data: members }] = await Promise.all([
      supabase.from("invites").select("email").eq("client_id", id).order("email"),
      supabase.from("client_members").select("profiles(email)").eq("client_id", id),
    ]);
    const joined = new Set(
      (members ?? []).flatMap((m) => {
        const p = m.profiles as unknown as { email: string } | { email: string }[] | null;
        return (Array.isArray(p) ? p : p ? [p] : []).map((x) => x.email.toLowerCase());
      }),
    );
    access = (invites ?? []).map((i) => ({ email: i.email, joined: joined.has(i.email.toLowerCase()) }));
  }

  return (
    <>
      {error ? <div className="msg">{error}</div> : null}
      <div className="stats">
        <Link className="stat k" href={`/c/${id}/posts`}>
          <b>{waiting ?? 0}</b>
          <span>Posts waiting on the client</span>
        </Link>
        <Link className="stat p" href={`/c/${id}/requests`}>
          <b>{newRequests ?? 0}</b>
          <span>New requests for 9SM</span>
        </Link>
      </div>
      {lines.length ? (
        <div className="scope">
          <h2>What we promised and what we delivered</h2>
          <div className="scope-head">
            <span />
            <span>{monthName(lastMonth)}</span>
            <span>{monthName(thisMonth)} so far</span>
          </div>
          {lines.map((l) => {
            // One track per month. The tick is what was promised, and anything past it is drawn brighter.
            const cell = (done: number) => {
              const over = overBy(done, l.monthly_target);
              const scale = Math.max(done, l.monthly_target) * 1.08;
              const tick = (l.monthly_target / scale) * 100;
              const fill = (Math.min(done, l.monthly_target) / scale) * 100;
              const extra = (Math.max(0, done - l.monthly_target) / scale) * 100;
              return (
                <div>
                  <span className="scope-num">{done}</span>
                  <span className="mute small"> of {l.monthly_target}</span>
                  {over ? <span className="over">{over}% more than promised</span> : null}
                  <div className="track" role="img" aria-label={`${done} delivered against ${l.monthly_target} promised`}>
                    <i className="met" style={{ width: `${fill}%` }} />
                    <i className="extra" style={{ left: `${tick}%`, width: `${extra}%` }} />
                    <b style={{ left: `${tick}%` }} />
                  </div>
                </div>
              );
            };
            return (
              <div className="scope-row" key={l.id}>
                <div>
                  <b>{l.label}</b>
                  <div className="mute small">{l.monthly_target} a month</div>
                </div>
                {cell(l.last)}
                {cell(l.now)}
                {isStaff ? (
                  <form action={removeScopeItem.bind(null, id, l.id)}>
                    <button className="btn ghost sm">Remove</button>
                  </form>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
          <p className="mute small" style={{ marginTop: 10 }}>
            The mark on each line is what was promised. Anything past it is extra.
          </p>
        </div>
      ) : null}

      <div className="grid">
        {isStaff ? (
          <div className="card">
            <h2>Scope</h2>
            <form className="f" action={addScopeItem.bind(null, id)}>
              <div className="row">
                <label style={{ flex: 2 }}>
                  What the contract promises
                  <input type="text" name="label" placeholder="Posts, videos, graphics" required />
                </label>
                <label>
                  Per month
                  <input type="number" name="target" min="1" required />
                </label>
              </div>
              <label className="check">
                <input type="checkbox" name="counts" value="posts" />
                Count this from posts marked posted
              </label>
              <div>
                <button className="btn">Add line</button>
              </div>
            </form>
            {lines.some((l) => l.counts === "manual") ? (
              <>
                {[lastMonth, thisMonth].map((m) => (
                  <form className="f" key={m} action={logDelivery.bind(null, id, m)} style={{ marginTop: 16 }}>
                    <div className="mute small">Delivered in {monthName(m)}</div>
                    <div className="row">
                      {lines
                        .filter((l) => l.counts === "manual")
                        .map((l) => (
                          <label key={l.id} style={{ minWidth: 110 }}>
                            {l.label}
                            <input type="number" name={`d_${l.id}`} min="0" defaultValue={m === thisMonth ? l.now : l.last} />
                          </label>
                        ))}
                      <button className="btn ghost sm">Save</button>
                    </div>
                  </form>
                ))}
              </>
            ) : null}
          </div>
        ) : null}
        <div className="card">
          <h2>{client.paused_at ? "Posting is paused" : "Pause all posting"}</h2>
          {client.paused_at ? (
            <form className="f" action={setPause.bind(null, id, false)}>
              <p className="mute" style={{ margin: 0 }}>
                Nothing goes out for this brand until posting is resumed.
              </p>
              <div>
                <button className="btn">Resume posting</button>
              </div>
            </form>
          ) : (
            <form className="f" action={setPause.bind(null, id, true)}>
              <label>
                Reason, so the team knows what happened
                <input type="text" name="reason" placeholder="Site outage, compromised account, sensitive news" />
              </label>
              <div>
                <button className="btn danger">Pause all posting</button>
              </div>
            </form>
          )}
          <p className="mute small">
            {isStaff
              ? "The client can press this too. Posts cannot be marked posted while it is on."
              : "Use this if something is wrong and nothing should go out. Your 9SM team is told straight away."}
          </p>
        </div>
        {isStaff ? (
          <div className="card">
            <h2>Social media manager</h2>
            <form className="f" action={assignSmm.bind(null, client.id)}>
              <label>
                Who looks after this client
                <select name="smm" defaultValue={smmId}>
                  <option value="">Nobody yet</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name ? `${s.full_name} (${s.email})` : s.email}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <button className="btn">Save</button>
              </div>
            </form>
            <p className="mute small">
              The client sees this person&apos;s name, title and photo at the top of their workspace. Staff add those
              under Your profile.
            </p>
          </div>
        ) : null}
        {isStaff ? (
          <div className="card">
            <h2>Operator access</h2>
            <div className="tw">
              <table>
                <tbody>
                  {access.map((a) => (
                    <tr key={a.email}>
                      <td>{a.email}</td>
                      <td>
                        <span className={a.joined ? "pill good" : "pill"}>{a.joined ? "Active" : "Not signed up yet"}</span>
                      </td>
                      <td>
                        <form action={removeOperator.bind(null, client.id, a.email)}>
                          <button className="btn ghost sm">Remove</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                  {access.length === 0 ? (
                    <tr>
                      <td className="mute">Nobody at this operator has access yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <form className="f" action={inviteOperator.bind(null, client.id)} style={{ marginTop: 12 }}>
              <label>
                Operator email
                <input type="email" name="email" required />
              </label>
              <div>
                <button className="btn">Give access</button>
              </div>
            </form>
            <p className="mute" style={{ fontSize: 12 }}>
              They create their own account with this email and land in this workspace only.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
