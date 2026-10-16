import { DetailGrid, Lookup, PageHeader } from "@/components/chrome";
import { requireContext } from "@/lib/context";
import { formatDateTime } from "@/lib/format";
import { lookupHref } from "@/lib/queries";
import { notFound } from "next/navigation";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await requireContext();
  const profile = db.profiles.find((item) => item.id === id && item.organizationId === user.organizationId);
  if (!profile) notFound();
  const role = db.roles.find((item) => item.id === profile.roleId);
  const manager = db.profiles.find((item) => item.id === profile.managerId);
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Usuário"
        title={profile.fullName}
        highlights={[
          { label: "Email", value: profile.email },
          { label: "Papel", value: role?.name ?? "—" },
          { label: "Gestor", value: manager ? <Lookup href={lookupHref(db, "user", manager.id)}>{manager.fullName}</Lookup> : "—" },
          { label: "Status", value: profile.isActive ? "Ativo" : "Inativo" },
        ]}
      />
      <section className="card detail-card">
        <h2 className="section-title">Informações do usuário</h2>
        <DetailGrid items={[
          { label: "Nome", value: profile.fullName },
          { label: "Email", value: profile.email },
          { label: "Papel", value: role?.name ?? "—" },
          { label: "Gestor", value: manager ? <Lookup href={lookupHref(db, "user", manager.id)}>{manager.fullName}</Lookup> : "—" },
          { label: "Ativo", value: profile.isActive ? "Sim" : "Não" },
          { label: "Último acesso", value: formatDateTime(profile.lastSeenAt) },
          { label: "Criado em", value: formatDateTime(profile.createdAt) },
        ]} />
      </section>
    </div>
  );
}
