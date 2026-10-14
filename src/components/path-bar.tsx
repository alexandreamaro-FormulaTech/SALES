"use client";

import { changeLeadStatusAction, changeOpportunityStageAction } from "@/app/actions";
import { cn } from "@/lib/format";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = { id: string; name: string; guidance: string; closed?: boolean; converted?: boolean };
type Outcome = { id: string; name: string; requiresReason: boolean; guidance: string };

export function PathBar({
  mode,
  recordId,
  steps,
  currentId,
  outcomes,
  locked,
}: {
  mode: "lead" | "opportunity";
  recordId: string;
  steps: Step[];
  currentId: string;
  outcomes: Outcome[];
  locked: boolean;
  keyFields: { label: string; value: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentId);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const currentIndex = steps.findIndex((step) => step.id === currentId);
  const nextOpen = steps.slice(Math.max(currentIndex, 0) + 1).find((step) => !step.converted);
  const targetId = selected !== currentId ? selected : nextOpen?.id;
  const chosen = steps.find((step) => step.id === (targetId ?? selected)) ?? outcomes.find((step) => step.id === selected);
  const needsReason = outcomes.some((item) => item.id === targetId && item.requiresReason)
    || (mode === "opportunity" && steps.find((step) => step.id === targetId)?.name === "Fechada perdida");
  const buttonLabel = selected !== currentId ? "Marcar status como atual" : "Marcar status como concluído";

  async function commit(statusId: string) {
    setPending(true);
    setError("");
    const result = mode === "lead"
      ? await changeLeadStatusAction({ leadId: recordId, statusId, reason })
      : await changeOpportunityStageAction({ opportunityId: recordId, stageId: statusId, lossReason: reason });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReason("");
    setSelected(statusId);
    router.refresh();
  }

  return (
    <div>
      <div className="path-wrap">
        <ol className="path" aria-label="Etapas">
          {steps.map((step, index) => {
            const state = step.id === currentId ? "current" : currentIndex >= 0 && index < currentIndex && !step.converted ? "complete" : "incomplete";
            return (
              <li key={step.id} className={cn("path-item", `is-${state}`, selected === step.id && state !== "current" && "is-picked")}>
                <button type="button" disabled={locked || step.converted} onClick={() => setSelected(step.id)}>
                  {state === "complete" ? "✓ " : ""}{step.name}
                </button>
              </li>
            );
          })}
        </ol>
        {!locked && targetId ? (
          <button className="btn btn-primary" type="button" disabled={pending} onClick={() => commit(targetId)}>
            {pending ? "Salvando…" : buttonLabel}
          </button>
        ) : null}
      </div>
      {chosen && "guidance" in chosen && chosen.guidance ? <p className="path-guide">{chosen.guidance}</p> : null}
      {error ? <div role="alert" className="alert mb-3">{error}</div> : null}
      {!locked && (needsReason || outcomes.length) ? (
        <div className="path-actions">
          {needsReason ? (
            <label className="field min-w-64">
              <span>Motivo</span>
              <input className="input" value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
          ) : null}
          {outcomes.map((outcome) => (
            <button key={outcome.id} className={cn("btn", selected === outcome.id && "btn-primary")} type="button" onClick={() => setSelected(outcome.id)}>
              {outcome.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
