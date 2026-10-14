import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { SCHEMA_VERSION } from "../ids";
import type { Account, Activity, Address, AuditLog, Contact, Contract, DB, Lead, Opportunity, Profile } from "../types";
import { emptyAddress } from "../types";
import { createClient } from "./server";

type Row = Record<string, unknown>;

function text(row: Row, key: string) {
  return row[key] == null ? "" : String(row[key]);
}

function nullable(row: Row, key: string) {
  return row[key] == null ? null : String(row[key]);
}

function dateOnly(row: Row, key: string) {
  const value = nullable(row, key);
  return value ? value.slice(0, 10) : null;
}

function numberOrNull(row: Row, key: string) {
  if (row[key] == null || row[key] === "") return null;
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : null;
}

function flag(row: Row, key: string) {
  return Boolean(row[key]);
}

function address(row: Row, prefix: string): Address {
  return {
    street: text(row, `${prefix}_street`),
    number: text(row, `${prefix}_number`),
    complement: text(row, `${prefix}_complement`),
    district: text(row, `${prefix}_district`),
    city: text(row, `${prefix}_city`),
    state: text(row, `${prefix}_state`),
    postalCode: text(row, `${prefix}_postal_code`),
    country: text(row, `${prefix}_country`) || "Brasil",
  };
}

function addressColumns(value: Address, prefix: string) {
  return {
    [`${prefix}_street`]: value.street,
    [`${prefix}_number`]: value.number,
    [`${prefix}_complement`]: value.complement,
    [`${prefix}_district`]: value.district,
    [`${prefix}_city`]: value.city,
    [`${prefix}_state`]: value.state,
    [`${prefix}_postal_code`]: value.postalCode,
    [`${prefix}_country`]: value.country || "Brasil",
  };
}

function stamp(row: Row) {
  return {
    organizationId: text(row, "organization_id"),
    ownerId: text(row, "owner_id"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at"),
    createdBy: text(row, "created_by"),
    updatedBy: text(row, "updated_by"),
    deletedAt: nullable(row, "deleted_at"),
  };
}

function stampColumns(record: { organizationId: string; ownerId: string; createdAt: string; updatedAt: string; createdBy: string; updatedBy: string; deletedAt: string | null }) {
  return {
    organization_id: record.organizationId,
    owner_id: record.ownerId,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    created_by: record.createdBy || null,
    updated_by: record.updatedBy || null,
    deleted_at: record.deletedAt,
  };
}

async function readTable(supabase: SupabaseClient, table: string): Promise<Row[]> {
  const { data, error } = await supabase.from(table).select("*").limit(1000);
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as Row[];
}

function emptyDb(): DB {
  return {
    schemaVersion: SCHEMA_VERSION,
    organization: { id: "", name: "", locale: "pt-BR", timezone: "America/Sao_Paulo", currencyCode: "BRL" },
    profiles: [],
    roles: [],
    permissions: [],
    rolePermissions: [],
    leadStatuses: [],
    opportunityStages: [],
    leads: [],
    accounts: [],
    contacts: [],
    opportunities: [],
    opportunityContacts: [],
    contracts: [],
    activities: [],
    auditLogs: [],
    savedViews: [],
  };
}

export async function loadSupabaseDb(): Promise<DB> {
  const supabase = await createClient();
  const [organizations, profiles, roles, permissions, rolePermissions, leadStatuses, opportunityStages, leads, accounts, contacts, opportunities, opportunityContacts, contracts, activities, auditLogs, savedViews] = await Promise.all([
    readTable(supabase, "organizations"),
    readTable(supabase, "profiles"),
    readTable(supabase, "roles"),
    readTable(supabase, "permissions"),
    readTable(supabase, "role_permissions"),
    readTable(supabase, "lead_statuses"),
    readTable(supabase, "opportunity_stages"),
    readTable(supabase, "leads"),
    readTable(supabase, "accounts"),
    readTable(supabase, "contacts"),
    readTable(supabase, "opportunities"),
    readTable(supabase, "opportunity_contacts"),
    readTable(supabase, "contracts"),
    readTable(supabase, "activities"),
    readTable(supabase, "record_audit_logs"),
    readTable(supabase, "saved_views"),
  ]);
  const db = emptyDb();
  const organization = organizations[0];
  if (organization) {
    db.organization = {
      id: text(organization, "id"),
      name: text(organization, "name"),
      locale: text(organization, "locale") || "pt-BR",
      timezone: text(organization, "timezone") || "America/Sao_Paulo",
      currencyCode: text(organization, "currency_code") || "BRL",
    };
  }
  db.profiles = profiles.map((row) => ({
    id: text(row, "id"),
    organizationId: text(row, "organization_id"),
    fullName: text(row, "full_name"),
    email: text(row, "email"),
    roleId: text(row, "role_id"),
    managerId: nullable(row, "manager_id"),
    isActive: flag(row, "is_active"),
    locale: text(row, "locale") || "pt-BR",
    timezone: text(row, "timezone") || "America/Sao_Paulo",
    lastSeenAt: nullable(row, "last_seen_at"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at"),
  }));
  db.roles = roles.map((row) => ({
    id: text(row, "id"),
    organizationId: text(row, "organization_id"),
    name: text(row, "name"),
    description: text(row, "description"),
    readScope: text(row, "read_scope") as DB["roles"][number]["readScope"],
    writeScope: text(row, "write_scope") as DB["roles"][number]["writeScope"],
  }));
  db.permissions = permissions.map((row) => ({
    id: text(row, "id"),
    key: text(row, "key") as DB["permissions"][number]["key"],
    label: text(row, "label"),
    group: text(row, "permission_group"),
  }));
  db.rolePermissions = rolePermissions.map((row) => ({ roleId: text(row, "role_id"), permissionId: text(row, "permission_id") }));
  db.leadStatuses = leadStatuses.map((row) => ({
    id: text(row, "id"),
    organizationId: text(row, "organization_id"),
    name: text(row, "name"),
    sortOrder: numberOrNull(row, "sort_order") ?? 0,
    isClosed: flag(row, "is_closed"),
    isConverted: flag(row, "is_converted"),
    allowsConversion: flag(row, "allows_conversion"),
    requiresReason: flag(row, "requires_reason"),
    guidanceText: text(row, "guidance_text"),
  }));
  db.opportunityStages = opportunityStages.map((row) => ({
    id: text(row, "id"),
    organizationId: text(row, "organization_id"),
    name: text(row, "name"),
    sortOrder: numberOrNull(row, "sort_order") ?? 0,
    isClosed: flag(row, "is_closed"),
    isWon: flag(row, "is_won"),
    defaultProbability: numberOrNull(row, "default_probability") ?? 0,
    guidanceText: text(row, "guidance_text"),
  }));
  db.leads = leads.map((row) => ({
    ...stamp(row),
    id: text(row, "id"),
    firstName: text(row, "first_name"),
    lastName: text(row, "last_name"),
    company: text(row, "company"),
    title: text(row, "title"),
    email: text(row, "email"),
    phone: text(row, "phone"),
    mobile: text(row, "mobile"),
    website: text(row, "website"),
    statusId: text(row, "status_id"),
    leadSource: text(row, "lead_source"),
    rating: (text(row, "rating") || "") as Lead["rating"],
    industry: text(row, "industry"),
    annualRevenue: numberOrNull(row, "annual_revenue"),
    employeeCount: numberOrNull(row, "employee_count"),
    address: address(row, "address"),
    description: text(row, "description"),
    qualificationNotes: text(row, "qualification_notes"),
    disqualificationReason: text(row, "disqualification_reason"),
    isConverted: flag(row, "is_converted"),
    convertedAt: nullable(row, "converted_at"),
    convertedAccountId: nullable(row, "converted_account_id"),
    convertedContactId: nullable(row, "converted_contact_id"),
    convertedOpportunityId: nullable(row, "converted_opportunity_id"),
  }));
  db.accounts = accounts.map((row) => ({
    ...stamp(row),
    id: text(row, "id"),
    name: text(row, "name"),
    legalName: text(row, "legal_name"),
    taxId: text(row, "tax_id"),
    type: text(row, "type") as Account["type"],
    industry: text(row, "industry"),
    website: text(row, "website"),
    phone: text(row, "phone"),
    annualRevenue: numberOrNull(row, "annual_revenue"),
    employeeCount: numberOrNull(row, "employee_count"),
    parentAccountId: nullable(row, "parent_account_id"),
    billingAddress: address(row, "billing"),
    shippingAddress: address(row, "shipping"),
    sourceLeadId: nullable(row, "source_lead_id"),
    description: text(row, "description"),
  }));
  db.contacts = contacts.map((row) => ({
    ...stamp(row),
    id: text(row, "id"),
    accountId: text(row, "account_id"),
    firstName: text(row, "first_name"),
    lastName: text(row, "last_name"),
    email: text(row, "email"),
    phone: text(row, "phone"),
    mobile: text(row, "mobile"),
    title: text(row, "title"),
    department: text(row, "department"),
    reportsToContactId: nullable(row, "reports_to_contact_id"),
    isPrimary: flag(row, "is_primary"),
    mailingAddress: address(row, "mailing"),
    leadSource: text(row, "lead_source"),
    emailOptOut: flag(row, "email_opt_out"),
    doNotCall: flag(row, "do_not_call"),
    sourceLeadId: nullable(row, "source_lead_id"),
    description: text(row, "description"),
  }));
  db.opportunities = opportunities.map((row) => ({
    ...stamp(row),
    id: text(row, "id"),
    name: text(row, "name"),
    accountId: text(row, "account_id"),
    stageId: text(row, "stage_id"),
    amount: numberOrNull(row, "amount"),
    currencyCode: text(row, "currency_code") || "BRL",
    probability: numberOrNull(row, "probability") ?? 0,
    closeDate: dateOnly(row, "close_date") ?? "",
    actualCloseDate: dateOnly(row, "actual_close_date"),
    type: text(row, "type") as Opportunity["type"],
    leadSource: text(row, "lead_source"),
    nextStep: text(row, "next_step"),
    description: text(row, "description"),
    lossReason: text(row, "loss_reason"),
    primaryContactId: nullable(row, "primary_contact_id"),
    sourceLeadId: nullable(row, "source_lead_id"),
  }));
  db.opportunityContacts = opportunityContacts.map((row) => ({
    id: text(row, "id"),
    organizationId: text(row, "organization_id"),
    opportunityId: text(row, "opportunity_id"),
    contactId: text(row, "contact_id"),
    role: text(row, "role"),
    isPrimary: flag(row, "is_primary"),
  }));
  db.contracts = contracts.map((row) => ({
    ...stamp(row),
    id: text(row, "id"),
    contractNumber: text(row, "contract_number"),
    accountId: text(row, "account_id"),
    opportunityId: nullable(row, "opportunity_id"),
    signerContactId: nullable(row, "signer_contact_id"),
    name: text(row, "name"),
    status: text(row, "status") as Contract["status"],
    startDate: dateOnly(row, "start_date"),
    endDate: dateOnly(row, "end_date"),
    termMonths: numberOrNull(row, "term_months"),
    amount: numberOrNull(row, "amount"),
    currencyCode: text(row, "currency_code") || "BRL",
    signedAt: nullable(row, "signed_at"),
    activatedAt: nullable(row, "activated_at"),
    renewalNoticeDays: numberOrNull(row, "renewal_notice_days") ?? 30,
    documentPath: text(row, "document_path"),
    description: text(row, "description"),
  }));
  db.activities = activities.map((row) => ({
    id: text(row, "id"),
    organizationId: text(row, "organization_id"),
    objectType: text(row, "object_type") as Activity["objectType"],
    recordId: text(row, "record_id"),
    type: text(row, "type") as Activity["type"],
    subject: text(row, "subject"),
    body: text(row, "body"),
    dueAt: dateOnly(row, "due_at"),
    createdAt: text(row, "created_at"),
    createdBy: text(row, "created_by"),
  }));
  db.auditLogs = auditLogs.map((row) => ({
    id: text(row, "id"),
    organizationId: text(row, "organization_id"),
    actorId: text(row, "actor_id"),
    action: text(row, "action"),
    objectType: text(row, "object_type"),
    recordId: text(row, "record_id"),
    changes: Array.isArray(row.changes) ? row.changes as AuditLog["changes"] : [],
    createdAt: text(row, "created_at"),
  }));
  db.savedViews = savedViews.map((row) => ({
    id: text(row, "id"),
    organizationId: text(row, "organization_id"),
    userId: text(row, "user_id"),
    objectType: text(row, "object_type") as DB["savedViews"][number]["objectType"],
    name: text(row, "name"),
    shared: flag(row, "shared"),
    filters: row.filters && typeof row.filters === "object" ? row.filters as Record<string, string> : {},
    createdAt: text(row, "created_at"),
  }));
  return db;
}

async function applyTable(supabase: SupabaseClient, table: string, before: Row[], after: Row[], idKey = "id") {
  const beforeMap = new Map(before.map((row) => [String(row[idKey]), JSON.stringify(row)]));
  const afterMap = new Map(after.map((row) => [String(row[idKey]), row]));
  const inserts: Row[] = [];
  const updates: Row[] = [];
  const deletes: string[] = [];
  for (const [id, row] of afterMap) {
    const previous = beforeMap.get(id);
    if (!previous) inserts.push(row);
    else if (previous !== JSON.stringify(row)) updates.push(row);
  }
  for (const id of beforeMap.keys()) if (!afterMap.has(id)) deletes.push(id);
  if (inserts.length) {
    const { error } = await supabase.from(table).insert(inserts);
    if (error && error.code !== "42501") throw new Error(`${table}: ${error.message}`);
  }
  for (const row of updates) {
    const { error } = await supabase.from(table).update(row).eq(idKey, row[idKey]);
    if (error && error.code !== "42501") throw new Error(`${table}: ${error.message}`);
  }
  if (deletes.length && idKey === "id") {
    const { error } = await supabase.from(table).delete().in("id", deletes);
    if (error && error.code !== "42501") throw new Error(`${table}: ${error.message}`);
  }
}

export async function saveSupabaseDb(before: DB, after: DB) {
  const supabase = await createClient();
  if (after.organization.id && before.organization.id !== after.organization.id) {
    const { error } = await supabase.from("organizations").insert({
      id: after.organization.id,
      name: after.organization.name,
      locale: after.organization.locale,
      timezone: after.organization.timezone,
      currency_code: after.organization.currencyCode,
    });
    if (error && error.code !== "42501") throw new Error(`organizations: ${error.message}`);
  }
  await applyTable(supabase, "permissions", before.permissions.map(permissionRow), after.permissions.map(permissionRow));
  await applyTable(supabase, "roles", before.roles.map(roleRow), after.roles.map(roleRow));
  await applyTable(supabase, "profiles", before.profiles.map(profileRow), after.profiles.map(profileRow));
  await applyTable(supabase, "lead_statuses", before.leadStatuses.map(statusRow), after.leadStatuses.map(statusRow));
  await applyTable(supabase, "opportunity_stages", before.opportunityStages.map(stageRow), after.opportunityStages.map(stageRow));
  await applyTable(supabase, "accounts", before.accounts.map(accountRow), after.accounts.map(accountRow));
  await applyTable(supabase, "contacts", before.contacts.map(contactRow), after.contacts.map(contactRow));
  await applyTable(supabase, "opportunities", before.opportunities.map(opportunityRow), after.opportunities.map(opportunityRow));
  await applyTable(supabase, "opportunity_contacts", before.opportunityContacts.map(linkRow), after.opportunityContacts.map(linkRow));
  await applyTable(supabase, "contracts", before.contracts.map(contractRow), after.contracts.map(contractRow));
  await applyTable(supabase, "leads", before.leads.map(leadRow), after.leads.map(leadRow));
  await applyTable(supabase, "activities", before.activities.map(activityRow), after.activities.map(activityRow));
  await applyTable(supabase, "record_audit_logs", before.auditLogs.map(auditRow), after.auditLogs.map(auditRow));
  await applyTable(supabase, "saved_views", before.savedViews.map(viewRow), after.savedViews.map(viewRow));
  await syncRolePermissions(supabase, before, after);
}

async function syncRolePermissions(supabase: SupabaseClient, before: DB, after: DB) {
  const key = (item: { roleId: string; permissionId: string }) => `${item.roleId}:${item.permissionId}`;
  const previous = new Set(before.rolePermissions.map(key));
  const next = new Set(after.rolePermissions.map(key));
  const inserts = after.rolePermissions.filter((item) => !previous.has(key(item))).map((item) => ({ role_id: item.roleId, permission_id: item.permissionId }));
  const deletes = before.rolePermissions.filter((item) => !next.has(key(item)));
  if (inserts.length) {
    const { error } = await supabase.from("role_permissions").insert(inserts);
    if (error && error.code !== "42501") throw new Error(`role_permissions: ${error.message}`);
  }
  for (const item of deletes) {
    const { error } = await supabase.from("role_permissions").delete().eq("role_id", item.roleId).eq("permission_id", item.permissionId);
    if (error && error.code !== "42501") throw new Error(`role_permissions: ${error.message}`);
  }
}

function permissionRow(item: DB["permissions"][number]): Row {
  return { id: item.id, key: item.key, label: item.label, permission_group: item.group };
}
function roleRow(item: DB["roles"][number]): Row {
  return { id: item.id, organization_id: item.organizationId, name: item.name, description: item.description, read_scope: item.readScope, write_scope: item.writeScope };
}
function profileRow(profile: Profile): Row {
  return { id: profile.id, organization_id: profile.organizationId, full_name: profile.fullName, email: profile.email, role_id: profile.roleId, manager_id: profile.managerId, is_active: profile.isActive, locale: profile.locale, timezone: profile.timezone, last_seen_at: profile.lastSeenAt, created_at: profile.createdAt, updated_at: profile.updatedAt };
}
function statusRow(status: DB["leadStatuses"][number]): Row {
  return { id: status.id, organization_id: status.organizationId, name: status.name, sort_order: status.sortOrder, is_closed: status.isClosed, is_converted: status.isConverted, allows_conversion: status.allowsConversion, requires_reason: status.requiresReason, guidance_text: status.guidanceText };
}
function stageRow(stage: DB["opportunityStages"][number]): Row {
  return { id: stage.id, organization_id: stage.organizationId, name: stage.name, sort_order: stage.sortOrder, is_closed: stage.isClosed, is_won: stage.isWon, default_probability: stage.defaultProbability, guidance_text: stage.guidanceText };
}
function accountRow(account: Account): Row {
  return { id: account.id, ...stampColumns(account), name: account.name, legal_name: account.legalName, tax_id: account.taxId, type: account.type, industry: account.industry, website: account.website, phone: account.phone, annual_revenue: account.annualRevenue, employee_count: account.employeeCount, parent_account_id: account.parentAccountId, ...addressColumns(account.billingAddress, "billing"), ...addressColumns(account.shippingAddress, "shipping"), source_lead_id: account.sourceLeadId, description: account.description };
}
function contactRow(contact: Contact): Row {
  return { id: contact.id, ...stampColumns(contact), account_id: contact.accountId, first_name: contact.firstName, last_name: contact.lastName, email: contact.email, phone: contact.phone, mobile: contact.mobile, title: contact.title, department: contact.department, reports_to_contact_id: contact.reportsToContactId, is_primary: contact.isPrimary, ...addressColumns(contact.mailingAddress, "mailing"), lead_source: contact.leadSource, email_opt_out: contact.emailOptOut, do_not_call: contact.doNotCall, source_lead_id: contact.sourceLeadId, description: contact.description };
}
function opportunityRow(opportunity: Opportunity): Row {
  return { id: opportunity.id, ...stampColumns(opportunity), name: opportunity.name, account_id: opportunity.accountId, stage_id: opportunity.stageId, amount: opportunity.amount, currency_code: opportunity.currencyCode, probability: opportunity.probability, close_date: opportunity.closeDate, actual_close_date: opportunity.actualCloseDate, type: opportunity.type, lead_source: opportunity.leadSource, next_step: opportunity.nextStep, description: opportunity.description, loss_reason: opportunity.lossReason, primary_contact_id: opportunity.primaryContactId, source_lead_id: opportunity.sourceLeadId };
}
function linkRow(item: DB["opportunityContacts"][number]): Row {
  return { id: item.id, organization_id: item.organizationId, opportunity_id: item.opportunityId, contact_id: item.contactId, role: item.role, is_primary: item.isPrimary };
}
function contractRow(contract: Contract): Row {
  return { id: contract.id, ...stampColumns(contract), contract_number: contract.contractNumber, account_id: contract.accountId, opportunity_id: contract.opportunityId, signer_contact_id: contract.signerContactId, name: contract.name, status: contract.status, start_date: contract.startDate, end_date: contract.endDate, term_months: contract.termMonths, amount: contract.amount, currency_code: contract.currencyCode, signed_at: contract.signedAt, activated_at: contract.activatedAt, renewal_notice_days: contract.renewalNoticeDays, document_path: contract.documentPath || null, description: contract.description };
}
function leadRow(lead: Lead): Row {
  return { id: lead.id, ...stampColumns(lead), first_name: lead.firstName, last_name: lead.lastName, company: lead.company, title: lead.title, email: lead.email, phone: lead.phone, mobile: lead.mobile, website: lead.website, status_id: lead.statusId, lead_source: lead.leadSource, rating: lead.rating || null, industry: lead.industry, annual_revenue: lead.annualRevenue, employee_count: lead.employeeCount, ...addressColumns(lead.address ?? emptyAddress(), "address"), description: lead.description, qualification_notes: lead.qualificationNotes, disqualification_reason: lead.disqualificationReason, is_converted: lead.isConverted, converted_at: lead.convertedAt, converted_account_id: lead.convertedAccountId, converted_contact_id: lead.convertedContactId, converted_opportunity_id: lead.convertedOpportunityId };
}
function activityRow(activity: Activity): Row {
  return { id: activity.id, organization_id: activity.organizationId, object_type: activity.objectType, record_id: activity.recordId, type: activity.type, subject: activity.subject, body: activity.body, due_at: activity.dueAt, created_at: activity.createdAt, created_by: activity.createdBy || null };
}
function auditRow(log: AuditLog): Row {
  return { id: log.id, organization_id: log.organizationId, actor_id: log.actorId || null, action: log.action, object_type: log.objectType, record_id: log.recordId, changes: log.changes, created_at: log.createdAt };
}
function viewRow(view: DB["savedViews"][number]): Row {
  return { id: view.id, organization_id: view.organizationId, user_id: view.userId, object_type: view.objectType, name: view.name, shared: view.shared, filters: view.filters, created_at: view.createdAt };
}
