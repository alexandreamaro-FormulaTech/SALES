import { ActivityCards } from "@/components/activities";
import { Badge, DetailGrid, Lookup, PageHeader, RelatedList, Tabs } from "@/components/chrome";
import { EditDialog } from "@/components/edit-dialog";
import { HistoryList } from "@/components/history";
import { PathBar } from "@/components/path-bar";
import { ActivityForm, DeleteButton } from "@/components/record-actions";
import { RecordForm } from "@/components/record-form";
import { requireContext } from "@/lib/context";
import { isContractClosed, renewalSoon } from "@/lib/domain";
import { contractFields, formValues } from "@/lib/field-defs";
import { formatDate, formatDateTime, formatMoney, fullName } from "@/lib/format";
import { can, hasPermission } from "@/lib/permissions";
import { accountName, assignableOwners, lookupHref, ownerName } from "@/lib/queries";
import type { Contract, DB, Profile } from "@/lib/types";
import { notFound } from "next/navigation";

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; editar?: string }>;
}) {
  const { id } = await params;
  const { tab = "details", editar } = await searchParams;
  const { db, user } = await requireContext();
  const contract = db.contracts.find((item) => item.id === id && !item.deletedAt && item.organizationId === user.organizationId);
  if (!contract || !can(db, user, "contract.read", contract.ownerId)) notFound();
  const closed = isContractClosed(db, contract);
  const writable = can(db, user, "contract.update", contract.ownerId) && !closed;
  const stages = db.contractStatuses
    .filter((item) => item.organizationId === contract.organizationId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const currentStage = stages.find((item) => item.name === contract.status);
  const signer = db.contacts.find((item) => item.id === contract.signerContactId);
  const opportunity = db.opportunities.find((item) => item.id === contract.opportunityId);
  const base = `/crm/contracts/${contract.id}`;
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Contrato"
        title={contract.contractNumber}
        highlights={[
          { label: "Título", value: contract.name },
          { label: "Conta", value: <Lookup href={lookupHref(db, "account", contract.accountId)}>{accountName(db, contract.accountId)}</Lookup> },
          { label: "Status", value: contract.status },
          { label: "Valor", value: formatMoney(contract.amount) },
          { label: "Fim", value: formatDate(contract.endDate) },
        ]}
        actions={
          <>
            <Badge>{contract.status}</Badge>
            {renewalSoon(contract) ? <Badge>Renovação próxima</Badge> : null}
            {writable ? (
              <EditDialog title={`Editar ${contract.contractNumber}`} defaultOpen={editar === "1"}>
                <RecordForm
                  layout="modal"
                  actionKey="contract.update"
                  recordId={contract.id}
                  fields={contractEditFields(db, user, contract)}
                  values={contractEditValues(db, user, contract)}
                  cancelHref={base}
                  submitLabel="Salvar"
                />
              </EditDialog>
            ) : null}
            {can(db, user, "contract.delete", contract.ownerId) ? <DeleteButton object="contract" id={contract.id} label="este contrato" /> : null}
          </>
        }
      />
      <PathBar
        mode="contract"
        recordId={contract.id}
        steps={stages.filter((item) => !item.isClosed).map((item) => ({ id: item.id, name: item.name, guidance: item.guidanceText }))}
        currentId={currentStage?.id ?? ""}
        outcomes={stages.filter((item) => item.isClosed).map((item) => ({ id: item.id, name: item.name, requiresReason: false, guidance: item.guidanceText }))}
        locked={closed || !can(db, user, "contract.update", contract.ownerId)}
        keyFields={[
          { label: "Conta", value: accountName(db, contract.accountId) },
          { label: "Valor", value: formatMoney(contract.amount) },
          { label: "Início", value: formatDate(contract.startDate) },
          { label: "Fim", value: formatDate(contract.endDate) },
        ]}
      />
      <Tabs current={tab} tabs={[
        { id: "details", label: "Detalhes", href: `${base}?tab=details` },
        { id: "related", label: "Relacionados", href: `${base}?tab=related` },
        { id: "activity", label: "Atividades", href: `${base}?tab=activity` },
        { id: "history", label: "Histórico", href: `${base}?tab=history` },
      ]} />
      {tab === "details" ? (
        <section className="card detail-card space-y-0">
          <h2 className="section-title">Informações do contrato</h2>
          <DetailGrid items={[
            { label: "Título", value: contract.name },
            { label: "Conta", value: <Lookup href={lookupHref(db, "account", contract.accountId)}>{accountName(db, contract.accountId)}</Lookup> },
            { label: "Oportunidade", value: opportunity ? <Lookup href={lookupHref(db, "opportunity", opportunity.id)}>{opportunity.name}</Lookup> : "—" },
            { label: "Assinante", value: signer ? <Lookup href={lookupHref(db, "contact", signer.id)}>{fullName(signer.firstName, signer.lastName)}</Lookup> : "—" },
            { label: "Valor", value: formatMoney(contract.amount, contract.currencyCode) },
            { label: "Início", value: formatDate(contract.startDate) },
            { label: "Fim", value: formatDate(contract.endDate) },
            { label: "Prazo", value: contract.termMonths ? `${contract.termMonths} meses` : "—" },
            { label: "Aviso de renovação", value: `${contract.renewalNoticeDays} dias` },
            { label: "Assinado em", value: formatDateTime(contract.signedAt) },
            { label: "Ativado em", value: formatDateTime(contract.activatedAt) },
            { label: "Proprietário", value: <Lookup href={lookupHref(db, "user", contract.ownerId)}>{ownerName(db, contract.ownerId)}</Lookup> },
            { label: "Documento", value: contract.documentPath || "Nenhum arquivo registrado" },
            { label: "Observações", value: contract.description || "—" },
          ]} />
          <p className="px-4 pb-3 text-muted">O arquivo fica em armazenamento privado. Em produção, o download usa URL assinada.</p>
        </section>
      ) : null}
      {tab === "related" ? (
        <RelatedList title="Origem" rows={[
          { href: `/crm/accounts/${contract.accountId}`, title: accountName(db, contract.accountId), meta: "Conta" },
          ...(opportunity ? [{ href: `/crm/opportunities/${opportunity.id}`, title: opportunity.name, meta: "Oportunidade" }] : []),
          ...(signer ? [{ href: `/crm/contacts/${signer.id}`, title: fullName(signer.firstName, signer.lastName), meta: "Assinante" }] : []),
        ]} />
      ) : null}
      {tab === "activity" ? <div className="space-y-3">{writable ? <ActivityForm objectType="contract" recordId={contract.id} /> : null}<ActivityCards db={db} items={db.activities.filter((item) => item.objectType === "contract" && item.recordId === contract.id)} /></div> : null}
      {tab === "history" ? <HistoryList db={db} logs={db.auditLogs.filter((item) => item.objectType === "contract" && item.recordId === contract.id)} /> : null}
    </div>
  );
}

function contractEditFields(db: DB, user: Profile, contract: Contract) {
  const owners = assignableOwners(db, user);
  if (!owners.some((profile) => profile.id === contract.ownerId)) {
    const current = db.profiles.find((profile) => profile.id === contract.ownerId);
    if (current) owners.push(current);
  }
  const accounts = db.accounts
    .filter((account) => !account.deletedAt && can(db, user, "account.read", account.ownerId))
    .map((account) => ({ value: account.id, label: account.name }));
  const opportunities = db.opportunities
    .filter((item) => !item.deletedAt)
    .map((item) => ({ value: item.id, label: item.name, accountId: item.accountId }));
  const contacts = db.contacts
    .filter((contact) => !contact.deletedAt)
    .map((contact) => ({ value: contact.id, label: fullName(contact.firstName, contact.lastName), accountId: contact.accountId }));
  return contractFields(
    owners.map((profile) => ({ value: profile.id, label: profile.fullName })),
    accounts,
    opportunities,
    contacts,
    hasPermission(db, user, "contract.activate"),
    contract.status,
    db.contractStatuses
      .filter((item) => item.organizationId === contract.organizationId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({ name: item.name, isActive: item.isActive })),
  );
}

function contractEditValues(db: DB, user: Profile, contract: Contract) {
  return formValues(contractEditFields(db, user, contract), {
    ...contract,
    amount: contract.amount,
    termMonths: contract.termMonths,
    renewalNoticeDays: contract.renewalNoticeDays,
    opportunityId: contract.opportunityId,
    signerContactId: contract.signerContactId,
    startDate: contract.startDate,
    endDate: contract.endDate,
  });
}
