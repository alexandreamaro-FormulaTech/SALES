import { expectedRevenue } from "./domain";
import { fullName } from "./format";
import { can, roleOf, teamOwnerIds } from "./permissions";
import type { CrmObject, DB, Profile } from "./types";

export type ListParams = {
  q?: string;
  scope?: string;
  status?: string;
  owner?: string;
  sort?: string;
  dir?: string;
  page?: string;
  view?: string;
};

export type ListRow = Record<string, string | number | null>;

const PAGE_SIZE = 8;

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function includes(haystack: string, query: string): boolean {
  return haystack.toLowerCase().includes(query);
}

function compare(left: string | number | null, right: string | number | null): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), "pt-BR");
}

export function ownerName(db: DB, ownerId: string): string {
  return db.profiles.find((profile) => profile.id === ownerId)?.fullName ?? "—";
}

export function statusName(db: DB, statusId: string): string {
  return db.leadStatuses.find((status) => status.id === statusId)?.name ?? "—";
}

export function stageName(db: DB, stageId: string): string {
  return db.opportunityStages.find((stage) => stage.id === stageId)?.name ?? "—";
}

export function accountName(db: DB, accountId: string | null): string {
  if (!accountId) return "—";
  return db.accounts.find((account) => account.id === accountId)?.name ?? "—";
}

const DETAIL_PREFIX = {
  account: "/crm/accounts",
  contact: "/crm/contacts",
  opportunity: "/crm/opportunities",
  contract: "/crm/contracts",
  user: "/crm/users",
} as const;

export type LookupKind = keyof typeof DETAIL_PREFIX;

export function lookupHref(db: DB, kind: LookupKind, id: string | null | undefined): string | null {
  if (!id) return null;
  const exists = kind === "account"
    ? db.accounts.some((item) => item.id === id && !item.deletedAt)
    : kind === "contact"
      ? db.contacts.some((item) => item.id === id && !item.deletedAt)
      : kind === "opportunity"
        ? db.opportunities.some((item) => item.id === id && !item.deletedAt)
        : kind === "contract"
          ? db.contracts.some((item) => item.id === id && !item.deletedAt)
          : db.profiles.some((item) => item.id === id);
  return exists ? `${DETAIL_PREFIX[kind]}/${id}` : null;
}

function visible<T extends { organizationId: string; ownerId: string; deletedAt: string | null }>(
  db: DB,
  user: Profile,
  object: CrmObject,
  rows: T[],
): T[] {
  return rows.filter(
    (row) => !row.deletedAt && row.organizationId === user.organizationId && can(db, user, `${object}.read`, row.ownerId),
  );
}

function applyScope<T extends { ownerId: string; createdAt: string }>(rows: T[], user: Profile, scope: string | undefined): T[] {
  if (scope === "mine") return rows.filter((row) => row.ownerId === user.id);
  if (scope === "recent") {
    const limit = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return rows.filter((row) => new Date(row.createdAt).getTime() >= limit);
  }
  return rows;
}

function paginate<T>(rows: T[], pageRaw: string | undefined): { page: number; pages: number; total: number; rows: T[] } {
  const total = rows.length;
  if (pageRaw === "all") return { page: 1, pages: 1, total, rows };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Number(pageRaw ?? "1");
  const page = Number.isFinite(requested) ? Math.min(Math.max(1, requested), pages) : 1;
  const start = (page - 1) * PAGE_SIZE;
  return { page, pages, total, rows: rows.slice(start, start + PAGE_SIZE) };
}

function sortRows<T extends ListRow>(rows: T[], sort: string, dir: string, fallback: string): T[] {
  const key = sort || fallback;
  const factor = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => compare(a[key] ?? null, b[key] ?? null) * factor);
}

export function queryLeads(db: DB, user: Profile, params: ListParams) {
  const query = normalize(params.q);
  let rows = visible(db, user, "lead", db.leads).map((lead) => ({
    id: lead.id,
    name: fullName(lead.firstName, lead.lastName),
    company: lead.company,
    status: statusName(db, lead.statusId),
    statusId: lead.statusId,
    source: lead.leadSource || "—",
    owner: ownerName(db, lead.ownerId),
    ownerId: lead.ownerId,
    createdAt: lead.createdAt,
    search: `${lead.firstName} ${lead.lastName} ${lead.company} ${lead.email} ${lead.phone}`,
  }));
  rows = applyScope(rows, user, params.scope);
  if (params.status) rows = rows.filter((row) => row.statusId === params.status);
  if (params.owner) rows = rows.filter((row) => row.ownerId === params.owner);
  if (query) rows = rows.filter((row) => includes(row.search, query));
  rows = sortRows(rows, params.sort ?? "createdAt", params.dir ?? "desc", "createdAt");
  return paginate(rows, params.page);
}

export function queryAccounts(db: DB, user: Profile, params: ListParams) {
  const query = normalize(params.q);
  let rows = visible(db, user, "account", db.accounts).map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    industry: account.industry || "—",
    phone: account.phone || "—",
    owner: ownerName(db, account.ownerId),
    ownerId: account.ownerId,
    createdAt: account.createdAt,
    search: `${account.name} ${account.legalName} ${account.taxId} ${account.phone}`,
  }));
  rows = applyScope(rows, user, params.scope);
  if (params.status) rows = rows.filter((row) => row.type === params.status);
  if (params.owner) rows = rows.filter((row) => row.ownerId === params.owner);
  if (query) rows = rows.filter((row) => includes(row.search, query));
  rows = sortRows(rows, params.sort ?? "name", params.dir ?? "asc", "name");
  return paginate(rows, params.page);
}

export function queryContacts(db: DB, user: Profile, params: ListParams) {
  const query = normalize(params.q);
  let rows = visible(db, user, "contact", db.contacts).map((contact) => ({
    id: contact.id,
    name: fullName(contact.firstName, contact.lastName),
    account: accountName(db, contact.accountId),
    accountId: contact.accountId,
    title: contact.title || "—",
    email: contact.email || "—",
    phone: contact.phone || contact.mobile || "—",
    owner: ownerName(db, contact.ownerId),
    ownerId: contact.ownerId,
    createdAt: contact.createdAt,
    search: `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.phone} ${accountName(db, contact.accountId)}`,
  }));
  rows = applyScope(rows, user, params.scope);
  if (params.status) rows = rows.filter((row) => row.accountId === params.status);
  if (params.owner) rows = rows.filter((row) => row.ownerId === params.owner);
  if (query) rows = rows.filter((row) => includes(row.search, query));
  rows = sortRows(rows, params.sort ?? "name", params.dir ?? "asc", "name");
  return paginate(rows, params.page);
}

export function queryOpportunities(db: DB, user: Profile, params: ListParams) {
  const query = normalize(params.q);
  let rows = visible(db, user, "opportunity", db.opportunities).map((opportunity) => ({
    id: opportunity.id,
    name: opportunity.name,
    account: accountName(db, opportunity.accountId),
    accountId: opportunity.accountId,
    stage: stageName(db, opportunity.stageId),
    stageId: opportunity.stageId,
    amount: opportunity.amount,
    closeDate: opportunity.closeDate,
    owner: ownerName(db, opportunity.ownerId),
    ownerId: opportunity.ownerId,
    probability: opportunity.probability,
    expected: expectedRevenue(opportunity),
    createdAt: opportunity.createdAt,
    search: `${opportunity.name} ${accountName(db, opportunity.accountId)}`,
  }));
  rows = applyScope(rows, user, params.scope);
  if (params.status) rows = rows.filter((row) => row.stageId === params.status);
  if (params.owner) rows = rows.filter((row) => row.ownerId === params.owner);
  if (query) rows = rows.filter((row) => includes(row.search, query));
  rows = sortRows(rows, params.sort ?? "closeDate", params.dir ?? "asc", "closeDate");
  return paginate(rows, params.page);
}

export function queryContracts(db: DB, user: Profile, params: ListParams) {
  const query = normalize(params.q);
  let rows = visible(db, user, "contract", db.contracts).map((contract) => ({
    id: contract.id,
    number: contract.contractNumber,
    name: contract.name,
    account: accountName(db, contract.accountId),
    status: contract.status,
    amount: contract.amount,
    startDate: contract.startDate,
    endDate: contract.endDate,
    owner: ownerName(db, contract.ownerId),
    ownerId: contract.ownerId,
    createdAt: contract.createdAt,
    search: `${contract.contractNumber} ${contract.name} ${accountName(db, contract.accountId)}`,
  }));
  rows = applyScope(rows, user, params.scope);
  if (params.status) rows = rows.filter((row) => row.status === params.status);
  if (params.owner) rows = rows.filter((row) => row.ownerId === params.owner);
  if (query) rows = rows.filter((row) => includes(row.search, query));
  rows = sortRows(rows, params.sort ?? "endDate", params.dir ?? "asc", "endDate");
  return paginate(rows, params.page);
}

export function savedViewsFor(db: DB, user: Profile, objectType: CrmObject) {
  const role = db.roles.find((item) => item.id === user.roleId);
  return db.savedViews.filter((view) => {
    if (view.organizationId !== user.organizationId || view.objectType !== objectType) return false;
    if (view.userId === user.id) return true;
    if (!view.shared) return false;
    if (role?.readScope === "all") return true;
    const author = db.profiles.find((profile) => profile.id === view.userId);
    return author?.managerId === user.id || user.managerId === author?.id || (author?.managerId != null && author.managerId === user.managerId);
  });
}

export function globalSearch(db: DB, user: Profile, q: string) {
  const params = { q, scope: "all", page: "1" };
  return {
    leads: queryLeads(db, user, params).rows.slice(0, 6),
    accounts: queryAccounts(db, user, params).rows.slice(0, 6),
    contacts: queryContacts(db, user, params).rows.slice(0, 6),
    opportunities: queryOpportunities(db, user, params).rows.slice(0, 6),
    contracts: queryContracts(db, user, params).rows.slice(0, 6),
  };
}

export function visibleOwners(db: DB, user: Profile) {
  const role = roleOf(db, user);
  const team = teamOwnerIds(db, user);
  return db.profiles.filter((profile) => {
    if (profile.organizationId !== user.organizationId) return false;
    if (!role || role.readScope === "all") return true;
    if (role.readScope === "own") return profile.id === user.id;
    return team.has(profile.id);
  });
}

export function assignableOwners(db: DB, user: Profile) {
  return db.profiles.filter((profile) => {
    if (!profile.isActive || profile.organizationId !== user.organizationId) return false;
    const role = db.roles.find((item) => item.id === user.roleId);
    if (!role) return false;
    if (role.writeScope === "all") return true;
    if (role.writeScope === "own") return profile.id === user.id;
    return profile.id === user.id || profile.managerId === user.id;
  });
}

export const pageSize = PAGE_SIZE;
