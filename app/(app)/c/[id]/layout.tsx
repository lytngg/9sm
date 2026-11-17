import { loadWorkspace } from "@/lib/workspace";
import { NavLink } from "@/components/nav-link";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { client, isStaff } = await loadWorkspace(id);
  const meta = [client.type, client.smm ? `SMM ${client.smm}` : ""].filter(Boolean).join(", ");
  return (
    <>
      <div className="wshead">
        <div>
          <h1>{client.name}</h1>
          {meta ? <div className="wsmeta">{meta}</div> : null}
        </div>
      </div>
      <nav className="tabs">
        <NavLink href={`/c/${id}`} exact>
          Overview
        </NavLink>
        <NavLink href={`/c/${id}/calendar`}>Calendar</NavLink>
        <NavLink href={`/c/${id}/posts`}>{isStaff ? "Posts and approvals" : "Approvals"}</NavLink>
        <NavLink href={`/c/${id}/requests`}>Requests</NavLink>
      </nav>
      {children}
    </>
  );
}
