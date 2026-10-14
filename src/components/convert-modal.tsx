"use client";

import { convertLeadAction } from "@/app/actions";
import type { DuplicateHit } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Choice = { id: string; label: string; accountId?: string };

export function ConvertModal({
  leadId,
  company,
  accounts,
  contacts,
  owners,
  duplicates,
  defaultOwnerId,
}: {
  leadId: string;
  company: string;
  accounts: Choice[];
  contacts: Choice[];
  owners: Choice[];
  duplicates: DuplicateHit[];
  defaultOwnerId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountMode, setAccountMode] = useState<"create" | "link">("create");
  const [contactMode, setContactMode] = useState<"create" | "link">("create");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [contactId, setContactId] = useState("");
  const [accountName, setAccountName] = useState(company);
  const [taxId, setTaxId] = useState("");
  const [createOpportunity, setCreateOpportunity] = useState(true);
  const [opportunityName, setOpportunityName] = useState(`${company} — novo negócio`);
  const [ownerId, setOwnerId] = useState(defaultOwnerId);
  const [acknowledge, setAcknowledge] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<DuplicateHit[]>(duplicates);
  const [pending, setPending] = useState(false);

  const visibleDuplicates = found.filter((hit) => {
    if (accountMode === "link" && hit.kind === "account" && hit.id === accountId) return false;
    if (contactMode === "link" && hit.kind === "contact" && hit.id === contactId) return false;
    return true;
  });
  const contactOptions = contacts.filter((contact) => !accountId || contact.accountId === (accountMode === "link" ? accountId : contact.accountId));

  async function submit() {
    setPending(true);
    setError("");
    const result = await convertLeadAction({
      leadId,
      accountMode,
      accountId: accountMode === "link" ? accountId : undefined,
      accountName,
      taxId,
      contactMode,
      contactId: contactMode === "link" ? contactId : undefined,
      createOpportunity,
      opportunityName,
      ownerId,
      acknowledgeDuplicates: acknowledge || visibleDuplicates.length === 0,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      if (result.duplicates.length) {
        setFound(result.duplicates);
        setAcknowledge(false);
      }
      return;
    }
    router.push(result.href ?? `/crm/leads/${leadId}`);
    router.refresh();
  }

  return (
    <>
      <button className="btn" type="button" onClick={() => setOpen(true)}>Converter</button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/45 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="convert-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded bg-white shadow-xl">
          <form
            className="p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <h2 id="convert-title" className="text-xl font-semibold">Converter lead</h2>
            <p className="mt-1 text-sm text-muted">A conta e o contato existentes não são sobrescritos. A operação é única e pode ser repetida sem duplicar.</p>
            {error ? <div role="alert" className="alert mt-3">{error}</div> : null}
            {visibleDuplicates.length ? (
              <div className="mt-3 rounded-xl bg-[#fff8ef] p-3 text-sm">
                <p className="font-semibold">Possíveis duplicidades. Nada será mesclado automaticamente.</p>
                <ul className="mt-2 space-y-1">
                  {visibleDuplicates.map((hit) => (
                    <li key={`${hit.kind}-${hit.id}`}><a className="text-primary" href={hit.href}>{hit.label}</a> — {hit.reason}</li>
                  ))}
                </ul>
                <label className="mt-2 flex items-center gap-2">
                  <input type="checkbox" checked={acknowledge} onChange={(event) => setAcknowledge(event.target.checked)} />
                  Continuar sem mesclar
                </label>
              </div>
            ) : null}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <fieldset className="space-y-2">
                <legend className="text-sm font-bold">Conta</legend>
                <label className="flex gap-2 text-sm"><input type="radio" checked={accountMode === "create"} onChange={() => setAccountMode("create")} /> Criar conta</label>
                <label className="flex gap-2 text-sm"><input type="radio" checked={accountMode === "link"} onChange={() => setAccountMode("link")} /> Vincular existente</label>
                {accountMode === "create" ? (
                  <>
                    <input className="input" aria-label="Nome da conta" value={accountName} onChange={(event) => setAccountName(event.target.value)} />
                    <input className="input" aria-label="CNPJ ou CPF" placeholder="CNPJ/CPF" value={taxId} onChange={(event) => setTaxId(event.target.value)} />
                  </>
                ) : (
                  <select className="select" aria-label="Conta existente" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}
                  </select>
                )}
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm font-bold">Contato</legend>
                <label className="flex gap-2 text-sm"><input type="radio" checked={contactMode === "create"} onChange={() => setContactMode("create")} /> Criar contato</label>
                <label className="flex gap-2 text-sm"><input type="radio" checked={contactMode === "link"} onChange={() => setContactMode("link")} /> Vincular existente</label>
                {contactMode === "link" ? (
                  <select className="select" aria-label="Contato existente" value={contactId} onChange={(event) => setContactId(event.target.value)}>
                    <option value="">Selecione</option>
                    {(accountMode === "link" ? contactOptions.filter((item) => item.accountId === accountId) : contacts).map((contact) => (
                      <option key={contact.id} value={contact.id}>{contact.label}</option>
                    ))}
                  </select>
                ) : <p className="text-sm text-muted">Os dados do lead serão copiados para um contato novo.</p>}
              </fieldset>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" checked={createOpportunity} onChange={(event) => setCreateOpportunity(event.target.checked)} />
                Criar oportunidade
              </label>
              {createOpportunity ? (
                <label className="field md:col-span-2">
                  <span>Nome sugerido</span>
                  <input className="input" value={opportunityName} onChange={(event) => setOpportunityName(event.target.value)} />
                </label>
              ) : null}
              <label className="field md:col-span-2">
                <span>Proprietário dos novos registros</span>
                <select className="select" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
                  {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.label}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn" type="button" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={pending || (visibleDuplicates.length > 0 && !acknowledge)} type="submit">
                {pending ? "Convertendo…" : "Converter"}
              </button>
            </div>
          </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
