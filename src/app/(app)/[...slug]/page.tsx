import { notFound } from "next/navigation";
import { findNavItem, visibleNav } from "@/lib/nav";
import { getContext } from "@/lib/context";

// Telas ainda não implementadas: mostram em qual fase do roteiro chegam.
// Só renderiza se o item existe no menu E a pessoa tem a permissão dele na casa atual.
export default async function PlaceholderPage({ params }: PageProps<"/[...slug]">) {
  const { slug } = await params;
  const item = findNavItem(`/${slug.join("/")}`);
  const ctx = (await getContext())!;
  const allowed = item && visibleNav(ctx.current.permissions).some((g) => g.items.some((i) => i.href === item.href));
  if (!item || !allowed) notFound();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-ink">{item.label}</h1>
      <p className="rounded-card border border-dashed border-line bg-surface p-6 text-ink-2">
        Esta tela ainda não foi construída. Ela entra na fase {item.phase} do roteiro.
      </p>
    </div>
  );
}
