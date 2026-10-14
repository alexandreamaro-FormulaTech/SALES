import { requireContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await requireContext();
  const contact = db.contacts.find((item) => item.id === id && !item.deletedAt);
  if (!contact || contact.organizationId !== user.organizationId || !can(db, user, "contact.read", contact.ownerId)) notFound();
  if (!can(db, user, "contact.update", contact.ownerId)) redirect(`/crm/contacts/${contact.id}`);
  redirect(`/crm/contacts/${contact.id}?editar=1`);
}
