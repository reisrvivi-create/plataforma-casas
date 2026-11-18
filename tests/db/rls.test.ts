// Testa o isolamento entre casas com um Postgres real (PGlite) aplicando a migração.
// Emula o Supabase: schema auth, auth.uid() lendo request.jwt.claim.sub e os papéis anon/authenticated.
import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();

const A = "00000000-0000-0000-0000-00000000000a"; // admin da casa X
const B = "00000000-0000-0000-0000-00000000000b"; // admin da casa Y
const C = "00000000-0000-0000-0000-00000000000c"; // membro comum da casa X
const D = "00000000-0000-0000-0000-00000000000d"; // sem nenhuma casa

let houseX: string;
let houseY: string;

async function asUser<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${uid ? "authenticated" : "anon"}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ""]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}

async function rows(sql: string, params: unknown[] = []) {
  return (await db.query<Record<string, unknown>>(sql, params)).rows;
}

async function rejects(fn: () => Promise<unknown>, re: RegExp) {
  await assert.rejects(fn, (e: Error) => re.test(e.message));
}

before(async () => {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await db.exec(readFileSync(join(import.meta.dirname, "../../supabase/migrations/0001_foundation.sql"), "utf8"));
  for (const u of [A, B, C, D]) await db.query("insert into auth.users (id) values ($1)", [u]);

  houseX = await asUser(A, async () =>
    (await rows("select public.create_house('Casa X', 'casa-x') as id"))[0].id as string);
  houseY = await asUser(B, async () =>
    (await rows("select public.create_house('Casa Y', 'casa-y') as id"))[0].id as string);

  // A convida C como Membro da casa X (feito como superusuário, simulando o fluxo de convite).
  const m = (await rows("insert into public.memberships (tenant_id, user_id) values ($1, $2) returning id", [houseX, C]))[0].id;
  const role = (await rows("select id from public.roles where tenant_id = $1 and name = 'Membro'", [houseX]))[0].id;
  await db.query("insert into public.membership_roles (tenant_id, membership_id, role_id) values ($1, $2, $3)", [houseX, m, role]);
});

describe("isolamento entre casas", () => {
  test("cada administrador enxerga só a própria casa", async () => {
    const a = await asUser(A, () => rows("select slug from public.tenants"));
    const b = await asUser(B, () => rows("select slug from public.tenants"));
    assert.deepEqual(a.map((r) => r.slug), ["casa-x"]);
    assert.deepEqual(b.map((r) => r.slug), ["casa-y"]);
  });

  test("papéis, vínculos e auditoria da outra casa ficam invisíveis", async () => {
    for (const table of ["roles", "memberships", "role_permissions", "membership_roles", "audit_log", "house_settings", "subscriptions"]) {
      const r = await asUser(A, () => rows(`select 1 from public.${table} where tenant_id = $1`, [houseY]));
      assert.equal(r.length, 0, `A viu linhas de ${table} da casa Y`);
    }
  });

  test("não é possível criar vínculo na outra casa", async () => {
    await rejects(
      () => asUser(A, () => db.query("insert into public.memberships (tenant_id, user_id) values ($1, $2)", [houseY, D])),
      /row-level security/i,
    );
  });

  test("não é possível alterar dados da outra casa", async () => {
    const r = await asUser(A, () => db.query("update public.tenants set name = 'invadida' where id = $1", [houseY]));
    assert.equal(r.affectedRows, 0);
    const name = (await rows("select name from public.tenants where id = $1", [houseY]))[0].name;
    assert.equal(name, "Casa Y");
  });

  test("referência cruzada entre casas é recusada pelas chaves compostas", async () => {
    const mX = (await rows("select id from public.memberships where tenant_id = $1 and user_id = $2", [houseX, A]))[0].id;
    const roleY = (await rows("select id from public.roles where tenant_id = $1 and name = 'Membro'", [houseY]))[0].id;
    // Mesmo como superusuário (sem RLS), o banco impede ligar vínculo da casa X a papel da casa Y.
    await rejects(
      () => db.query("insert into public.membership_roles (tenant_id, membership_id, role_id) values ($1, $2, $3)", [houseX, mX, roleY]),
      /foreign key/i,
    );
  });

  test("usuário sem casa e usuário anônimo não veem nada", async () => {
    const d = await asUser(D, () => rows("select 1 from public.tenants"));
    assert.equal(d.length, 0);
    await rejects(() => asUser(null, () => rows("select 1 from public.tenants")), /permission denied/i);
  });

  test("my_houses devolve só as casas do usuário, com permissões", async () => {
    const a = await asUser(A, () => rows("select * from public.my_houses()"));
    assert.equal(a.length, 1);
    assert.equal(a[0].slug, "casa-x");
    assert.ok((a[0].permissions as string[]).includes("identidade.publicar"));
    const c = await asUser(C, () => rows("select * from public.my_houses()"));
    assert.deepEqual((c[0].permissions as string[]).sort(), ["atividades.ver", "limpeza.ver"]);
    assert.equal((await asUser(D, () => rows("select * from public.my_houses()"))).length, 0);
  });
});

describe("permissões dentro da mesma casa", () => {
  test("membro comum não altera a casa nem as configurações", async () => {
    const t = await asUser(C, () => db.query("update public.tenants set name = 'x' where id = $1", [houseX]));
    assert.equal(t.affectedRows, 0);
    const s = await asUser(C, () => db.query("update public.house_settings set member_capacity = 5 where tenant_id = $1", [houseX]));
    assert.equal(s.affectedRows, 0);
  });

  test("membro comum não gerencia usuários", async () => {
    await rejects(
      () => asUser(C, () => db.query("insert into public.memberships (tenant_id, user_id) values ($1, $2)", [houseX, D])),
      /row-level security/i,
    );
  });

  test("administrador altera a capacidade da casa, separada do limite de contas", async () => {
    const r = await asUser(A, () => db.query("update public.house_settings set member_capacity = 50 where tenant_id = $1", [houseX]));
    assert.equal(r.affectedRows, 1);
    const seats = (await rows("select seat_limit from public.subscriptions where tenant_id = $1", [houseX]))[0].seat_limit;
    assert.equal(seats, 10);
  });

  test("slug da casa é imutável pelo cliente", async () => {
    await rejects(
      () => asUser(A, () => db.query("update public.tenants set slug = 'outro' where id = $1", [houseX])),
      /permission denied/i,
    );
  });

  test("papéis do sistema não podem ser apagados nem editados", async () => {
    const del = await asUser(A, () => db.query("delete from public.roles where tenant_id = $1 and name = 'Administrador'", [houseX]));
    assert.equal(del.affectedRows, 0);
    const perm = await asUser(A, () =>
      db.query("delete from public.role_permissions where tenant_id = $1 and permission_key = 'usuarios.gerenciar'", [houseX]));
    assert.equal(perm.affectedRows, 0);
  });

  test("administrador cria papel personalizado", async () => {
    const r = await asUser(A, () => db.query("insert into public.roles (tenant_id, name) values ($1, 'Almoxarife') returning id", [houseX]));
    assert.equal(r.rows.length, 1);
  });
});

describe("auditoria", () => {
  test("só quem tem auditoria.ver lê; membro comum não vê nada", async () => {
    assert.ok((await asUser(A, () => rows("select 1 from public.audit_log where tenant_id = $1", [houseX]))).length >= 1);
    assert.equal((await asUser(C, () => rows("select 1 from public.audit_log"))).length, 0);
  });

  test("registro é só de inclusão: clientes não escrevem, alteram nem apagam", async () => {
    await rejects(
      () => asUser(A, () => db.query("insert into public.audit_log (tenant_id, action) values ($1, 'falso')", [houseX])),
      /permission denied/i,
    );
    await rejects(() => asUser(A, () => db.query("update public.audit_log set action = 'x'")), /permission denied/i);
    await rejects(() => asUser(A, () => db.query("delete from public.audit_log")), /permission denied/i);
  });

  test("log_audit só grava em casa da qual o usuário é membro", async () => {
    await asUser(A, () => db.query("select public.log_audit($1, 'teste', 'x', '1', '{}'::jsonb)", [houseX]));
    await rejects(
      () => asUser(A, () => db.query("select public.log_audit($1, 'teste', 'x', '1', '{}'::jsonb)", [houseY])),
      /sem acesso/i,
    );
  });
});

describe("criação de casa", () => {
  test("slug duplicado é recusado e exige login", async () => {
    await rejects(() => asUser(D, () => db.query("select public.create_house('Outra', 'casa-x')")), /duplicate|unique/i);
    await rejects(() => asUser(null, () => db.query("select public.create_house('Outra', 'outra')")), /permission denied|não autenticado/i);
  });

  test("slug inválido é recusado", async () => {
    await rejects(() => asUser(D, () => db.query("select public.create_house('Outra', 'Casa Inválida!')")), /check constraint/i);
  });
});
