import { AppShell, type ShellLink } from "@/components/shell";
import { requireContext } from "@/lib/context";
import { hasPermission } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { db, user, role } = await requireContext();
  const links: ShellLink[] = [
    { href: "/crm/dashboard", label: "Painel", icon: "dashboard" },
    { href: "/crm/leads", label: "Leads", icon: "leads" },
    { href: "/crm/accounts", label: "Contas", icon: "accounts" },
    { href: "/crm/contacts", label: "Contatos", icon: "contacts" },
    { href: "/crm/opportunities", label: "Oportunidades", icon: "opportunities" },
    { href: "/crm/contracts", label: "Contratos", icon: "contracts" },
    { href: "/crm/reports", label: "Relatórios", icon: "reports" },
  ];
  const adminLinks: ShellLink[] = [];
  if (hasPermission(db, user, "user.read") || hasPermission(db, user, "user.manage")) {
    adminLinks.push({ href: "/admin/users", label: "Usuários", icon: "users" });
  }
  if (hasPermission(db, user, "settings.manage")) {
    adminLinks.push({ href: "/admin/roles", label: "Papéis", icon: "roles" });
    adminLinks.push({ href: "/admin/pipelines", label: "Funil", icon: "pipelines" });
  }
  if (hasPermission(db, user, "audit.read")) {
    adminLinks.push({ href: "/admin/audit", label: "Auditoria", icon: "audit" });
  }
  return (
    <AppShell
      user={{ name: user.fullName, email: user.email, role: role.name, organization: db.organization.name }}
      links={links}
      adminLinks={adminLinks}
    >
      {children}
    </AppShell>
  );
}
