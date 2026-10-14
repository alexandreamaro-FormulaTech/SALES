import { ActivityCards } from "@/components/activities";
import { Badge, DetailGrid, PageHeader, RelatedList, Tabs } from "@/components/chrome";
import { EditDialog } from "@/components/edit-dialog";
import { HistoryList } from "@/components/history";
import { ActivityForm, DeleteButton } from "@/components/record-actions";
import { RecordForm } from "@/components/record-form";
import { requireContext } from "@/lib/context";
import { contactFields, formValues } from "@/lib/field-defs";
import { addressValues } from "@/lib/form-input";
import { formatAddress, formatDateTime, fullName } from "@/lib/format";
import { can } from "@/lib/permissions";
import { accountName, assignableOwners, ownerName, stageName } from "@/lib/queries";
import type { Contact, DB, Profile } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; editar?: string }>;
}) {
  const { id } = await params;
  const { tab = "details", editar } = await searchParams;
  const { db, user } = await requireContext();
  const contact = db.contacts.find((item) => item.id === id && !item.deletedAt && item.organizationId === user.organizationId);
  if (!contact || !can(db, user, "contact.read", contact.ownerId)) notFound();
  const writable = can(db, user, "contact.update", contact.ownerId);
  const opportunities = db.opportunities.filter((item) => !item.deletedAt && (item.primaryContactId === contact.id || db.opportunityContacts.some((link) => link.opportunityId === item.id && link.contactId === contact.id)));
  const base = `/crm/contacts/${contact.id}`;
  const name = fullName(contact.firstName, contact.lastName);
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Contato"
        title={name}
        highlights={[
          { label: "Conta", value: accountName(db, contact.accountId) },
          { label: "Cargo", value: contact.title || "—" },
          { label: "Email", value: contact.email || "—" },
          { label: "Telefone", value: contact.phone || contact.mobile || "—" },
        ]}
        actions={
          <>
            {contact.isPrimary ? <Badge>Principal</Badge> : null}
            {contact.doNotCall ? <Badge>Não ligar</Badge> : null}
            {contact.emailOptOut ? <Badge>Sem email</Badge> : null}
            {writable ? (
              <EditDialog title={`Editar ${name}`} defaultOpen={editar === "1"}>
                <RecordForm
                  layout="modal"
                  actionKey="contact.update"
                  recordId={contact.id}
                  fields={contactEditFields(db, user, contact)}
                  values={contactEditValues(db, user, contact)}
                  cancelHref={base}
                  submitLabel="Salvar"
                />
              </EditDialog>
            ) : null}
            {can(db, user, "contact.delete", contact.ownerId) ? <DeleteButton object="contact" id={contact.id} label="este contato" /> : null}
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
        <section className="card detail-card">
          <h2 className="section-title">Informações do contato</h2>
          <DetailGrid items={[
            { label: "Nome", value: name },
            { label: "Conta", value: <Link className="text-primary" href={`/crm/accounts/${contact.accountId}`}>{accountName(db, contact.accountId)}</Link> },
            { label: "Cargo", value: contact.title || "—" },
            { label: "Departamento", value: contact.department || "—" },
            { label: "Email", value: contact.email || "—" },
            { label: "Telefone", value: contact.phone || "—" },
            { label: "Celular", value: contact.mobile || "—" },
            { label: "Origem", value: contact.leadSource || "—" },
            { label: "Proprietário", value: ownerName(db, contact.ownerId) },
            { label: "Endereço", value: formatAddress(contact.mailingAddress) },
            { label: "Observações", value: contact.description || "—" },
            { label: "Criado em", value: formatDateTime(contact.createdAt) },
          ]} />
        </section>
      ) : null}
      {tab === "related" ? (
        <RelatedList title="Oportunidades" rows={opportunities.map((item) => ({ href: `/crm/opportunities/${item.id}`, title: item.name, meta: `${stageName(db, item.stageId)} · ${formatMoney(item.amount)}` }))} />
      ) : null}
      {tab === "activity" ? (
        <div className="space-y-3">
          {writable ? <ActivityForm objectType="contact" recordId={contact.id} /> : null}
          <ActivityCards db={db} items={db.activities.filter((item) => item.objectType === "contact" && item.recordId === contact.id)} />
        </div>
      ) : null}
      {tab === "history" ? <HistoryList db={db} logs={db.auditLogs.filter((item) => item.objectType === "contact" && item.recordId === contact.id)} /> : null}
    </div>
  );
}

function contactEditFields(db: DB, user: Profile, contact: Contact) {
  const owners = assignableOwners(db, user);
  if (!owners.some((profile) => profile.id === contact.ownerId)) {
    const current = db.profiles.find((profile) => profile.id === contact.ownerId);
    if (current) owners.push(current);
  }
  const accounts = db.accounts
    .filter((account) => !account.deletedAt && can(db, user, "account.read", account.ownerId))
    .map((account) => ({ value: account.id, label: account.name }));
  const reports = db.contacts
    .filter((item) => item.id !== contact.id && !item.deletedAt)
    .map((item) => ({ value: item.id, label: fullName(item.firstName, item.lastName) }));
  return contactFields(owners.map((profile) => ({ value: profile.id, label: profile.fullName })), accounts, reports);
}

function contactEditValues(db: DB, user: Profile, contact: Contact) {
  return formValues(contactEditFields(db, user, contact), {
    ...contact,
    isPrimary: contact.isPrimary,
    emailOptOut: contact.emailOptOut,
    doNotCall: contact.doNotCall,
    reportsToContactId: contact.reportsToContactId,
    ...addressValues("mailing", contact.mailingAddress),
  });
}
