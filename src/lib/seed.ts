import { IDS, SCHEMA_VERSION, nid } from "./ids";
import type {
  Account,
  Activity,
  AuditLog,
  Contact,
  Contract,
  DB,
  Lead,
  Opportunity,
  Permission,
  PermissionKey,
  Profile,
} from "./types";
import { PERMISSION_KEYS, emptyAddress } from "./types";

const PERMISSION_META: { key: PermissionKey; label: string; group: string }[] = [
  ["lead.create", "Criar leads", "Leads"],
  ["lead.read", "Ver leads", "Leads"],
  ["lead.update", "Editar leads", "Leads"],
  ["lead.delete", "Excluir leads", "Leads"],
  ["lead.export", "Exportar leads", "Leads"],
  ["lead.transfer_owner", "Alterar proprietário do lead", "Leads"],
  ["lead.convert", "Converter leads", "Leads"],
  ["account.create", "Criar contas", "Contas"],
  ["account.read", "Ver contas", "Contas"],
  ["account.update", "Editar contas", "Contas"],
  ["account.delete", "Excluir contas", "Contas"],
  ["account.export", "Exportar contas", "Contas"],
  ["account.transfer_owner", "Alterar proprietário da conta", "Contas"],
  ["contact.create", "Criar contatos", "Contatos"],
  ["contact.read", "Ver contatos", "Contatos"],
  ["contact.update", "Editar contatos", "Contatos"],
  ["contact.delete", "Excluir contatos", "Contatos"],
  ["contact.export", "Exportar contatos", "Contatos"],
  ["contact.transfer_owner", "Alterar proprietário do contato", "Contatos"],
  ["opportunity.create", "Criar oportunidades", "Oportunidades"],
  ["opportunity.read", "Ver oportunidades", "Oportunidades"],
  ["opportunity.update", "Editar oportunidades", "Oportunidades"],
  ["opportunity.delete", "Excluir oportunidades", "Oportunidades"],
  ["opportunity.export", "Exportar oportunidades", "Oportunidades"],
  ["opportunity.transfer_owner", "Alterar proprietário da oportunidade", "Oportunidades"],
  ["opportunity.close", "Fechar oportunidades", "Oportunidades"],
  ["contract.create", "Criar contratos", "Contratos"],
  ["contract.read", "Ver contratos", "Contratos"],
  ["contract.update", "Editar contratos", "Contratos"],
  ["contract.delete", "Excluir contratos", "Contratos"],
  ["contract.export", "Exportar contratos", "Contratos"],
  ["contract.transfer_owner", "Alterar proprietário do contrato", "Contratos"],
  ["contract.activate", "Ativar contratos", "Contratos"],
  ["user.read", "Ver usuários", "Administração"],
  ["user.manage", "Gerenciar usuários", "Administração"],
  ["settings.manage", "Gerenciar configurações", "Administração"],
  ["audit.read", "Consultar auditoria global", "Administração"],
].map(([key, label, group]) => ({ key: key as PermissionKey, label: label as string, group: group as string }));

function daysAgo(days: number, hour = 9): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
}

function dayOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function address(city: string, state: string, street: string): ReturnType<typeof emptyAddress> {
  return { ...emptyAddress(), street, number: "100", district: "Centro", city, state, postalCode: "01000-000", country: "Brasil" };
}

export function createBaseDb(): DB {
  const permissions: Permission[] = PERMISSION_META.map((item, index) => ({
    id: `88888888-8888-4888-8888-${String(index + 1).padStart(12, "0")}`,
    ...item,
  }));
  const byKey = new Map(permissions.map((permission) => [permission.key, permission.id]));
  const grant = (roleId: string, keys: PermissionKey[]) => keys.map((key) => ({ roleId, permissionId: byKey.get(key)! }));
  const commercial: PermissionKey[] = PERMISSION_KEYS.filter((key) => !["user.manage", "settings.manage"].includes(key));
  const seller: PermissionKey[] = PERMISSION_KEYS.filter(
    (key) => !key.endsWith("transfer_owner") && !["user.read", "user.manage", "settings.manage", "audit.read", "contract.activate"].includes(key),
  );
  const reader: PermissionKey[] = PERMISSION_KEYS.filter((key) => key.endsWith(".read") || key === "audit.read");

  const stamp = daysAgo(40);
  const profile = (id: string, fullName: string, email: string, roleId: string, managerId: string | null): Profile => ({
    id,
    organizationId: IDS.org,
    fullName,
    email,
    roleId,
    managerId,
    isActive: true,
    locale: "pt-BR",
    timezone: "America/Sao_Paulo",
    lastSeenAt: daysAgo(0, 8),
    createdAt: stamp,
    updatedAt: stamp,
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    organization: {
      id: IDS.org,
      name: "Grupo Horizonte",
      locale: "pt-BR",
      timezone: "America/Sao_Paulo",
      currencyCode: "BRL",
    },
    profiles: [
      profile(IDS.admin, "Helena Duarte", "helena.duarte@formula360.local", IDS.roleAdmin, null),
      profile(IDS.gestor, "Carlos Menezes", "carlos.menezes@formula360.local", IDS.roleGestor, IDS.admin),
      profile(IDS.vendedor, "Bianca Alves", "bianca.alves@formula360.local", IDS.roleVendedor, IDS.gestor),
      profile(IDS.vendedor2, "Diego Farias", "diego.farias@formula360.local", IDS.roleVendedor, IDS.gestor),
      profile(IDS.auditor, "Rita Colombo", "rita.colombo@formula360.local", IDS.roleAuditor, IDS.admin),
    ],
    roles: [
      { id: IDS.roleAdmin, organizationId: IDS.org, name: "Administrador", description: "Gerencia usuários, papéis, catálogos e todos os registros.", readScope: "all", writeScope: "all" },
      { id: IDS.roleGestor, organizationId: IDS.org, name: "Gestor comercial", description: "CRUD da equipe, relatórios e atribuição.", readScope: "team", writeScope: "team" },
      { id: IDS.roleVendedor, organizationId: IDS.org, name: "Vendedor", description: "CRUD dos próprios registros e leitura compartilhada.", readScope: "all", writeScope: "own" },
      { id: IDS.roleAuditor, organizationId: IDS.org, name: "Leitura / Auditor", description: "Somente leitura e consulta ao histórico.", readScope: "all", writeScope: "own" },
    ],
    permissions,
    rolePermissions: [
      ...grant(IDS.roleAdmin, [...PERMISSION_KEYS]),
      ...grant(IDS.roleGestor, commercial),
      ...grant(IDS.roleVendedor, seller),
      ...grant(IDS.roleAuditor, reader),
    ],
    leadStatuses: [
      { id: IDS.stNovo, organizationId: IDS.org, name: "Novo", sortOrder: 1, isClosed: false, isConverted: false, allowsConversion: false, requiresReason: false, guidanceText: "Capturado. Atribua proprietário e origem." },
      { id: IDS.stContato, organizationId: IDS.org, name: "Em contato", sortOrder: 2, isClosed: false, isConverted: false, allowsConversion: false, requiresReason: false, guidanceText: "Registre a tentativa de contato e a próxima ação." },
      { id: IDS.stQualificacao, organizationId: IDS.org, name: "Qualificação", sortOrder: 3, isClosed: false, isConverted: false, allowsConversion: false, requiresReason: false, guidanceText: "Valide necessidade, fit e dados mínimos." },
      { id: IDS.stQualificado, organizationId: IDS.org, name: "Qualificado", sortOrder: 4, isClosed: false, isConverted: false, allowsConversion: true, requiresReason: false, guidanceText: "Empresa, sobrenome e um contato identificável habilitam a conversão." },
      { id: IDS.stConvertido, organizationId: IDS.org, name: "Convertido", sortOrder: 5, isClosed: true, isConverted: true, allowsConversion: false, requiresReason: false, guidanceText: "Estado final definido pela conversão. O lead permanece consultável." },
      { id: IDS.stNaoQualificado, organizationId: IDS.org, name: "Não qualificado", sortOrder: 6, isClosed: true, isConverted: false, allowsConversion: false, requiresReason: true, guidanceText: "Encerre com motivo. Evite excluir o histórico." },
      { id: IDS.stDescartado, organizationId: IDS.org, name: "Descartado", sortOrder: 7, isClosed: true, isConverted: false, allowsConversion: false, requiresReason: true, guidanceText: "Encerre com motivo quando não houver continuidade." },
    ],
    opportunityStages: [
      { id: IDS.sgProspeccao, organizationId: IDS.org, name: "Prospecção", sortOrder: 1, isClosed: false, isWon: false, defaultProbability: 10, guidanceText: "Identifique o decisor e o contexto." },
      { id: IDS.sgDescoberta, organizationId: IDS.org, name: "Descoberta", sortOrder: 2, isClosed: false, isWon: false, defaultProbability: 25, guidanceText: "Necessidade e orçamento compreendidos." },
      { id: IDS.sgProposta, organizationId: IDS.org, name: "Proposta", sortOrder: 3, isClosed: false, isWon: false, defaultProbability: 50, guidanceText: "Proposta apresentada ao cliente." },
      { id: IDS.sgNegociacao, organizationId: IDS.org, name: "Negociação", sortOrder: 4, isClosed: false, isWon: false, defaultProbability: 75, guidanceText: "Condições comerciais em negociação." },
      { id: IDS.sgGanha, organizationId: IDS.org, name: "Fechada ganha", sortOrder: 5, isClosed: true, isWon: true, defaultProbability: 100, guidanceText: "Valor final e data definidos. Elegível a contrato." },
      { id: IDS.sgPerdida, organizationId: IDS.org, name: "Fechada perdida", sortOrder: 6, isClosed: true, isWon: false, defaultProbability: 0, guidanceText: "Motivo da perda obrigatório." },
    ],
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

export function createSeed(): DB {
  const db = createBaseDb();
  const meta = (ownerId: string, days: number) => ({
    organizationId: IDS.org,
    ownerId,
    createdAt: daysAgo(days),
    updatedAt: daysAgo(Math.max(days - 1, 0)),
    createdBy: ownerId,
    updatedBy: ownerId,
    deletedAt: null,
  });

  const accounts: Account[] = [
    {
      id: nid(1), ...meta(IDS.vendedor, 28),
      name: "Aurora Saúde", legalName: "Aurora Saúde Ltda.", taxId: "12345678000190", type: "Cliente",
      industry: "Saúde", website: "https://aurorasaude.example", phone: "(11) 3120-4400",
      annualRevenue: 48000000, employeeCount: 320, parentAccountId: null,
      billingAddress: address("São Paulo", "SP", "Av. Paulista"), shippingAddress: address("São Paulo", "SP", "Av. Paulista"),
      sourceLeadId: nid(101), description: "Rede de clínicas. Contrato de expansão em descoberta.",
    },
    {
      id: nid(2), ...meta(IDS.gestor, 45),
      name: "Vale Norte Logística", legalName: "Vale Norte Logística S.A.", taxId: "98765432000110", type: "Cliente",
      industry: "Logística", website: "https://valenorte.example", phone: "(21) 2222-1900",
      annualRevenue: 120000000, employeeCount: 860, parentAccountId: null,
      billingAddress: address("Rio de Janeiro", "RJ", "Av. Rio Branco"), shippingAddress: address("Duque de Caxias", "RJ", "Rod. Washington Luís"),
      sourceLeadId: null, description: "Operação nacional. Renovação em negociação e um negócio já ganho.",
    },
    {
      id: nid(3), ...meta(IDS.vendedor2, 12),
      name: "Horizonte Alimentos", legalName: "Horizonte Alimentos S.A.", taxId: "11222333000181", type: "Prospect",
      industry: "Indústria", website: "https://horizontealimentos.example", phone: "(31) 3333-2200",
      annualRevenue: 76000000, employeeCount: 540, parentAccountId: null,
      billingAddress: address("Belo Horizonte", "MG", "Av. Afonso Pena"), shippingAddress: address("Contagem", "MG", "Distrito Industrial"),
      sourceLeadId: null, description: "Proposta enviada para o ciclo de safra.",
    },
    {
      id: nid(4), ...meta(IDS.vendedor, 20),
      name: "Navegantes Indústria", legalName: "Navegantes Indústria Ltda.", taxId: "55666777000142", type: "Cliente",
      industry: "Indústria", website: "https://navegantes.example", phone: "(47) 3344-1000",
      annualRevenue: 23000000, employeeCount: 140, parentAccountId: null,
      billingAddress: address("Joinville", "SC", "Rua Dona Francisca"), shippingAddress: address("Joinville", "SC", "Rua Dona Francisca"),
      sourceLeadId: null, description: "Contrato assinado, aguardando ativação operacional.",
    },
    {
      id: nid(5), ...meta(IDS.gestor, 60),
      name: "Estação Solar", legalName: "Estação Solar Energia Ltda.", taxId: "22333444000155", type: "Parceiro",
      industry: "Energia", website: "https://estacaosolar.example", phone: "(62) 3555-0101",
      annualRevenue: 15000000, employeeCount: 70, parentAccountId: null,
      billingAddress: address("Goiânia", "GO", "Av. Goiás"), shippingAddress: address("Goiânia", "GO", "Av. Goiás"),
      sourceLeadId: null, description: "Parceria encerrada neste ciclo. Oportunidade perdida por preço.",
    },
  ];

  const contacts: Contact[] = [
    { id: nid(11), ...meta(IDS.vendedor, 28), accountId: nid(1), firstName: "Camila", lastName: "Rocha", email: "camila.rocha@aurorasaude.example", phone: "(11) 98888-1200", mobile: "(11) 98888-1200", title: "Diretora de operações", department: "Operações", reportsToContactId: null, isPrimary: true, mailingAddress: address("São Paulo", "SP", "Av. Paulista"), leadSource: "Outbound", emailOptOut: false, doNotCall: false, sourceLeadId: nid(101), description: "Decisora do contrato de clínicas." },
    { id: nid(12), ...meta(IDS.vendedor, 18), accountId: nid(1), firstName: "Igor", lastName: "Pacheco", email: "igor.pacheco@aurorasaude.example", phone: "(11) 97777-3311", mobile: "", title: "Compras", department: "Suprimentos", reportsToContactId: nid(11), isPrimary: false, mailingAddress: address("São Paulo", "SP", "Av. Paulista"), leadSource: "Indicação", emailOptOut: false, doNotCall: false, sourceLeadId: null, description: "" },
    { id: nid(13), ...meta(IDS.gestor, 40), accountId: nid(2), firstName: "Renata", lastName: "Guimarães", email: "renata.guimaraes@valenorte.example", phone: "(21) 99999-4040", mobile: "(21) 99999-4040", title: "Gerente comercial", department: "Comercial", reportsToContactId: null, isPrimary: true, mailingAddress: address("Rio de Janeiro", "RJ", "Av. Rio Branco"), leadSource: "Evento", emailOptOut: false, doNotCall: false, sourceLeadId: null, description: "Conduz a renovação." },
    { id: nid(14), ...meta(IDS.vendedor2, 10), accountId: nid(3), firstName: "Otávio", lastName: "Lima", email: "otavio.lima@horizontealimentos.example", phone: "(31) 98888-2211", mobile: "", title: "Head de suprimentos", department: "Suprimentos", reportsToContactId: null, isPrimary: true, mailingAddress: address("Belo Horizonte", "MG", "Av. Afonso Pena"), leadSource: "Site", emailOptOut: false, doNotCall: false, sourceLeadId: null, description: "" },
    { id: nid(15), ...meta(IDS.vendedor, 16), accountId: nid(4), firstName: "Helena", lastName: "Vasconcelos", email: "helena.vasconcelos@navegantes.example", phone: "(47) 99991-2020", mobile: "(47) 99991-2020", title: "CFO", department: "Financeiro", reportsToContactId: null, isPrimary: true, mailingAddress: address("Joinville", "SC", "Rua Dona Francisca"), leadSource: "Indicação", emailOptOut: false, doNotCall: true, sourceLeadId: null, description: "Prefere contato por email." },
    { id: nid(16), ...meta(IDS.gestor, 50), accountId: nid(5), firstName: "Caio", lastName: "Borges", email: "caio.borges@estacaosolar.example", phone: "(62) 98800-1111", mobile: "", title: "Sócio", department: "Diretoria", reportsToContactId: null, isPrimary: true, mailingAddress: address("Goiânia", "GO", "Av. Goiás"), leadSource: "Parceiro", emailOptOut: true, doNotCall: false, sourceLeadId: null, description: "" },
  ];

  const leads: Lead[] = [
    { id: nid(102), ...meta(IDS.vendedor, 2), firstName: "Marina", lastName: "Costa", company: "Atlas Química", title: "Compradora", email: "marina.costa@atlasquimica.example", phone: "(11) 4000-1001", mobile: "(11) 98111-1001", website: "https://atlasquimica.example", statusId: IDS.stNovo, leadSource: "Site", rating: "Quente", industry: "Indústria", annualRevenue: 18000000, employeeCount: 90, address: address("Campinas", "SP", "Rua das Indústrias"), description: "Pediu retorno sobre abastecimento recorrente.", qualificationNotes: "", disqualificationReason: "", isConverted: false, convertedAt: null, convertedAccountId: null, convertedContactId: null, convertedOpportunityId: null },
    { id: nid(103), ...meta(IDS.vendedor, 6), firstName: "Paulo", lastName: "Ribeiro", company: "Serra & Filhos", title: "Diretor", email: "paulo.ribeiro@serraefilhos.example", phone: "(19) 3232-0909", mobile: "", website: "https://serraefilhos.example", statusId: IDS.stContato, leadSource: "Indicação", rating: "Morno", industry: "Agronegócio", annualRevenue: 9000000, employeeCount: 40, address: address("Ribeirão Preto", "SP", "Av. Independência"), description: "Indicado pela Navegantes.", qualificationNotes: "Ligação feita em 10 min. Pediu material.", disqualificationReason: "", isConverted: false, convertedAt: null, convertedAccountId: null, convertedContactId: null, convertedOpportunityId: null },
    { id: nid(104), ...meta(IDS.vendedor2, 9), firstName: "Lúcia", lastName: "Andrade", company: "Brisa Varejo", title: "Gerente de lojas", email: "lucia.andrade@brisavarejo.example", phone: "", mobile: "(41) 99900-2020", website: "https://brisavarejo.example", statusId: IDS.stQualificacao, leadSource: "Evento", rating: "Frio", industry: "Varejo", annualRevenue: 25000000, employeeCount: 210, address: address("Curitiba", "PR", "Rua XV de Novembro"), description: "Conheceu a operação na feira.", qualificationNotes: "Fit ainda incerto. Orçamento no próximo trimestre.", disqualificationReason: "", isConverted: false, convertedAt: null, convertedAccountId: null, convertedContactId: null, convertedOpportunityId: null },
    { id: nid(105), ...meta(IDS.gestor, 4), firstName: "Ricardo", lastName: "Melo", company: "Pilar Energia", title: "Head comercial", email: "ricardo.melo@pilarenergia.example", phone: "(61) 3333-8080", mobile: "(61) 99100-8080", website: "https://pilarenergia.example", statusId: IDS.stQualificado, leadSource: "Outbound", rating: "Quente", industry: "Energia", annualRevenue: 54000000, employeeCount: 180, address: address("Brasília", "DF", "SCS Quadra 1"), description: "Projeto de eficiência para três plantas.", qualificationNotes: "Decisor confirmado. Orçamento aprovado em comitê.", disqualificationReason: "", isConverted: false, convertedAt: null, convertedAccountId: null, convertedContactId: null, convertedOpportunityId: null },
    { id: nid(106), ...meta(IDS.vendedor2, 3), firstName: "Sofia", lastName: "Martins", company: "Leme Indústria", title: "Coordenadora", email: "sofia.martins@leme.example", phone: "(71) 3200-4545", mobile: "", website: "https://leme.example", statusId: IDS.stQualificado, leadSource: "LinkedIn", rating: "Morno", industry: "Indústria", annualRevenue: 12000000, employeeCount: 75, address: address("Salvador", "BA", "Av. Tancredo Neves"), description: "", qualificationNotes: "Dados mínimos completos. Aguardando conversão.", disqualificationReason: "", isConverted: false, convertedAt: null, convertedAccountId: null, convertedContactId: null, convertedOpportunityId: null },
    { id: nid(107), ...meta(IDS.vendedor, 15), firstName: "Helena", lastName: "Dias", company: "Campo Verde", title: "Analista", email: "helena.dias@campoverde.example", phone: "", mobile: "", website: "", statusId: IDS.stNaoQualificado, leadSource: "Site", rating: "Frio", industry: "Agronegócio", annualRevenue: null, employeeCount: 12, address: address("Londrina", "PR", "Rua Piauí"), description: "", qualificationNotes: "Sem aderência ao perfil B2B atendido.", disqualificationReason: "Sem fit", isConverted: false, convertedAt: null, convertedAccountId: null, convertedContactId: null, convertedOpportunityId: null },
    { id: nid(108), ...meta(IDS.vendedor2, 21), firstName: "Tiago", lastName: "Nunes", company: "Oficina Digital", title: "Fundador", email: "tiago.nunes@oficinadigital.example", phone: "(48) 99999-0001", mobile: "(48) 99999-0001", website: "https://oficinadigital.example", statusId: IDS.stDescartado, leadSource: "Outbound", rating: "Frio", industry: "Tecnologia", annualRevenue: 2000000, employeeCount: 8, address: address("Florianópolis", "SC", "Rua Bocaiúva"), description: "", qualificationNotes: "", disqualificationReason: "Sem resposta", isConverted: false, convertedAt: null, convertedAccountId: null, convertedContactId: null, convertedOpportunityId: null },
    { id: nid(101), ...meta(IDS.vendedor, 30), firstName: "Camila", lastName: "Rocha", company: "Aurora Saúde", title: "Diretora de operações", email: "camila.rocha@aurorasaude.example", phone: "(11) 98888-1200", mobile: "(11) 98888-1200", website: "https://aurorasaude.example", statusId: IDS.stConvertido, leadSource: "Outbound", rating: "Quente", industry: "Saúde", annualRevenue: 48000000, employeeCount: 320, address: address("São Paulo", "SP", "Av. Paulista"), description: "Origem da conta Aurora Saúde.", qualificationNotes: "Convertido com conta, contato e oportunidade.", disqualificationReason: "", isConverted: true, convertedAt: daysAgo(28, 11), convertedAccountId: nid(1), convertedContactId: nid(11), convertedOpportunityId: nid(21) },
  ];

  const opportunities: Opportunity[] = [
    { id: nid(21), ...meta(IDS.vendedor, 27), name: "Aurora — expansão de clínicas", accountId: nid(1), stageId: IDS.sgDescoberta, amount: 280000, currencyCode: "BRL", probability: 25, closeDate: dayOffset(20), actualCloseDate: null, type: "Expansão", leadSource: "Outbound", nextStep: "Mapear as três unidades novas", description: "Necessidade confirmada. Orçamento em validação.", lossReason: "", primaryContactId: nid(11), sourceLeadId: nid(101) },
    { id: nid(22), ...meta(IDS.gestor, 14), name: "Vale Norte — renovação 2026", accountId: nid(2), stageId: IDS.sgNegociacao, amount: 640000, currencyCode: "BRL", probability: 75, closeDate: dayOffset(12), actualCloseDate: null, type: "Renovação", leadSource: "Evento", nextStep: "Revisar cláusula de reajuste", description: "Condições em negociação com o jurídico.", lossReason: "", primaryContactId: nid(13), sourceLeadId: null },
    { id: nid(23), ...meta(IDS.vendedor2, 8), name: "Horizonte Alimentos — safra", accountId: nid(3), stageId: IDS.sgProposta, amount: 410000, currencyCode: "BRL", probability: 50, closeDate: dayOffset(35), actualCloseDate: null, type: "Novo negócio", leadSource: "Site", nextStep: "Apresentar proposta revisada", description: "Proposta enviada na semana passada.", lossReason: "", primaryContactId: nid(14), sourceLeadId: null },
    { id: nid(24), ...meta(IDS.vendedor, 18), name: "Navegantes — abastecimento", accountId: nid(4), stageId: IDS.sgProspeccao, amount: 95000, currencyCode: "BRL", probability: 10, closeDate: dayOffset(-3), actualCloseDate: null, type: "Novo negócio", leadSource: "Indicação", nextStep: "Confirmar decisor financeiro", description: "Fechamento previsto já passou.", lossReason: "", primaryContactId: nid(15), sourceLeadId: null },
    { id: nid(25), ...meta(IDS.gestor, 33), name: "Estação Solar — parceria", accountId: nid(5), stageId: IDS.sgPerdida, amount: 150000, currencyCode: "BRL", probability: 0, closeDate: dayOffset(-20), actualCloseDate: dayOffset(-18), type: "Novo negócio", leadSource: "Parceiro", nextStep: "", description: "Preço fora da faixa aceita.", lossReason: "Preço", primaryContactId: nid(16), sourceLeadId: null },
    { id: nid(26), ...meta(IDS.gestor, 40), name: "Vale Norte — torre de controle", accountId: nid(2), stageId: IDS.sgGanha, amount: 890000, currencyCode: "BRL", probability: 100, closeDate: dayOffset(-15), actualCloseDate: dayOffset(-15), type: "Novo negócio", leadSource: "Evento", nextStep: "", description: "Negócio ganho. Contrato em vigência.", lossReason: "", primaryContactId: nid(13), sourceLeadId: null },
  ];

  const contracts: Contract[] = [
    { id: nid(31), ...meta(IDS.gestor, 15), contractNumber: "CTR-2026-0001", accountId: nid(2), opportunityId: nid(26), signerContactId: nid(13), name: "Torre de controle Vale Norte", status: "Ativo", startDate: dayOffset(-15), endDate: dayOffset(18), termMonths: 12, amount: 890000, currencyCode: "BRL", signedAt: daysAgo(16), activatedAt: daysAgo(15), renewalNoticeDays: 30, documentPath: "contratos/grupo-horizonte/ctr-2026-0001.pdf", description: "Vigência curta para demonstrar o aviso de renovação." },
    { id: nid(32), ...meta(IDS.vendedor, 7), contractNumber: "CTR-2026-0002", accountId: nid(4), opportunityId: null, signerContactId: nid(15), name: "Abastecimento Navegantes", status: "Assinado", startDate: dayOffset(5), endDate: dayOffset(370), termMonths: 12, amount: 210000, currencyCode: "BRL", signedAt: daysAgo(2), activatedAt: null, renewalNoticeDays: 45, documentPath: "", description: "Assinado, ainda não ativado." },
    { id: nid(33), ...meta(IDS.vendedor2, 1), contractNumber: "CTR-2026-0003", accountId: nid(3), opportunityId: nid(23), signerContactId: nid(14), name: "Minuta Horizonte Alimentos", status: "Rascunho", startDate: null, endDate: null, termMonths: 12, amount: 410000, currencyCode: "BRL", signedAt: null, activatedAt: null, renewalNoticeDays: 30, documentPath: "", description: "Minuta interna, sem envio." },
  ];

  const activities: Activity[] = [
    { id: nid(41), organizationId: IDS.org, objectType: "lead", recordId: nid(103), type: "Chamada", subject: "Primeiro contato com Paulo Ribeiro", body: "Pediu o material de capacidade logística.", dueAt: dayOffset(1), createdAt: daysAgo(5), createdBy: IDS.vendedor },
    { id: nid(42), organizationId: IDS.org, objectType: "opportunity", recordId: nid(22), type: "Reunião", subject: "Revisão de reajuste com a Vale Norte", body: "Jurídico devolve a minuta até sexta.", dueAt: dayOffset(4), createdAt: daysAgo(1), createdBy: IDS.gestor },
    { id: nid(43), organizationId: IDS.org, objectType: "account", recordId: nid(1), type: "Nota", subject: "Visita à unidade Paulista", body: "Operação preparada para mais duas clínicas.", dueAt: null, createdAt: daysAgo(3), createdBy: IDS.vendedor },
    { id: nid(44), organizationId: IDS.org, objectType: "contract", recordId: nid(31), type: "Tarefa", subject: "Avisar renovação da torre de controle", body: "Contrato entra na janela de aviso.", dueAt: dayOffset(2), createdAt: daysAgo(1, 14), createdBy: IDS.gestor },
  ];

  const auditLogs: AuditLog[] = [
    { id: nid(51), organizationId: IDS.org, actorId: IDS.vendedor, action: "convert", objectType: "lead", recordId: nid(101), changes: [{ field: "conversao", before: null, after: "Aurora Saúde" }], createdAt: daysAgo(28, 11) },
    { id: nid(52), organizationId: IDS.org, actorId: IDS.gestor, action: "stage_change", objectType: "opportunity", recordId: nid(26), changes: [{ field: "stageId", before: "Negociação", after: "Fechada ganha" }], createdAt: daysAgo(15) },
    { id: nid(53), organizationId: IDS.org, actorId: IDS.vendedor, action: "status_change", objectType: "lead", recordId: nid(107), changes: [{ field: "disqualificationReason", before: null, after: "Sem fit" }], createdAt: daysAgo(14) },
  ];

  db.accounts = accounts;
  db.contacts = contacts;
  db.leads = leads;
  db.opportunities = opportunities;
  db.opportunityContacts = [
    { id: nid(61), organizationId: IDS.org, opportunityId: nid(21), contactId: nid(11), role: "Decisor", isPrimary: true },
    { id: nid(62), organizationId: IDS.org, opportunityId: nid(22), contactId: nid(13), role: "Decisor", isPrimary: true },
    { id: nid(63), organizationId: IDS.org, opportunityId: nid(23), contactId: nid(14), role: "Decisor", isPrimary: true },
    { id: nid(64), organizationId: IDS.org, opportunityId: nid(26), contactId: nid(13), role: "Assinante", isPrimary: true },
  ];
  db.contracts = contracts;
  db.activities = activities;
  db.auditLogs = auditLogs;
  return db;
}
