"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-semibold">Não foi possível carregar esta página.</h1>
      <p className="mt-2 text-muted">Tente de novo. Se o problema continuar, restaure os dados de demonstração em Usuários.</p>
      <button className="btn btn-primary mt-4" type="button" onClick={reset}>Tentar de novo</button>
    </div>
  );
}
