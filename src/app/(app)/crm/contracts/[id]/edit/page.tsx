import { requireContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await requireContext();
  const contract = db.contracts.find((item) => item.id === id && !item.deletedAt);
  if (!contract || contract.organizationId !== user.organizationId || !can(db, user, "contract.read", contract.ownerId)) notFound();
  if (!can(db, user, "contract.update", contract.ownerId) || contract.status === "Cancelado" || contract.status === "Expirado") {
    redirect(`/crm/contracts/${contract.id}`);
  }
  redirect(`/crm/contracts/${contract.id}?editar=1`);
}
