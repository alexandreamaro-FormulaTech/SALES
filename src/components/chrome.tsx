import { cn, toneForLabel } from "@/lib/format";
import type { ReactNode } from "react";

function iconColor(eyebrow?: string) {
  const colors: Record<string, string> = {
    Lead: "#1b96ff",
    Conta: "#5867e8",
    Contato: "#9050e9",
    Oportunidade: "#ff5d2d",
    Contrato: "#06a59a",
  };
  return eyebrow ? colors[eyebrow] ?? "#0176d3" : "#0176d3";
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  highlights,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
  highlights?: { label: string; value: ReactNode }[];
}) {
  if (eyebrow || highlights) {
    return (
      <header className="record-header">
        <div className="record-header-top">
          <div className="record-ident">
            <span className="record-icon" aria-hidden style={{ background: iconColor(eyebrow) }}>{(eyebrow ?? title).slice(0, 1)}</span>
            <div>
              {eyebrow ? <p className="record-kicker">{eyebrow}</p> : null}
              <h1>{title}</h1>
            </div>
          </div>
          {actions ? <div className="record-actions">{actions}</div> : null}
        </div>
        {highlights?.length ? (
          <dl className="highlights">
            {highlights.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value || "—"}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </header>
    );
  }
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="record-actions">{actions}</div> : null}
    </div>
  );
}

export function DetailGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="detail-grid">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Tabs({ current, tabs }: { current: string; tabs: { id: string; label: string; href: string }[] }) {
  return (
    <div className="record-tabs">
      {tabs.map((tab) => (
        <a key={tab.id} href={tab.href} className={cn(current === tab.id && "active")}>
          {tab.label}
        </a>
      ))}
    </div>
  );
}

export function RelatedList({ title, rows }: { title: string; rows: { href: string; title: string; meta: string }[] }) {
  return (
    <section className="card related-card">
      <h2>{title} ({rows.length})</h2>
      {rows.length ? rows.map((row) => (
        <a key={row.href + row.title} href={row.href}>
          <span>{row.title}</span>
          <span className="meta">{row.meta}</span>
        </a>
      )) : <p className="px-3 py-3 text-sm text-muted">Nenhum registro relacionado.</p>}
    </section>
  );
}

export function Badge({ children }: { children: string }) {
  return <span className={`badge badge-${toneForLabel(children)}`}>{children}</span>;
}
