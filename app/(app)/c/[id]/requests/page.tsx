import { redirect } from "next/navigation";

// Requests now live on the calendar.
export default async function Requests({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/c/${id}/calendar`);
}
