import {
  ACCOUNT_TYPES,
  ACTIVITY_TYPES,
  CONTRACT_STATUSES,
  INDUSTRIES,
  LEAD_SOURCES,
  OPPORTUNITY_TYPES,
  RATINGS,
} from "./constants";
import type {
  AccountInput,
  ContactInput,
  ContractInput,
  LeadInput,
  OpportunityInput,
} from "./domain";
import { emptyActionState, emptyAddress, type ActionState, type Address, type ContractStatus } from "./types";

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function numberValue(formData: FormData, name: string): { value: number | null; error?: string } {
  const raw = text(formData, name);
  if (!raw) return { value: null };
  const value = Number(raw);
  if (!Number.isFinite(value)) return { value: null, error: "Informe um número válido." };
  return { value };
}

function integerValue(formData: FormData, name: string): { value: number | null; error?: string } {
  const parsed = numberValue(formData, name);
  if (parsed.error || parsed.value == null) return parsed;
  if (!Number.isInteger(parsed.value)) return { value: null, error: "Informe um número inteiro." };
  return parsed;
}

export function readAddress(formData: FormData, prefix: string): Address {
  return {
    street: text(formData, `${prefix}Street`),
    number: text(formData, `${prefix}Number`),
    complement: text(formData, `${prefix}Complement`),
    district: text(formData, `${prefix}District`),
    city: text(formData, `${prefix}City`),
    state: text(formData, `${prefix}State`),
    postalCode: text(formData, `${prefix}PostalCode`),
    country: text(formData, `${prefix}Country`) || "Brasil",
  };
}

function invalid(error: string, fieldErrors: Record<string, string> = {}): { state: ActionState } {
  return { state: { ...emptyActionState, ok: false, error, fieldErrors } };
}

export function parseLead(formData: FormData): { value: LeadInput } | { state: ActionState } {
  const revenue = numberValue(formData, "annualRevenue");
  const employees = integerValue(formData, "employeeCount");
  const fieldErrors: Record<string, string> = {};
  if (revenue.error) fieldErrors.annualRevenue = revenue.error;
  if (employees.error) fieldErrors.employeeCount = employees.error;
  const rating = text(formData, "rating");
  if (rating && !RATINGS.includes(rating as (typeof RATINGS)[number])) fieldErrors.rating = "Classificação inválida.";
  if (Object.keys(fieldErrors).length) return invalid("Revise os campos destacados.", fieldErrors);
  return {
    value: {
      ownerId: text(formData, "ownerId") || undefined,
      firstName: text(formData, "firstName"),
      lastName: text(formData, "lastName"),
      company: text(formData, "company"),
      title: text(formData, "title"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      mobile: text(formData, "mobile"),
      website: text(formData, "website"),
      leadSource: text(formData, "leadSource"),
      rating: (rating || "") as LeadInput["rating"],
      industry: text(formData, "industry"),
      annualRevenue: revenue.value,
      employeeCount: employees.value,
      address: readAddress(formData, "address"),
      description: text(formData, "description"),
      qualificationNotes: text(formData, "qualificationNotes"),
    },
  };
}

export function parseAccount(formData: FormData): { value: AccountInput } | { state: ActionState } {
  const revenue = numberValue(formData, "annualRevenue");
  const employees = integerValue(formData, "employeeCount");
  const type = text(formData, "type");
  const fieldErrors: Record<string, string> = {};
  if (revenue.error) fieldErrors.annualRevenue = revenue.error;
  if (employees.error) fieldErrors.employeeCount = employees.error;
  if (!ACCOUNT_TYPES.includes(type as (typeof ACCOUNT_TYPES)[number])) fieldErrors.type = "Tipo inválido.";
  if (Object.keys(fieldErrors).length) return invalid("Revise os campos destacados.", fieldErrors);
  return {
    value: {
      ownerId: text(formData, "ownerId") || undefined,
      name: text(formData, "name"),
      legalName: text(formData, "legalName"),
      taxId: text(formData, "taxId"),
      type: type as AccountInput["type"],
      industry: text(formData, "industry"),
      website: text(formData, "website"),
      phone: text(formData, "phone"),
      annualRevenue: revenue.value,
      employeeCount: employees.value,
      parentAccountId: text(formData, "parentAccountId") || null,
      billingAddress: readAddress(formData, "billing"),
      shippingAddress: readAddress(formData, "shipping"),
      description: text(formData, "description"),
    },
  };
}

export function parseContact(formData: FormData): { value: ContactInput } | { state: ActionState } {
  return {
    value: {
      ownerId: text(formData, "ownerId") || undefined,
      accountId: text(formData, "accountId"),
      firstName: text(formData, "firstName"),
      lastName: text(formData, "lastName"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      mobile: text(formData, "mobile"),
      title: text(formData, "title"),
      department: text(formData, "department"),
      reportsToContactId: text(formData, "reportsToContactId") || null,
      isPrimary: formData.get("isPrimary") === "on",
      mailingAddress: readAddress(formData, "mailing"),
      leadSource: text(formData, "leadSource"),
      emailOptOut: formData.get("emailOptOut") === "on",
      doNotCall: formData.get("doNotCall") === "on",
      description: text(formData, "description"),
    },
  };
}

export function parseOpportunity(formData: FormData): { value: OpportunityInput } | { state: ActionState } {
  const amount = numberValue(formData, "amount");
  const probability = numberValue(formData, "probability");
  const type = text(formData, "type");
  const fieldErrors: Record<string, string> = {};
  if (amount.error) fieldErrors.amount = amount.error;
  if (probability.error) fieldErrors.probability = probability.error;
  if (!OPPORTUNITY_TYPES.includes(type as (typeof OPPORTUNITY_TYPES)[number])) fieldErrors.type = "Tipo inválido.";
  if (Object.keys(fieldErrors).length) return invalid("Revise os campos destacados.", fieldErrors);
  return {
    value: {
      ownerId: text(formData, "ownerId") || undefined,
      name: text(formData, "name"),
      accountId: text(formData, "accountId"),
      amount: amount.value,
      closeDate: text(formData, "closeDate"),
      probability: probability.value,
      type: type as OpportunityInput["type"],
      leadSource: text(formData, "leadSource"),
      nextStep: text(formData, "nextStep"),
      description: text(formData, "description"),
      primaryContactId: text(formData, "primaryContactId") || null,
    },
  };
}

export function parseContract(formData: FormData): { value: ContractInput } | { state: ActionState } {
  const amount = numberValue(formData, "amount");
  const term = integerValue(formData, "termMonths");
  const notice = integerValue(formData, "renewalNoticeDays");
  const status = text(formData, "status");
  const fieldErrors: Record<string, string> = {};
  if (amount.error) fieldErrors.amount = amount.error;
  if (term.error) fieldErrors.termMonths = term.error;
  if (notice.error) fieldErrors.renewalNoticeDays = notice.error;
  if (!CONTRACT_STATUSES.includes(status as ContractStatus)) fieldErrors.status = "Status inválido.";
  if (Object.keys(fieldErrors).length) return invalid("Revise os campos destacados.", fieldErrors);
  return {
    value: {
      ownerId: text(formData, "ownerId") || undefined,
      name: text(formData, "name"),
      accountId: text(formData, "accountId"),
      opportunityId: text(formData, "opportunityId") || null,
      signerContactId: text(formData, "signerContactId") || null,
      status: status as ContractStatus,
      startDate: text(formData, "startDate") || null,
      endDate: text(formData, "endDate") || null,
      termMonths: term.value,
      amount: amount.value,
      renewalNoticeDays: notice.value ?? 30,
      documentPath: text(formData, "documentPath"),
      description: text(formData, "description"),
    },
  };
}

export function parseActivity(formData: FormData) {
  const type = text(formData, "type");
  if (!ACTIVITY_TYPES.includes(type as (typeof ACTIVITY_TYPES)[number])) {
    return invalid("Tipo de atividade inválido.");
  }
  return {
    value: {
      objectType: text(formData, "objectType") as "lead" | "account" | "contact" | "opportunity" | "contract",
      recordId: text(formData, "recordId"),
      type: type as (typeof ACTIVITY_TYPES)[number],
      subject: text(formData, "subject"),
      body: text(formData, "body"),
      dueAt: text(formData, "dueAt") || null,
    },
  };
}

export function addressValues(prefix: string, address = emptyAddress()): Record<string, string> {
  return {
    [`${prefix}Street`]: address.street,
    [`${prefix}Number`]: address.number,
    [`${prefix}Complement`]: address.complement,
    [`${prefix}District`]: address.district,
    [`${prefix}City`]: address.city,
    [`${prefix}State`]: address.state,
    [`${prefix}PostalCode`]: address.postalCode,
    [`${prefix}Country`]: address.country,
  };
}

export { INDUSTRIES, LEAD_SOURCES };
