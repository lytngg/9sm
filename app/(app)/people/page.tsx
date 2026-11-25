import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TEAMS } from "@/lib/workspace";
import { Avatar } from "@/components/avatar";

type Person = { id: string; full_name: string | null; title: string | null; team: string | null; photo_url: string | null };

// The staff list: who everyone is, what team they are on and what they are carrying.
export default async function People() {
  await requireStaff();
  const supabase = await createClient();
  const [{ data: staff }, { data: clients }, { data: briefs }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, title, team, photo_url").eq("role", "staff").not("full_name", "is", null).order("full_name"),
    supabase.from("clients").select("name, smm_id").not("smm_id", "is", null).order("name"),
    supabase.from("briefs").select("assignee").neq("status", "Delivered").not("assignee", "is", null),
  ]);
  const people = (staff ?? []) as Person[];
  const owns = new Map<string, string[]>();
  (clients ?? []).forEach((c) => owns.set(c.smm_id, [...(owns.get(c.smm_id) ?? []), c.name]));
  const open = new Map<string, number>();
  (briefs ?? []).forEach((b) => open.set(b.assignee, (open.get(b.assignee) ?? 0) + 1));
  const groups = [...TEAMS, "Other"]
    .map((team) => ({ team, list: people.filter((p) => (TEAMS.includes(p.team ?? "") ? p.team : "Other") === team) }))
    .filter((g) => g.list.length);
  return (
    <>
      <h1>People</h1>
      <p className="sub">Everyone at 9SM, by team. {people.length} people.</p>
      {groups.map((g) => (
        <section key={g.team} className="plug-sec">
          <h3>
            {g.team} <span className="mute" style={{ fontSize: 14, fontFamily: "inherit" }}>{g.list.length}</span>
          </h3>
          <div className="plug-grid" style={{ marginTop: 14 }}>
            {g.list.map((p) => {
              const mine = owns.get(p.id) ?? [];
              const n = open.get(p.id) ?? 0;
              return (
                <div key={p.id} className="plug-card" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <Avatar name={p.full_name ?? "?"} photoUrl={p.photo_url} size={48} />
                  <div style={{ minWidth: 0 }}>
                    <div className="smm-name">{p.full_name}</div>
                    <div className="mute small">{p.title ?? "No title set"}</div>
                    {mine.length ? (
                      <div className="small" style={{ marginTop: 8 }}>
                        Runs {mine.slice(0, 4).join(", ")}
                        {mine.length > 4 ? ` and ${mine.length - 4} more` : ""}
                      </div>
                    ) : null}
                    {n ? <div className="small" style={{ marginTop: 6 }}>{n} open {n === 1 ? "brief" : "briefs"}</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {people.length === 0 ? <p className="empty">Nobody has filled in their profile yet.</p> : null}
    </>
  );
}
