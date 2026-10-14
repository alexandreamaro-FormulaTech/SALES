import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="login-screen">
      <section className="login-card">
        <img src="/logo.png" alt="" className="brand-logo" />
        <h1 className="text-center text-xl font-bold">Formula 360</h1>
        <p className="mt-1 mb-5 text-center text-muted">Entre para abrir o console de vendas.</p>
        {params.error === "inactive" ? <div className="alert mb-4">Este acesso está desativado.</div> : null}
        <LoginForm next={params.next} />
      </section>
    </main>
  );
}
