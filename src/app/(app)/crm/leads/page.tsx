import { ObjectList } from "@/components/object-list";
import { requireContext } from "@/lib/context";
import { formatDateTime, toneForLabel, withSearch } from "@/lib/format";
import { can } from "@/lib/permissions";
import { queryLeads, savedViewsFor, visibleOwners } from "@/lib/queries";
import type { TableColumn } from "@/components/data-table";

function paramsOf(input: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

export const metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, user } = await requireContext();
  const params = paramsOf(await searchParams);
  const views = savedViewsFor(db, user, "lead");
  const selected = views.find((view) => view.id === params.view);
  const query = selected ? { ...selected.filters, view: params.view } : params;
  const result = queryLeads(db, user, query);
  const owners = visibleOwners(db, user).map((profile) => ({ id: profile.id, name: profile.fullName }));
  const columns: TableColumn[] = [
    ["name", "Nome"],
    ["company", "Empresa"],
    ["status", "Status"],
    ["source", "Origem"],
    ["owner", "Proprietário"],
    ["createdAt", "Criado em"],
  ].map(([key, label]) => ({
    key,
    label,
    href: withSearch("/crm/leads", query, { sort: key, dir: query.sort === key && query.dir === "asc" ? "desc" : "asc", page: null }),
  }));
  return (
    <ObjectList
      title="Leads"
      description="Captação, qualificação e conversão. Um lead convertido permanece consultável."
      basePath="/crm/leads"
      object="lead"
      params={query}
      columns={columns}
      rows={result.rows.map((row) => ({
        id: row.id,
        cells: {
          name: { text: row.name, href: `/crm/leads/${row.id}` },
          company: { text: row.company },
          status: { text: row.status, tone: toneForLabel(row.status) },
          source: { text: row.source },
          owner: { text: row.owner },
          createdAt: { text: formatDateTime(row.createdAt) },
        },
      }))}
      total={result.total}
      page={result.page}
      pages={result.pages}
      statusLabel="Status"
      statusOptions={db.leadStatuses.map((status) => ({ value: status.id, label: status.name }))}
      owners={owners}
      views={views.map((view) => ({ id: view.id, name: view.name, mine: view.userId === user.id }))}
      canCreate={can(db, user, "lead.create")}
      canDelete={can(db, user, "lead.delete")}
      canTransfer={can(db, user, "lead.transfer_owner")}
      canExport={can(db, user, "lead.export")}
      createHref="/crm/leads/new"
    />
  );
}
