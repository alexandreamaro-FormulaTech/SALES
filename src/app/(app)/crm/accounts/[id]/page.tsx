import { ActivityCards } from "@/components/activities";
import { Badge, DetailGrid, Lookup, PageHeader, RelatedList, Tabs } from "@/components/chrome";
import { EditDialog } from "@/components/edit-dialog";
import { HistoryList } from "@/components/history";
import { ActivityForm, DeleteButton } from "@/components/record-actions";
import { RecordForm } from "@/components/record-form";
import { requireContext } from "@/lib/context";
import { accountFields, formValues } from "@/lib/field-defs";
import { addressValues } from "@/lib/form-input";
import { formatAddress, formatDateTime, formatMoney, formatNumber, formatTaxId, fullName } from "@/lib/format";
import { can } from "@/lib/permissions";
import { accountName, assignableOwners, lookupHref, ownerName, stageName } from "@/lib/queries";
import type { Account, DB, Profile } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; editar?: string }>;
}) {
  const { id } = await params;
  const { tab = "details", editar } = await searchParams;
  const { db, user } = await requireContext();
  const account = db.accounts.find((item) => item.id === id && !item.deletedAt && item.organizationId === user.organizationId);
  if (!account || !can(db, user, "account.read", account.ownerId)) notFound();
  const writable = can(db, user, "account.update", account.ownerId);
  const contacts = db.contacts.filter((item) => item.accountId === account.id && !item.deletedAt);
  const opportunities = db.opportunities.filter((item) => item.accountId === account.id && !item.deletedAt);
  const contracts = db.contracts.filter((item) => item.accountId === account.id && !item.deletedAt);
  const base = `/crm/accounts/${account.id}`;
  const activities = db.activities.filter((item) => item.objectType === "account" && item.recordId === account.id);
  const logs = db.auditLogs.filter((item) => item.objectType === "account" && item.recordId === account.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Conta"
        title={account.name}
        highlights={[
          { label: "Telefone", value: account.phone || "—" },
          { label: "Tipo", value: account.type },
          { label: "Setor", value: account.industry || "—" },
          { label: "Proprietário", value: <Lookup href={lookupHref(db, "user", account.ownerId)}>{ownerName(db, account.ownerId)}</Lookup> },
        ]}
        actions={
          <>
            <Badge>{account.type}</Badge>
            {writable ? (
              <EditDialog title={`Editar ${account.name}`} defaultOpen={editar === "1"}>
                <RecordForm
                  layout="modal"
                  actionKey="account.update"
                  recordId={account.id}
                  fields={accountEditFields(db, user, account)}
                  values={accountEditValues(db, user, account)}
                  cancelHref={base}
                  submitLabel="Salvar"
                />
              </EditDialog>
            ) : null}
            {can(db, user, "contact.create") ? <Link className="btn" href={`/crm/contacts/new?accountId=${account.id}`}>Novo contato</Link> : null}
            {can(db, user, "opportunity.create") ? <Link className="btn" href={`/crm/opportunities/new?accountId=${account.id}`}>Nova oportunidade</Link> : null}
            {can(db, user, "account.delete", account.ownerId) ? <DeleteButton object="account" id={account.id} label="esta conta" /> : null}
          </>
        }
      />
      <Tabs current={tab} tabs={[
        { id: "details", label: "Detalhes", href: `${base}?tab=details` },
        { id: "related", label: "Relacionados", href: `${base}?tab=related` },
        { id: "activity", label: "Atividades", href: `${base}?tab=activity` },
        { id: "history", label: "Histórico", href: `${base}?tab=history` },
      ]} />
      {tab === "details" ? (
        <div className="record-grid">
          <section className="card detail-card">
            <h2 className="section-title">Informações da conta</h2>
            <DetailGrid items={[
            { label: "Nome", value: account.name },
            { label: "Razão social", value: account.legalName || "—" },
            { label: "CNPJ/CPF", value: formatTaxId(account.taxId) },
            { label: "Tipo", value: account.type },
            { label: "Setor", value: account.industry || "—" },
            { label: "Site", value: account.website || "—" },
            { label: "Telefone", value: account.phone || "—" },
            { label: "Receita anual", value: formatMoney(account.annualRevenue) },
            { label: "Funcionários", value: formatNumber(account.employeeCount) },
            { label: "Conta pai", value: <Lookup href={lookupHref(db, "account", account.parentAccountId)}>{account.parentAccountId ? accountName(db, account.parentAccountId) : "—"}</Lookup> },
            { label: "Proprietário", value: <Lookup href={lookupHref(db, "user", account.ownerId)}>{ownerName(db, account.ownerId)}</Lookup> },
            { label: "Cobrança", value: formatAddress(account.billingAddress) },
            { label: "Entrega", value: formatAddress(account.shippingAddress) },
            { label: "Observações", value: account.description || "—" },
            { label: "Criado em", value: formatDateTime(account.createdAt) },
          ]} />
        </section>
          <aside className="grid gap-3">
            <Mini title="Contatos" count={contacts.length} />
            <Mini title="Oportunidades" count={opportunities.length} />
            <Mini title="Contratos" count={contracts.length} />
          </aside>
        </div>
      ) : null}
      {tab === "related" ? (
        <div className="grid gap-3 lg:grid-cols-3">
          <RelatedList title="Contatos" rows={contacts.map((contact) => ({ href: `/crm/contacts/${contact.id}`, title: fullName(contact.firstName, contact.lastName), meta: contact.title || "Sem cargo" }))} />
          <RelatedList title="Oportunidades" rows={opportunities.map((item) => ({ href: `/crm/opportunities/${item.id}`, title: item.name, meta: `${stageName(db, item.stageId)} · ${formatMoney(item.amount)}` }))} />
          <RelatedList title="Contratos" rows={contracts.map((item) => ({ href: `/crm/contracts/${item.id}`, title: item.contractNumber, meta: `${item.status} · ${item.name}` }))} />
        </div>
      ) : null}
      {tab === "activity" ? <div className="space-y-3">{writable ? <ActivityForm objectType="account" recordId={account.id} /> : null}<ActivityCards db={db} items={activities} /></div> : null}
      {tab === "history" ? <HistoryList db={db} logs={logs} /> : null}
    </div>
  );
}

function accountEditFields(db: DB, user: Profile, account: Account) {
  const owners = assignableOwners(db, user);
  if (!owners.some((profile) => profile.id === account.ownerId)) {
    const current = db.profiles.find((profile) => profile.id === account.ownerId);
    if (current) owners.push(current);
  }
  const parents = db.accounts
    .filter((item) => item.id !== account.id && !item.deletedAt && can(db, user, "account.read", item.ownerId))
    .map((item) => ({ value: item.id, label: item.name }));
  return accountFields(owners.map((profile) => ({ value: profile.id, label: profile.fullName })), parents);
}

function accountEditValues(db: DB, user: Profile, account: Account) {
  return formValues(accountEditFields(db, user, account), {
    ...account,
    parentAccountId: account.parentAccountId,
    annualRevenue: account.annualRevenue,
    employeeCount: account.employeeCount,
    ...addressValues("billing", account.billingAddress),
    ...addressValues("shipping", account.shippingAddress),
  });
}

function Mini({ title, count }: { title: string; count: number }) {
  return <div className="card px-4 py-3"><p className="text-xs font-bold tracking-wide text-muted uppercase">{title}</p><p className="font-display text-2xl font-semibold">{count}</p></div>;
}
