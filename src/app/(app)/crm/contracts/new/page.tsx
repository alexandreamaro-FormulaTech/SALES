import { PageHeader } from "@/components/chrome";
import { RecordForm } from "@/components/record-form";
import { requireContext } from "@/lib/context";
import { contractFields, formValues } from "@/lib/field-defs";
import { fullName } from "@/lib/format";
import { can, hasPermission } from "@/lib/permissions";
import { assignableOwners } from "@/lib/queries";

export const metadata = { title: "Novo contrato" };

export default async function NewContractPage({ searchParams }: { searchParams: Promise<{ accountId?: string; opportunityId?: string }> }) {
  const query = await searchParams;
  const { db, user } = await requireContext();
  if (!can(db, user, "contract.create")) return <PageHeader title="Novo contrato" description="Sem permissão para criar contratos." />;
  const owners = assignableOwners(db, user).map((profile) => ({ value: profile.id, label: profile.fullName }));
  const accounts = db.accounts.filter((account) => !account.deletedAt && can(db, user, "account.read", account.ownerId)).map((account) => ({ value: account.id, label: account.name }));
  const opportunities = db.opportunities.filter((item) => !item.deletedAt).map((item) => ({ value: item.id, label: item.name, accountId: item.accountId }));
  const contacts = db.contacts.filter((contact) => !contact.deletedAt).map((contact) => ({ value: contact.id, label: fullName(contact.firstName, contact.lastName), accountId: contact.accountId }));
  const opportunity = db.opportunities.find((item) => item.id === query.opportunityId);
  const fields = contractFields(owners, accounts, opportunities, contacts, hasPermission(db, user, "contract.activate"));
  return (
    <div>
      <PageHeader title="Novo contrato" description="O número é gerado automaticamente. A oportunidade, se houver, precisa ser da mesma conta." />
      <RecordForm
        actionKey="contract.create"
        fields={fields}
        values={formValues(fields, {
          ownerId: user.id,
          status: "Rascunho",
          renewalNoticeDays: 30,
          accountId: query.accountId || opportunity?.accountId || "",
          opportunityId: opportunity?.id || "",
          amount: opportunity?.amount,
          name: opportunity ? `Contrato ${opportunity.name}` : "",
        })}
        cancelHref="/crm/contracts"
        submitLabel="Criar contrato"
      />
    </div>
  );
}
