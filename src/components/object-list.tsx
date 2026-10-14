import { deleteViewAction, saveViewAction } from "@/app/actions";
import { DataTable, type TableColumn, type TableRow } from "@/components/data-table";
import { withSearch } from "@/lib/format";
import type { CrmObject } from "@/lib/types";
import Link from "next/link";
import type { ReactNode } from "react";

type Params = Record<string, string | undefined>;

export function ObjectList({
  title,
  description,
  basePath,
  object,
  params,
  columns,
  rows,
  total,
  page,
  pages,
  statusOptions,
  statusLabel,
  owners,
  views,
  canCreate,
  canDelete,
  canTransfer,
  canExport,
  createHref,
  layout,
  board,
}: {
  title: string;
  description: string;
  basePath: string;
  object: CrmObject;
  params: Params;
  columns: TableColumn[];
  rows: TableRow[];
  total: number;
  page: number;
  pages: number;
  statusOptions: { value: string; label: string }[];
  statusLabel: string;
  owners: { id: string; name: string }[];
  views: { id: string; name: string; mine: boolean }[];
  canCreate: boolean;
  canDelete: boolean;
  canTransfer: boolean;
  canExport: boolean;
  createHref: string;
  layout?: ReactNode;
  board?: ReactNode;
}) {
  const scopes = [
    ["all", "Todos autorizados"],
    ["mine", "Meus"],
    ["recent", "Recentes"],
  ] as const;
  const scope = params.scope || "all";
  const scopeLabel = scopes.find(([value]) => value === scope)?.[1] ?? "Todos";
  const currentView = views.find((view) => view.id === params.view);
  const listTitle = currentView?.name ?? (scope === "all" ? `Todos os ${title.toLowerCase()}` : scopeLabel);
  const filters = {
    q: params.q ?? "",
    status: params.status ?? "",
    owner: params.owner ?? "",
    scope,
    sort: params.sort ?? "",
    dir: params.dir ?? "",
  };
  const exportQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) exportQuery.set(key, value);
  }

  return (
    <div>
      <div className="list-header">
        <details className="view-picker">
          <summary>
            <p className="object-name">{title}</p>
            <h1 className="list-title">{listTitle}</h1>
            <p className="list-meta">{total} itens · {description}</p>
          </summary>
          <div className="view-menu">
            {scopes.map(([value, label]) => (
              <Link key={value} className={scope === value && !params.view ? "current" : undefined} href={withSearch(basePath, params, { scope: value, view: null, page: null })}>
                {value === "all" ? `Todos os ${title.toLowerCase()}` : label}
              </Link>
            ))}
            {views.map((view) => (
              <span key={view.id} className="flex items-center">
                <Link className={params.view === view.id ? "current" : undefined} href={`${basePath}?view=${view.id}`}>{view.name}</Link>
                {view.mine ? (
                  <form action={deleteViewAction}>
                    <input type="hidden" name="id" value={view.id} />
                    <input type="hidden" name="objectType" value={object} />
                    <button type="submit" aria-label={`Excluir visão ${view.name}`}>×</button>
                  </form>
                ) : null}
              </span>
            ))}
          </div>
        </details>
        <div className="list-actions">
          {layout}
          {canExport ? <a className="btn" href={`/api/export/${object}?${exportQuery.toString()}`}>Exportar</a> : null}
          {canCreate ? <Link className="btn btn-primary" href={createHref}>Criar</Link> : null}
        </div>
      </div>
      <form method="get" className="list-toolbar">
        <label className="field min-w-52 flex-1">
          <span className="sr-only">Pesquisar nesta lista</span>
          <input className="input" name="q" defaultValue={params.q ?? ""} placeholder="Pesquisar nesta lista..." />
        </label>
        <label className="field">
          <span>{statusLabel}</span>
          <select className="select" name="status" defaultValue={params.status ?? ""}>
            <option value="">Todos</option>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Proprietário</span>
          <select className="select" name="owner" defaultValue={params.owner ?? ""}>
            <option value="">Todos</option>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </select>
        </label>
        <input type="hidden" name="scope" value={scope} />
        <button className="btn" type="submit">Filtrar</button>
        <details>
          <summary className="btn">Salvar visão</summary>
          <form action={saveViewAction} className="mt-2 flex flex-wrap items-end gap-2">
            <input type="hidden" name="objectType" value={object} />
            <input type="hidden" name="filters" value={JSON.stringify(filters)} />
            <label className="field">
              <span>Nome</span>
              <input className="input" name="name" required placeholder="Nome da visão" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="shared" /> Compartilhar com a equipe
            </label>
            <button className="btn" type="submit">Salvar</button>
          </form>
        </details>
      </form>
      <div className={board ? undefined : "list-panel"}>
        {board ?? (
          <DataTable
            columns={columns}
            rows={rows}
            object={object}
            canDelete={canDelete}
            canTransfer={canTransfer}
            owners={owners}
            empty="Nenhum registro nesta visão."
          />
        )}
        {board ? null : (
          <div className="list-footer">
            <span>{total} itens</span>
            <div className="flex gap-2">
              {page > 1 ? <Link className="btn" href={withSearch(basePath, params, { page: String(page - 1) })}>Anterior</Link> : null}
              <span className="px-2 py-2">Página {page} de {pages}</span>
              {page < pages ? <Link className="btn" href={withSearch(basePath, params, { page: String(page + 1) })}>Próxima</Link> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
