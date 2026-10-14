import { ACCOUNT_TYPES, ACTIVITY_TYPES, BRAZIL_STATES, CONTRACT_STATUSES, INDUSTRIES, LEAD_SOURCES, OPPORTUNITY_TYPES, RATINGS } from "./constants";

export type FormField = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "date" | "textarea" | "select" | "checkbox";
  required?: boolean;
  options?: { value: string; label: string; accountId?: string }[];
  dependsOn?: string;
  section: string;
  span?: 2;
  step?: string;
  min?: string;
  max?: string;
};

type Option = { value: string; label: string; accountId?: string };

function options(values: readonly string[]): Option[] {
  return values.map((value) => ({ value, label: value }));
}

export function addressFields(prefix: string, section: string): FormField[] {
  return [
    { name: `${prefix}Street`, label: "Rua", type: "text", section, span: 2 },
    { name: `${prefix}Number`, label: "Número", type: "text", section },
    { name: `${prefix}Complement`, label: "Complemento", type: "text", section },
    { name: `${prefix}District`, label: "Bairro", type: "text", section },
    { name: `${prefix}City`, label: "Cidade", type: "text", section },
    { name: `${prefix}State`, label: "UF", type: "select", section, options: options(BRAZIL_STATES) },
    { name: `${prefix}PostalCode`, label: "CEP", type: "text", section },
    { name: `${prefix}Country`, label: "País", type: "text", section },
  ];
}

function ownerField(owners: Option[], section = "Responsável"): FormField {
  return { name: "ownerId", label: "Proprietário", type: "select", section, options: owners, required: true };
}

export function leadFields(owners: Option[]): FormField[] {
  return [
    { name: "firstName", label: "Nome", type: "text", section: "Dados" },
    { name: "lastName", label: "Sobrenome", type: "text", section: "Dados", required: true },
    { name: "company", label: "Empresa", type: "text", section: "Dados", required: true },
    { name: "title", label: "Cargo", type: "text", section: "Dados" },
    { name: "email", label: "Email", type: "email", section: "Dados" },
    { name: "phone", label: "Telefone", type: "tel", section: "Dados" },
    { name: "mobile", label: "Celular", type: "tel", section: "Dados" },
    { name: "website", label: "Site", type: "text", section: "Dados" },
    { name: "leadSource", label: "Origem", type: "select", section: "Qualificação", options: options(LEAD_SOURCES) },
    { name: "rating", label: "Classificação", type: "select", section: "Qualificação", options: options(RATINGS) },
    { name: "industry", label: "Setor", type: "select", section: "Qualificação", options: options(INDUSTRIES) },
    { name: "annualRevenue", label: "Receita anual", type: "number", section: "Qualificação", min: "0", step: "0.01" },
    { name: "employeeCount", label: "Funcionários", type: "number", section: "Qualificação", min: "0", step: "1" },
    ownerField(owners, "Qualificação"),
    ...addressFields("address", "Endereço"),
    { name: "description", label: "Observações", type: "textarea", section: "Contexto", span: 2 },
    { name: "qualificationNotes", label: "Notas de qualificação", type: "textarea", section: "Contexto", span: 2 },
  ];
}

export function accountFields(owners: Option[], parents: Option[]): FormField[] {
  return [
    { name: "name", label: "Nome", type: "text", section: "Dados", required: true },
    { name: "legalName", label: "Razão social", type: "text", section: "Dados" },
    { name: "taxId", label: "CNPJ/CPF", type: "text", section: "Dados" },
    { name: "type", label: "Tipo", type: "select", section: "Dados", required: true, options: options(ACCOUNT_TYPES) },
    { name: "industry", label: "Setor", type: "select", section: "Dados", options: options(INDUSTRIES) },
    { name: "website", label: "Site", type: "text", section: "Dados" },
    { name: "phone", label: "Telefone", type: "tel", section: "Dados" },
    { name: "annualRevenue", label: "Receita anual", type: "number", section: "Dados", min: "0", step: "0.01" },
    { name: "employeeCount", label: "Funcionários", type: "number", section: "Dados", min: "0", step: "1" },
    { name: "parentAccountId", label: "Conta pai", type: "select", section: "Dados", options: parents },
    ownerField(owners),
    ...addressFields("billing", "Endereço de cobrança"),
    ...addressFields("shipping", "Endereço de entrega"),
    { name: "description", label: "Observações", type: "textarea", section: "Contexto", span: 2 },
  ];
}

export function contactFields(owners: Option[], accounts: Option[], reports: Option[]): FormField[] {
  return [
    { name: "accountId", label: "Conta", type: "select", section: "Dados", required: true, options: accounts },
    { name: "firstName", label: "Nome", type: "text", section: "Dados" },
    { name: "lastName", label: "Sobrenome", type: "text", section: "Dados", required: true },
    { name: "email", label: "Email", type: "email", section: "Dados" },
    { name: "phone", label: "Telefone", type: "tel", section: "Dados" },
    { name: "mobile", label: "Celular", type: "tel", section: "Dados" },
    { name: "title", label: "Cargo", type: "text", section: "Dados" },
    { name: "department", label: "Departamento", type: "text", section: "Dados" },
    { name: "reportsToContactId", label: "Reporta-se a", type: "select", section: "Dados", options: reports },
    { name: "leadSource", label: "Origem", type: "select", section: "Preferências", options: options(LEAD_SOURCES) },
    { name: "isPrimary", label: "Contato principal da conta", type: "checkbox", section: "Preferências" },
    { name: "emailOptOut", label: "Não receber emails", type: "checkbox", section: "Preferências" },
    { name: "doNotCall", label: "Não ligar", type: "checkbox", section: "Preferências" },
    ownerField(owners, "Preferências"),
    ...addressFields("mailing", "Endereço"),
    { name: "description", label: "Observações", type: "textarea", section: "Contexto", span: 2 },
  ];
}

export function opportunityFields(owners: Option[], accounts: Option[], contacts: Option[]): FormField[] {
  return [
    { name: "name", label: "Nome do negócio", type: "text", section: "Negócio", required: true, span: 2 },
    { name: "accountId", label: "Conta", type: "select", section: "Negócio", required: true, options: accounts },
    { name: "primaryContactId", label: "Contato principal", type: "select", section: "Negócio", options: contacts, dependsOn: "accountId" },
    { name: "amount", label: "Valor (BRL)", type: "number", section: "Negócio", min: "0", step: "0.01" },
    { name: "closeDate", label: "Fechamento previsto", type: "date", section: "Negócio", required: true },
    { name: "probability", label: "Probabilidade (%)", type: "number", section: "Negócio", min: "0", max: "100", step: "0.01" },
    { name: "type", label: "Tipo", type: "select", section: "Negócio", required: true, options: options(OPPORTUNITY_TYPES) },
    { name: "leadSource", label: "Origem", type: "select", section: "Negócio", options: options(LEAD_SOURCES) },
    { name: "nextStep", label: "Próxima ação", type: "text", section: "Contexto", span: 2 },
    ownerField(owners, "Contexto"),
    { name: "description", label: "Necessidade e contexto", type: "textarea", section: "Contexto", span: 2 },
  ];
}

export function contractFields(
  owners: Option[],
  accounts: Option[],
  opportunities: Option[],
  contacts: Option[],
  canActivate: boolean,
  currentStatus?: string,
): FormField[] {
  const statuses = CONTRACT_STATUSES.filter((status) => canActivate || status !== "Ativo" || status === currentStatus).map((status) => ({ value: status, label: status }));
  return [
    { name: "name", label: "Título", type: "text", section: "Contrato", required: true, span: 2 },
    { name: "accountId", label: "Conta", type: "select", section: "Contrato", required: true, options: accounts },
    { name: "opportunityId", label: "Oportunidade", type: "select", section: "Contrato", options: opportunities, dependsOn: "accountId" },
    { name: "signerContactId", label: "Assinante", type: "select", section: "Contrato", options: contacts, dependsOn: "accountId" },
    { name: "status", label: "Status", type: "select", section: "Contrato", required: true, options: statuses },
    { name: "amount", label: "Valor (BRL)", type: "number", section: "Contrato", min: "0", step: "0.01" },
    { name: "startDate", label: "Início", type: "date", section: "Vigência" },
    { name: "endDate", label: "Fim", type: "date", section: "Vigência" },
    { name: "termMonths", label: "Prazo (meses)", type: "number", section: "Vigência", min: "1", step: "1" },
    { name: "renewalNoticeDays", label: "Aviso de renovação (dias)", type: "number", section: "Vigência", min: "0", step: "1" },
    ownerField(owners, "Vigência"),
    { name: "documentPath", label: "Caminho do documento privado", type: "text", section: "Documento", span: 2 },
    { name: "description", label: "Observações", type: "textarea", section: "Documento", span: 2 },
  ];
}

export function formValues(fields: FormField[], extra: Record<string, unknown> = {}): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    values[field.name] = field.name.endsWith("Country") ? "Brasil" : "";
  }
  for (const [key, value] of Object.entries(extra)) {
    if (typeof value === "boolean") values[key] = value ? "on" : "";
    else if (typeof value === "string" || typeof value === "number") values[key] = String(value);
  }
  return values;
}

export { ACTIVITY_TYPES };
