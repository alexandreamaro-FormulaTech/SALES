import { formatDate, formatDateTime } from "@/lib/format";
import { ownerName } from "@/lib/queries";
import type { Activity, DB } from "@/lib/types";

export function ActivityCards({ db, items }: { db: DB; items: Activity[] }) {
  if (!items.length) return <p className="text-sm text-muted">Nenhuma atividade.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="card p-4">
          <p className="text-sm font-semibold">{item.type} · {item.subject}</p>
          {item.body ? <p className="text-sm text-muted">{item.body}</p> : null}
          <p className="text-xs text-muted">
            {ownerName(db, item.createdBy)} · {formatDateTime(item.createdAt)}
            {item.dueAt ? ` · prazo ${formatDate(item.dueAt)}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
