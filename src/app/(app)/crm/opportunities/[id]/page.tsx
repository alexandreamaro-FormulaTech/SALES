import { ActivityCards } from "@/components/activities";
import { Badge, DetailGrid, Lookup, PageHeader, RelatedList, Tabs } from "@/components/chrome";
import { EditDialog } from "@/components/edit-dialog";
import { HistoryList } from "@/components/history";
import { PathBar } from "@/components/path-bar";
import { ActivityForm, DeleteButton } from "@/components/record-actions";
import { RecordForm } from "@/components/record-form";
import { requireContext } from "@/lib/context";
import { expectedRevenue } from "@/lib/domain";
import { formValues, opportunityFields } from "@/lib/field-defs";
import { formatDate, formatDateTime, formatMoney, fullName } from "@/lib/format";
import { can } from "@/lib/permissions";
import { accountName, assignableOwners, lookupHref, ownerName } from "@/lib/queries";
import type { DB, Opportunity, Profile } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function OpportunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; editar?: string }>;
}) {
  const { id } = await params;
  const { tab = "details", editar } = await searchParams;
  const { db, user } = await requireContext();
  const opportunity = db.opportunities.find((item) => item.id === id && !item.deletedAt && item.organizationId === user.organizationId);
  if (!opportunity || !can(db, user, "opportunity.read", opportunity.ownerId)) notFound();
  const stage = db.opportunityStages.find((item) => item.id === opportunity.stageId);
  const writable = can(db, user, "opportunity.update", opportunity.ownerId) && !stage?.isClosed;
  const steps = db.opportunityStages.filter((item) => item.isWon || !item.isClosed).sort((a, b) => a.sortOrder - b.sortOrder).map((item) => ({
    id: item.id,
    name: item.name,
    guidance: item.guidanceText,
  }));
  const lost = db.opportunityStages.find((item) => item.isClosed && !item.isWon);
  const contact = db.contacts.find((item) => item.id === opportunity.primaryContactId);
  const contracts = db.contracts.filter((item) => item.opportunityId === opportunity.id && !item.deletedAt);
  const base = `/crm/opportunities/${opportunity.id}`;
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Oportunidade"
        title={opportunity.name}
        highlights={[
          { label: "Conta", value: <Lookup href={lookupHref(db, "account", opportunity.accountId)}>{accountName(db, opportunity.accountId)}</Lookup> },
          { label: "Valor", value: formatMoney(opportunity.amount) },
          { label: "Fechamento", value: formatDate(opportunity.closeDate) },
          { label: "Etapa", value: stage?.name ?? "—" },
          { label: "Proprietário", value: <Lookup href={lookupHref(db, "user", opportunity.ownerId)}>{ownerName(db, opportunity.ownerId)}</Lookup> },
        ]}
        actions={
          <>
            <Badge>{stage?.name ?? "—"}</Badge>
            <Badge>{opportunity.type}</Badge>
            {writable ? (
              <EditDialog title={`Editar ${opportunity.name}`} defaultOpen={editar === "1"}>
                <RecordForm
                  layout="modal"
                  actionKey="opportunity.update"
                  recordId={opportunity.id}
                  fields={opportunityEditFields(db, user, opportunity)}
                  values={opportunityEditValues(db, user, opportunity)}
                  cancelHref={base}
                  submitLabel="Salvar"
                />
              </EditDialog>
            ) : null}
            {stage?.isWon && can(db, user, "contract.create") ? <Link className="btn btn-primary" href={`/crm/contracts/new?accountId=${opportunity.accountId}&opportunityId=${opportunity.id}`}>Criar contrato</Link> : null}
            {can(db, user, "opportunity.delete", opportunity.ownerId) ? <DeleteButton object="opportunity" id={opportunity.id} label="esta oportunidade" /> : null}
          </>
        }
      />
      <PathBar
        mode="opportunity"
        recordId={opportunity.id}
        steps={steps}
        currentId={opportunity.stageId}
        outcomes={lost ? [{ id: lost.id, name: lost.name, requiresReason: true, guidance: lost.guidanceText }] : []}
        locked={Boolean(stage?.isClosed) || !can(db, user, stage?.isClosed ? "opportunity.close" : "opportunity.update", opportunity.ownerId)}
        keyFields={[
          { label: "Valor", value: formatMoney(opportunity.amount) },
          { label: "Fechamento", value: formatDate(opportunity.closeDate) },
          { label: "Próxima ação", value: opportunity.nextStep || "—" },
          { label: "Probabilidade", value: `${opportunity.probability}%` },
          { label: "Contato", value: contact ? fullName(contact.firstName, contact.lastName) : "—" },
        ]}
      />
      <Tabs current={tab} tabs={[
        { id: "details", label: "Detalhes", href: `${base}?tab=details` },
        { id: "related", label: "Relacionados", href: `${base}?tab=related` },
        { id: "activity", label: "Atividades", href: `${base}?tab=activity` },
        { id: "history", label: "Histórico", href: `${base}?tab=history` },
      ]} />
      {tab === "details" ? (
        <section className="card detail-card">
          <h2 className="section-title">Informações da oportunidade</h2>
          <DetailGrid items={[
            { label: "Conta", value: <Lookup href={lookupHref(db, "account", opportunity.accountId)}>{accountName(db, opportunity.accountId)}</Lookup> },
            { label: "Contato principal", value: contact ? <Lookup href={lookupHref(db, "contact", contact.id)}>{fullName(contact.firstName, contact.lastName)}</Lookup> : "—" },
            { label: "Valor", value: formatMoney(opportunity.amount) },
            { label: "Receita prevista", value: formatMoney(expectedRevenue(opportunity)) },
            { label: "Probabilidade", value: `${opportunity.probability}%` },
            { label: "Fechamento previsto", value: formatDate(opportunity.closeDate) },
            { label: "Fechamento efetivo", value: formatDate(opportunity.actualCloseDate) },
            { label: "Tipo", value: opportunity.type },
            { label: "Origem", value: opportunity.leadSource || "—" },
            { label: "Próxima ação", value: opportunity.nextStep || "—" },
            { label: "Motivo da perda", value: opportunity.lossReason || "—" },
            { label: "Proprietário", value: <Lookup href={lookupHref(db, "user", opportunity.ownerId)}>{ownerName(db, opportunity.ownerId)}</Lookup> },
            { label: "Contexto", value: opportunity.description || "—" },
            { label: "Atualizado em", value: formatDateTime(opportunity.updatedAt) },
          ]} />
        </section>
      ) : null}
      {tab === "related" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <RelatedList title="Contatos" rows={relatedContacts(db, opportunity).map((link) => {
            const person = db.contacts.find((item) => item.id === link.contactId);
            return { href: `/crm/contacts/${link.contactId}`, title: person ? fullName(person.firstName, person.lastName) : "Contato", meta: link.role || "Contato" };
          })} />
          <RelatedList title="Contratos" rows={contracts.map((item) => ({ href: `/crm/contracts/${item.id}`, title: item.contractNumber, meta: `${item.status} · ${formatMoney(item.amount)}` }))} />
        </div>
      ) : null}
      {tab === "activity" ? <div className="space-y-3">{writable ? <ActivityForm objectType="opportunity" recordId={opportunity.id} /> : null}<ActivityCards db={db} items={db.activities.filter((item) => item.objectType === "opportunity" && item.recordId === opportunity.id)} /></div> : null}
      {tab === "history" ? <HistoryList db={db} logs={db.auditLogs.filter((item) => item.objectType === "opportunity" && item.recordId === opportunity.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))} /> : null}
    </div>
  );
}

function relatedContacts(db: DB, opportunity: Opportunity) {
  const links = db.opportunityContacts.filter((item) => item.opportunityId === opportunity.id);
  if (opportunity.primaryContactId && !links.some((item) => item.contactId === opportunity.primaryContactId)) {
    links.push({
      id: opportunity.primaryContactId,
      organizationId: opportunity.organizationId,
      opportunityId: opportunity.id,
      contactId: opportunity.primaryContactId,
      role: "Contato principal",
      isPrimary: true,
    });
  }
  return links;
}

function opportunityEditFields(db: DB, user: Profile, opportunity: Opportunity) {
  const owners = assignableOwners(db, user);
  if (!owners.some((profile) => profile.id === opportunity.ownerId)) {
    const current = db.profiles.find((profile) => profile.id === opportunity.ownerId);
    if (current) owners.push(current);
  }
  const accounts = db.accounts
    .filter((account) => !account.deletedAt && can(db, user, "account.read", account.ownerId))
    .map((account) => ({ value: account.id, label: account.name }));
  const contacts = db.contacts
    .filter((contact) => !contact.deletedAt)
    .map((contact) => ({ value: contact.id, label: fullName(contact.firstName, contact.lastName), accountId: contact.accountId }));
  return opportunityFields(owners.map((profile) => ({ value: profile.id, label: profile.fullName })), accounts, contacts);
}

function opportunityEditValues(db: DB, user: Profile, opportunity: Opportunity) {
  return formValues(opportunityEditFields(db, user, opportunity), {
    ...opportunity,
    amount: opportunity.amount,
    probability: opportunity.probability,
    primaryContactId: opportunity.primaryContactId,
  });
}
