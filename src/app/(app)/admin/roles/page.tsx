import { RolesMatrix } from "@/components/roles-matrix";
import { PageHeader } from "@/components/chrome";
import { requireContext } from "@/lib/context";
import { hasPermission } from "@/lib/permissions";
import { notFound } from "next/navigation";

export const metadata = { title: "Papéis" };

export default async function RolesPage() {
  const { db, user } = await requireContext();
  if (!hasPermission(db, user, "settings.manage")) notFound();
  return (
    <div className="space-y-4">
      <PageHeader title="Papéis e permissões" description="O administrador permanece com acesso integral. Os demais papéis podem ser ajustados. O alcance do registro (próprio, equipe ou todos) acompanha o papel." />
      <div className="grid gap-3 md:grid-cols-2">
        {db.roles.map((role) => (
          <article key={role.id} className="card p-4">
            <h2 className="font-semibold">{role.name}</h2>
            <p className="text-sm text-muted">{role.description}</p>
            <p className="mt-2 text-xs text-muted">Leitura: {scopeLabel(role.readScope)} · Escrita: {scopeLabel(role.writeScope)}</p>
          </article>
        ))}
      </div>
      <RolesMatrix roles={db.roles} permissions={db.permissions} grants={db.rolePermissions} />
    </div>
  );
}

function scopeLabel(scope: string) {
  if (scope === "all") return "todos";
  if (scope === "team") return "equipe";
  return "próprios";
}
