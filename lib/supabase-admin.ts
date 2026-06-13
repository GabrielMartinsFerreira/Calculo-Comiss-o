import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a SERVICE_ROLE key — ignora o RLS.
 * Uso EXCLUSIVO no servidor (webhooks/rotas API). Nunca expor ao browser
 * nem prefixar a chave com NEXT_PUBLIC_.
 */
export function createSupabaseAdmin() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
