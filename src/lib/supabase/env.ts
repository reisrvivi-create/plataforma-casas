// Variáveis de ambiente do Supabase. Em desenvolvimento, sem elas o app roda em modo demonstração.
// Em produção, a ausência delas é um erro: nunca há modo demonstração fora do desenvolvimento.

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export function isDemoMode() {
  if (supabaseEnv()) return false;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Configuração ausente: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  return true;
}
