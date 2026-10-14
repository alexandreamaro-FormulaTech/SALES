export const PERMISSION_KEYS = [
  "lead.create",
  "lead.read",
  "lead.update",
  "lead.delete",
  "lead.export",
  "lead.transfer_owner",
  "lead.convert",
  "account.create",
  "account.read",
  "account.update",
  "account.delete",
  "account.export",
  "account.transfer_owner",
  "contact.create",
  "contact.read",
  "contact.update",
  "contact.delete",
  "contact.export",
  "contact.transfer_owner",
  "opportunity.create",
  "opportunity.read",
  "opportunity.update",
  "opportunity.delete",
  "opportunity.export",
  "opportunity.transfer_owner",
  "opportunity.close",
  "contract.create",
  "contract.read",
  "contract.update",
  "contract.delete",
  "contract.export",
  "contract.transfer_owner",
  "contract.activate",
  "user.read",
  "user.manage",
  "settings.manage",
  "audit.read",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type CrmObject = "lead" | "account" | "contact" | "opportunity" | "contract";

export type AccessScope = "all" | "team" | "own";

export type Rating = "Quente" | "Morno" | "Frio";

export type AccountType = "Prospect" | "Cliente" | "Parceiro";

export type OpportunityType = "Novo negócio" | "Expansão" | "Renovação";

export type ContractStatus =
  | "Rascunho"
  | "Em aprovação"
  | "Enviado"
  | "Assinado"
  | "Ativo"
  | "Expirado"
  | "Cancelado";

export type ActivityType = "Tarefa" | "Chamada" | "Reunião" | "Nota";

export type Address = {
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type Organization = {
  id: string;
  name: string;
  locale: string;
  timezone: string;
  currencyCode: string;
};

export type Role = {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  readScope: AccessScope;
  writeScope: AccessScope;
};

export type Permission = {
  id: string;
  key: PermissionKey;
  label: string;
  group: string;
};

export type RolePermission = {
  roleId: string;
  permissionId: string;
};

export type Profile = {
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  roleId: string;
  managerId: string | null;
  isActive: boolean;
  locale: string;
  timezone: string;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadStatus = {
  id: string;
  organizationId: string;
  name: string;
  sortOrder: number;
  isClosed: boolean;
  isConverted: boolean;
  allowsConversion: boolean;
  requiresReason: boolean;
  guidanceText: string;
};

export type OpportunityStage = {
  id: string;
  organizationId: string;
  name: string;
  sortOrder: number;
  isClosed: boolean;
  isWon: boolean;
  defaultProbability: number;
  guidanceText: string;
};

type AuditStamp = {
  organizationId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  deletedAt: string | null;
};

export type Lead = AuditStamp & {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  mobile: string;
  website: string;
  statusId: string;
  leadSource: string;
  rating: Rating | "";
  industry: string;
  annualRevenue: number | null;
  employeeCount: number | null;
  address: Address;
  description: string;
  qualificationNotes: string;
  disqualificationReason: string;
  isConverted: boolean;
  convertedAt: string | null;
  convertedAccountId: string | null;
  convertedContactId: string | null;
  convertedOpportunityId: string | null;
};

export type Account = AuditStamp & {
  id: string;
  name: string;
  legalName: string;
  taxId: string;
  type: AccountType;
  industry: string;
  website: string;
  phone: string;
  annualRevenue: number | null;
  employeeCount: number | null;
  parentAccountId: string | null;
  billingAddress: Address;
  shippingAddress: Address;
  sourceLeadId: string | null;
  description: string;
};

export type Contact = AuditStamp & {
  id: string;
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
  sourceLeadId: string | null;
  description: string;
};

export type Opportunity = AuditStamp & {
  id: string;
  name: string;
  accountId: string;
  stageId: string;
  amount: number | null;
  currencyCode: string;
  probability: number;
  closeDate: string;
  actualCloseDate: string | null;
  type: OpportunityType;
  leadSource: string;
  nextStep: string;
  description: string;
  lossReason: string;
  primaryContactId: string | null;
  sourceLeadId: string | null;
};

export type OpportunityContact = {
  id: string;
  organizationId: string;
  opportunityId: string;
  contactId: string;
  role: string;
  isPrimary: boolean;
};

export type Contract = AuditStamp & {
  id: string;
  contractNumber: string;
  accountId: string;
  opportunityId: string | null;
  signerContactId: string | null;
  name: string;
  status: ContractStatus;
  startDate: string | null;
  endDate: string | null;
  termMonths: number | null;
  amount: number | null;
  currencyCode: string;
  signedAt: string | null;
  activatedAt: string | null;
  renewalNoticeDays: number;
  documentPath: string;
  description: string;
};

export type Activity = {
  id: string;
  organizationId: string;
  objectType: CrmObject;
  recordId: string;
  type: ActivityType;
  subject: string;
  body: string;
  dueAt: string | null;
  createdAt: string;
  createdBy: string;
};

export type AuditChange = {
  field: string;
  before: unknown;
  after: unknown;
};

export type AuditLog = {
  id: string;
  organizationId: string;
  actorId: string;
  action: string;
  objectType: string;
  recordId: string;
  changes: AuditChange[];
  createdAt: string;
};

export type SavedView = {
  id: string;
  organizationId: string;
  userId: string;
  objectType: CrmObject;
  name: string;
  shared: boolean;
  filters: Record<string, string>;
  createdAt: string;
};

export type DB = {
  schemaVersion: number;
  organization: Organization;
  profiles: Profile[];
  roles: Role[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
  leadStatuses: LeadStatus[];
  opportunityStages: OpportunityStage[];
  leads: Lead[];
  accounts: Account[];
  contacts: Contact[];
  opportunities: Opportunity[];
  opportunityContacts: OpportunityContact[];
  contracts: Contract[];
  activities: Activity[];
  auditLogs: AuditLog[];
  savedViews: SavedView[];
};

export type DuplicateHit = {
  id: string;
  kind: "account" | "contact";
  label: string;
  reason: string;
  href: string;
};

export type DomainFailure = {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
  duplicates?: DuplicateHit[];
};

export type DomainSuccess<T> = { ok: true; data: T };

export type DomainResult<T> = DomainSuccess<T> | DomainFailure;

export type ActionState = {
  ok: boolean;
  error: string;
  notice: string;
  fieldErrors: Record<string, string>;
  duplicates: DuplicateHit[];
};

export const emptyActionState: ActionState = {
  ok: true,
  error: "",
  notice: "",
  fieldErrors: {},
  duplicates: [],
};

export function emptyAddress(): Address {
  return {
    street: "",
    number: "",
    complement: "",
    district: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Brasil",
  };
}
