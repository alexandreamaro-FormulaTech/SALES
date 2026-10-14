"use client";

import { savePipelineAction } from "@/app/actions";
import { emptyActionState } from "@/lib/types";
import { useActionState } from "react";

type Status = { id: string; name: string; sortOrder: number; guidanceText: string; closed: boolean };
type Stage = Status & { defaultProbability: number };

export function PipelineForm({ statuses, stages }: { statuses: Status[]; stages: Stage[] }) {
  const [state, action, pending] = useActionState(savePipelineAction, emptyActionState);
  return (
    <form action={action} className="space-y-5">
      {state.error ? <div role="alert" className="alert">{state.error}</div> : null}
      {state.notice ? <div className="notice" role="status">{state.notice}</div> : null}
      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Status do lead</h2>
        <div className="space-y-3">
          {statuses.map((status) => (
            <div key={status.id} className="grid gap-2 border-t border-line pt-3 md:grid-cols-[160px_100px_1fr]">
              <strong>{status.name}</strong>
              <label className="field"><span>Ordem</span><input className="input" type="number" name={`status:${status.id}:sortOrder`} defaultValue={status.sortOrder} /></label>
              <label className="field"><span>Orientação</span><input className="input" name={`status:${status.id}:guidance`} defaultValue={status.guidanceText} /></label>
            </div>
          ))}
        </div>
      </section>
      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Etapas da oportunidade</h2>
        <div className="space-y-3">
          {stages.map((stage) => (
            <div key={stage.id} className="grid gap-2 border-t border-line pt-3 md:grid-cols-[160px_100px_120px_1fr]">
              <strong>{stage.name}</strong>
              <label className="field"><span>Ordem</span><input className="input" type="number" name={`stage:${stage.id}:sortOrder`} defaultValue={stage.sortOrder} /></label>
              <label className="field"><span>Probabilidade</span><input className="input" type="number" min={0} max={100} name={`stage:${stage.id}:probability`} defaultValue={stage.defaultProbability} /></label>
              <label className="field"><span>Orientação</span><input className="input" name={`stage:${stage.id}:guidance`} defaultValue={stage.guidanceText} /></label>
            </div>
          ))}
        </div>
      </section>
      <button className="btn btn-primary" disabled={pending} type="submit">{pending ? "Salvando…" : "Salvar funil"}</button>
    </form>
  );
}
