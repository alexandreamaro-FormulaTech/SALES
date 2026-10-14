"use client";

import { logoutAction } from "@/app/actions";
import { cn } from "@/lib/format";
import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type ShellUser = {
  name: string;
  email: string;
  role: string;
  organization: string;
};

export type ShellLink = { href: string; label: string; icon: string };

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({
  user,
  links,
  adminLinks,
  children,
}: {
  user: ShellUser;
  links: ShellLink[];
  adminLinks: ShellLink[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const items = [...links, ...adminLinks];

  return (
    <div className="min-h-screen">
      <header className="app-header">
        <div className="app-header-main">
          <button className="btn px-2 lg:hidden" type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Fechar menu" : "Abrir menu"}>
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
          <Link href="/crm/dashboard" className="brand">
            <img src="/logo.png" alt="" className="brand-logo" />
            <strong>Formula 360</strong>
          </Link>
          <form action="/crm/search" className="global-search">
            <Search size={16} aria-hidden />
            <input
              className="input"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar..."
              aria-label="Busca global"
            />
          </form>
          <div className="header-user">
            <span className="avatar" aria-hidden>{initials(user.name)}</span>
            <div className="hidden sm:block">
              <p className="name">{user.name}</p>
              <p className="role">{user.role}</p>
            </div>
            <form action={logoutAction}>
              <button className="btn" type="submit">Sair</button>
            </form>
          </div>
        </div>
        <nav className={cn("app-nav", open ? "flex" : "hidden lg:flex")} aria-label="Aplicativos">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : undefined} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
