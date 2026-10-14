"use client";

import { createAccountAction, createContactAction, createContractAction, createLeadAction, createOpportunityAction, updateAccountAction, updateContactAction, updateContractAction, updateLeadAction, updateOpportunityAction } from "@/app/actions";
import { cn } from "@/lib/format";
import type { FormField } from "@/lib/field-defs";
import { emptyActionState, type ActionState } from "@/lib/types";
import Link from "next/link";
import { useActionState, useState } from "react";

export type { FormField };

const ACTIONS = {
  "lead.create": createLeadAction,
  "lead.update": updateLeadAction,
  "account.create": createAccountAction,
  "account.update": updateAccountAction,
  "contact.create": createContactAction,
  "contact.update": updateContactAction,
  "opportunity.create": createOpportunityAction,
  "opportunity.update": updateOpportunityAction,
  "contract.create": createContractAction,
  "contract.update": updateContractAction,
};

export function RecordForm({
  actionKey,
  recordId,
  fields,
  values,
  cancelHref,
  submitLabel,
  layout = "page",
  onCancel,
}: {
  actionKey: keyof typeof ACTIONS;
  recordId?: string;
  fields: FormField[];
  values: Record<string, string>;
  cancelHref: string;
  submitLabel: string;
  layout?: "page" | "modal";
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState(ACTIONS[actionKey], emptyActionState);
  const [data, setData] = useState<Record<string, string>>(values);
  const sections = [...new Set(fields.map((field) => field.section))];

  function update(name: string, value: string) {
    setData((current) => {
      const next = { ...current, [name]: value };
      if (name === "accountId") {
        for (const field of fields) {
          if (field.dependsOn === "accountId") next[field.name] = "";
        }
      }
      return next;
    });
  }

  const modal = layout === "modal";
  const fieldsOf = (section: string) => fields.filter((field) => field.section === section);

  return (
    <form action={formAction} className={modal ? undefined : "space-y-5"}>
      {recordId ? <input type="hidden" name="id" value={recordId} /> : null}
      <div className={modal ? "edit-modal-body" : "space-y-5"}>
        {state.error ? <div role="alert" className="alert mb-3">{state.error}</div> : null}
        {sections.map((section, index) => (
          <section key={section} className={modal ? undefined : "card p-5"}>
            {modal ? (
              <div className="edit-section-head">
                <h3>{section}</h3>
                {index === 0 ? <span className="req-note"><abbr className="req">*</abbr>= Informações obrigatórias</span> : null}
              </div>
            ) : <h2 className="mb-4 text-lg font-semibold">{section}</h2>}
            <div className={modal ? "modal-fields" : "grid gap-4 md:grid-cols-2"}>
              {fieldsOf(section).map((field) => {
                const error = state.fieldErrors[field.name];
                const options = (field.options ?? []).filter((option) => !field.dependsOn || !option.accountId || option.accountId === data[field.dependsOn]);
                return (
                  <label key={field.name} className={cn("field", field.span === 2 && "md:col-span-2")}>
                    <span>{field.required ? <abbr className="req" title="obrigatório">*</abbr> : null}{field.label}</span>
                    {field.type === "textarea" ? (
                      <textarea className="textarea" name={field.name} value={data[field.name] ?? ""} onChange={(event) => update(field.name, event.target.value)} />
                    ) : null}
                    {field.type === "select" ? (
                      <select className="select" name={field.name} required={field.required} value={data[field.name] ?? ""} onChange={(event) => update(field.name, event.target.value)}>
                        <option value="">{field.dependsOn && !data[field.dependsOn] ? "Selecione a conta" : "-- Nenhum --"}</option>
                        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    ) : null}
                    {field.type === "checkbox" ? (
                      <input
                        type="checkbox"
                        name={field.name}
                        checked={data[field.name] === "on"}
                        onChange={(event) => update(field.name, event.target.checked ? "on" : "")}
                      />
                    ) : null}
                    {field.type !== "textarea" && field.type !== "select" && field.type !== "checkbox" ? (
                      <input
                        className="input"
                        type={field.type}
                        name={field.name}
                        required={field.required}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={data[field.name] ?? ""}
                        onChange={(event) => update(field.name, event.target.value)}
                      />
                    ) : null}
                    {error ? <em className="field-error">{error}</em> : null}
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className={modal ? "edit-modal-foot" : "flex flex-wrap gap-3"}>
        {onCancel ? <button className="btn" type="button" onClick={onCancel}>Cancelar</button> : <Link className="btn" href={cancelHref}>Cancelar</Link>}
        {modal ? <button className="btn" type="submit" name="saveMode" value="new" disabled={pending}>Salvar e criar</button> : null}
        <button className="btn btn-primary" type="submit" name="saveMode" value="stay" disabled={pending}>{pending ? "Salvando…" : submitLabel}</button>
      </div>
    </form>
  );
}

export function FormNotice({ state }: { state?: ActionState }) {
  if (!state?.notice) return null;
  return <div className="notice" role="status">{state.notice}</div>;
}
