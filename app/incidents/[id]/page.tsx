import { notFound } from "next/navigation";
import { getIncidentFull } from "@/lib/incidents";
import { InvestigationWorkspace } from "@/components/workspace/investigation-workspace";

export const dynamic = "force-dynamic";

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await getIncidentFull(id);
  if (!full) notFound();

  return <InvestigationWorkspace initial={full} />;
}
