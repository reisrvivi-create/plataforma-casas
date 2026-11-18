import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type House = { id: string; name: string; slug: string; permissions: string[] };
export type AppContext = {
  userEmail: string;
  houses: House[];
  current: House;
  demo: boolean;
};

export const HOUSE_COOKIE = "casa_atual";

const DEMO_HOUSES: House[] = [
  { id: "demo-a", name: "Casa Demonstração A", slug: "demo-a", permissions: ["atividades.ver", "limpeza.ver", "estoque.ver", "config.ver", "identidade.editar", "identidade.publicar", "usuarios.gerenciar", "site.ver", "pessoas.ver", "grimorio.ver", "arquivos.ver"] },
  { id: "demo-b", name: "Casa Demonstração B", slug: "demo-b", permissions: ["atividades.ver", "limpeza.ver"] },
];

/**
 * Contexto da requisição: usuário, casas a que ele pertence e a casa atual.
 * A casa atual vem de um cookie, mas só vale se a pessoa for membro dela (validado a cada requisição).
 * Sem casa nenhuma, leva para a criação da primeira casa.
 */
export async function getContext(options: { allowNoHouse?: boolean } = {}): Promise<AppContext | null> {
  const cookieStore = await cookies();
  const wanted = cookieStore.get(HOUSE_COOKIE)?.value;

  if (isDemoMode()) {
    const current = DEMO_HOUSES.find((h) => h.id === wanted) ?? DEMO_HOUSES[0];
    return { userEmail: "demo@exemplo.local", houses: DEMO_HOUSES, current, demo: true };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data, error } = await supabase.rpc("my_houses");
  if (error) throw new Error("Não foi possível carregar as casas do usuário.");
  const houses: House[] = (data ?? []).map((h: { tenant_id: string; name: string; slug: string; permissions: string[] }) => ({
    id: h.tenant_id,
    name: h.name,
    slug: h.slug,
    permissions: h.permissions,
  }));

  if (houses.length === 0) {
    if (options.allowNoHouse) return null;
    redirect("/nova-casa");
  }
  const current = houses.find((h) => h.id === wanted) ?? houses[0];
  return { userEmail: auth.user.email ?? "", houses, current, demo: false };
}

export function can(ctx: AppContext, permission: string) {
  return ctx.current.permissions.includes(permission);
}
