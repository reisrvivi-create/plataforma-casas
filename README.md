# Plataforma Casas

Plataforma SaaS multi-casas de gestão para casas religiosas, integrada a sites institucionais personalizáveis.

**Status:** Fase 0 (fundação) concluída: login, casas, permissões, isolamento por casa no banco (RLS) e estrutura do painel (menu em 7 grupos e seletor de casa). As demais telas aparecem como "ainda não construída" e entram nas fases seguintes.

## Stack

Next.js (App Router, TypeScript, Tailwind) · Supabase (Postgres com RLS, Auth) · hospedagem Business da Hostinger.

## Rodar em desenvolvimento

```bash
npm install
npm run dev
```

Sem as variáveis do Supabase, o app roda em **modo demonstração** (duas casas fictícias, sem login) apenas em desenvolvimento. Em produção, a falta das variáveis é erro.

## Conectar ao Supabase

1. No painel do Supabase, abra **SQL Editor** e execute o conteúdo de `supabase/migrations/0001_foundation.sql`.
2. Em **Project Settings > API**, copie a URL do projeto e a chave pública (publishable/anon).
3. Crie `.env.local` a partir de `.env.example` e preencha as duas variáveis.
4. Em **Authentication > URL Configuration**, defina a Site URL e inclua `<site>/auth/confirm` nas Redirect URLs. No modelo de e-mail "Confirm signup", use o link `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.

Nunca coloque a senha do banco nem a chave de serviço (service role) no código ou no repositório.

## Testes

```bash
npm run test:db   # isolamento entre casas e permissões, com Postgres real em memória (PGlite)
npm run lint
npm run build
```

## Estrutura

- `supabase/migrations/` esquema do banco e políticas RLS
- `tests/db/` testes de isolamento
- `src/lib/nav.ts` mapa de navegação e permissões do menu
- `src/lib/context.ts` casa atual validada no servidor
- `src/proxy.ts` renovação de sessão e exigência de login
