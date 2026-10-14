import { getDb } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { queryAccounts, queryContacts, queryContracts, queryLeads, queryOpportunities } from "@/lib/queries";
import { getSessionUserId } from "@/lib/session";
import type { CrmObject } from "@/lib/types";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const objects = new Set<CrmObject>(["lead", "account", "contact", "opportunity", "contract"]);

export async function GET(request: NextRequest, context: { params: Promise<{ object: string }> }) {
  const { object } = await context.params;
  if (!objects.has(object as CrmObject)) return new NextResponse("Objeto inválido", { status: 404 });
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Não autenticado", { status: 401 });
  const db = await getDb();
  const user = db.profiles.find((profile) => profile.id === userId && profile.isActive);
  if (!user) return new NextResponse("Não autenticado", { status: 401 });
  const key = object as CrmObject;
  if (!hasPermission(db, user, `${key}.export`)) return new NextResponse("Sem permissão para exportar", { status: 403 });

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const query = { ...params, page: "all" };
  const table = key === "lead"
    ? sheet(queryLeads(db, user, query).rows, [
        ["name", "Nome"], ["company", "Empresa"], ["status", "Status"], ["source", "Origem"], ["owner", "Proprietário"],
      ])
    : key === "account"
      ? sheet(queryAccounts(db, user, query).rows, [
          ["name", "Nome"], ["type", "Tipo"], ["industry", "Setor"], ["phone", "Telefone"], ["owner", "Proprietário"],
        ])
      : key === "contact"
        ? sheet(queryContacts(db, user, query).rows, [
            ["name", "Nome"], ["account", "Conta"], ["title", "Cargo"], ["email", "Email"], ["phone", "Telefone"],
          ])
        : key === "opportunity"
          ? sheet(queryOpportunities(db, user, query).rows.map((row) => ({
              ...row,
              amountLabel: formatMoney(row.amount),
              closeLabel: formatDate(row.closeDate),
            })), [
              ["name", "Nome"], ["account", "Conta"], ["stage", "Etapa"], ["amountLabel", "Valor"], ["closeLabel", "Fechamento"], ["owner", "Proprietário"],
            ])
          : sheet(queryContracts(db, user, query).rows.map((row) => ({
              ...row,
              amountLabel: formatMoney(row.amount),
              startLabel: formatDate(row.startDate),
              endLabel: formatDate(row.endDate),
            })), [
              ["number", "Número"], ["account", "Conta"], ["status", "Status"], ["amountLabel", "Valor"], ["startLabel", "Início"], ["endLabel", "Fim"],
            ]);

  return new NextResponse(table, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${key}s.csv"`,
    },
  });
}

function sheet(rows: Record<string, unknown>[], columns: [string, string][]) {
  const header = columns.map(([, label]) => csv(label)).join(";");
  const body = rows.map((row) => columns.map(([key]) => csv(row[key])).join(";")).join("\n");
  return `\uFEFF${header}\n${body}`;
}

function csv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
