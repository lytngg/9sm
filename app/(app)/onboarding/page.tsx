import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { doneCount, onboardingSteps, type ClientProfile } from "@/lib/onboarding";

export default async function OnboardingBoard() {
  await requireStaff();
  const supabase = await createClient();
  const [{ data: clients }, { data: profiles }] = await Promise.all([
    supabase.from("clients").select("id, name, created_at").order("created_at", { ascending: false }),
    supabase.from("client_profile").select("*"),
  ]);
  const byClient = new Map((profiles ?? []).map((p) => [p.client_id as string, p as ClientProfile]));
  // Reading the clock is fine here: the page is rendered per request, never cached.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const rows = (clients ?? []).map((c) => {
    const p = byClient.get(c.id) ?? null;
    const steps = onboardingSteps(p);
    return {
      ...c,
      steps,
      done: doneCount(steps),
      goLive: p?.go_live_date ?? null,
      days: Math.max(0, Math.floor((now - new Date(c.created_at).getTime()) / 86400000)),
    };
  });
  const open = rows.filter((r) => r.done < r.steps.length);
  const finished = rows.filter((r) => r.done === r.steps.length);
  return (
    <>
      <h1>Onboarding</h1>
      <p className="sub">Every client still being set up, what is outstanding and whose move it is.</p>
      <div className="key">
        <span className="pill pink">With the client</span>
        <span className="pill purple">With 9SM</span>
      </div>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Progress</th>
              <th>Outstanding</th>
              <th>Go-live</th>
              <th>Days since added</th>
            </tr>
          </thead>
          <tbody>
            {open.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/c/${r.id}/hub`}>{r.name}</Link>
                </td>
                <td>
                  <div className="onb-bar sm" role="img" aria-label={`${r.done} of ${r.steps.length} done`}>
                    {r.steps.map((s) => (
                      <i key={s.key} className={s.state === "done" ? "on" : s.state === "9sm" ? "p" : "k"} />
                    ))}
                  </div>
                </td>
                <td>
                  <span className="row" style={{ gap: 12 }}>
                    {r.steps
                      .filter((s) => s.state !== "done")
                      .map((s) => (
                        <span key={s.key} className={s.state === "9sm" ? "pill purple" : "pill pink"}>
                          {s.label}
                        </span>
                      ))}
                  </span>
                </td>
                <td>{r.goLive ?? <span className="mute">Not set</span>}</td>
                <td>{r.days > 10 ? <span style={{ color: "var(--warn)" }}>{r.days}</span> : r.days}</td>
              </tr>
            ))}
            {open.length === 0 ? (
              <tr>
                <td colSpan={5} className="mute">
                  Nobody is in onboarding right now.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {finished.length ? (
        <p className="mute" style={{ marginTop: 24 }}>
          Fully onboarded: {finished.map((r) => r.name).join(", ")}
        </p>
      ) : null}
    </>
  );
}
