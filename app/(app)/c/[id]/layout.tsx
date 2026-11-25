import { loadWorkspace } from "@/lib/workspace";
import { NavLink } from "@/components/nav-link";
import { Avatar } from "@/components/avatar";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { client, isStaff, supabase } = await loadWorkspace(id);
  // Name, title and photo only. The database decides whether this person may see them.
  const { data: smmRows } = await supabase.rpc("client_smm", { p_client: id });
  const smm = (smmRows as { full_name: string | null; title: string | null; photo_url: string | null }[] | null)?.[0];
  const [{ data: depts }, { data: have }] = await Promise.all([
    supabase.from("departments").select("key, name").order("position"),
    supabase.from("client_plugins").select("dept_key").eq("client_id", id),
  ]);
  const mine = new Set((have ?? []).map((h) => h.dept_key));
  const tags: string[] = client.tags ?? [];
  const meta = tags.length ? tags.join(", ") : (client.type ?? "");
  return (
    <>
      <div className="wshead">
        <div>
          <h1>{client.name}</h1>
          {meta ? <div className="wsmeta">{meta}</div> : null}
        </div>
        {smm ? (
          <div className="smm">
            <Avatar name={smm.full_name ?? "9SM"} photoUrl={smm.photo_url} />
            <div>
              <div className="mute small">{isStaff ? "Social media manager" : "Your social media manager"}</div>
              <div className="smm-name">{smm.full_name ?? "9SM team"}</div>
              {smm.title ? <div className="mute small">{smm.title}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
      {client.paused_at ? (
        <div className="paused" role="alert">
          <b>All posting is paused.</b> {client.pause_reason ? `Reason: ${client.pause_reason}. ` : ""}
          Nothing goes out until it is resumed from the Overview tab.
        </div>
      ) : null}
      <nav className="tabs">
        <NavLink href={`/c/${id}`} exact>
          Overview
        </NavLink>
        <NavLink href={`/c/${id}/health`}>Channel health</NavLink>
        <NavLink href={`/c/${id}/calendar`}>Calendar</NavLink>
        <NavLink href={`/c/${id}/posts`}>{isStaff ? "Posts and approvals" : "Approvals"}</NavLink>
        <NavLink href={`/c/${id}/requests`}>Requests</NavLink>
        <NavLink href={`/c/${id}/hub`}>{isStaff ? "Onboarding and hub" : "Your brand"}</NavLink>
      </nav>
      <nav className="tabs sub" aria-label="Plugins">
        <span className="tabs-label">Plugins</span>
        <NavLink href={`/c/${id}/plugins`} exact>
          All
        </NavLink>
        {((depts ?? []) as { key: string; name: string }[]).map((d) => (
          <NavLink key={d.key} href={d.key === "talent" ? `/c/${id}/talent` : `/c/${id}/plugins/${d.key}`}>
            {d.name}
            {mine.has(d.key) ? <i className="dot-on" aria-label="part of the plan" /> : null}
          </NavLink>
        ))}
      </nav>
      {children}
    </>
  );
}
