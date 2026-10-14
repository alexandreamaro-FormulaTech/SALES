import { domainOf, emailDomain, fullName, todayISO } from "./format";
import { can, hasPermission } from "./permissions";
import type {
  Account,
  Activity,
  ActivityType,
  Address,
  AuditChange,
  Contract,
  ContractStatus,
  CrmObject,
  DB,
  DomainResult,
  DuplicateHit,
  Lead,
  Opportunity,
  PermissionKey,
  Profile,
} from "./types";

const TRACKED: Record<CrmObject, string[]> = {
  lead: [
    "firstName", "lastName", "company", "title", "email", "phone", "mobile", "website",
    "statusId", "leadSource", "rating", "industry", "annualRevenue", "employeeCount",
    "description", "qualificationNotes", "disqualificationReason", "ownerId", "address",
  ],
  account: [
    "name", "legalName", "taxId", "type", "industry", "website", "phone", "annualRevenue",
    "employeeCount", "parentAccountId", "billingAddress", "shippingAddress", "description", "ownerId",
  ],
  contact: [
    "accountId", "firstName", "lastName", "email", "phone", "mobile", "title", "department",
    "reportsToContactId", "isPrimary", "mailingAddress", "leadSource", "emailOptOut", "doNotCall",
    "description", "ownerId",
  ],
  opportunity: [
    "name", "accountId", "stageId", "amount", "probability", "closeDate", "actualCloseDate", "type",
    "leadSource", "nextStep", "description", "lossReason", "primaryContactId", "ownerId",
  ],
  contract: [
    "name", "accountId", "opportunityId", "signerContactId", "status", "startDate", "endDate",
    "termMonths", "amount", "signedAt", "activatedAt", "renewalNoticeDays", "documentPath",
    "description", "ownerId",
  ],
};

export type LeadInput = {
  ownerId?: string;
  firstName: string;
  lastName: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  mobile: string;
  website: string;
  leadSource: string;
  rating: Lead["rating"];
  industry: string;
  annualRevenue: number | null;
  employeeCount: number | null;
  address: Address;
  description: string;
  qualificationNotes: string;
};

export type AccountInput = {
  ownerId?: string;
  name: string;
  legalName: string;
  taxId: string;
  type: Account["type"];
  industry: string;
  website: string;
  phone: string;
  annualRevenue: number | null;
  employeeCount: number | null;
  parentAccountId: string | null;
  billingAddress: Address;
  shippingAddress: Address;
  description: string;
};

export type ContactInput = {
  ownerId?: string;
  accountId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  title: string;
  department: string;
  reportsToContactId: string | null;
  isPrimary: boolean;
  mailingAddress: Address;
  leadSource: string;
  emailOptOut: boolean;
  doNotCall: boolean;
  description: string;
};

export type OpportunityInput = {
  ownerId?: string;
  name: string;
  accountId: string;
  amount: number | null;
  closeDate: string;
  probability: number | null;
  type: Opportunity["type"];
  leadSource: string;
  nextStep: string;
  description: string;
  primaryContactId: string | null;
};

export type ContractInput = {
  ownerId?: string;
  name: string;
  accountId: string;
  opportunityId: string | null;
  signerContactId: string | null;
  status: ContractStatus;
  startDate: string | null;
  endDate: string | null;
  termMonths: number | null;
  amount: number | null;
  renewalNoticeDays: number;
  documentPath: string;
  description: string;
};

export type ConvertInput = {
  leadId: string;
  accountMode: "create" | "link";
  accountId?: string;
  accountName?: string;
  taxId?: string;
  contactMode: "create" | "link";
  contactId?: string;
  createOpportunity: boolean;
  opportunityName?: string;
  ownerId?: string;
  acknowledgeDuplicates: boolean;
};

type Mutation<T> = { db: DB; result: DomainResult<T> };

function fail<T>(db: DB, error: string, extra?: Partial<Extract<DomainResult<T>, { ok: false }>>): Mutation<T> {
  return {
    db,
    result: {
      ok: false,
      error,
      fieldErrors: extra?.fieldErrors,
      duplicates: extra?.duplicates,
    },
  };
}

function done<T>(db: DB, data: T): Mutation<T> {
  return { db, result: { ok: true, data } };
}

function actorOf(db: DB, actorId: string): Profile | null {
  const profile = db.profiles.find((item) => item.id === actorId);
  if (!profile?.isActive) return null;
  return profile;
}

function now(): string {
  return new Date().toISOString();
}

function uid(): string {
  return crypto.randomUUID();
}

function clone(db: DB): DB {
  return structuredClone(db);
}

function audit(
  db: DB,
  actor: Profile,
  action: string,
  objectType: string,
  recordId: string,
  changes: AuditChange[],
) {
  db.auditLogs.push({
    id: uid(),
    organizationId: actor.organizationId,
    actorId: actor.id,
    action,
    objectType,
    recordId,
    changes,
    createdAt: now(),
  });
}

function diffRecord(before: object, after: object, fields: string[]): AuditChange[] {
  const left = before as Record<string, unknown>;
  const right = after as Record<string, unknown>;
  const changes: AuditChange[] = [];
  for (const field of fields) {
    if (JSON.stringify(left[field]) !== JSON.stringify(right[field])) {
      changes.push({ field, before: left[field] ?? null, after: right[field] ?? null });
    }
  }
  return changes;
}

function assignOwner(db: DB, actor: Profile, permission: PermissionKey, requested: string | undefined, fallback: string): string | null {
  const ownerId = requested || fallback;
  if (!can(db, actor, permission, ownerId)) return null;
  const owner = db.profiles.find((profile) => profile.id === ownerId && profile.organizationId === actor.organizationId && profile.isActive);
  return owner ? owner.id : null;
}

function emailOk(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function taxOk(taxId: string): boolean {
  if (!taxId) return true;
  return taxId.length === 11 || taxId.length === 14;
}

function nonNegative(value: number | null): boolean {
  return value == null || value >= 0;
}

function leadStatus(db: DB, id: string) {
  return db.leadStatuses.find((status) => status.id === id) ?? null;
}

function stageOf(db: DB, id: string) {
  return db.opportunityStages.find((stage) => stage.id === id) ?? null;
}

function identifiable(lead: Pick<Lead, "email" | "phone" | "mobile">): boolean {
  return Boolean(lead.email.trim() || lead.phone.trim() || lead.mobile.trim());
}

function parentCycle(db: DB, accountId: string, parentId: string | null): boolean {
  let current = parentId;
  const seen = new Set<string>();
  while (current) {
    if (current === accountId || seen.has(current)) return true;
    seen.add(current);
    current = db.accounts.find((account) => account.id === current)?.parentAccountId ?? null;
  }
  return false;
}

function sameAccountContact(db: DB, accountId: string, contactId: string | null, organizationId: string): boolean {
  if (!contactId) return true;
  const contact = db.contacts.find((item) => item.id === contactId && !item.deletedAt);
  return Boolean(contact && contact.organizationId === organizationId && contact.accountId === accountId);
}

function clearOtherPrimaries(db: DB, accountId: string, keepId: string) {
  for (const contact of db.contacts) {
    if (contact.accountId === accountId && contact.id !== keepId) contact.isPrimary = false;
  }
}

export function expectedRevenue(opportunity: Pick<Opportunity, "amount" | "probability">): number | null {
  if (opportunity.amount == null) return null;
  return Math.round((opportunity.amount * opportunity.probability) / 100 * 100) / 100;
}

export function findLeadDuplicates(db: DB, lead: Lead, taxId = ""): DuplicateHit[] {
  const hits: DuplicateHit[] = [];
  const email = lead.email.trim().toLowerCase();
  const domains = new Set(
    [domainOf(lead.website), emailDomain(email)].filter((item): item is string => Boolean(item)),
  );
  const normalizedTax = taxId.replace(/\D/g, "");
  for (const contact of db.contacts) {
    if (contact.deletedAt || contact.organizationId !== lead.organizationId) continue;
    if (email && contact.email.toLowerCase() === email) {
      hits.push({
        id: contact.id,
        kind: "contact",
        label: fullName(contact.firstName, contact.lastName),
        reason: "Email igual ao de um contato",
        href: `/crm/contacts/${contact.id}`,
      });
    }
  }
  for (const account of db.accounts) {
    if (account.deletedAt || account.organizationId !== lead.organizationId) continue;
    const accountDomain = domainOf(account.website);
    if (accountDomain && domains.has(accountDomain)) {
      hits.push({
        id: account.id,
        kind: "account",
        label: account.name,
        reason: "Domínio semelhante ao de uma conta",
        href: `/crm/accounts/${account.id}`,
      });
    }
    if (normalizedTax && account.taxId === normalizedTax) {
      hits.push({
        id: account.id,
        kind: "account",
        label: account.name,
        reason: "CNPJ/CPF já cadastrado",
        href: `/crm/accounts/${account.id}`,
      });
    }
  }
  return hits;
}

export function createLead(db: DB, actorId: string, input: LeadInput): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const fieldErrors: Record<string, string> = {};
  if (!input.lastName.trim()) fieldErrors.lastName = "Informe o sobrenome.";
  if (!input.company.trim()) fieldErrors.company = "Informe a empresa.";
  if (!emailOk(input.email)) fieldErrors.email = "Informe um email válido.";
  if (!nonNegative(input.annualRevenue)) fieldErrors.annualRevenue = "A receita não pode ser negativa.";
  if (!nonNegative(input.employeeCount)) fieldErrors.employeeCount = "A quantidade não pode ser negativa.";
  if (Object.keys(fieldErrors).length) return fail(db, "Revise os campos destacados.", { fieldErrors });
  const ownerId = assignOwner(db, actor, "lead.create", input.ownerId, actor.id);
  if (!ownerId) return fail(db, "Você não pode atribuir este proprietário.");
  const status = db.leadStatuses.find((item) => item.organizationId === actor.organizationId && item.name === "Novo");
  if (!status) return fail(db, "Status inicial de lead não configurado.");
  const next = clone(db);
  const id = uid();
  const stamp = now();
  next.leads.push({
    id,
    organizationId: actor.organizationId,
    ownerId,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    company: input.company.trim(),
    title: input.title.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    mobile: input.mobile.trim(),
    website: input.website.trim(),
    statusId: status.id,
    leadSource: input.leadSource.trim(),
    rating: input.rating,
    industry: input.industry.trim(),
    annualRevenue: input.annualRevenue,
    employeeCount: input.employeeCount,
    address: input.address,
    description: input.description.trim(),
    qualificationNotes: input.qualificationNotes.trim(),
    disqualificationReason: "",
    isConverted: false,
    convertedAt: null,
    convertedAccountId: null,
    convertedContactId: null,
    convertedOpportunityId: null,
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.id,
    updatedBy: actor.id,
    deletedAt: null,
  });
  audit(next, actor, "create", "lead", id, [{ field: "registro", before: null, after: input.company.trim() }]);
  return done(next, { id });
}

export function updateLead(db: DB, actorId: string, leadId: string, input: LeadInput): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const current = db.leads.find((lead) => lead.id === leadId && !lead.deletedAt);
  if (!current || current.organizationId !== actor.organizationId) return fail(db, "Lead não encontrado.");
  if (!can(db, actor, "lead.update", current.ownerId)) return fail(db, "Sem permissão para editar este lead.");
  if (current.isConverted) return fail(db, "Lead convertido não pode ser alterado.");
  const status = leadStatus(db, current.statusId);
  if (status?.isClosed) return fail(db, "Status terminal não pode ser alterado.");
  const fieldErrors: Record<string, string> = {};
  if (!input.lastName.trim()) fieldErrors.lastName = "Informe o sobrenome.";
  if (!input.company.trim()) fieldErrors.company = "Informe a empresa.";
  if (!emailOk(input.email)) fieldErrors.email = "Informe um email válido.";
  if (!nonNegative(input.annualRevenue)) fieldErrors.annualRevenue = "A receita não pode ser negativa.";
  if (status?.allowsConversion && !identifiable({ ...input })) {
    fieldErrors.email = "Lead qualificado precisa de email ou telefone.";
  }
  if (Object.keys(fieldErrors).length) return fail(db, "Revise os campos destacados.", { fieldErrors });
  const ownerId = assignOwner(db, actor, "lead.update", input.ownerId, current.ownerId);
  if (!ownerId) return fail(db, "Você não pode atribuir este proprietário.");
  const next = clone(db);
  const lead = next.leads.find((item) => item.id === leadId)!;
  const before = structuredClone(lead);
  Object.assign(lead, {
    ownerId,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    company: input.company.trim(),
    title: input.title.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    mobile: input.mobile.trim(),
    website: input.website.trim(),
    leadSource: input.leadSource.trim(),
    rating: input.rating,
    industry: input.industry.trim(),
    annualRevenue: input.annualRevenue,
    employeeCount: input.employeeCount,
    address: input.address,
    description: input.description.trim(),
    qualificationNotes: input.qualificationNotes.trim(),
    updatedAt: now(),
    updatedBy: actor.id,
  });
  const changes = diffRecord(before, lead, TRACKED.lead);
  if (changes.length) audit(next, actor, "update", "lead", lead.id, changes);
  return done(next, { id: lead.id });
}

export function changeLeadStatus(
  db: DB,
  actorId: string,
  leadId: string,
  statusId: string,
  reason: string,
): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const current = db.leads.find((lead) => lead.id === leadId && !lead.deletedAt);
  if (!current || current.organizationId !== actor.organizationId) return fail(db, "Lead não encontrado.");
  if (!can(db, actor, "lead.update", current.ownerId)) return fail(db, "Sem permissão para alterar este lead.");
  const currentStatus = leadStatus(db, current.statusId);
  const target = leadStatus(db, statusId);
  if (!target || target.organizationId !== actor.organizationId) return fail(db, "Status inválido.");
  if (current.isConverted || currentStatus?.isClosed || currentStatus?.isConverted) {
    return fail(db, "Status terminal não pode ser alterado.");
  }
  if (target.isConverted) return fail(db, "Use a conversão para concluir o lead.");
  if (target.requiresReason && !reason.trim()) return fail(db, "Informe o motivo para encerrar o lead.");
  if (target.allowsConversion && (!current.lastName.trim() || !current.company.trim() || !identifiable(current))) {
    return fail(db, "Para qualificar, informe empresa, sobrenome e um email ou telefone.");
  }
  if (current.statusId === target.id) return done(db, { id: current.id });
  const next = clone(db);
  const lead = next.leads.find((item) => item.id === leadId)!;
  const before = lead.statusId;
  lead.statusId = target.id;
  lead.disqualificationReason = target.requiresReason ? reason.trim() : lead.disqualificationReason;
  lead.updatedAt = now();
  lead.updatedBy = actor.id;
  audit(next, actor, "status_change", "lead", lead.id, [
    { field: "statusId", before, after: target.id },
    ...(target.requiresReason ? [{ field: "disqualificationReason", before: current.disqualificationReason, after: reason.trim() }] : []),
  ]);
  return done(next, { id: lead.id });
}

export function convertLead(db: DB, actorId: string, input: ConvertInput): Mutation<{
  accountId: string;
  contactId: string;
  opportunityId: string | null;
  idempotent: boolean;
}> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const current = db.leads.find((lead) => lead.id === input.leadId && !lead.deletedAt);
  if (!current || current.organizationId !== actor.organizationId) return fail(db, "Lead não encontrado.");
  if (!can(db, actor, "lead.read", current.ownerId)) return fail(db, "Sem permissão para consultar este lead.");
  if (current.isConverted) {
    return done(db, {
      accountId: current.convertedAccountId ?? "",
      contactId: current.convertedContactId ?? "",
      opportunityId: current.convertedOpportunityId,
      idempotent: true,
    });
  }
  if (!can(db, actor, "lead.convert", current.ownerId)) return fail(db, "Sem permissão para converter este lead.");
  const status = leadStatus(db, current.statusId);
  if (!status?.allowsConversion) return fail(db, "Converta apenas leads qualificados.");
  if (!current.company.trim() || !current.lastName.trim() || !identifiable(current)) {
    return fail(db, "Empresa, sobrenome e um contato identificável são obrigatórios.");
  }
  const ownerId = assignOwner(db, actor, "lead.convert", input.ownerId, current.ownerId);
  if (!ownerId) return fail(db, "Você não pode atribuir este proprietário.");
  const taxId = (input.taxId ?? "").replace(/\D/g, "");
  if (input.accountMode === "create" && !taxOk(taxId)) return fail(db, "Informe um CPF ou CNPJ válido.");

  const account = input.accountMode === "link"
    ? db.accounts.find((item) => item.id === input.accountId && !item.deletedAt && item.organizationId === actor.organizationId)
    : undefined;
  if (input.accountMode === "link" && !account) return fail(db, "Conta não encontrada nesta organização.");
  const contact = input.contactMode === "link"
    ? db.contacts.find((item) => item.id === input.contactId && !item.deletedAt && item.organizationId === actor.organizationId)
    : undefined;
  if (input.contactMode === "link" && !contact) return fail(db, "Contato não encontrado nesta organização.");

  const duplicates = findLeadDuplicates(db, current, taxId).filter((hit) => {
    if (hit.kind === "account" && account && hit.id === account.id) return false;
    if (hit.kind === "contact" && contact && hit.id === contact.id) return false;
    return true;
  });
  if (duplicates.length && !input.acknowledgeDuplicates) {
    return fail(db, "Há possíveis duplicidades. Confirme para continuar sem mesclar.", { duplicates });
  }
  if (input.contactMode === "link" && input.accountMode === "link" && contact && account && contact.accountId !== account.id) {
    return fail(db, "O contato precisa pertencer à conta selecionada.");
  }

  const next = clone(db);
  const stamp = now();
  let accountId = account?.id ?? "";
  if (!account) {
    if (!can(db, actor, "account.create", ownerId)) return fail(db, "Sem permissão para criar a conta.");
    accountId = uid();
    next.accounts.push({
      id: accountId,
      organizationId: actor.organizationId,
      ownerId,
      name: (input.accountName || current.company).trim(),
      legalName: "",
      taxId,
      type: "Prospect",
      industry: current.industry,
      website: current.website,
      phone: current.phone,
      annualRevenue: current.annualRevenue,
      employeeCount: current.employeeCount,
      parentAccountId: null,
      billingAddress: structuredClone(current.address),
      shippingAddress: structuredClone(current.address),
      sourceLeadId: current.id,
      description: current.description,
      createdAt: stamp,
      updatedAt: stamp,
      createdBy: actor.id,
      updatedBy: actor.id,
      deletedAt: null,
    });
    audit(next, actor, "create", "account", accountId, [{ field: "registro", before: null, after: current.company }]);
  }

  let contactId = contact?.id ?? "";
  if (input.contactMode === "link" && contact && accountId && contact.accountId !== accountId) {
    return fail(db, "O contato precisa pertencer à conta selecionada.");
  }
  if (!contact) {
    if (!can(db, actor, "contact.create", ownerId)) return fail(db, "Sem permissão para criar o contato.");
    contactId = uid();
    const hasPrimary = next.contacts.some((item) => item.accountId === accountId && item.isPrimary && !item.deletedAt);
    next.contacts.push({
      id: contactId,
      organizationId: actor.organizationId,
      ownerId,
      accountId,
      firstName: current.firstName,
      lastName: current.lastName,
      email: current.email,
      phone: current.phone,
      mobile: current.mobile,
      title: current.title,
      department: "",
      reportsToContactId: null,
      isPrimary: !hasPrimary,
      mailingAddress: structuredClone(current.address),
      leadSource: current.leadSource,
      emailOptOut: false,
      doNotCall: false,
      sourceLeadId: current.id,
      description: current.qualificationNotes,
      createdAt: stamp,
      updatedAt: stamp,
      createdBy: actor.id,
      updatedBy: actor.id,
      deletedAt: null,
    });
    audit(next, actor, "create", "contact", contactId, [{
      field: "registro",
      before: null,
      after: fullName(current.firstName, current.lastName),
    }]);
  }

  let opportunityId: string | null = null;
  if (input.createOpportunity) {
    if (!can(db, actor, "opportunity.create", ownerId)) return fail(db, "Sem permissão para criar a oportunidade.");
    const stage = next.opportunityStages
      .filter((item) => item.organizationId === actor.organizationId && !item.isClosed)
      .sort((a, b) => a.sortOrder - b.sortOrder)[0];
    if (!stage) return fail(db, "Etapa inicial do funil não configurada.");
    opportunityId = uid();
    const close = new Date();
    close.setDate(close.getDate() + 30);
    next.opportunities.push({
      id: opportunityId,
      organizationId: actor.organizationId,
      ownerId,
      name: (input.opportunityName || `${current.company} — novo negócio`).trim(),
      accountId,
      stageId: stage.id,
      amount: null,
      currencyCode: "BRL",
      probability: stage.defaultProbability,
      closeDate: close.toISOString().slice(0, 10),
      actualCloseDate: null,
      type: "Novo negócio",
      leadSource: current.leadSource,
      nextStep: "",
      description: current.qualificationNotes,
      lossReason: "",
      primaryContactId: contactId,
      sourceLeadId: current.id,
      createdAt: stamp,
      updatedAt: stamp,
      createdBy: actor.id,
      updatedBy: actor.id,
      deletedAt: null,
    });
    next.opportunityContacts.push({
      id: uid(),
      organizationId: actor.organizationId,
      opportunityId,
      contactId,
      role: "Decisor",
      isPrimary: true,
    });
    audit(next, actor, "create", "opportunity", opportunityId, [{
      field: "registro",
      before: null,
      after: input.opportunityName || current.company,
    }]);
  }

  const converted = next.leadStatuses.find((item) => item.organizationId === actor.organizationId && item.isConverted);
  if (!converted) return fail(db, "Status Convertido não configurado.");
  const lead = next.leads.find((item) => item.id === current.id)!;
  lead.statusId = converted.id;
  lead.isConverted = true;
  lead.convertedAt = stamp;
  lead.convertedAccountId = accountId;
  lead.convertedContactId = contactId;
  lead.convertedOpportunityId = opportunityId;
  lead.updatedAt = stamp;
  lead.updatedBy = actor.id;
  audit(next, actor, "convert", "lead", lead.id, [{
    field: "conversao",
    before: null,
    after: { accountId, contactId, opportunityId },
  }]);
  return done(next, { accountId, contactId, opportunityId, idempotent: false });
}

export function createAccount(db: DB, actorId: string, input: AccountInput): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const taxId = input.taxId.replace(/\D/g, "");
  const fieldErrors: Record<string, string> = {};
  if (!input.name.trim()) fieldErrors.name = "Informe o nome da conta.";
  if (!taxOk(taxId)) fieldErrors.taxId = "Informe um CPF ou CNPJ válido.";
  if (!nonNegative(input.annualRevenue)) fieldErrors.annualRevenue = "A receita não pode ser negativa.";
  if (Object.keys(fieldErrors).length) return fail(db, "Revise os campos destacados.", { fieldErrors });
  if (input.parentAccountId) {
    const parent = db.accounts.find((account) => account.id === input.parentAccountId && !account.deletedAt);
    if (!parent || parent.organizationId !== actor.organizationId) return fail(db, "Conta pai inválida.");
  }
  const ownerId = assignOwner(db, actor, "account.create", input.ownerId, actor.id);
  if (!ownerId) return fail(db, "Você não pode atribuir este proprietário.");
  const next = clone(db);
  const id = uid();
  const stamp = now();
  next.accounts.push({
    id,
    organizationId: actor.organizationId,
    ownerId,
    name: input.name.trim(),
    legalName: input.legalName.trim(),
    taxId,
    type: input.type,
    industry: input.industry.trim(),
    website: input.website.trim(),
    phone: input.phone.trim(),
    annualRevenue: input.annualRevenue,
    employeeCount: input.employeeCount,
    parentAccountId: input.parentAccountId,
    billingAddress: input.billingAddress,
    shippingAddress: input.shippingAddress,
    sourceLeadId: null,
    description: input.description.trim(),
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.id,
    updatedBy: actor.id,
    deletedAt: null,
  });
  audit(next, actor, "create", "account", id, [{ field: "registro", before: null, after: input.name.trim() }]);
  return done(next, { id });
}

export function updateAccount(db: DB, actorId: string, accountId: string, input: AccountInput): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const current = db.accounts.find((account) => account.id === accountId && !account.deletedAt);
  if (!current || current.organizationId !== actor.organizationId) return fail(db, "Conta não encontrada.");
  if (!can(db, actor, "account.update", current.ownerId)) return fail(db, "Sem permissão para editar esta conta.");
  const taxId = input.taxId.replace(/\D/g, "");
  const fieldErrors: Record<string, string> = {};
  if (!input.name.trim()) fieldErrors.name = "Informe o nome da conta.";
  if (!taxOk(taxId)) fieldErrors.taxId = "Informe um CPF ou CNPJ válido.";
  if (Object.keys(fieldErrors).length) return fail(db, "Revise os campos destacados.", { fieldErrors });
  if (input.parentAccountId) {
    const parent = db.accounts.find((account) => account.id === input.parentAccountId && !account.deletedAt);
    if (!parent || parent.organizationId !== actor.organizationId) return fail(db, "Conta pai inválida.");
    if (parentCycle(db, accountId, input.parentAccountId)) return fail(db, "A hierarquia de contas não pode formar um ciclo.");
  }
  const ownerId = assignOwner(db, actor, "account.update", input.ownerId, current.ownerId);
  if (!ownerId) return fail(db, "Você não pode atribuir este proprietário.");
  const next = clone(db);
  const account = next.accounts.find((item) => item.id === accountId)!;
  const before = structuredClone(account);
  Object.assign(account, {
    ownerId,
    name: input.name.trim(),
    legalName: input.legalName.trim(),
    taxId,
    type: input.type,
    industry: input.industry.trim(),
    website: input.website.trim(),
    phone: input.phone.trim(),
    annualRevenue: input.annualRevenue,
    employeeCount: input.employeeCount,
    parentAccountId: input.parentAccountId,
    billingAddress: input.billingAddress,
    shippingAddress: input.shippingAddress,
    description: input.description.trim(),
    updatedAt: now(),
    updatedBy: actor.id,
  });
  const changes = diffRecord(before, account, TRACKED.account);
  if (changes.length) audit(next, actor, "update", "account", account.id, changes);
  return done(next, { id: account.id });
}

export function createContact(db: DB, actorId: string, input: ContactInput): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const account = db.accounts.find((item) => item.id === input.accountId && !item.deletedAt);
  if (!account || account.organizationId !== actor.organizationId) return fail(db, "Selecione uma conta da organização.");
  const fieldErrors: Record<string, string> = {};
  if (!input.lastName.trim()) fieldErrors.lastName = "Informe o sobrenome.";
  if (!emailOk(input.email)) fieldErrors.email = "Informe um email válido.";
  if (Object.keys(fieldErrors).length) return fail(db, "Revise os campos destacados.", { fieldErrors });
  if (input.reportsToContactId) {
    const manager = db.contacts.find((item) => item.id === input.reportsToContactId && !item.deletedAt);
    if (!manager || manager.organizationId !== actor.organizationId) return fail(db, "Gestor do contato inválido.");
  }
  const ownerId = assignOwner(db, actor, "contact.create", input.ownerId, actor.id);
  if (!ownerId) return fail(db, "Você não pode atribuir este proprietário.");
  const next = clone(db);
  const id = uid();
  const stamp = now();
  if (input.isPrimary) clearOtherPrimaries(next, account.id, id);
  next.contacts.push({
    id,
    organizationId: actor.organizationId,
    ownerId,
    accountId: account.id,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    mobile: input.mobile.trim(),
    title: input.title.trim(),
    department: input.department.trim(),
    reportsToContactId: input.reportsToContactId,
    isPrimary: input.isPrimary,
    mailingAddress: input.mailingAddress,
    leadSource: input.leadSource.trim(),
    emailOptOut: input.emailOptOut,
    doNotCall: input.doNotCall,
    sourceLeadId: null,
    description: input.description.trim(),
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.id,
    updatedBy: actor.id,
    deletedAt: null,
  });
  audit(next, actor, "create", "contact", id, [{
    field: "registro",
    before: null,
    after: fullName(input.firstName, input.lastName),
  }]);
  return done(next, { id });
}

export function updateContact(db: DB, actorId: string, contactId: string, input: ContactInput): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const current = db.contacts.find((contact) => contact.id === contactId && !contact.deletedAt);
  if (!current || current.organizationId !== actor.organizationId) return fail(db, "Contato não encontrado.");
  if (!can(db, actor, "contact.update", current.ownerId)) return fail(db, "Sem permissão para editar este contato.");
  const account = db.accounts.find((item) => item.id === input.accountId && !item.deletedAt);
  if (!account || account.organizationId !== actor.organizationId) return fail(db, "Selecione uma conta da organização.");
  if (!input.lastName.trim()) return fail(db, "Informe o sobrenome.", { fieldErrors: { lastName: "Informe o sobrenome." } });
  if (!emailOk(input.email)) return fail(db, "Informe um email válido.", { fieldErrors: { email: "Informe um email válido." } });
  if (input.reportsToContactId === contactId) return fail(db, "O contato não pode reportar a si mesmo.");
  if (input.reportsToContactId) {
    const manager = db.contacts.find((item) => item.id === input.reportsToContactId && !item.deletedAt);
    if (!manager || manager.organizationId !== actor.organizationId) return fail(db, "Gestor do contato inválido.");
  }
  const ownerId = assignOwner(db, actor, "contact.update", input.ownerId, current.ownerId);
  if (!ownerId) return fail(db, "Você não pode atribuir este proprietário.");
  const next = clone(db);
  const contact = next.contacts.find((item) => item.id === contactId)!;
  const before = structuredClone(contact);
  if (input.isPrimary) clearOtherPrimaries(next, account.id, contact.id);
  Object.assign(contact, {
    ownerId,
    accountId: account.id,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    mobile: input.mobile.trim(),
    title: input.title.trim(),
    department: input.department.trim(),
    reportsToContactId: input.reportsToContactId,
    isPrimary: input.isPrimary,
    mailingAddress: input.mailingAddress,
    leadSource: input.leadSource.trim(),
    emailOptOut: input.emailOptOut,
    doNotCall: input.doNotCall,
    description: input.description.trim(),
    updatedAt: now(),
    updatedBy: actor.id,
  });
  const changes = diffRecord(before, contact, TRACKED.contact);
  if (changes.length) audit(next, actor, "update", "contact", contact.id, changes);
  return done(next, { id: contact.id });
}

export function createOpportunity(db: DB, actorId: string, input: OpportunityInput): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const account = db.accounts.find((item) => item.id === input.accountId && !item.deletedAt);
  if (!account || account.organizationId !== actor.organizationId) return fail(db, "Selecione uma conta da organização.");
  const fieldErrors: Record<string, string> = {};
  if (!input.name.trim()) fieldErrors.name = "Informe o nome do negócio.";
  if (!input.closeDate) fieldErrors.closeDate = "Informe a data de fechamento.";
  if (!nonNegative(input.amount)) fieldErrors.amount = "O valor não pode ser negativo.";
  if (input.probability != null && (input.probability < 0 || input.probability > 100)) {
    fieldErrors.probability = "A probabilidade fica entre 0 e 100.";
  }
  if (!sameAccountContact(db, account.id, input.primaryContactId, actor.organizationId)) {
    fieldErrors.primaryContactId = "O contato principal precisa ser da mesma conta.";
  }
  if (Object.keys(fieldErrors).length) return fail(db, "Revise os campos destacados.", { fieldErrors });
  const ownerId = assignOwner(db, actor, "opportunity.create", input.ownerId, actor.id);
  if (!ownerId) return fail(db, "Você não pode atribuir este proprietário.");
  const stage = db.opportunityStages
    .filter((item) => item.organizationId === actor.organizationId && !item.isClosed)
    .sort((a, b) => a.sortOrder - b.sortOrder)[0];
  if (!stage) return fail(db, "Etapa inicial do funil não configurada.");
  const next = clone(db);
  const id = uid();
  const stamp = now();
  next.opportunities.push({
    id,
    organizationId: actor.organizationId,
    ownerId,
    name: input.name.trim(),
    accountId: account.id,
    stageId: stage.id,
    amount: input.amount,
    currencyCode: "BRL",
    probability: input.probability ?? stage.defaultProbability,
    closeDate: input.closeDate,
    actualCloseDate: null,
    type: input.type,
    leadSource: input.leadSource.trim(),
    nextStep: input.nextStep.trim(),
    description: input.description.trim(),
    lossReason: "",
    primaryContactId: input.primaryContactId,
    sourceLeadId: null,
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.id,
    updatedBy: actor.id,
    deletedAt: null,
  });
  if (input.primaryContactId) {
    next.opportunityContacts.push({
      id: uid(),
      organizationId: actor.organizationId,
      opportunityId: id,
      contactId: input.primaryContactId,
      role: "Decisor",
      isPrimary: true,
    });
  }
  audit(next, actor, "create", "opportunity", id, [{ field: "registro", before: null, after: input.name.trim() }]);
  return done(next, { id });
}

export function updateOpportunity(db: DB, actorId: string, opportunityId: string, input: OpportunityInput): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const current = db.opportunities.find((item) => item.id === opportunityId && !item.deletedAt);
  if (!current || current.organizationId !== actor.organizationId) return fail(db, "Oportunidade não encontrada.");
  if (!can(db, actor, "opportunity.update", current.ownerId)) return fail(db, "Sem permissão para editar esta oportunidade.");
  const stage = stageOf(db, current.stageId);
  if (stage?.isClosed) return fail(db, "Oportunidade fechada não pode ser alterada por aqui.");
  const account = db.accounts.find((item) => item.id === input.accountId && !item.deletedAt);
  if (!account || account.organizationId !== actor.organizationId) return fail(db, "Selecione uma conta da organização.");
  const fieldErrors: Record<string, string> = {};
  if (!input.name.trim()) fieldErrors.name = "Informe o nome do negócio.";
  if (!input.closeDate) fieldErrors.closeDate = "Informe a data de fechamento.";
  if (!nonNegative(input.amount)) fieldErrors.amount = "O valor não pode ser negativo.";
  if (input.probability != null && (input.probability < 0 || input.probability > 100)) {
    fieldErrors.probability = "A probabilidade fica entre 0 e 100.";
  }
  if (!sameAccountContact(db, account.id, input.primaryContactId, actor.organizationId)) {
    fieldErrors.primaryContactId = "O contato principal precisa ser da mesma conta.";
  }
  if (Object.keys(fieldErrors).length) return fail(db, "Revise os campos destacados.", { fieldErrors });
  const ownerId = assignOwner(db, actor, "opportunity.update", input.ownerId, current.ownerId);
  if (!ownerId) return fail(db, "Você não pode atribuir este proprietário.");
  const next = clone(db);
  const opportunity = next.opportunities.find((item) => item.id === opportunityId)!;
  const before = structuredClone(opportunity);
  Object.assign(opportunity, {
    ownerId,
    name: input.name.trim(),
    accountId: account.id,
    amount: input.amount,
    probability: input.probability ?? opportunity.probability,
    closeDate: input.closeDate,
    type: input.type,
    leadSource: input.leadSource.trim(),
    nextStep: input.nextStep.trim(),
    description: input.description.trim(),
    primaryContactId: input.primaryContactId,
    updatedAt: now(),
    updatedBy: actor.id,
  });
  const link = next.opportunityContacts.find((item) => item.opportunityId === opportunity.id && item.isPrimary);
  if (input.primaryContactId) {
    if (link) link.contactId = input.primaryContactId;
    else {
      next.opportunityContacts.push({
        id: uid(),
        organizationId: actor.organizationId,
        opportunityId: opportunity.id,
        contactId: input.primaryContactId,
        role: "Decisor",
        isPrimary: true,
      });
    }
  }
  const changes = diffRecord(before, opportunity, TRACKED.opportunity);
  if (changes.length) audit(next, actor, "update", "opportunity", opportunity.id, changes);
  return done(next, { id: opportunity.id });
}

export function changeOpportunityStage(
  db: DB,
  actorId: string,
  opportunityId: string,
  stageId: string,
  lossReason: string,
): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const current = db.opportunities.find((item) => item.id === opportunityId && !item.deletedAt);
  if (!current || current.organizationId !== actor.organizationId) return fail(db, "Oportunidade não encontrada.");
  const currentStage = stageOf(db, current.stageId);
  const target = stageOf(db, stageId);
  if (!target || target.organizationId !== actor.organizationId) return fail(db, "Etapa inválida.");
  if (currentStage?.isClosed) return fail(db, "Etapa final não avança.");
  const permission: PermissionKey = target.isClosed ? "opportunity.close" : "opportunity.update";
  if (!can(db, actor, permission, current.ownerId)) return fail(db, "Sem permissão para alterar esta etapa.");
  if (target.isClosed && !target.isWon && !lossReason.trim()) return fail(db, "Informe o motivo da perda.");
  if (target.isWon && (current.amount == null || !current.closeDate)) {
    return fail(db, "Para ganhar, informe o valor final e a data de fechamento.");
  }
  if (current.stageId === target.id) return done(db, { id: current.id });
  const next = clone(db);
  const opportunity = next.opportunities.find((item) => item.id === opportunityId)!;
  const beforeStage = opportunity.stageId;
  const beforeProbability = opportunity.probability;
  opportunity.stageId = target.id;
  opportunity.probability = target.defaultProbability;
  opportunity.updatedAt = now();
  opportunity.updatedBy = actor.id;
  if (target.isClosed) opportunity.actualCloseDate = todayISO();
  if (target.isWon) opportunity.lossReason = "";
  if (target.isClosed && !target.isWon) opportunity.lossReason = lossReason.trim();
  audit(next, actor, "stage_change", "opportunity", opportunity.id, [
    { field: "stageId", before: beforeStage, after: target.id },
    { field: "probability", before: beforeProbability, after: target.defaultProbability },
    ...(target.isClosed && !target.isWon ? [{ field: "lossReason", before: current.lossReason, after: lossReason.trim() }] : []),
  ]);
  return done(next, { id: opportunity.id });
}

function nextContractNumber(db: DB, organizationId: string): string {
  const year = new Date().getFullYear();
  const prefix = `CTR-${year}-`;
  const seq = db.contracts
    .filter((contract) => contract.organizationId === organizationId && contract.contractNumber.startsWith(prefix))
    .map((contract) => Number(contract.contractNumber.slice(prefix.length)) || 0);
  return `${prefix}${String(Math.max(0, ...seq) + 1).padStart(4, "0")}`;
}

function assertContractLinks(db: DB, actor: Profile, input: ContractInput): string | null {
  const account = db.accounts.find((item) => item.id === input.accountId && !item.deletedAt);
  if (!account || account.organizationId !== actor.organizationId) return "Selecione uma conta da organização.";
  if (input.opportunityId) {
    const opportunity = db.opportunities.find((item) => item.id === input.opportunityId && !item.deletedAt);
    if (!opportunity || opportunity.organizationId !== actor.organizationId || opportunity.accountId !== account.id) {
      return "O contrato só pode referenciar uma oportunidade da mesma conta.";
    }
  }
  if (!sameAccountContact(db, account.id, input.signerContactId, actor.organizationId)) {
    return "O assinante precisa ser um contato da mesma conta.";
  }
  if (input.endDate && input.startDate && input.endDate < input.startDate) return "A data final não pode ser anterior ao início.";
  if (!nonNegative(input.amount)) return "O valor não pode ser negativo.";
  if (!input.name.trim()) return "Informe o título do contrato.";
  if (input.renewalNoticeDays < 0) return "O aviso de renovação não pode ser negativo.";
  return null;
}

export function createContract(db: DB, actorId: string, input: ContractInput): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const problem = assertContractLinks(db, actor, input);
  if (problem) return fail(db, problem);
  if (input.status === "Ativo" && !hasPermission(db, actor, "contract.activate")) {
    return fail(db, "Sem permissão para ativar contratos.");
  }
  const ownerId = assignOwner(db, actor, "contract.create", input.ownerId, actor.id);
  if (!ownerId) return fail(db, "Você não pode atribuir este proprietário.");
  const next = clone(db);
  const id = uid();
  const stamp = now();
  next.contracts.push({
    id,
    organizationId: actor.organizationId,
    ownerId,
    contractNumber: nextContractNumber(next, actor.organizationId),
    accountId: input.accountId,
    opportunityId: input.opportunityId,
    signerContactId: input.signerContactId,
    name: input.name.trim(),
    status: input.status,
    startDate: input.startDate,
    endDate: input.endDate,
    termMonths: input.termMonths,
    amount: input.amount,
    currencyCode: "BRL",
    signedAt: input.status === "Assinado" || input.status === "Ativo" ? stamp : null,
    activatedAt: input.status === "Ativo" ? stamp : null,
    renewalNoticeDays: input.renewalNoticeDays,
    documentPath: input.documentPath.trim(),
    description: input.description.trim(),
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: actor.id,
    updatedBy: actor.id,
    deletedAt: null,
  });
  audit(next, actor, "create", "contract", id, [{ field: "registro", before: null, after: input.name.trim() }]);
  return done(next, { id });
}

export function updateContract(db: DB, actorId: string, contractId: string, input: ContractInput): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const current = db.contracts.find((item) => item.id === contractId && !item.deletedAt);
  if (!current || current.organizationId !== actor.organizationId) return fail(db, "Contrato não encontrado.");
  if (!can(db, actor, "contract.update", current.ownerId)) return fail(db, "Sem permissão para editar este contrato.");
  if (current.status === "Cancelado" || current.status === "Expirado") {
    return fail(db, "Contrato encerrado não pode ser alterado.");
  }
  const problem = assertContractLinks(db, actor, input);
  if (problem) return fail(db, problem);
  if (input.status === "Ativo" && current.status !== "Ativo" && !hasPermission(db, actor, "contract.activate")) {
    return fail(db, "Sem permissão para ativar contratos.");
  }
  const ownerId = assignOwner(db, actor, "contract.update", input.ownerId, current.ownerId);
  if (!ownerId) return fail(db, "Você não pode atribuir este proprietário.");
  const next = clone(db);
  const contract = next.contracts.find((item) => item.id === contractId)!;
  const before = structuredClone(contract);
  const stamp = now();
  Object.assign(contract, {
    ownerId,
    accountId: input.accountId,
    opportunityId: input.opportunityId,
    signerContactId: input.signerContactId,
    name: input.name.trim(),
    status: input.status,
    startDate: input.startDate,
    endDate: input.endDate,
    termMonths: input.termMonths,
    amount: input.amount,
    renewalNoticeDays: input.renewalNoticeDays,
    documentPath: input.documentPath.trim(),
    description: input.description.trim(),
    updatedAt: stamp,
    updatedBy: actor.id,
  });
  if ((input.status === "Assinado" || input.status === "Ativo") && !contract.signedAt) contract.signedAt = stamp;
  if (input.status === "Ativo" && !contract.activatedAt) contract.activatedAt = stamp;
  const changes = diffRecord(before, contract, TRACKED.contract);
  if (changes.length) audit(next, actor, "update", "contract", contract.id, changes);
  return done(next, { id: contract.id });
}

function collection(db: DB, object: CrmObject) {
  if (object === "lead") return db.leads;
  if (object === "account") return db.accounts;
  if (object === "contact") return db.contacts;
  if (object === "opportunity") return db.opportunities;
  return db.contracts;
}

function recordLabel(record: { name?: string; company?: string; firstName?: string; lastName?: string; contractNumber?: string }): string {
  if ("contractNumber" in record && record.contractNumber) return record.contractNumber;
  if (record.firstName || record.lastName) return fullName(record.firstName ?? "", record.lastName ?? "");
  return record.name || record.company || "Registro";
}

export function softDelete(db: DB, actorId: string, object: CrmObject, id: string): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const rows = collection(db, object) as Array<{ id: string; organizationId: string; ownerId: string; deletedAt: string | null }>;
  const current = rows.find((item) => item.id === id && !item.deletedAt);
  if (!current || current.organizationId !== actor.organizationId) return fail(db, "Registro não encontrado.");
  if (!can(db, actor, `${object}.delete`, current.ownerId)) return fail(db, "Sem permissão para excluir este registro.");
  if (object === "lead") {
    const lead = current as Lead;
    if (lead.isConverted) return fail(db, "Lead convertido permanece no histórico e não pode ser excluído.");
  }
  if (object === "account") {
    const blocked = db.contacts.some((item) => item.accountId === id && !item.deletedAt)
      || db.opportunities.some((item) => item.accountId === id && !item.deletedAt)
      || db.contracts.some((item) => item.accountId === id && !item.deletedAt);
    if (blocked) return fail(db, "Esta conta possui registros relacionados. Encerre ou desvincule antes de excluir.");
  }
  if (object === "contact") {
    const blocked = db.opportunities.some((item) => item.primaryContactId === id && !item.deletedAt)
      || db.contracts.some((item) => item.signerContactId === id && !item.deletedAt);
    if (blocked) return fail(db, "Este contato está vinculado a uma oportunidade ou contrato.");
  }
  if (object === "opportunity") {
    const blocked = db.contracts.some((item) => item.opportunityId === id && !item.deletedAt);
    if (blocked) return fail(db, "Esta oportunidade possui contrato e não pode ser excluída.");
  }
  const next = clone(db);
  const row = (collection(next, object) as typeof rows).find((item) => item.id === id)!;
  row.deletedAt = now();
  audit(next, actor, "delete", object, id, [{ field: "registro", before: recordLabel(row as never), after: null }]);
  return done(next, { id });
}

export function transferOwner(
  db: DB,
  actorId: string,
  object: CrmObject,
  ids: string[],
  ownerId: string,
): Mutation<{ count: number }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const owner = db.profiles.find((profile) => profile.id === ownerId && profile.isActive && profile.organizationId === actor.organizationId);
  if (!owner) return fail(db, "Proprietário inválido.");
  const rows = collection(db, object) as Array<{ id: string; organizationId: string; ownerId: string; deletedAt: string | null }>;
  for (const id of ids) {
    const current = rows.find((item) => item.id === id && !item.deletedAt);
    if (!current || current.organizationId !== actor.organizationId) return fail(db, "Registro não encontrado.");
    if (!can(db, actor, `${object}.transfer_owner`, current.ownerId)) return fail(db, "Sem permissão para alterar o proprietário.");
    if (!can(db, actor, `${object}.transfer_owner`, ownerId)) return fail(db, "Você não pode atribuir este proprietário.");
    if (object === "lead" && (current as Lead).isConverted) return fail(db, "Lead convertido não pode ser alterado.");
  }
  const next = clone(db);
  const mutable = collection(next, object) as typeof rows;
  let count = 0;
  for (const id of ids) {
    const row = mutable.find((item) => item.id === id)!;
    if (row.ownerId === ownerId) continue;
    const before = row.ownerId;
    row.ownerId = ownerId;
    audit(next, actor, "transfer_owner", object, id, [{ field: "ownerId", before, after: ownerId }]);
    count += 1;
  }
  return done(next, { count });
}

export function createActivity(
  db: DB,
  actorId: string,
  input: { objectType: CrmObject; recordId: string; type: ActivityType; subject: string; body: string; dueAt: string | null },
): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  if (!input.subject.trim()) return fail(db, "Informe o assunto da atividade.");
  const rows = collection(db, input.objectType) as Array<{ id: string; organizationId: string; ownerId: string; deletedAt: string | null }>;
  const record = rows.find((item) => item.id === input.recordId && !item.deletedAt);
  if (!record || record.organizationId !== actor.organizationId) return fail(db, "Registro não encontrado.");
  if (!can(db, actor, `${input.objectType}.update`, record.ownerId)) return fail(db, "Sem permissão para registrar atividade.");
  const next = clone(db);
  const id = uid();
  const activity: Activity = {
    id,
    organizationId: actor.organizationId,
    objectType: input.objectType,
    recordId: input.recordId,
    type: input.type,
    subject: input.subject.trim(),
    body: input.body.trim(),
    dueAt: input.dueAt,
    createdAt: now(),
    createdBy: actor.id,
  };
  next.activities.push(activity);
  audit(next, actor, "create", "activity", id, [{ field: "registro", before: null, after: activity.subject }]);
  return done(next, { id });
}

export function inviteUser(
  db: DB,
  actorId: string,
  input: { fullName: string; email: string; roleId: string; managerId: string | null },
): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  if (!hasPermission(db, actor, "user.manage")) return fail(db, "Sem permissão para convidar usuários.");
  if (!input.fullName.trim()) return fail(db, "Informe o nome.");
  if (!emailOk(input.email) || !input.email.trim()) return fail(db, "Informe um email válido.");
  const email = input.email.trim().toLowerCase();
  if (db.profiles.some((profile) => profile.email === email)) return fail(db, "Já existe um usuário com este email.");
  const role = db.roles.find((item) => item.id === input.roleId && item.organizationId === actor.organizationId);
  if (!role) return fail(db, "Papel inválido.");
  if (input.managerId) {
    const manager = db.profiles.find((profile) => profile.id === input.managerId && profile.organizationId === actor.organizationId);
    if (!manager) return fail(db, "Gestor inválido.");
  }
  const next = clone(db);
  const id = uid();
  const stamp = now();
  next.profiles.push({
    id,
    organizationId: actor.organizationId,
    fullName: input.fullName.trim(),
    email,
    roleId: role.id,
    managerId: input.managerId,
    isActive: true,
    locale: "pt-BR",
    timezone: "America/Sao_Paulo",
    lastSeenAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  });
  audit(next, actor, "create", "user", id, [{ field: "registro", before: null, after: input.fullName.trim() }]);
  return done(next, { id });
}

export function setUserActive(db: DB, actorId: string, userId: string, isActive: boolean): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  if (!hasPermission(db, actor, "user.manage")) return fail(db, "Sem permissão para gerenciar usuários.");
  if (actor.id === userId && !isActive) return fail(db, "Você não pode desativar o próprio acesso.");
  const current = db.profiles.find((profile) => profile.id === userId && profile.organizationId === actor.organizationId);
  if (!current) return fail(db, "Usuário não encontrado.");
  const next = clone(db);
  const profile = next.profiles.find((item) => item.id === userId)!;
  profile.isActive = isActive;
  profile.updatedAt = now();
  audit(next, actor, "update", "user", userId, [{ field: "isActive", before: current.isActive, after: isActive }]);
  return done(next, { id: userId });
}

export function updateRolePermissions(db: DB, actorId: string, roleId: string, permissionIds: string[]): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  if (!hasPermission(db, actor, "settings.manage")) return fail(db, "Sem permissão para alterar papéis.");
  const role = db.roles.find((item) => item.id === roleId && item.organizationId === actor.organizationId);
  if (!role) return fail(db, "Papel não encontrado.");
  if (role.name === "Administrador") return fail(db, "O papel Administrador permanece com acesso integral.");
  const allowed = new Set(db.permissions.map((permission) => permission.id));
  if (permissionIds.some((id) => !allowed.has(id))) return fail(db, "Permissão inválida.");
  const next = clone(db);
  next.rolePermissions = next.rolePermissions.filter((item) => item.roleId !== roleId);
  for (const permissionId of new Set(permissionIds)) {
    next.rolePermissions.push({ roleId, permissionId });
  }
  audit(next, actor, "update", "role", roleId, [{ field: "permissoes", before: null, after: permissionIds.length }]);
  return done(next, { id: roleId });
}

export function updatePipeline(
  db: DB,
  actorId: string,
  input: {
    statuses: { id: string; guidanceText: string; sortOrder: number }[];
    stages: { id: string; guidanceText: string; sortOrder: number; defaultProbability: number }[];
  },
): Mutation<{ ok: true }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  if (!hasPermission(db, actor, "settings.manage")) return fail(db, "Sem permissão para configurar o funil.");
  for (const stage of input.stages) {
    if (stage.defaultProbability < 0 || stage.defaultProbability > 100) {
      return fail(db, "A probabilidade padrão fica entre 0 e 100.");
    }
  }
  const next = clone(db);
  for (const item of input.statuses) {
    const status = next.leadStatuses.find((row) => row.id === item.id && row.organizationId === actor.organizationId);
    if (!status) return fail(db, "Status inválido.");
    status.guidanceText = item.guidanceText.trim();
    status.sortOrder = item.sortOrder;
  }
  for (const item of input.stages) {
    const stage = next.opportunityStages.find((row) => row.id === item.id && row.organizationId === actor.organizationId);
    if (!stage) return fail(db, "Etapa inválida.");
    stage.guidanceText = item.guidanceText.trim();
    stage.sortOrder = item.sortOrder;
    stage.defaultProbability = item.defaultProbability;
  }
  audit(next, actor, "update", "pipeline", actor.organizationId, [{ field: "registro", before: null, after: "Funil atualizado" }]);
  return done(next, { ok: true });
}

export function saveView(
  db: DB,
  actorId: string,
  input: { objectType: CrmObject; name: string; shared: boolean; filters: Record<string, string> },
): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  if (!input.name.trim()) return fail(db, "Informe o nome da visão.");
  if (!hasPermission(db, actor, `${input.objectType}.read`)) return fail(db, "Sem permissão para salvar esta visão.");
  const next = clone(db);
  const id = uid();
  next.savedViews.push({
    id,
    organizationId: actor.organizationId,
    userId: actor.id,
    objectType: input.objectType,
    name: input.name.trim(),
    shared: input.shared,
    filters: input.filters,
    createdAt: now(),
  });
  return done(next, { id });
}

export function deleteView(db: DB, actorId: string, viewId: string): Mutation<{ id: string }> {
  const actor = actorOf(db, actorId);
  if (!actor) return fail(db, "Sessão inválida.");
  const view = db.savedViews.find((item) => item.id === viewId && item.organizationId === actor.organizationId);
  if (!view || view.userId !== actor.id) return fail(db, "Visão não encontrada.");
  const next = clone(db);
  next.savedViews = next.savedViews.filter((item) => item.id !== viewId);
  return done(next, { id: viewId });
}

export function renewalSoon(contract: Contract, withinDays?: number): boolean {
  if (contract.deletedAt || contract.status !== "Ativo" || !contract.endDate) return false;
  const end = new Date(`${contract.endDate}T00:00:00`);
  const limit = new Date();
  limit.setDate(limit.getDate() + (withinDays ?? contract.renewalNoticeDays));
  return end <= limit;
}
