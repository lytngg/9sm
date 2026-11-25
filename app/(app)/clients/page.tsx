import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addClient, addStaff } from "./actions";
import { MARKETS, OPERATOR_TAGS } from "@/lib/workspace";
import { TagPicker } from "@/components/tags";
import { ClientTable } from "@/components/client-table";
import { doneCount, onboardingSteps, type ClientProfile } from "@/lib/onboarding";


export default async function Clients({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff();
  const { error } = await searchParams;
  const supabase = await createClient();
  const [{ data: clients }, { data: staff }, { data: staffInvites }, { data: profiles }, { data: waitingPosts }] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("profiles").select("id, email, full_name").eq("role", "staff").order("email"),
    supabase.from("invites").select("email").eq("role", "staff").order("email"),
    supabase.from("client_profile").select("*"),
    supabase.from("posts").select("client_id").eq("status", "Client review").limit(5000),
  ]);
  const nameOf = new Map((staff ?? []).map((s) => [s.id as string, (s.full_name as string | null) ?? s.email]));
  const profileOf = new Map((profiles ?? []).map((p) => [p.client_id as string, p as ClientProfile]));
  const waitingOf = new Map<string, number>();
  (waitingPosts ?? []).forEach((p) => waitingOf.set(p.client_id, (waitingOf.get(p.client_id) ?? 0) + 1));
  const rows = (clients ?? []).map((c) => {
    const steps = onboardingSteps(profileOf.get(c.id) ?? null);
    return {
      id: c.id as string,
      name: c.name as string,
      tags: (c.tags ?? []) as string[],
      smm: c.smm_id ? (nameOf.get(c.smm_id) ?? null) : null,
      done: doneCount(steps),
      total: steps.length,
      waiting: waitingOf.get(c.id) ?? 0,
    };
  });
  const joined = new Set((staff ?? []).map((s) => s.email.toLowerCase()));
  const waiting = (staffInvites ?? []).filter((i) => !joined.has(i.email.toLowerCase()));
  return (
    <>
      <h1>Clients</h1>
      <p className="sub">Each client has its own workspace. Operators only ever see their own.</p>
      {error ? <div className="msg">{error}</div> : null}
      <ClientTable rows={rows} />
      <div className="grid" style={{ marginTop: 40 }}>
        <div className="card">
          <h2>Add a client</h2>
          <form className="f" action={addClient}>
            <label>
              Brand name
              <input type="text" name="name" required />
            </label>
            <div>
              <div className="mute small" style={{ marginBottom: 4 }}>
                What they are. Pick every one that applies.
              </div>
              <TagPicker name="tags" options={OPERATOR_TAGS} />
            </div>
            <div>
              <div className="mute small" style={{ marginBottom: 4 }}>
                Markets, if it matters for talent
              </div>
              <TagPicker name="markets" options={MARKETS} />
            </div>
            <div>
              <button className="btn">Add client</button>
            </div>
          </form>
        </div>
        <div className="card">
          <h2>9SM staff</h2>
          <div className="tw">
            <table>
              <tbody>
                {(staff ?? []).map((s) => (
                  <tr key={s.email}>
                    <td>{s.full_name ? `${s.full_name}, ${s.email}` : s.email}</td>
                    <td>
                      <span className="pill good">Active</span>
                    </td>
                  </tr>
                ))}
                {waiting.map((i) => (
                  <tr key={i.email}>
                    <td>{i.email}</td>
                    <td>
                      <span className="pill">Not signed up yet</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form className="f" action={addStaff} style={{ marginTop: 12 }}>
            <label>
              Staff email
              <input type="email" name="email" required />
            </label>
            <div>
              <button className="btn">Give staff access</button>
            </div>
          </form>
          <p className="mute" style={{ fontSize: 12 }}>
            Staff see every client. They create their own account with this email.
          </p>
        </div>
      </div>
    </>
  );
}
