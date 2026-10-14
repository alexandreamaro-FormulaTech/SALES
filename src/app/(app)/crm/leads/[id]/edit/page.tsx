import { requireContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await requireContext();
  const lead = db.leads.find((item) => item.id === id && !item.deletedAt);
  if (!lead || lead.organizationId !== user.organizationId || !can(db, user, "lead.read", lead.ownerId)) notFound();
  if (lead.isConverted || !can(db, user, "lead.update", lead.ownerId)) redirect(`/crm/leads/${lead.id}`);
  redirect(`/crm/leads/${lead.id}?editar=1`);
}
