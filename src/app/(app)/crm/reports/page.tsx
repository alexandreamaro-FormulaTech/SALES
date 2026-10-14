import { PageHeader } from "@/components/chrome";
import { requireContext } from "@/lib/context";
import { formatMoney } from "@/lib/format";
import { can } from "@/lib/permissions";

export const metadata = { title: "Relatórios" };

export default async function ReportsPage() {
  const { db, user } = await requireContext();
  const leads = db.leads.filter((item) => !item.deletedAt && can(db, user, "lead.read", item.ownerId));
  const opportunities = db.opportunities.filter((item) => !item.deletedAt && can(db, user, "opportunity.read", item.ownerId));
  const contracts = db.contracts.filter((item) => !item.deletedAt && can(db, user, "contract.read", item.ownerId));
  const converted = leads.filter((lead) => lead.isConverted).length;
  const rate = leads.length ? Math.round((converted / leads.length) * 100) : 0;
  const wonStage = db.opportunityStages.find((stage) => stage.isWon);
  const lostStage = db.opportunityStages.find((stage) => stage.isClosed && !stage.isWon);
  const won = opportunities.filter((item) => item.stageId === wonStage?.id);
  const lost = opportunities.filter((item) => item.stageId === lostStage?.id);
  const wonAmount = won.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const reasons = new Map<string, number>();
  for (const item of lost) reasons.set(item.lossReason || "Sem motivo", (reasons.get(item.lossReason || "Sem motivo") ?? 0) + 1);
  const byStatus = new Map<string, number>();
  for (const contract of contracts) byStatus.set(contract.status, (byStatus.get(contract.status) ?? 0) + 1);

  return (
    <div className="space-y-5">
      <PageHeader title="Relatórios" description="Leitura do que você tem permissão de ver. Os números respeitam o papel e a equipe." />
      <section className="grid gap-3 md:grid-cols-3">
        <article className="card p-4"><p className="text-sm text-muted">Conversão de leads</p><p className="font-display text-3xl font-semibold">{rate}%</p><p className="text-sm text-muted">{converted} de {leads.length}</p></article>
        <article className="card p-4"><p className="text-sm text-muted">Valor ganho</p><p className="font-display text-3xl font-semibold">{formatMoney(wonAmount)}</p><p className="text-sm text-muted">{won.length} oportunidade(s)</p></article>
        <article className="card p-4"><p className="text-sm text-muted">Perdidas</p><p className="font-display text-3xl font-semibold">{lost.length}</p><p className="text-sm text-muted">com motivo registrado</p></article>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Funil por etapa</h2>
          <table className="data">
            <thead><tr><th>Etapa</th><th>Qtd.</th><th>Valor</th><th>Probabilidade</th></tr></thead>
            <tbody>
              {[...db.opportunityStages].sort((a, b) => a.sortOrder - b.sortOrder).map((stage) => {
                const rows = opportunities.filter((item) => item.stageId === stage.id);
                const total = rows.reduce((sum, item) => sum + (item.amount ?? 0), 0);
                return <tr key={stage.id}><td>{stage.name}</td><td>{rows.length}</td><td>{formatMoney(total)}</td><td>{stage.defaultProbability}%</td></tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Motivos de perda</h2>
          {reasons.size ? [...reasons.entries()].map(([reason, count]) => (
            <p key={reason} className="flex justify-between border-t border-line py-2 text-sm"><span>{reason}</span><strong>{count}</strong></p>
          )) : <p className="text-sm text-muted">Nenhuma perda visível.</p>}
          <h2 className="mt-6 mb-3 font-semibold">Contratos por status</h2>
          {[...byStatus.entries()].map(([status, count]) => (
            <p key={status} className="flex justify-between border-t border-line py-2 text-sm"><span>{status}</span><strong>{count}</strong></p>
          ))}
        </div>
      </section>
    </div>
  );
}
