import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-bold tracking-wide text-muted uppercase">Formula 360</p>
        <h1 className="mt-2 text-3xl font-semibold">Registro não encontrado</h1>
        <p className="mt-2 text-muted">Ele não existe, foi excluído ou está fora do seu alcance.</p>
        <Link className="btn btn-primary mt-5" href="/crm/dashboard">Voltar ao painel</Link>
      </div>
    </main>
  );
}
