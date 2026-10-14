import { logoutAction } from "@/app/actions";

export const metadata = { title: "Sem vínculo" };

export default function UnlinkedAccountPage() {
  return (
    <main className="login-screen">
      <section className="login-card">
        <img src="/logo.png" alt="" className="brand-logo" />
        <h1 className="text-xl font-bold">Conta autenticada no Supabase</h1>
        <p className="mt-2 text-muted">
          O login funcionou, mas este usuário ainda não tem um perfil vinculado a uma organização no CRM. Crie a organização, o papel e o perfil com o mesmo id do Auth para liberar o acesso.
        </p>
        <form action={logoutAction} className="mt-5">
          <button className="btn btn-primary" type="submit">Sair</button>
        </form>
      </section>
    </main>
  );
}
