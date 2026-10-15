"use client";

import { logoutAction } from "@/app/actions";
import { cn } from "@/lib/format";
import { Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const returnTo = useRef("/crm/dashboard");
  const settingsOpen = pathname.startsWith("/admin");

  useEffect(() => {
    if (!pathname.startsWith("/admin")) returnTo.current = pathname || "/crm/dashboard";
  }, [pathname]);

  useEffect(() => {
    if (!settingsOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") router.push(returnTo.current);
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [router, settingsOpen]);

  return (
    <div className="min-h-screen">
      <header className="app-header">
        <div className="app-header-main">
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
            {adminLinks.length ? (
              <Link
                href={adminLinks[0].href}
                className={cn("icon-btn", settingsOpen && "active")}
                aria-label="Configurações"
                aria-current={settingsOpen ? "page" : undefined}
              >
                <Settings size={18} />
              </Link>
            ) : null}
            <form action={logoutAction}>
              <button className="btn" type="submit">Sair</button>
            </form>
          </div>
        </div>
        <nav className="app-nav" aria-label="Aplicativos">
          {links.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : undefined}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {settingsOpen ? (
        <div className="settings-backdrop">
          <div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="settings-modal">
            <div className="settings-head">
              <h2 id="settings-title">Configurações</h2>
              <button className="edit-modal-close" type="button" aria-label="Fechar" onClick={() => router.push(returnTo.current)}>×</button>
            </div>
            <div className="settings-layout">
              <nav className="settings-nav" aria-label="Configurações">
                {adminLinks.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link key={item.href} href={item.href} className={active ? "active" : undefined}>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="settings-main">{children}</div>
            </div>
          </div>
        </div>
      ) : (
        <main className="app-main">{children}</main>
      )}
    </div>
  );
}
