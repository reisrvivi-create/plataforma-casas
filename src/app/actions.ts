"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { HOUSE_COOKIE, getContext } from "@/lib/context";
import { isDemoMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; info?: string };

const MESSAGES = {
  generic: "Não foi possível concluir. Tente novamente.",
  credentials: "E-mail ou senha incorretos.",
  fields: "Preencha e-mail e senha.",
  password: "A senha precisa ter pelo menos 10 caracteres.",
  slug: "O endereço da casa deve ter de 3 a 40 letras minúsculas, números ou hífens.",
  slugTaken: "Esse endereço já está em uso. Escolha outro.",
  name: "Informe o nome da casa (2 a 80 caracteres).",
};

function text(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  if (isDemoMode()) redirect("/dashboard");
  const email = text(formData, "email");
  const password = text(formData, "password");
  if (!email || !password) return { error: MESSAGES.fields };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: MESSAGES.credentials };
  redirect("/dashboard");
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  if (isDemoMode()) redirect("/dashboard");
  const email = text(formData, "email");
  const password = text(formData, "password");
  const name = text(formData, "name");
  if (!email || !password) return { error: MESSAGES.fields };
  if (password.length < 10) return { error: MESSAGES.password };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
  if (error) return { error: MESSAGES.generic };
  if (!data.session) return { info: "Enviamos um e-mail de confirmação. Abra o link para ativar a conta e depois entre." };
  redirect("/dashboard");
}

export async function signOut() {
  if (!isDemoMode()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  (await cookies()).delete(HOUSE_COOKIE);
  redirect("/login");
}

/** Troca a casa atual. O valor do cookie só é aceito se a pessoa for membro da casa. */
export async function selectHouse(formData: FormData) {
  const id = text(formData, "house");
  const ctx = await getContext();
  if (!ctx || !ctx.houses.some((h) => h.id === id)) return;
  (await cookies()).set(HOUSE_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function createHouse(_: FormState, formData: FormData): Promise<FormState> {
  if (isDemoMode()) redirect("/dashboard");
  const name = text(formData, "name");
  const slug = text(formData, "slug").toLowerCase();
  if (name.length < 2 || name.length > 80) return { error: MESSAGES.name };
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug)) return { error: MESSAGES.slug };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_house", { p_name: name, p_slug: slug });
  if (error) return { error: error.code === "23505" ? MESSAGES.slugTaken : MESSAGES.generic };
  (await cookies()).set(HOUSE_COOKIE, data as string, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard");
}
