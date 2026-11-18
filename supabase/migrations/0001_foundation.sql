-- Fase 0: fundação multi-tenant.
-- Cada "casa" é um tenant. Toda tabela de dados da casa tem tenant_id e RLS ativa.
-- O acesso é decidido por vínculos (memberships) e permissões (roles -> permissions),
-- nunca por parâmetro vindo do cliente.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  name        text not null check (char_length(name) between 2 and 80),
  created_at  timestamptz not null default now()
);

-- Limite de contas da assinatura (NÃO é a capacidade da casa).
create table public.subscriptions (
  tenant_id   uuid primary key references public.tenants(id) on delete cascade,
  plan        text not null default 'basic',
  seat_limit  integer not null default 10 check (seat_limit > 0)
);

-- Capacidade da casa (número de filhos que a casa comporta). Campo separado de seat_limit.
create table public.house_settings (
  tenant_id        uuid primary key references public.tenants(id) on delete cascade,
  member_capacity  integer check (member_capacity is null or member_capacity >= 0),
  updated_at       timestamptz not null default now()
);

create table public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  full_name   text check (full_name is null or char_length(full_name) <= 120),
  created_at  timestamptz not null default now()
);

-- Catálogo global de permissões (igual para todas as casas).
create table public.permissions (
  key          text primary key,
  description  text not null
);

create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 60),
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (tenant_id, name),
  unique (tenant_id, id)
);

create table public.role_permissions (
  tenant_id       uuid not null,
  role_id         uuid not null,
  permission_key  text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key),
  foreign key (tenant_id, role_id) references public.roles(tenant_id, id) on delete cascade
);

create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'active' check (status in ('active', 'suspended')),
  created_at  timestamptz not null default now(),
  unique (tenant_id, user_id),
  unique (tenant_id, id)
);

create table public.membership_roles (
  tenant_id      uuid not null,
  membership_id  uuid not null,
  role_id        uuid not null,
  primary key (membership_id, role_id),
  foreign key (tenant_id, membership_id) references public.memberships(tenant_id, id) on delete cascade,
  foreign key (tenant_id, role_id) references public.roles(tenant_id, id) on delete cascade
);

-- Registro de auditoria: só inclusão. Clientes não escrevem aqui diretamente.
create table public.audit_log (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  actor_id    uuid,
  action      text not null,
  entity      text,
  entity_id   text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

create index on public.memberships (user_id);
create index on public.roles (tenant_id);
create index on public.audit_log (tenant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Funções de autorização (security definer para evitar recursão de RLS)
-- ---------------------------------------------------------------------------

create function public.is_member(t uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.tenant_id = t and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create function public.has_permission(t uuid, p text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.membership_roles mr on mr.membership_id = m.id
    join public.role_permissions rp on rp.role_id = mr.role_id
    where m.tenant_id = t
      and m.user_id = auth.uid()
      and m.status = 'active'
      and rp.permission_key = p
  );
$$;

-- Verdadeiro se o usuário logado e o usuário u participam de alguma casa em comum.
create function public.shares_tenant(u uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.memberships a
    join public.memberships b on b.tenant_id = a.tenant_id
    where a.user_id = auth.uid() and a.status = 'active' and b.user_id = u
  );
$$;

-- ---------------------------------------------------------------------------
-- Catálogo de permissões
-- ---------------------------------------------------------------------------

insert into public.permissions (key, description) values
  ('pessoas.ver',          'Ver Nossa Corrente, médiuns, hierarquia e equipes'),
  ('pessoas.editar',       'Cadastrar e editar pessoas e equipes'),
  ('atividades.ver',       'Ver agenda, giras e obrigações'),
  ('atividades.editar',    'Criar e editar atividades'),
  ('estoque.ver',          'Ver inventário, velas e compras'),
  ('estoque.editar',       'Cadastrar materiais e registrar movimentações'),
  ('limpeza.ver',          'Ver a escala de limpeza'),
  ('limpeza.editar',       'Criar e editar equipes e escalas de limpeza'),
  ('grimorio.ver',         'Ver o Grimório (além do controle por entrada)'),
  ('grimorio.editar',      'Criar e editar entradas do Grimório'),
  ('financeiro.ver',       'Ver o módulo financeiro'),
  ('arquivos.ver',         'Ver arquivos da casa'),
  ('site.ver',             'Ver o painel do site institucional'),
  ('site.editar',          'Editar páginas, notícias, eventos e galeria'),
  ('config.ver',           'Ver as configurações da casa'),
  ('config.editar',        'Editar dados da casa, categorias e unidades'),
  ('identidade.editar',    'Editar o rascunho da identidade visual'),
  ('identidade.publicar',  'Publicar e restaurar a identidade visual'),
  ('usuarios.gerenciar',   'Convidar usuários e gerenciar papéis e permissões'),
  ('auditoria.ver',        'Ver o registro de auditoria');

-- ---------------------------------------------------------------------------
-- Criação de casa (única forma de criar um tenant)
-- ---------------------------------------------------------------------------

-- Cria papéis-base: Administrador (todas as permissões) e Membro (leitura básica).
create function public.seed_default_roles(t uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  admin_id uuid;
  member_id uuid;
begin
  insert into public.roles (tenant_id, name, is_system)
    values (t, 'Administrador', true) returning id into admin_id;
  insert into public.roles (tenant_id, name, is_system)
    values (t, 'Membro', true) returning id into member_id;

  insert into public.role_permissions (tenant_id, role_id, permission_key)
    select t, admin_id, key from public.permissions;

  insert into public.role_permissions (tenant_id, role_id, permission_key)
    select t, member_id, key from public.permissions
    where key in ('atividades.ver', 'limpeza.ver');

  return admin_id;
end;
$$;

revoke all on function public.seed_default_roles(uuid) from public, anon, authenticated;

create function public.create_house(p_name text, p_slug text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t uuid;
  admin_id uuid;
  m uuid;
begin
  if uid is null then
    raise exception 'não autenticado' using errcode = '28000';
  end if;

  insert into public.tenants (name, slug) values (trim(p_name), lower(trim(p_slug)))
    returning id into t;
  insert into public.subscriptions (tenant_id) values (t);
  insert into public.house_settings (tenant_id) values (t);

  admin_id := public.seed_default_roles(t);

  insert into public.memberships (tenant_id, user_id) values (t, uid) returning id into m;
  insert into public.membership_roles (tenant_id, membership_id, role_id) values (t, m, admin_id);

  insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, detail)
    values (t, uid, 'house.created', 'tenant', t::text, jsonb_build_object('slug', lower(trim(p_slug))));

  return t;
end;
$$;

-- Casas do usuário logado com a lista de permissões em cada uma.
create function public.my_houses()
returns table (tenant_id uuid, name text, slug text, permissions text[])
language sql stable security definer set search_path = public
as $$
  select t.id, t.name, t.slug,
         coalesce(array_agg(distinct rp.permission_key) filter (where rp.permission_key is not null), '{}')
  from public.memberships m
  join public.tenants t on t.id = m.tenant_id
  left join public.membership_roles mr on mr.membership_id = m.id
  left join public.role_permissions rp on rp.role_id = mr.role_id
  where m.user_id = auth.uid() and m.status = 'active'
  group by t.id, t.name, t.slug
  order by t.name;
$$;

-- Registra auditoria a partir do servidor (autor sempre = usuário logado, casa = onde ele é membro).
create function public.log_audit(p_tenant uuid, p_action text, p_entity text, p_entity_id text, p_detail jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_member(p_tenant) then
    raise exception 'sem acesso a esta casa' using errcode = '42501';
  end if;
  insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, detail)
    values (p_tenant, auth.uid(), p_action, p_entity, p_entity_id, p_detail);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.tenants          enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.house_settings   enable row level security;
alter table public.profiles         enable row level security;
alter table public.permissions      enable row level security;
alter table public.roles            enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships      enable row level security;
alter table public.membership_roles enable row level security;
alter table public.audit_log        enable row level security;

-- tenants: ver se for membro; editar dados da casa com config.editar. Sem insert/delete direto.
create policy tenants_select on public.tenants for select to authenticated
  using (public.is_member(id));
create policy tenants_update on public.tenants for update to authenticated
  using (public.has_permission(id, 'config.editar'))
  with check (public.has_permission(id, 'config.editar'));

create policy subscriptions_select on public.subscriptions for select to authenticated
  using (public.is_member(tenant_id));

create policy house_settings_select on public.house_settings for select to authenticated
  using (public.is_member(tenant_id));
create policy house_settings_update on public.house_settings for update to authenticated
  using (public.has_permission(tenant_id, 'config.editar'))
  with check (public.has_permission(tenant_id, 'config.editar'));

-- profiles: o próprio e quem divide uma casa com o usuário.
create policy profiles_select on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.shares_tenant(user_id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (user_id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy permissions_select on public.permissions for select to authenticated
  using (true);

-- roles e permissões de papéis: membros leem; usuarios.gerenciar escreve. Papéis do sistema não são apagados.
create policy roles_select on public.roles for select to authenticated
  using (public.is_member(tenant_id));
create policy roles_insert on public.roles for insert to authenticated
  with check (public.has_permission(tenant_id, 'usuarios.gerenciar') and is_system = false);
create policy roles_update on public.roles for update to authenticated
  using (public.has_permission(tenant_id, 'usuarios.gerenciar') and is_system = false)
  with check (public.has_permission(tenant_id, 'usuarios.gerenciar') and is_system = false);
create policy roles_delete on public.roles for delete to authenticated
  using (public.has_permission(tenant_id, 'usuarios.gerenciar') and is_system = false);

create policy role_permissions_select on public.role_permissions for select to authenticated
  using (public.is_member(tenant_id));
create policy role_permissions_write on public.role_permissions for all to authenticated
  using (
    public.has_permission(tenant_id, 'usuarios.gerenciar')
    and exists (select 1 from public.roles r where r.id = role_id and r.is_system = false)
  )
  with check (
    public.has_permission(tenant_id, 'usuarios.gerenciar')
    and exists (select 1 from public.roles r where r.id = role_id and r.is_system = false)
  );

create policy memberships_select on public.memberships for select to authenticated
  using (public.is_member(tenant_id));
create policy memberships_write on public.memberships for all to authenticated
  using (public.has_permission(tenant_id, 'usuarios.gerenciar'))
  with check (public.has_permission(tenant_id, 'usuarios.gerenciar'));

create policy membership_roles_select on public.membership_roles for select to authenticated
  using (public.is_member(tenant_id));
create policy membership_roles_write on public.membership_roles for all to authenticated
  using (public.has_permission(tenant_id, 'usuarios.gerenciar'))
  with check (public.has_permission(tenant_id, 'usuarios.gerenciar'));

-- audit_log: só leitura para quem tem auditoria.ver; escrita apenas via log_audit/create_house.
create policy audit_select on public.audit_log for select to authenticated
  using (public.has_permission(tenant_id, 'auditoria.ver'));

-- ---------------------------------------------------------------------------
-- Privilégios (RLS decide as linhas; GRANT decide as operações)
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon;

grant select on public.tenants, public.subscriptions, public.permissions,
                public.role_permissions, public.membership_roles, public.audit_log
  to authenticated;
grant select, update on public.tenants, public.house_settings to authenticated;
grant select on public.house_settings to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.roles, public.memberships to authenticated;
grant insert, update, delete on public.role_permissions, public.membership_roles to authenticated;

-- tenants: apenas o nome pode ser alterado pelo cliente (slug e id são imutáveis pela API).
revoke update on public.tenants from authenticated;
grant update (name) on public.tenants to authenticated;
revoke update on public.house_settings from authenticated;
grant update (member_capacity, updated_at) on public.house_settings to authenticated;

grant execute on function public.is_member(uuid), public.has_permission(uuid, text),
  public.shares_tenant(uuid), public.create_house(text, text), public.my_houses(),
  public.log_audit(uuid, text, text, text, jsonb)
  to authenticated;
