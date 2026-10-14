import { requireContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await requireContext();
  const opportunity = db.opportunities.find((item) => item.id === id && !item.deletedAt);
  if (!opportunity || opportunity.organizationId !== user.organizationId || !can(db, user, "opportunity.read", opportunity.ownerId)) notFound();
  const stage = db.opportunityStages.find((item) => item.id === opportunity.stageId);
  if (!can(db, user, "opportunity.update", opportunity.ownerId) || stage?.isClosed) redirect(`/crm/opportunities/${opportunity.id}`);
  redirect(`/crm/opportunities/${opportunity.id}?editar=1`);
}
