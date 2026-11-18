// Mapa de navegação (sitemap). Cada item declara a permissão mínima para aparecer no menu.
// A permissão aqui só controla o MENU; o acesso real aos dados é decidido pelo banco (RLS).

export type NavItem = {
  label: string;
  href: string;
  /** Permissão exigida para ver o item. Ausente = qualquer membro da casa. */
  permission?: string;
  /** Fase do roteiro em que a tela é implementada. */
  phase: number;
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { label: "Dashboard", href: "/dashboard", phase: 0 },
      { label: "Agenda", href: "/agenda", permission: "atividades.ver", phase: 5 },
      { label: "Notificações", href: "/notificacoes", phase: 5 },
    ],
  },
  {
    label: "Pessoas e organização",
    items: [
      { label: "Nossa Corrente", href: "/nossa-corrente", permission: "pessoas.ver", phase: 4 },
      { label: "Médiuns", href: "/mediuns", permission: "pessoas.ver", phase: 4 },
      { label: "Hierarquia", href: "/hierarquia", permission: "pessoas.ver", phase: 4 },
      { label: "Equipes", href: "/equipes", permission: "pessoas.ver", phase: 4 },
      { label: "Escala de Limpeza", href: "/limpeza", permission: "limpeza.ver", phase: 4 },
    ],
  },
  {
    label: "Atividades religiosas",
    items: [
      { label: "Giras", href: "/giras", permission: "atividades.ver", phase: 5 },
      { label: "Obrigações", href: "/obrigacoes", permission: "atividades.ver", phase: 5 },
      { label: "Grimório", href: "/grimorio", permission: "grimorio.ver", phase: 6 },
      { label: "Estudos", href: "/estudos", permission: "grimorio.ver", phase: 6 },
    ],
  },
  {
    label: "Recursos e administração",
    items: [
      { label: "Inventário", href: "/inventario", permission: "estoque.ver", phase: 3 },
      { label: "Velas", href: "/velas", permission: "estoque.ver", phase: 3 },
      { label: "Compras", href: "/compras", permission: "estoque.ver", phase: 3 },
      { label: "Financeiro", href: "/financeiro", permission: "financeiro.ver", phase: 8 },
      { label: "Arquivos", href: "/arquivos", permission: "arquivos.ver", phase: 6 },
    ],
  },
  {
    label: "Site institucional",
    items: [
      { label: "Dashboard do Site", href: "/site", permission: "site.ver", phase: 7 },
      { label: "Páginas", href: "/site/paginas", permission: "site.ver", phase: 7 },
      { label: "Notícias", href: "/site/noticias", permission: "site.ver", phase: 7 },
      { label: "Eventos Públicos", href: "/site/eventos", permission: "site.ver", phase: 7 },
      { label: "Galeria", href: "/site/galeria", permission: "site.ver", phase: 7 },
      { label: "Contatos", href: "/site/contatos", permission: "site.ver", phase: 7 },
      { label: "Aparência do Site", href: "/site/aparencia", permission: "site.ver", phase: 2 },
    ],
  },
  {
    label: "Configurações",
    items: [
      { label: "Dados da Casa", href: "/configuracoes/dados-da-casa", permission: "config.ver", phase: 1 },
      { label: "Identidade Visual", href: "/configuracoes/identidade-visual", permission: "config.ver", phase: 1 },
      { label: "Usuários e Permissões", href: "/configuracoes/usuarios", permission: "usuarios.gerenciar", phase: 1 },
      { label: "Categorias", href: "/configuracoes/categorias", permission: "config.ver", phase: 1 },
      { label: "Unidades de Medida", href: "/configuracoes/unidades", permission: "config.ver", phase: 1 },
      { label: "Tipos de Atividades", href: "/configuracoes/tipos-de-atividades", permission: "config.ver", phase: 1 },
      { label: "Notificações", href: "/configuracoes/notificacoes", permission: "config.ver", phase: 5 },
      { label: "Integrações", href: "/configuracoes/integracoes", permission: "config.ver", phase: 8 },
      { label: "Privacidade", href: "/configuracoes/privacidade", permission: "config.ver", phase: 1 },
    ],
  },
  {
    label: "Suporte",
    items: [
      { label: "Central de Ajuda", href: "/suporte/ajuda", phase: 8 },
      { label: "Tutoriais", href: "/suporte/tutoriais", phase: 8 },
      { label: "Chamados", href: "/suporte/chamados", phase: 8 },
    ],
  },
];

/** Filtra o menu pelas permissões da pessoa na casa atual e remove grupos vazios. */
export function visibleNav(permissions: string[]): NavGroup[] {
  const has = new Set(permissions);
  return NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.permission || has.has(i.permission)),
  })).filter((g) => g.items.length > 0);
}

export function findNavItem(path: string): NavItem | undefined {
  return NAV.flatMap((g) => g.items).find((i) => i.href === path);
}
