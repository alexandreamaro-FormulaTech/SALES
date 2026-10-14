import { PageHeader } from "@/components/chrome";
import { RecordForm } from "@/components/record-form";
import { requireContext } from "@/lib/context";
import { formValues, leadFields } from "@/lib/field-defs";
import { can } from "@/lib/permissions";
import { assignableOwners } from "@/lib/queries";

export const metadata = { title: "Novo lead" };

export default async function NewLeadPage() {
  const { db, user } = await requireContext();
  if (!can(db, user, "lead.create")) {
    return <PageHeader title="Novo lead" description="Sem permissão para criar leads." />;
  }
  const owners = assignableOwners(db, user).map((profile) => ({ value: profile.id, label: profile.fullName }));
  const fields = leadFields(owners);
  return (
    <div>
      <PageHeader title="Novo lead" description="Informe ao menos o sobrenome e a empresa." />
      <RecordForm actionKey="lead.create" fields={fields} values={formValues(fields, { ownerId: user.id })} cancelHref="/crm/leads" submitLabel="Criar lead" />
    </div>
  );
}
