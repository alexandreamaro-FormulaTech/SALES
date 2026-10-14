import { ActivityCards } from "@/components/activities";
import { Badge, DetailGrid, PageHeader, RelatedList, Tabs } from "@/components/chrome";
import { ConvertModal } from "@/components/convert-modal";
import { EditDialog } from "@/components/edit-dialog";
import { HistoryList } from "@/components/history";
import { PathBar } from "@/components/path-bar";
import { ActivityForm, DeleteButton } from "@/components/record-actions";
import { RecordForm } from "@/components/record-form";
import { requireContext } from "@/lib/context";
import { findLeadDuplicates } from "@/lib/domain";
import { formValues, leadFields } from "@/lib/field-defs";
import { addressValues } from "@/lib/form-input";
import { formatAddress, formatDateTime, formatMoney, formatNumber, fullName } from "@/lib/format";
import { can } from "@/lib/permissions";
import { accountName, assignableOwners, ownerName } from "@/lib/queries";
import type { DB, Lead, Profile } from "@/lib/types";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Lead ${id.slice(0, 8)}` };
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; editar?: string }>;
}) {
  const { id } = await params;
  const { tab = "details", editar } = await searchParams;
  const { db, user } = await requireContext();
  const lead = db.leads.find((item) => item.id === id && !item.deletedAt && item.organizationId === user.organizationId);
  if (!lead || !can(db, user, "lead.read", lead.ownerId)) notFound();
  const status = db.leadStatuses.find((item) => item.id === lead.statusId);
  const writable = can(db, user, "lead.update", lead.ownerId) && !lead.isConverted && !status?.isClosed;
  const steps = db.leadStatuses
    .filter((item) => !item.requiresReason)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({ id: item.id, name: item.name, guidance: item.guidanceText, converted: item.isConverted }));
  const outcomes = db.leadStatuses
    .filter((item) => item.requiresReason)
    .map((item) => ({ id: item.id, name: item.name, requiresReason: true, guidance: item.guidanceText }));
  const activities = db.activities.filter((item) => item.objectType === "lead" && item.recordId === lead.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const logs = db.auditLogs.filter((item) => item.objectType === "lead" && item.recordId === lead.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const base = `/crm/leads/${lead.id}`;
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Lead"
        title={fullName(lead.firstName, lead.lastName)}
        highlights={[
          { label: "Empresa", value: lead.company },
          { label: "Telefone", value: lead.phone || lead.mobile || "—" },
          { label: "Email", value: lead.email || "—" },
          { label: "Proprietário", value: ownerName(db, lead.ownerId) },
          { label: "Status", value: status?.name ?? "—" },
        ]}
        actions={
          <>
            <Badge>{status?.name ?? "—"}</Badge>
            {lead.rating ? <Badge>{lead.rating}</Badge> : null}
            {writable ? (
              <EditDialog title={`Editar ${fullName(lead.firstName, lead.lastName)}`} defaultOpen={editar === "1"}>
                <RecordForm
                  layout="modal"
                  actionKey="lead.update"
                  recordId={lead.id}
                  fields={leadEditFields(db, user, lead)}
                  values={leadEditValues(db, user, lead)}
                  cancelHref={base}
                  submitLabel="Salvar"
                />
              </EditDialog>
            ) : null}
            {can(db, user, "lead.convert", lead.ownerId) && status?.allowsConversion && !lead.isConverted ? (
              <ConvertModal
                leadId={lead.id}
                company={lead.company}
                defaultOwnerId={lead.ownerId}
                duplicates={findLeadDuplicates(db, lead)}
                owners={assignableOwners(db, user).map((profile) => ({ id: profile.id, label: profile.fullName }))}
                accounts={db.accounts.filter((account) => !account.deletedAt && can(db, user, "account.read", account.ownerId)).map((account) => ({ id: account.id, label: account.name }))}
                contacts={db.contacts.filter((contact) => !contact.deletedAt && can(db, user, "contact.read", contact.ownerId)).map((contact) => ({ id: contact.id, label: fullName(contact.firstName, contact.lastName), accountId: contact.accountId }))}
              />
            ) : null}
            {can(db, user, "lead.delete", lead.ownerId) && !lead.isConverted ? <DeleteButton object="lead" id={lead.id} label="este lead" /> : null}
          </>
        }
      />
      <PathBar
        mode="lead"
        recordId={lead.id}
        steps={steps}
        currentId={lead.statusId}
        outcomes={outcomes}
        locked={!writable}
        keyFields={[
          { label: "Empresa", value: lead.company },
          { label: "Sobrenome", value: lead.lastName },
          { label: "Email", value: lead.email || "—" },
          { label: "Telefone", value: lead.phone || lead.mobile || "—" },
          { label: "Origem", value: lead.leadSource || "—" },
        ]}
      />
      <Tabs
        current={tab}
        tabs={[
          { id: "details", label: "Detalhes", href: `${base}?tab=details` },
          { id: "related", label: "Relacionados", href: `${base}?tab=related` },
          { id: "activity", label: "Atividades", href: `${base}?tab=activity` },
          { id: "history", label: "Histórico", href: `${base}?tab=history` },
        ]}
      />
      {tab === "related" ? <Related lead={lead} db={db} /> : null}
      {tab === "activity" ? (
        <div className="space-y-3">
          {writable || can(db, user, "lead.update", lead.ownerId) ? <ActivityForm objectType="lead" recordId={lead.id} /> : null}
          <ActivityCards db={db} items={activities} />
        </div>
      ) : null}
      {tab === "history" ? <HistoryList db={db} logs={logs} /> : null}
      {tab !== "related" && tab !== "activity" && tab !== "history" ? (
        <div className="record-grid">
          <section className="card detail-card">
            <h2 className="section-title">Informações do lead</h2>
            <DetailGrid items={detailItems(db, lead)} />
          </section>
          <aside><Related lead={lead} db={db} /></aside>
        </div>
      ) : null}
    </div>
  );
}

function detailItems(db: DB, lead: Lead) {
  return [
    { label: "Nome", value: fullName(lead.firstName, lead.lastName) },
    { label: "Empresa", value: lead.company },
    { label: "Cargo", value: lead.title || "—" },
    { label: "Email", value: lead.email || "—" },
    { label: "Telefone", value: lead.phone || "—" },
    { label: "Celular", value: lead.mobile || "—" },
    { label: "Site", value: lead.website || "—" },
    { label: "Origem", value: lead.leadSource || "—" },
    { label: "Setor", value: lead.industry || "—" },
    { label: "Receita anual", value: formatMoney(lead.annualRevenue) },
    { label: "Funcionários", value: formatNumber(lead.employeeCount) },
    { label: "Proprietário", value: ownerName(db, lead.ownerId) },
    { label: "Endereço", value: formatAddress(lead.address) },
    { label: "Observações", value: lead.description || "—" },
    { label: "Qualificação", value: lead.qualificationNotes || "—" },
    { label: "Motivo de encerramento", value: lead.disqualificationReason || "—" },
    { label: "Criado em", value: formatDateTime(lead.createdAt) },
    { label: "Atualizado em", value: formatDateTime(lead.updatedAt) },
  ];
}

function leadEditFields(db: DB, user: Profile, lead: Lead) {
  const owners = assignableOwners(db, user);
  if (!owners.some((profile) => profile.id === lead.ownerId)) {
    const current = db.profiles.find((profile) => profile.id === lead.ownerId);
    if (current) owners.push(current);
  }
  return leadFields(owners.map((profile) => ({ value: profile.id, label: profile.fullName })));
}

function leadEditValues(db: DB, user: Profile, lead: Lead) {
  return formValues(leadEditFields(db, user, lead), {
    ...lead,
    annualRevenue: lead.annualRevenue,
    employeeCount: lead.employeeCount,
    ...addressValues("address", lead.address),
  });
}

function Related({ lead, db }: { lead: Lead; db: DB }) {
  const rows = [
    lead.convertedAccountId ? { href: `/crm/accounts/${lead.convertedAccountId}`, title: accountName(db, lead.convertedAccountId), meta: "Conta resultante" } : null,
    lead.convertedContactId ? { href: `/crm/contacts/${lead.convertedContactId}`, title: "Contato resultante", meta: "Aberto a partir deste lead" } : null,
    lead.convertedOpportunityId ? { href: `/crm/opportunities/${lead.convertedOpportunityId}`, title: db.opportunities.find((item) => item.id === lead.convertedOpportunityId)?.name ?? "Oportunidade", meta: "Oportunidade da conversão" } : null,
  ].filter((item): item is { href: string; title: string; meta: string } => Boolean(item));
  return <RelatedList title="Resultado da conversão" rows={rows} />;
}

