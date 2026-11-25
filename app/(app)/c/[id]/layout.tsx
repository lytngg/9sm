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
      <nav className="tabs">
        <NavLink href={`/c/${id}`} exact>
          Overview
        </NavLink>
        <NavLink href={`/c/${id}/health`}>Channel health</NavLink>
        <NavLink href={`/c/${id}/calendar`}>Calendar</NavLink>
        <NavLink href={`/c/${id}/posts`}>{isStaff ? "Posts and approvals" : "Approvals"}</NavLink>
        <NavLink href={`/c/${id}/requests`}>Requests</NavLink>
        <NavLink href={`/c/${id}/talent`}>Talent</NavLink>
        <NavLink href={`/c/${id}/hub`}>{isStaff ? "Onboarding and hub" : "Your brand"}</NavLink>
      </nav>
      {children}
    </>
  );
}
