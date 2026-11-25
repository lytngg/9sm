import Link from "next/link";
import { loadWorkspace } from "@/lib/workspace";
import { PLUGINS } from "@/lib/plugins";

type Dept = { key: string; name: string; blurb: string | null; lead_name: string | null };

export default async function Plugins({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, isStaff } = await loadWorkspace(id);
  const [{ data: depts }, { data: have }, { data: requests }] = await Promise.all([
    supabase.from("departments").select("key, name, blurb, lead_name").order("position"),
    supabase.from("client_plugins").select("dept_key").eq("client_id", id),
    supabase.from("department_requests").select("dept_key, status").eq("client_id", id),
  ]);
  const active = new Set((have ?? []).map((h) => h.dept_key));
  const openCount = new Map<string, number>();
  (requests ?? []).forEach((r) => {
    if (r.status !== "Done") openCount.set(r.dept_key, (openCount.get(r.dept_key) ?? 0) + 1);
  });
  const list = (depts ?? []) as Dept[];
  const card = (d: Dept) => (
    <Link key={d.key} className="plug-card" href={d.key === "talent" ? `/c/${id}/talent` : `/c/${id}/plugins/${d.key}`}>
      <b>{d.name}</b>
      <p>{PLUGINS[d.key]?.tagline ?? d.blurb}</p>
      <span className={active.has(d.key) ? "pill good" : "pill"}>
        {active.has(d.key) ? (openCount.get(d.key) ? `${openCount.get(d.key)} in progress` : "On your plan") : "See what it does"}
      </span>
    </Link>
  );
  const mine = list.filter((d) => active.has(d.key));
  const rest = list.filter((d) => !active.has(d.key));
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Plugins</h2>
      <p className="sub" style={{ marginTop: 4 }}>
        {isStaff ? "The 9SM teams this client can use. Open one to add it to their plan." : "The other 9SM teams you can plug into your account."}
      </p>
      {mine.length ? (
        <section className="plug-sec" style={{ marginTop: 24 }}>
          <h3>{isStaff ? "On their plan" : "On your plan"}</h3>
          <div className="plug-grid" style={{ marginTop: 14 }}>{mine.map(card)}</div>
        </section>
      ) : null}
      {rest.length ? (
        <section className="plug-sec">
          <h3>Add to your plan</h3>
          <div className="plug-grid" style={{ marginTop: 14 }}>{rest.map(card)}</div>
        </section>
      ) : null}
    </>
  );
}
