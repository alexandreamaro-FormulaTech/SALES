import { PageHeader } from "@/components/chrome";
import { requireContext } from "@/lib/context";
import { renewalSoon } from "@/lib/domain";
import { formatDate, formatMoney } from "@/lib/format";
import { can } from "@/lib/permissions";
import { accountName } from "@/lib/queries";
import Link from "next/link";

export const metadata = { title: "Painel" };

export default async function DashboardPage() {
  const { db, user } = await requireContext();
  const leads = db.leads.filter((item) => !item.deletedAt && can(db, user, "lead.read", item.ownerId));
  const opportunities = db.opportunities.filter((item) => !item.deletedAt && can(db, user, "opportunity.read", item.ownerId));
  const contracts = db.contracts.filter((item) => !item.deletedAt && can(db, user, "contract.read", item.ownerId));
  const closedLead = new Set(db.leadStatuses.filter((status) => status.isClosed).map((status) => status.id));
  const openLeads = leads.filter((lead) => !closedLead.has(lead.statusId));
  const openStages = db.opportunityStages.filter((stage) => !stage.isClosed);
  const openIds = new Set(openStages.map((stage) => stage.id));
  const openOpps = opportunities.filter((item) => openIds.has(item.stageId));
  const weighted = openOpps.reduce((sum, item) => sum + ((item.amount ?? 0) * item.probability) / 100, 0);
  const activeContracts = contracts.filter((item) => item.status === "Ativo");
  const renewals = contracts.filter((item) => renewalSoon(item));
  const today = new Date().toISOString().slice(0, 10);
  const overdue = openOpps.filter((item) => item.closeDate < today);
  const maxStage = Math.max(1, ...openStages.map((stage) => opportunities.filter((item) => item.stageId === stage.id).reduce((sum, item) => sum + (item.amount ?? 0), 0)));

  return (
    <div className="space-y-5">
      <PageHeader title="Painel" description={`${db.organization.name} · o que pede ação agora.`} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Leads abertos" value={String(openLeads.length)} hint={`${leads.length} no total visível`} />
        <Metric label="Oportunidades abertas" value={String(openOpps.length)} hint={formatMoney(weighted) + " ponderados"} />
        <Metric label="Contratos ativos" value={String(activeContracts.length)} hint={`${renewals.length} em janela de renovação`} />
        <Metric label="Prazos vencidos" value={String(overdue.length)} hint="Oportunidades abertas" />
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="card p-5">
          <h2 className="mb-4 text-lg font-semibold">Funil</h2>
          <div className="space-y-3">
            {openStages.sort((a, b) => a.sortOrder - b.sortOrder).map((stage) => {
              const rows = opportunities.filter((item) => item.stageId === stage.id);
              const total = rows.reduce((sum, item) => sum + (item.amount ?? 0), 0);
              return (
                <div key={stage.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">{stage.name}</span>
                    <span className="text-muted">{rows.length} · {formatMoney(total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#e7edf3]">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(total ? 6 : 0, (total / maxStage) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">Renovações</h2>
          {renewals.length ? renewals.map((contract) => (
            <Link key={contract.id} href={`/crm/contracts/${contract.id}`} className="block border-t border-line py-2 no-underline">
              <span className="font-semibold text-primary">{contract.contractNumber}</span>
              <span className="block text-sm text-muted">{accountName(db, contract.accountId)} · até {formatDate(contract.endDate)}</span>
            </Link>
          )) : <p className="text-sm text-muted">Nenhum contrato ativo na janela de aviso.</p>}
          <h2 className="mt-6 mb-3 text-lg font-semibold">Fechamento atrasado</h2>
          {overdue.length ? overdue.map((item) => (
            <Link key={item.id} href={`/crm/opportunities/${item.id}`} className="block border-t border-line py-2 no-underline">
              <span className="font-semibold text-primary">{item.name}</span>
              <span className="block text-sm text-muted">{formatDate(item.closeDate)} · {formatMoney(item.amount)}</span>
            </Link>
          )) : <p className="text-sm text-muted">Nenhuma oportunidade aberta fora do prazo.</p>}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="card p-4">
      <p className="text-xs font-bold tracking-wide text-muted uppercase">{label}</p>
      <p className="font-display text-3xl font-semibold">{value}</p>
      <p className="text-sm text-muted">{hint}</p>
    </article>
  );
}
