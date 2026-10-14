import { HistoryList } from "@/components/history";
import { PageHeader } from "@/components/chrome";
import { requireContext } from "@/lib/context";
import { OBJECT_LABEL } from "@/lib/constants";
import { hasPermission } from "@/lib/permissions";
import { notFound } from "next/navigation";

export const metadata = { title: "Auditoria" };

export default async function AuditPage() {
  const { db, user } = await requireContext();
  if (!hasPermission(db, user, "audit.read")) notFound();
  const logs = db.auditLogs
    .filter((log) => log.organizationId === user.organizationId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 80);
  return (
    <div className="space-y-4">
      <PageHeader title="Auditoria" description="Trilha append-only: autor, horário, entidade e o que mudou." />
      <ul className="space-y-2 text-sm text-muted">
        {logs.slice(0, 1).length ? null : <li>Nenhum evento.</li>}
      </ul>
      <HistoryList db={db} logs={logs.map((log) => ({ ...log, action: `${OBJECT_LABEL[log.objectType] ?? log.objectType}: ${log.action}` }))} />
    </div>
  );
}
