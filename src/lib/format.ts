import type { Address } from "./types";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function fullName(first: string, last: string): string {
  return [first, last].filter(Boolean).join(" ").trim();
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatMoney(value: number | null | undefined, currency = "BRL"): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatTaxId(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return value?.trim() ? value : "—";
}

export function formatAddress(address: Address | null | undefined): string {
  if (!address) return "—";
  const line = [
    [address.street, address.number].filter(Boolean).join(", "),
    address.complement,
    [address.district, address.city, address.state].filter(Boolean).join(" · "),
    [address.postalCode, address.country].filter(Boolean).join(" · "),
  ].filter(Boolean);
  return line.join(" — ") || "—";
}

export function displayValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function domainOf(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const host = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname.replace(/^www\./, "");
    return host.toLowerCase() || null;
  } catch {
    return null;
  }
}

export function emailDomain(email: string | null | undefined): string | null {
  const part = email?.trim().toLowerCase().split("@")[1];
  return part || null;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function withSearch(
  base: string,
  current: Record<string, string | undefined>,
  patch: Record<string, string | null | undefined>,
): string {
  const params = new URLSearchParams();
  const merged: Record<string, string | undefined> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    merged[key] = value ?? undefined;
  }
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export type BadgeTone = "neutral" | "info" | "warning" | "success" | "danger" | "copper";

export function toneForLabel(label: string): BadgeTone {
  const map: Record<string, BadgeTone> = {
    Novo: "neutral",
    "Em contato": "info",
    Qualificação: "warning",
    Qualificado: "copper",
    Convertido: "success",
    "Não qualificado": "neutral",
    Descartado: "danger",
    Prospecção: "neutral",
    Descoberta: "info",
    Proposta: "warning",
    Negociação: "copper",
    "Fechada ganha": "success",
    "Fechada perdida": "danger",
    Prospect: "info",
    Cliente: "success",
    Parceiro: "copper",
    Rascunho: "neutral",
    "Em aprovação": "warning",
    Enviado: "info",
    Assinado: "copper",
    Ativo: "success",
    Expirado: "warning",
    Cancelado: "danger",
    Quente: "danger",
    Morno: "warning",
    Frio: "info",
    "Novo negócio": "info",
    Expansão: "copper",
    Renovação: "success",
  };
  return map[label] ?? "neutral";
}
