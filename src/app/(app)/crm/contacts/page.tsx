import { ObjectList } from "@/components/object-list";
import type { TableColumn } from "@/components/data-table";
import { requireContext } from "@/lib/context";
import { withSearch } from "@/lib/format";
import { can } from "@/lib/permissions";
import { queryContacts, savedViewsFor, visibleOwners } from "@/lib/queries";

function paramsOf(input: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

export const metadata = { title: "Contatos" };

export default async function ContactsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, user } = await requireContext();
  const params = paramsOf(await searchParams);
  const views = savedViewsFor(db, user, "contact");
  const selected = views.find((view) => view.id === params.view);
  const query = selected ? { ...selected.filters, view: params.view } : params;
  const result = queryContacts(db, user, query);
  const owners = visibleOwners(db, user).map((profile) => ({ id: profile.id, name: profile.fullName }));
  const columns: TableColumn[] = [
    ["name", "Nome"],
    ["account", "Conta"],
    ["title", "Cargo"],
    ["email", "Email"],
    ["phone", "Telefone"],
  ].map(([key, label]) => ({
    key,
    label,
    href: withSearch("/crm/contacts", query, { sort: key, dir: query.sort === key && query.dir === "asc" ? "desc" : "asc", page: null }),
  }));
  return (
    <ObjectList
      title="Contatos"
      description="Pessoas ligadas a uma conta. O contato principal fica marcado na ficha."
      basePath="/crm/contacts"
      object="contact"
      params={query}
      columns={columns}
      rows={result.rows.map((row) => ({
        id: row.id,
        cells: {
          name: { text: row.name, href: `/crm/contacts/${row.id}` },
          account: { text: row.account, href: `/crm/accounts/${row.accountId}` },
          title: { text: row.title },
          email: { text: row.email },
          phone: { text: row.phone },
        },
      }))}
      total={result.total}
      page={result.page}
      pages={result.pages}
      statusLabel="Conta"
      statusOptions={db.accounts.filter((account) => !account.deletedAt && can(db, user, "account.read", account.ownerId)).map((account) => ({ value: account.id, label: account.name }))}
      owners={owners}
      views={views.map((view) => ({ id: view.id, name: view.name, mine: view.userId === user.id }))}
      canCreate={can(db, user, "contact.create")}
      canDelete={can(db, user, "contact.delete")}
      canTransfer={can(db, user, "contact.transfer_owner")}
      canExport={can(db, user, "contact.export")}
      createHref="/crm/contacts/new"
    />
  );
}
