import { PageHeader } from "@/components/chrome";
import { RecordForm } from "@/components/record-form";
import { requireContext } from "@/lib/context";
import { accountFields, formValues } from "@/lib/field-defs";
import { can } from "@/lib/permissions";
import { assignableOwners } from "@/lib/queries";

export const metadata = { title: "Nova conta" };

export default async function NewAccountPage() {
  const { db, user } = await requireContext();
  if (!can(db, user, "account.create")) return <PageHeader title="Nova conta" description="Sem permissão para criar contas." />;
  const owners = assignableOwners(db, user).map((profile) => ({ value: profile.id, label: profile.fullName }));
  const parents = db.accounts.filter((account) => !account.deletedAt && can(db, user, "account.read", account.ownerId)).map((account) => ({ value: account.id, label: account.name }));
  const fields = accountFields(owners, parents);
  return (
    <div>
      <PageHeader title="Nova conta" description="A razão comercial é obrigatória." />
      <RecordForm actionKey="account.create" fields={fields} values={formValues(fields, { ownerId: user.id, type: "Prospect" })} cancelHref="/crm/accounts" submitLabel="Criar conta" />
    </div>
  );
}
