import { ObjectList } from "@/components/object-list";
import type { TableColumn } from "@/components/data-table";
import { KanbanBoard } from "@/components/kanban";
import { requireContext } from "@/lib/context";
import { formatDate, formatMoney, todayISO, toneForLabel, withSearch } from "@/lib/format";
import { can } from "@/lib/permissions";
import { queryOpportunities, savedViewsFor, visibleOwners } from "@/lib/queries";
import Link from "next/link";

function paramsOf(input: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

export const metadata = { title: "Oportunidades" };

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, user } = await requireContext();
  const params = paramsOf(await searchParams);
  const kanban = params.layout === "kanban";
  const views = savedViewsFor(db, user, "opportunity");
  const selected = views.find((view) => view.id === params.view);
  const query = selected ? { ...selected.filters, view: params.view, layout: params.layout } : params;
  const result = queryOpportunities(db, user, kanban ? { ...query, page: "all" } : query);
  const owners = visibleOwners(db, user).map((profile) => ({ id: profile.id, name: profile.fullName }));
  const stages = [...db.opportunityStages].sort((a, b) => a.sortOrder - b.sortOrder);
  const today = todayISO();
  const columns: TableColumn[] = [
    ["name", "Nome"],
    ["account", "Conta"],
    ["stage", "Etapa"],
    ["amount", "Valor"],
    ["closeDate", "Fechamento"],
    ["owner", "Proprietário"],
  ].map(([key, label]) => ({
    key,
    label,
    align: key === "amount" ? "right" as const : undefined,
    href: withSearch("/crm/opportunities", query, { sort: key, dir: query.sort === key && query.dir === "asc" ? "desc" : "asc", page: null }),
  }));
  const boardColumns = stages.map((stage) => {
    const cards = result.rows.filter((row) => row.stageId === stage.id);
    return {
      id: stage.id,
      name: stage.name,
      won: stage.isWon,
      lost: stage.isClosed && !stage.isWon,
      count: cards.length,
      total: cards.reduce((sum, card) => sum + (card.amount ?? 0), 0),
    };
  });
  return (
    <ObjectList
      title="Oportunidades"
      description="Lista ou quadro. A mudança de etapa valida motivo, valor e data no servidor."
      basePath="/crm/opportunities"
      object="opportunity"
      params={query}
      columns={columns}
      rows={result.rows.map((row) => ({
        id: row.id,
        cells: {
          name: { text: row.name, href: `/crm/opportunities/${row.id}` },
          account: { text: row.account },
          stage: { text: row.stage, tone: toneForLabel(row.stage) },
          amount: { text: formatMoney(row.amount) },
          closeDate: { text: formatDate(row.closeDate) },
          owner: { text: row.owner },
        },
      }))}
      total={result.total}
      page={result.page}
      pages={result.pages}
      statusLabel="Etapa"
      statusOptions={stages.map((stage) => ({ value: stage.id, label: stage.name }))}
      owners={owners}
      views={views.map((view) => ({ id: view.id, name: view.name, mine: view.userId === user.id }))}
      canCreate={can(db, user, "opportunity.create")}
      canDelete={can(db, user, "opportunity.delete")}
      canTransfer={can(db, user, "opportunity.transfer_owner")}
      canExport={can(db, user, "opportunity.export")}
      createHref="/crm/opportunities/new"
      layout={
        <>
          <Link className={kanban ? "btn" : "btn btn-primary"} href={withSearch("/crm/opportunities", query, { layout: null, page: null })}>Lista</Link>
          <Link className={kanban ? "btn btn-primary" : "btn"} href={withSearch("/crm/opportunities", query, { layout: "kanban", page: null })}>Kanban</Link>
        </>
      }
      board={kanban ? (
        <KanbanBoard
          columns={boardColumns}
          cards={result.rows.map((row) => {
            const stage = stages.find((item) => item.id === row.stageId);
            return {
              id: row.id,
              name: row.name,
              account: row.account,
              amount: row.amount,
              closeDate: row.closeDate ?? "",
              owner: row.owner,
              stageId: row.stageId,
              overdue: Boolean(row.closeDate && row.closeDate < today && stage && !stage.isClosed),
            };
          })}
        />
      ) : undefined}
    />
  );
}
