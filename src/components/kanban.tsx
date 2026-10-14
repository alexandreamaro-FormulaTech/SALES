"use client";

import { changeOpportunityStageAction } from "@/app/actions";
import { formatDate, formatMoney } from "@/lib/format";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type KanbanCard = {
  id: string;
  name: string;
  account: string;
  amount: number | null;
  closeDate: string;
  owner: string;
  overdue: boolean;
  stageId: string;
};

export type KanbanColumn = { id: string; name: string; total: number; count: number; won?: boolean; lost?: boolean };

export function KanbanBoard({ columns, cards }: { columns: KanbanColumn[]; cards: KanbanCard[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [reasonFor, setReasonFor] = useState<{ id: string; stageId: string } | null>(null);
  const [reason, setReason] = useState("");

  async function move(id: string, stageId: string, lossReason = "") {
    const column = columns.find((item) => item.id === stageId);
    if (column?.lost && !lossReason) {
      setReasonFor({ id, stageId });
      return;
    }
    setPendingId(id);
    setError("");
    const result = await changeOpportunityStageAction({ opportunityId: id, stageId, lossReason });
    setPendingId("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReasonFor(null);
    setReason("");
    router.refresh();
  }

  return (
    <div>
      {error ? <div role="alert" className="alert mb-3">{error}</div> : null}
      {reasonFor ? (
        <form
          className="card mb-3 flex flex-wrap items-end gap-3 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void move(reasonFor.id, reasonFor.stageId, reason);
          }}
        >
          <label className="field min-w-64 flex-1">
            <span>Motivo da perda</span>
            <input className="input" value={reason} onChange={(event) => setReason(event.target.value)} required />
          </label>
          <button className="btn btn-primary" type="submit">Confirmar perda</button>
          <button className="btn" type="button" onClick={() => setReasonFor(null)}>Cancelar</button>
        </form>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((column) => {
          const items = cards.filter((card) => card.stageId === column.id);
          return (
            <section
              key={column.id}
              className="w-72 shrink-0"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const id = event.dataTransfer.getData("text/plain");
                if (id) void move(id, column.id);
              }}
            >
              <header className="mb-2 px-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold">{column.name}</h2>
                  <span className="badge">{items.length}</span>
                </div>
                <p className="text-xs text-muted">{formatMoney(column.total)}</p>
              </header>
              <div className="space-y-2 rounded-xl bg-[#e7edf3] p-2 min-h-40">
                {items.map((card) => (
                  <article key={card.id} className="card p-3" draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", card.id)}>
                    <a className="font-semibold text-primary no-underline" href={`/crm/opportunities/${card.id}`}>{card.name}</a>
                    <p className="text-sm text-muted">{card.account}</p>
                    <p className="mt-2 text-sm font-semibold">{formatMoney(card.amount)}</p>
                    <p className="text-xs text-muted">{formatDate(card.closeDate)} · {card.owner}</p>
                    {card.overdue ? <p className="mt-1 text-xs font-bold text-danger">Prazo vencido</p> : null}
                    <label className="field mt-2">
                      <span className="sr-only">Mover {card.name}</span>
                      <select
                        className="select"
                        aria-label={`Mover ${card.name}`}
                        value={card.stageId}
                        disabled={pendingId === card.id}
                        onChange={(event) => void move(card.id, event.target.value)}
                      >
                        {columns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
