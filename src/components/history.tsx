import { FIELD_LABELS } from "@/lib/constants";
import { displayValue, formatDateTime } from "@/lib/format";
import { accountName, ownerName, stageName, statusName } from "@/lib/queries";
import type { AuditLog, DB } from "@/lib/types";

function pretty(db: DB, field: string, value: unknown): string {
  if (typeof value === "string") {
    if (field === "statusId") return statusName(db, value);
    if (field === "stageId") return stageName(db, value);
    if (field === "ownerId" || field.endsWith("By")) return ownerName(db, value);
    if (field === "accountId" || field === "parentAccountId") return accountName(db, value);
    if (field === "primaryContactId" || field === "signerContactId" || field === "reportsToContactId") {
      const contact = db.contacts.find((item) => item.id === value);
      return contact ? `${contact.firstName} ${contact.lastName}` : value;
    }
  }
  return displayValue(value);
}

const ACTION_LABEL: Record<string, string> = {
  create: "Criou",
  update: "Alterou",
  delete: "Excluiu",
  convert: "Converteu",
  status_change: "Mudou o status",
  stage_change: "Mudou a etapa",
  transfer_owner: "Alterou o proprietário",
};

export function HistoryList({ db, logs }: { db: DB; logs: AuditLog[] }) {
  if (!logs.length) return <p className="text-sm text-muted">Nenhuma alteração registrada.</p>;
  return (
    <ol className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="card p-4">
          <p className="text-sm">
            <strong>{ownerName(db, log.actorId)}</strong> {ACTION_LABEL[log.action] ?? log.action}
            <span className="text-muted"> · {formatDateTime(log.createdAt)}</span>
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {log.changes.map((change, index) => (
              <li key={`${log.id}-${index}`}>
                {FIELD_LABELS[change.field] ?? change.field}: {pretty(db, change.field, change.before)} → {pretty(db, change.field, change.after)}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
