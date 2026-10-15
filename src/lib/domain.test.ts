import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  changeContractStatus,
  changeLeadStatus,
  changeOpportunityStage,
  convertLead,
  createAccount,
  createContact,
  createContract,
  createLead,
  createOpportunity,
  softDelete,
  updateLead,
  type AccountInput,
  type LeadInput,
} from "./domain";
import { IDS } from "./ids";
import { createBaseDb } from "./seed";
import { emptyAddress, type DB } from "./types";

const leadInput: LeadInput = {
  firstName: "Ana",
  lastName: "Souza",
  company: "Oficina Nova",
  title: "Compras",
  email: "ana.souza@oficinanova.example",
  phone: "(11) 3000-0000",
  mobile: "",
  website: "https://oficinanova.example",
  leadSource: "Site",
  rating: "Quente",
  industry: "Indústria",
  annualRevenue: 1000,
  employeeCount: 10,
  address: emptyAddress(),
  description: "",
  qualificationNotes: "Fit confirmado",
};

function accountInput(name = "Conta Teste"): AccountInput {
  return {
    name,
    legalName: name,
    taxId: "",
    type: "Prospect",
    industry: "Serviços",
    website: "",
    phone: "",
    annualRevenue: null,
    employeeCount: null,
    parentAccountId: null,
    billingAddress: emptyAddress(),
    shippingAddress: emptyAddress(),
    description: "",
  };
}

function qualify(db: DB, actorId: string) {
  const created = createLead(db, actorId, leadInput);
  assert.equal(created.result.ok, true);
  if (!created.result.ok) return created;
  return changeLeadStatus(created.db, actorId, created.result.data.id, IDS.stQualificado, "");
}

describe("conversão de lead", () => {
  it("cria conta, contato e oportunidade numa única operação e não repete", () => {
    const ready = qualify(createBaseDb(), IDS.vendedor);
    assert.equal(ready.result.ok, true);
    if (!ready.result.ok) return;
    const leadId = ready.db.leads.at(-1)!.id;
    const first = convertLead(ready.db, IDS.vendedor, {
      leadId,
      accountMode: "create",
      contactMode: "create",
      createOpportunity: true,
      acknowledgeDuplicates: true,
    });
    assert.equal(first.result.ok, true);
    if (!first.result.ok) return;
    assert.equal(first.db.accounts.length, 1);
    assert.equal(first.db.contacts.length, 1);
    assert.equal(first.db.opportunities.length, 1);
    assert.equal(first.db.opportunityContacts.length, 1);
    assert.equal(first.db.opportunityContacts[0]?.opportunityId, first.result.data.opportunityId);
    assert.equal(first.db.opportunityContacts[0]?.contactId, first.result.data.contactId);
    assert.equal(first.db.opportunityContacts[0]?.isPrimary, true);
    const lead = first.db.leads.find((item) => item.id === leadId)!;
    assert.equal(lead.isConverted, true);
    assert.equal(lead.convertedAccountId, first.result.data.accountId);
    assert.equal(first.db.accounts[0]?.sourceLeadId, leadId);
    assert.ok(first.db.auditLogs.some((log) => log.action === "convert" && log.recordId === leadId));

    const second = convertLead(first.db, IDS.vendedor, {
      leadId,
      accountMode: "create",
      contactMode: "create",
      createOpportunity: true,
      acknowledgeDuplicates: true,
    });
    assert.equal(second.result.ok, true);
    if (!second.result.ok) return;
    assert.equal(second.result.data.idempotent, true);
    assert.equal(second.db.accounts.length, 1);
    assert.equal(second.db, first.db);
  });

  it("recusa lead que não está qualificado e status terminal manual", () => {
    const created = createLead(createBaseDb(), IDS.vendedor, leadInput);
    assert.equal(created.result.ok, true);
    if (!created.result.ok) return;
    const denied = convertLead(created.db, IDS.vendedor, {
      leadId: created.result.data.id,
      accountMode: "create",
      contactMode: "create",
      createOpportunity: false,
      acknowledgeDuplicates: true,
    });
    assert.equal(denied.result.ok, false);
    const manual = changeLeadStatus(created.db, IDS.vendedor, created.result.data.id, IDS.stConvertido, "");
    assert.equal(manual.result.ok, false);
  });

  it("exige confirmação quando o CNPJ já existe e não sobrescreve conta vinculada", () => {
    const base = createAccount(createBaseDb(), IDS.admin, { ...accountInput("Pilar Energia"), taxId: "12345678000190", website: "https://oficinanova.example" });
    assert.equal(base.result.ok, true);
    if (!base.result.ok) return;
    const accountId = base.result.data.id;
    const ready = qualify(base.db, IDS.vendedor);
    assert.equal(ready.result.ok, true);
    if (!ready.result.ok) return;
    const leadId = ready.db.leads.at(-1)!.id;
    const blocked = convertLead(ready.db, IDS.vendedor, {
      leadId,
      accountMode: "create",
      taxId: "12.345.678/0001-90",
      contactMode: "create",
      createOpportunity: false,
      acknowledgeDuplicates: false,
    });
    assert.equal(blocked.result.ok, false);
    if (blocked.result.ok) return;
    assert.ok(blocked.result.duplicates?.some((item) => item.reason.includes("CNPJ")));
    const originalName = ready.db.accounts[0]?.name;
    const linked = convertLead(ready.db, IDS.vendedor, {
      leadId,
      accountMode: "link",
      accountId,
      contactMode: "create",
      createOpportunity: false,
      acknowledgeDuplicates: true,
    });
    assert.equal(linked.result.ok, true);
    if (!linked.result.ok) return;
    assert.equal(linked.db.accounts.find((account) => account.id === accountId)?.name, originalName);
  });

  it("não vincula contato de outra conta", () => {
    let db = createBaseDb();
    const first = createAccount(db, IDS.admin, accountInput("Conta A"));
    db = first.db;
    const second = createAccount(db, IDS.admin, accountInput("Conta B"));
    db = second.db;
    assert.equal(first.result.ok && second.result.ok, true);
    if (!first.result.ok || !second.result.ok) return;
    const contact = createContact(db, IDS.admin, {
      accountId: second.result.data.id,
      firstName: "Lia",
      lastName: "Dias",
      email: "lia@b.example",
      phone: "",
      mobile: "",
      title: "",
      department: "",
      reportsToContactId: null,
      isPrimary: true,
      mailingAddress: emptyAddress(),
      leadSource: "",
      emailOptOut: false,
      doNotCall: false,
      description: "",
    });
    db = contact.db;
    const ready = qualify(db, IDS.vendedor);
    assert.equal(contact.result.ok && ready.result.ok, true);
    if (!contact.result.ok || !ready.result.ok) return;
    const result = convertLead(ready.db, IDS.vendedor, {
      leadId: ready.db.leads.at(-1)!.id,
      accountMode: "link",
      accountId: first.result.data.id,
      contactMode: "link",
      contactId: contact.result.data.id,
      createOpportunity: false,
      acknowledgeDuplicates: true,
    });
    assert.equal(result.result.ok, false);
  });
});

describe("permissões e integridade", () => {
  it("impede auditor de criar e vendedor de editar registro de outro", () => {
    const denied = createLead(createBaseDb(), IDS.auditor, leadInput);
    assert.equal(denied.result.ok, false);
    const created = createLead(createBaseDb(), IDS.gestor, leadInput);
    assert.equal(created.result.ok, true);
    if (!created.result.ok) return;
    const edited = updateLead(created.db, IDS.vendedor, created.result.data.id, { ...leadInput, company: "Outra" });
    assert.equal(edited.result.ok, false);
    const byManager = updateLead(created.db, IDS.gestor, created.result.data.id, { ...leadInput, company: "Ajustada" });
    assert.equal(byManager.result.ok, true);
  });

  it("bloqueia exclusão de conta com relacionamento e de lead convertido", () => {
    const account = createAccount(createBaseDb(), IDS.admin, accountInput());
    assert.equal(account.result.ok, true);
    if (!account.result.ok) return;
    const contact = createContact(account.db, IDS.admin, {
      accountId: account.result.data.id,
      firstName: "João",
      lastName: "Lima",
      email: "",
      phone: "",
      mobile: "",
      title: "",
      department: "",
      reportsToContactId: null,
      isPrimary: false,
      mailingAddress: emptyAddress(),
      leadSource: "",
      emailOptOut: false,
      doNotCall: false,
      description: "",
    });
    const removed = softDelete(contact.db, IDS.admin, "account", account.result.data.id);
    assert.equal(removed.result.ok, false);

    const ready = qualify(createBaseDb(), IDS.vendedor);
    assert.equal(ready.result.ok, true);
    if (!ready.result.ok) return;
    const leadId = ready.db.leads.at(-1)!.id;
    const converted = convertLead(ready.db, IDS.vendedor, {
      leadId,
      accountMode: "create",
      contactMode: "create",
      createOpportunity: false,
      acknowledgeDuplicates: true,
    });
    assert.equal(converted.result.ok, true);
    if (!converted.result.ok) return;
    assert.equal(updateLead(converted.db, IDS.vendedor, leadId, leadInput).result.ok, false);
    assert.equal(softDelete(converted.db, IDS.vendedor, "lead", leadId).result.ok, false);
  });
});

describe("oportunidade e contrato", () => {
  it("recalcula a probabilidade, exige motivo na perda e valor na vitória", () => {
    const account = createAccount(createBaseDb(), IDS.vendedor, accountInput());
    assert.equal(account.result.ok, true);
    if (!account.result.ok) return;
    const created = createOpportunity(account.db, IDS.vendedor, {
      name: "Negócio",
      accountId: account.result.data.id,
      amount: null,
      closeDate: "2026-12-01",
      probability: null,
      type: "Novo negócio",
      leadSource: "Site",
      nextStep: "",
      description: "",
      primaryContactId: null,
    });
    assert.equal(created.result.ok, true);
    if (!created.result.ok) return;
    const lost = changeOpportunityStage(created.db, IDS.vendedor, created.result.data.id, IDS.sgPerdida, "");
    assert.equal(lost.result.ok, false);
    const won = changeOpportunityStage(created.db, IDS.vendedor, created.result.data.id, IDS.sgGanha, "");
    assert.equal(won.result.ok, false);
    const proposed = changeOpportunityStage(created.db, IDS.vendedor, created.result.data.id, IDS.sgProposta, "");
    assert.equal(proposed.result.ok, true);
    if (!proposed.result.ok) return;
    assert.equal(proposed.db.opportunities[0]?.probability, 50);
    const priced = structuredClone(proposed.db);
    priced.opportunities[0]!.amount = 5000;
    const closed = changeOpportunityStage(priced, IDS.vendedor, created.result.data.id, IDS.sgGanha, "");
    assert.equal(closed.result.ok, true);
    if (!closed.result.ok) return;
    assert.equal(closed.db.opportunities[0]?.probability, 100);
    assert.ok(closed.db.opportunities[0]?.actualCloseDate);
  });

  it("não deixa o contrato apontar para oportunidade de outra conta", () => {
    let db = createBaseDb();
    const a = createAccount(db, IDS.admin, accountInput("A"));
    db = a.db;
    const b = createAccount(db, IDS.admin, accountInput("B"));
    db = b.db;
    assert.equal(a.result.ok && b.result.ok, true);
    if (!a.result.ok || !b.result.ok) return;
    const opportunity = createOpportunity(db, IDS.admin, {
      name: "Da conta A",
      accountId: a.result.data.id,
      amount: 10,
      closeDate: "2026-12-01",
      probability: 10,
      type: "Novo negócio",
      leadSource: "",
      nextStep: "",
      description: "",
      primaryContactId: null,
    });
    assert.equal(opportunity.result.ok, true);
    if (!opportunity.result.ok) return;
    const contract = createContract(opportunity.db, IDS.admin, {
      name: "Contrato cruzado",
      accountId: b.result.data.id,
      opportunityId: opportunity.result.data.id,
      signerContactId: null,
      status: "Rascunho",
      startDate: null,
      endDate: null,
      termMonths: null,
      amount: 10,
      renewalNoticeDays: 30,
      documentPath: "",
      description: "",
    });
    assert.equal(contract.result.ok, false);
  });

  it("avança o contrato pelo catálogo e impede ativação sem permissão", () => {
    const account = createAccount(createBaseDb(), IDS.vendedor, accountInput());
    assert.equal(account.result.ok, true);
    if (!account.result.ok) return;
    const created = createContract(account.db, IDS.vendedor, {
      name: "Minuta",
      accountId: account.result.data.id,
      opportunityId: null,
      signerContactId: null,
      status: "Rascunho",
      startDate: null,
      endDate: null,
      termMonths: null,
      amount: 100,
      renewalNoticeDays: 30,
      documentPath: "",
      description: "",
    });
    assert.equal(created.result.ok, true);
    if (!created.result.ok) return;
    const signed = changeContractStatus(created.db, IDS.vendedor, created.result.data.id, IDS.csAssinado);
    assert.equal(signed.result.ok, true);
    if (!signed.result.ok) return;
    assert.equal(signed.db.contracts[0]?.status, "Assinado");
    assert.ok(signed.db.contracts[0]?.signedAt);
    const denied = changeContractStatus(signed.db, IDS.vendedor, created.result.data.id, IDS.csAtivo);
    assert.equal(denied.result.ok, false);
    const active = changeContractStatus(signed.db, IDS.admin, created.result.data.id, IDS.csAtivo);
    assert.equal(active.result.ok, true);
    if (!active.result.ok) return;
    assert.equal(active.db.contracts[0]?.status, "Ativo");
    assert.ok(active.db.contracts[0]?.activatedAt);
    const expired = changeContractStatus(active.db, IDS.admin, created.result.data.id, IDS.csExpirado);
    assert.equal(expired.result.ok, true);
    if (!expired.result.ok) return;
    assert.equal(changeContractStatus(expired.db, IDS.admin, created.result.data.id, IDS.csRascunho).result.ok, false);
  });
});
