import type { Metadata } from "next";
import Link from "next/link";
import { getContext } from "@/lib/context";
import { visibleNav } from "@/lib/nav";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = (await getContext())!;
  const modules = visibleNav(ctx.current.permissions)
    .flatMap((g) => g.items)
    .filter((i) => i.href !== "/dashboard" && !i.href.startsWith("/configuracoes") && !i.href.startsWith("/suporte") && !i.href.startsWith("/site/"));

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-ink">{ctx.current.name}</h1>
        <p className="text-ink-2">Os módulos aparecem aqui conforme as suas permissões.</p>
      </header>

      <section aria-labelledby="modulos" className="space-y-3">
        <h2 id="modulos" className="text-lg font-semibold text-ink">
          Acesso aos módulos
        </h2>
        {modules.length === 0 ? (
          <p className="rounded-card border border-dashed border-line bg-surface p-6 text-ink-2">
            Você ainda não tem permissão para nenhum módulo. Peça a uma administradora da casa para liberar o acesso.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {modules.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="flex min-h-16 items-center rounded-card border border-line bg-surface px-4 font-semibold text-ink hover:border-control">
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
