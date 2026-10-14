import type { AccountType, ActivityType, ContractStatus, OpportunityType, Rating } from "./types";

export const LEAD_SOURCES = ["Site", "Indicação", "Evento", "Outbound", "Parceiro", "LinkedIn"] as const;

export const INDUSTRIES = [
  "Indústria",
  "Tecnologia",
  "Saúde",
  "Varejo",
  "Logística",
  "Energia",
  "Agronegócio",
  "Serviços",
] as const;

export const RATINGS: Rating[] = ["Quente", "Morno", "Frio"];

export const ACCOUNT_TYPES: AccountType[] = ["Prospect", "Cliente", "Parceiro"];

export const OPPORTUNITY_TYPES: OpportunityType[] = ["Novo negócio", "Expansão", "Renovação"];

export const CONTRACT_STATUSES: ContractStatus[] = [
  "Rascunho",
  "Em aprovação",
  "Enviado",
  "Assinado",
  "Ativo",
  "Expirado",
  "Cancelado",
];

export const ACTIVITY_TYPES: ActivityType[] = ["Tarefa", "Chamada", "Reunião", "Nota"];

export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const DEMO_PASSWORD = "horizonte";

export const OBJECT_LABEL: Record<string, string> = {
  lead: "Lead",
  account: "Conta",
  contact: "Contato",
  opportunity: "Oportunidade",
  contract: "Contrato",
};

export const OBJECT_LABEL_PLURAL: Record<string, string> = {
  lead: "Leads",
  account: "Contas",
  contact: "Contatos",
  opportunity: "Oportunidades",
  contract: "Contratos",
};

export const FIELD_LABELS: Record<string, string> = {
  firstName: "Nome",
  lastName: "Sobrenome",
  company: "Empresa",
  title: "Cargo",
  email: "Email",
  phone: "Telefone",
  mobile: "Celular",
  website: "Site",
  statusId: "Status",
  stageId: "Etapa",
  leadSource: "Origem",
  rating: "Classificação",
  industry: "Setor",
  annualRevenue: "Receita anual",
  employeeCount: "Funcionários",
  description: "Observações",
  qualificationNotes: "Notas de qualificação",
  disqualificationReason: "Motivo",
  ownerId: "Proprietário",
  name: "Nome",
  legalName: "Razão social",
  taxId: "CNPJ/CPF",
  type: "Tipo",
  parentAccountId: "Conta pai",
  accountId: "Conta",
  department: "Departamento",
  isPrimary: "Contato principal",
  emailOptOut: "Não receber emails",
  doNotCall: "Não ligar",
  amount: "Valor",
  probability: "Probabilidade",
  closeDate: "Fechamento previsto",
  actualCloseDate: "Fechamento efetivo",
  nextStep: "Próxima ação",
  lossReason: "Motivo da perda",
  primaryContactId: "Contato principal",
  contractNumber: "Número",
  opportunityId: "Oportunidade",
  signerContactId: "Assinante",
  status: "Status",
  startDate: "Início",
  endDate: "Fim",
  termMonths: "Prazo (meses)",
  documentPath: "Documento",
  renewalNoticeDays: "Aviso de renovação (dias)",
  roleId: "Papel",
  managerId: "Gestor",
  isActive: "Ativo",
  fullName: "Nome",
  registro: "Registro",
  conversao: "Conversão",
};
