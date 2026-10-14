import { ObjectList } from "@/components/object-list";
import type { TableColumn } from "@/components/data-table";
import { requireContext } from "@/lib/context";
import { toneForLabel, withSearch } from "@/lib/format";
import { can } from "@/lib/permissions";
import { queryAccounts, savedViewsFor, visibleOwners } from "@/lib/queries";

function paramsOf(input: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

export const metadata = { title: "Contas" };

export default async function AccountsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, user } = await requireContext();
  const params = paramsOf(await searchParams);
  const views = savedViewsFor(db, user, "account");
  const selected = views.find((view) => view.id === params.view);
  const query = selected ? { ...selected.filters, view: params.view } : params;
  const result = queryAccounts(db, user, query);
  const owners = visibleOwners(db, user).map((profile) => ({ id: profile.id, name: profile.fullName }));
  const columns: TableColumn[] = [
    ["name", "Nome"],
    ["type", "Tipo"],
    ["industry", "Setor"],
    ["phone", "Telefone"],
    ["owner", "Proprietário"],
  ].map(([key, label]) => ({
    key,
    label,
    href: withSearch("/crm/accounts", query, { sort: key, dir: query.sort === key && query.dir === "asc" ? "desc" : "asc", page: null }),
  }));
  return (
    <ObjectList
      title="Contas"
      description="Empresas prospect, clientes e parceiros."
      basePath="/crm/accounts"
      object="account"
      params={query}
      columns={columns}
      rows={result.rows.map((row) => ({
        id: row.id,
        cells: {
          name: { text: row.name, href: `/crm/accounts/${row.id}` },
          type: { text: row.type, tone: toneForLabel(row.type) },
          industry: { text: row.industry },
          phone: { text: row.phone },
          owner: { text: row.owner },
        },
      }))}
      total={result.total}
      page={result.page}
      pages={result.pages}
      statusLabel="Tipo"
      statusOptions={["Prospect", "Cliente", "Parceiro"].map((type) => ({ value: type, label: type }))}
      owners={owners}
      views={views.map((view) => ({ id: view.id, name: view.name, mine: view.userId === user.id }))}
      canCreate={can(db, user, "account.create")}
      canDelete={can(db, user, "account.delete")}
      canTransfer={can(db, user, "account.transfer_owner")}
      canExport={can(db, user, "account.export")}
      createHref="/crm/accounts/new"
    />
  );
}
