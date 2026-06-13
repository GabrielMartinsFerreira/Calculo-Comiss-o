import { supabase } from "./supabase";
import type { Subscription } from "./types";

// Acesso à base de dados das assinaturas. Importa o cliente Supabase, por isso
// NÃO deve ser usado no middleware (Edge). Para o gate de rotas, o middleware
// faz a query diretamente via createMiddlewareClient + helpers puros de
// `lib/subscription.ts`.

/** Busca a assinatura do utilizador autenticado (RLS garante que só vê a sua). */
export async function getMySubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .maybeSingle();
  if (error) return null;
  return data as Subscription | null;
}
