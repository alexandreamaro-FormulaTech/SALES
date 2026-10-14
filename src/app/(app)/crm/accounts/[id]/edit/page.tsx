import { requireContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await requireContext();
  const account = db.accounts.find((item) => item.id === id && !item.deletedAt);
  if (!account || account.organizationId !== user.organizationId || !can(db, user, "account.read", account.ownerId)) notFound();
  if (!can(db, user, "account.update", account.ownerId)) redirect(`/crm/accounts/${account.id}`);
  redirect(`/crm/accounts/${account.id}?editar=1`);
}
