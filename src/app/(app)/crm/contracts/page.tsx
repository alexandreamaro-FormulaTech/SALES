import { ObjectList } from "@/components/object-list";
import type { TableColumn } from "@/components/data-table";
import { requireContext } from "@/lib/context";
import { CONTRACT_STATUSES } from "@/lib/constants";
import { formatDate, formatMoney, toneForLabel, withSearch } from "@/lib/format";
import { can } from "@/lib/permissions";
import { queryContracts, savedViewsFor, visibleOwners } from "@/lib/queries";

function paramsOf(input: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

export const metadata = { title: "Contratos" };

export default async function ContractsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, user } = await requireContext();
  const params = paramsOf(await searchParams);
  const views = savedViewsFor(db, user, "contract");
  const selected = views.find((view) => view.id === params.view);
  const query = selected ? { ...selected.filters, view: params.view } : params;
  const result = queryContracts(db, user, query);
  const owners = visibleOwners(db, user).map((profile) => ({ id: profile.id, name: profile.fullName }));
  const columns: TableColumn[] = [
    ["number", "Número"],
    ["account", "Conta"],
    ["status", "Status"],
    ["amount", "Valor"],
    ["startDate", "Início"],
    ["endDate", "Fim"],
  ].map(([key, label]) => ({
    key,
    label,
    align: key === "amount" ? "right" as const : undefined,
    href: withSearch("/crm/contracts", query, { sort: key, dir: query.sort === key && query.dir === "asc" ? "desc" : "asc", page: null }),
  }));
  return (
    <ObjectList
      title="Contratos"
      description="Vigência, assinatura e documento em armazenamento privado."
      basePath="/crm/contracts"
      object="contract"
      params={query}
      columns={columns}
      rows={result.rows.map((row) => ({
        id: row.id,
        cells: {
          number: { text: row.number, href: `/crm/contracts/${row.id}` },
          account: { text: row.account },
          status: { text: row.status, tone: toneForLabel(row.status) },
          amount: { text: formatMoney(row.amount) },
          startDate: { text: formatDate(row.startDate) },
          endDate: { text: formatDate(row.endDate) },
        },
      }))}
      total={result.total}
      page={result.page}
      pages={result.pages}
      statusLabel="Status"
      statusOptions={CONTRACT_STATUSES.map((status) => ({ value: status, label: status }))}
      owners={owners}
      views={views.map((view) => ({ id: view.id, name: view.name, mine: view.userId === user.id }))}
      canCreate={can(db, user, "contract.create")}
      canDelete={can(db, user, "contract.delete")}
      canTransfer={can(db, user, "contract.transfer_owner")}
      canExport={can(db, user, "contract.export")}
      createHref="/crm/contracts/new"
    />
  );
}
