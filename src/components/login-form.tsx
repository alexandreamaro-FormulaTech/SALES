"use client";

import { loginAction } from "@/app/actions";
import { emptyActionState } from "@/lib/types";
import { useActionState } from "react";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, emptyActionState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      {state.error ? <div role="alert" className="alert">{state.error}</div> : null}
      <label className="field">
        <span>Email</span>
        <input className="input" name="email" type="email" autoComplete="username" required placeholder="voce@formula360.local" />
      </label>
      <label className="field">
        <span>Senha</span>
        <input className="input" name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className="btn btn-primary w-full" disabled={pending} type="submit">
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <div className="rounded bg-canvas p-3 text-sm text-muted">
        <p className="font-semibold text-ink">Supabase conectado</p>
        <p className="mt-1">Use um email já confirmado no projeto. O banco está em kbmfayowkaihsweukgvf.</p>
      </div>
    </form>
  );
}
