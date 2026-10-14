"use client";

import { bulkRecordsAction } from "@/app/actions";
import { cn, type BadgeTone } from "@/lib/format";
import type { CrmObject } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type TableColumn = { key: string; label: string; href?: string; align?: "right" };
export type TableCell = { text: string; href?: string; tone?: BadgeTone; strong?: boolean };
export type TableRow = { id: string; cells: Record<string, TableCell> };

export function DataTable({
  columns,
  rows,
  object,
  canDelete,
  canTransfer,
  owners,
  empty,
}: {
  columns: TableColumn[];
  rows: TableRow[];
  object: CrmObject;
  canDelete: boolean;
  canTransfer: boolean;
  owners: { id: string; name: string }[];
  empty: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const all = rows.length > 0 && rows.every((row) => selected.includes(row.id));

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function run(type: "delete" | "transfer") {
    if (!selected.length) return;
    if (type === "delete" && !window.confirm("Excluir os registros selecionados? O histórico comercial é mantido.")) return;
    setPending(true);
    setError("");
    const result = await bulkRecordsAction({ object, ids: selected, type, ownerId });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSelected([]);
    router.refresh();
  }

  if (!rows.length) {
    return <div className="px-6 py-12 text-center text-muted">{empty}</div>;
  }

  return (
    <div className="overflow-hidden">
      {error ? <div role="alert" className="alert m-3">{error}</div> : null}
      {selected.length ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-3">
          <span className="text-sm font-semibold">{selected.length} selecionado(s)</span>
          {canTransfer ? (
            <>
              <select className="select max-w-xs" aria-label="Novo proprietário" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
                {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
              </select>
              <button className="btn" type="button" disabled={pending} onClick={() => run("transfer")}>Alterar proprietário</button>
            </>
          ) : null}
          {canDelete ? <button className="btn btn-danger" type="button" disabled={pending} onClick={() => run("delete")}>Excluir</button> : null}
        </div>
      ) : null}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  aria-label="Selecionar página"
                  checked={all}
                  onChange={() => setSelected(all ? [] : rows.map((row) => row.id))}
                />
              </th>
              {columns.map((column) => (
                <th key={column.key} className={column.align === "right" ? "text-right" : undefined}>
                  {column.href ? <a href={column.href}>{column.label}</a> : column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <input type="checkbox" aria-label={`Selecionar ${row.cells[columns[0]?.key]?.text ?? "registro"}`} checked={selected.includes(row.id)} onChange={() => toggle(row.id)} />
                </td>
                {columns.map((column) => {
                  const cell = row.cells[column.key];
                  return (
                    <td key={column.key} className={cn(column.align === "right" && "text-right")}>
                      {cell?.tone ? <span className={`badge badge-${cell.tone}`}>{cell.text}</span> : null}
                      {!cell?.tone && cell?.href ? <a className="row-link" href={cell.href}>{cell.text}</a> : null}
                      {!cell?.tone && !cell?.href ? <span className={cell?.strong ? "font-semibold" : undefined}>{cell?.text || "—"}</span> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
