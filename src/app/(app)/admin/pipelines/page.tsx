import { PageHeader } from "@/components/chrome";
import { PipelineForm } from "@/components/pipeline-form";
import { requireContext } from "@/lib/context";
import { hasPermission } from "@/lib/permissions";
import { notFound } from "next/navigation";

export const metadata = { title: "Funil" };

export default async function PipelinesPage() {
  const { db, user } = await requireContext();
  if (!hasPermission(db, user, "settings.manage")) notFound();
  return (
    <div className="space-y-4">
      <PageHeader title="Funil" description="A orientação e a ordem podem mudar. Os estados finais e a conversão continuam protegidos pelas regras do servidor." />
      <PipelineForm
        statuses={[...db.leadStatuses].sort((a, b) => a.sortOrder - b.sortOrder).map((status) => ({
          id: status.id,
          name: status.name,
          sortOrder: status.sortOrder,
          guidanceText: status.guidanceText,
          closed: status.isClosed,
        }))}
        stages={[...db.opportunityStages].sort((a, b) => a.sortOrder - b.sortOrder).map((stage) => ({
          id: stage.id,
          name: stage.name,
          sortOrder: stage.sortOrder,
          guidanceText: stage.guidanceText,
          closed: stage.isClosed,
          defaultProbability: stage.defaultProbability,
        }))}
        contractStatuses={[...db.contractStatuses].sort((a, b) => a.sortOrder - b.sortOrder).map((status) => ({
          id: status.id,
          name: status.name,
          sortOrder: status.sortOrder,
          guidanceText: status.guidanceText,
          closed: status.isClosed,
        }))}
      />
    </div>
  );
}
