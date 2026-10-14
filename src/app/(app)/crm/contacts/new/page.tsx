import { PageHeader } from "@/components/chrome";
import { RecordForm } from "@/components/record-form";
import { requireContext } from "@/lib/context";
import { contactFields, formValues } from "@/lib/field-defs";
import { fullName } from "@/lib/format";
import { can } from "@/lib/permissions";
import { assignableOwners } from "@/lib/queries";

export const metadata = { title: "Novo contato" };

export default async function NewContactPage({ searchParams }: { searchParams: Promise<{ accountId?: string }> }) {
  const { accountId } = await searchParams;
  const { db, user } = await requireContext();
  if (!can(db, user, "contact.create")) return <PageHeader title="Novo contato" description="Sem permissão para criar contatos." />;
  const owners = assignableOwners(db, user).map((profile) => ({ value: profile.id, label: profile.fullName }));
  const accounts = db.accounts.filter((account) => !account.deletedAt && can(db, user, "account.read", account.ownerId)).map((account) => ({ value: account.id, label: account.name }));
  const reports = db.contacts.filter((contact) => !contact.deletedAt && can(db, user, "contact.read", contact.ownerId)).map((contact) => ({ value: contact.id, label: fullName(contact.firstName, contact.lastName) }));
  const fields = contactFields(owners, accounts, reports);
  return (
    <div>
      <PageHeader title="Novo contato" description="O sobrenome e a conta são obrigatórios." />
      <RecordForm actionKey="contact.create" fields={fields} values={formValues(fields, { ownerId: user.id, accountId: accountId ?? "" })} cancelHref="/crm/contacts" submitLabel="Criar contato" />
    </div>
  );
}
