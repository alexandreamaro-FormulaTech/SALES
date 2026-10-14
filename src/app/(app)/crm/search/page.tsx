import { PageHeader } from "@/components/chrome";
import { requireContext } from "@/lib/context";
import { formatMoney } from "@/lib/format";
import { globalSearch } from "@/lib/queries";
import Link from "next/link";

export const metadata = { title: "Busca" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { db, user } = await requireContext();
  const query = q.trim();
  const result = query ? globalSearch(db, user, query) : null;
  const groups = result ? [
    ["Leads", result.leads.map((row) => ({ href: `/crm/leads/${row.id}`, title: row.name, meta: row.company }))],
    ["Contas", result.accounts.map((row) => ({ href: `/crm/accounts/${row.id}`, title: row.name, meta: row.type }))],
    ["Contatos", result.contacts.map((row) => ({ href: `/crm/contacts/${row.id}`, title: row.name, meta: row.account }))],
    ["Oportunidades", result.opportunities.map((row) => ({ href: `/crm/opportunities/${row.id}`, title: row.name, meta: formatMoney(row.amount) }))],
    ["Contratos", result.contracts.map((row) => ({ href: `/crm/contracts/${row.id}`, title: row.number, meta: row.account }))],
  ] as const : [];
  return (
    <div>
      <PageHeader title="Busca" description={query ? `Resultados para “${query}”.` : "Digite um nome, empresa, email ou número de contrato."} />
      {query && groups.every(([, rows]) => rows.length === 0) ? <p className="text-muted">Nada encontrado no seu alcance.</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map(([title, rows]) => rows.length ? (
          <section key={title} className="card p-4">
            <h2 className="mb-2 font-semibold">{title}</h2>
            {rows.map((row) => (
              <Link key={row.href} href={row.href} className="block border-t border-line py-2 no-underline">
                <span className="font-semibold text-primary">{row.title}</span>
                <span className="block text-sm text-muted">{row.meta}</span>
              </Link>
            ))}
          </section>
        ) : null)}
      </div>
    </div>
  );
}
