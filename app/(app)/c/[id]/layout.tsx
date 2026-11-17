import Link from "next/link";
import { loadWorkspace } from "@/lib/workspace";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { client, isStaff } = await loadWorkspace(id);
  return (
    <>
      <h1>{client.name}</h1>
      <p className="sub">
        {client.type}
        {client.smm ? ` · SMM: ${client.smm}` : ""}
      </p>
      <div className="tabs">
        <Link href={`/c/${id}`}>Overview</Link>
        <Link href={`/c/${id}/calendar`}>Calendar</Link>
        <Link href={`/c/${id}/posts`}>{isStaff ? "Posts and approvals" : "Approvals"}</Link>
        <Link href={`/c/${id}/requests`}>Requests</Link>
      </div>
      {children}
    </>
  );
}
