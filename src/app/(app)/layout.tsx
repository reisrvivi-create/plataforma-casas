import { AppShell } from "@/components/app-shell";
import { HouseSelector } from "@/components/house-selector";
import { signOut } from "@/app/actions";
import { getContext } from "@/lib/context";
import { visibleNav } from "@/lib/nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = (await getContext())!;
  const header = (
    <>
      <div className="min-w-0 flex-1">
        <HouseSelector houses={ctx.houses.map(({ id, name }) => ({ id, name }))} currentId={ctx.current.id} />
      </div>
      {ctx.demo ? <span className="hidden rounded-control border border-line px-2 py-1 text-xs text-ink-2 sm:inline">Modo demonstração</span> : null}
      <span className="hidden max-w-48 truncate text-sm text-ink-2 md:inline">{ctx.userEmail}</span>
      <form action={signOut}>
        <button type="submit" className="min-h-11 rounded-control border border-control px-3 text-sm font-semibold text-ink hover:bg-canvas">
          Sair
        </button>
      </form>
    </>
  );
  return (
    <AppShell nav={visibleNav(ctx.current.permissions)} header={header}>
      {children}
    </AppShell>
  );
}
