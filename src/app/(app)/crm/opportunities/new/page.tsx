import { PageHeader } from "@/components/chrome";
import { RecordForm } from "@/components/record-form";
import { requireContext } from "@/lib/context";
import { formValues, opportunityFields } from "@/lib/field-defs";
import { fullName } from "@/lib/format";
import { can } from "@/lib/permissions";
import { assignableOwners } from "@/lib/queries";
import { addDaysISO } from "@/lib/format";

export const metadata = { title: "Nova oportunidade" };

export default async function NewOpportunityPage({ searchParams }: { searchParams: Promise<{ accountId?: string }> }) {
  const { accountId } = await searchParams;
  const { db, user } = await requireContext();
  if (!can(db, user, "opportunity.create")) return <PageHeader title="Nova oportunidade" description="Sem permissão para criar oportunidades." />;
  const owners = assignableOwners(db, user).map((profile) => ({ value: profile.id, label: profile.fullName }));
  const accounts = db.accounts.filter((account) => !account.deletedAt && can(db, user, "account.read", account.ownerId)).map((account) => ({ value: account.id, label: account.name }));
  const contacts = db.contacts.filter((contact) => !contact.deletedAt && can(db, user, "contact.read", contact.ownerId)).map((contact) => ({
    value: contact.id,
    label: fullName(contact.firstName, contact.lastName),
    accountId: contact.accountId,
  }));
  const fields = opportunityFields(owners, accounts, contacts);
  return (
    <div>
      <PageHeader title="Nova oportunidade" description="A etapa inicial é Prospecção. O fechamento previsto é obrigatório." />
      <RecordForm
        actionKey="opportunity.create"
        fields={fields}
        values={formValues(fields, { ownerId: user.id, accountId: accountId ?? "", type: "Novo negócio", closeDate: addDaysISO(30) })}
        cancelHref="/crm/opportunities"
        submitLabel="Criar oportunidade"
      />
    </div>
  );
}
