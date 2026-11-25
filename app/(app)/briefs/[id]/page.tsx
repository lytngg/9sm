import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { TaskDetail } from "@/components/task-detail";

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await requireStaff();
  const { id } = await params;
  const { error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  return <TaskDetail id={id} meId={me.id} error={error} />;
}
