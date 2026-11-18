"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { NavGroup } from "@/lib/nav";

export function AppShell({ nav, header, children }: { nav: NavGroup[]; header: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Fecha a gaveta com Esc (devolvendo o foco ao botão) e ao escolher um item do menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2">
        Ir para o conteúdo
      </a>

      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface px-4">
        <button
          ref={toggleRef}
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-control lg:hidden"
          aria-expanded={open}
          aria-controls="menu-lateral"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
          <span aria-hidden="true">☰</span>
        </button>
        {header}
      </header>

      {open ? <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" aria-hidden="true" onClick={() => setOpen(false)} /> : null}

      <aside
        id="menu-lateral"
        className={`fixed bottom-0 left-0 top-16 z-20 w-64 overflow-y-auto border-r border-line bg-surface px-3 py-4 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <nav aria-label="Principal" className="space-y-6">
          {nav.map((group, gi) => (
            <section key={group.label} aria-labelledby={`g-${gi}`}>
              <h2 id={`g-${gi}`} className="px-3 pb-1 text-xs font-semibold text-ink-2">
                {group.label}
              </h2>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={`flex min-h-10 items-center rounded-control px-3 text-sm ${active ? "bg-primary font-semibold text-on-primary" : "text-ink hover:bg-canvas"}`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
      </aside>

      <main id="conteudo" className="px-4 pb-12 pt-24 lg:ml-64 lg:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
