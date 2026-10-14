import { inviteUserAction, resetDemoAction, toggleUserAction } from "@/app/actions";
import { PageHeader } from "@/components/chrome";
import { requireContext } from "@/lib/context";
import { hasPermission } from "@/lib/permissions";
import { notFound } from "next/navigation";

export const metadata = { title: "Usuários" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { db, user } = await requireContext();
  if (!hasPermission(db, user, "user.read") && !hasPermission(db, user, "user.manage")) notFound();
  const manage = hasPermission(db, user, "user.manage");
  const people = db.profiles.filter((profile) => profile.organizationId === user.organizationId);
  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuários"
        description="Convite de demonstração cria o perfil na hora. Em produção, o Supabase Auth envia o convite e a senha não fica neste cadastro."
        actions={manage ? (
          <form action={resetDemoAction}>
            <button className="btn" type="submit">Restaurar demonstração</button>
          </form>
        ) : null}
      />
      {error ? <div role="alert" className="alert">{error}</div> : null}
      {manage ? (
        <form action={inviteUserAction} className="card grid gap-3 p-4 md:grid-cols-4">
          <label className="field"><span>Nome</span><input className="input" name="fullName" required /></label>
          <label className="field"><span>Email</span><input className="input" name="email" type="email" required /></label>
          <label className="field"><span>Papel</span>
            <select className="select" name="roleId" required>
              {db.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Gestor</span>
            <select className="select" name="managerId">
              <option value="">Nenhum</option>
              {people.filter((profile) => profile.isActive).map((profile) => <option key={profile.id} value={profile.id}>{profile.fullName}</option>)}
            </select>
          </label>
          <button className="btn btn-primary md:col-span-4 w-fit" type="submit">Convidar</button>
        </form>
      ) : null}
      <div className="card table-wrap">
        <table className="data">
          <thead><tr><th>Nome</th><th>Email</th><th>Papel</th><th>Gestor</th><th>Ativo</th>{manage ? <th></th> : null}</tr></thead>
          <tbody>
            {people.map((profile) => {
              const role = db.roles.find((item) => item.id === profile.roleId);
              const manager = people.find((item) => item.id === profile.managerId);
              return (
                <tr key={profile.id}>
                  <td className="font-semibold">{profile.fullName}</td>
                  <td>{profile.email}</td>
                  <td>{role?.name}</td>
                  <td>{manager?.fullName ?? "—"}</td>
                  <td>{profile.isActive ? "Sim" : "Não"}</td>
                  {manage ? (
                    <td>
                      <form action={toggleUserAction}>
                        <input type="hidden" name="userId" value={profile.id} />
                        <input type="hidden" name="isActive" value={profile.isActive ? "false" : "true"} />
                        <button className="btn" type="submit" disabled={profile.id === user.id}>{profile.isActive ? "Desativar" : "Ativar"}</button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
