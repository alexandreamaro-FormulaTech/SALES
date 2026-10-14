"use client";

import { createActivityAction, deleteRecordAction } from "@/app/actions";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { emptyActionState } from "@/lib/types";
import type { CrmObject } from "@/lib/types";
import { useActionState } from "react";
import { useState } from "react";

export function ActivityForm({ objectType, recordId }: { objectType: CrmObject; recordId: string }) {
  const [state, action, pending] = useActionState(createActivityAction, emptyActionState);
  return (
    <form action={action} className="card space-y-3 p-4">
      <input type="hidden" name="objectType" value={objectType} />
      <input type="hidden" name="recordId" value={recordId} />
      {state.error ? <div role="alert" className="alert">{state.error}</div> : null}
      {state.notice ? <div className="notice" role="status">{state.notice}</div> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <label className="field">
          <span>Tipo</span>
          <select className="select" name="type" defaultValue="Nota">
            {ACTIVITY_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label className="field md:col-span-2">
          <span>Assunto</span>
          <input className="input" name="subject" required />
        </label>
        <label className="field">
          <span>Prazo</span>
          <input className="input" type="date" name="dueAt" />
        </label>
        <label className="field md:col-span-2">
          <span>Notas</span>
          <input className="input" name="body" />
        </label>
      </div>
      <button className="btn btn-primary" disabled={pending} type="submit">{pending ? "Salvando…" : "Registrar atividade"}</button>
    </form>
  );
}

export function DeleteButton({ object, id, label }: { object: CrmObject; id: string; label: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div>
      {error ? <div role="alert" className="alert mb-2">{error}</div> : null}
      <button
        className="btn btn-danger"
        type="button"
        disabled={pending}
        onClick={async () => {
          if (!window.confirm(`Excluir ${label}? O histórico comercial permanece.`)) return;
          setPending(true);
          try {
            const result = await deleteRecordAction({ object, id });
            if (!result.ok) {
              setPending(false);
              setError(result.error);
            }
          } catch {
            // A exclusão bem-sucedida redireciona para a lista.
          }
        }}
      >
        Excluir
      </button>
    </div>
  );
}
