import { createBrowserClient } from "@supabase/ssr";
import type { ServiceOrder, ServiceOrderInsert, ServiceOrderUpdate } from "./types";

// Trim defende contra espaços/quebras de linha coladas por engano no painel do Vercel
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// ── Auth ─────────────────────────────────────────────────────

export async function signIn(
  email: string,
  password: string,
  rememberMe: boolean
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // "Lembrar-me": localStorage persiste entre sessões do browser
  // Sem "Lembrar-me": sessionStorage apaga quando o tab fecha
  if (rememberMe) {
    localStorage.setItem("remember_me", "true");
    sessionStorage.removeItem("session_only");
  } else {
    localStorage.removeItem("remember_me");
    sessionStorage.setItem("session_only", "active");
  }
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  rememberMe: boolean
): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }, // vai para user_metadata
  });
  if (error) throw error;

  // Se a confirmação de e-mail estiver desativada no Supabase, já vem sessão.
  // Nesse caso, gravar as flags de "Lembrar-me" para o ConditionalLayout não deslogar.
  if (data.session) {
    if (rememberMe) {
      localStorage.setItem("remember_me", "true");
      sessionStorage.removeItem("session_only");
    } else {
      localStorage.removeItem("remember_me");
      sessionStorage.setItem("session_only", "active");
    }
  }

  return { needsConfirmation: !data.session };
}

export async function signOut(): Promise<void> {
  localStorage.removeItem("remember_me");
  sessionStorage.removeItem("session_only");
  await supabase.auth.signOut();
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ── Service Orders ───────────────────────────────────────────

export async function getOrders(competencia?: string): Promise<ServiceOrder[]> {
  let query = supabase
    .from("service_orders")
    .select("*")
    .order("order_date", { ascending: false });

  if (competencia) {
    query = query.eq("competencia", competencia);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createOrder(order: ServiceOrderInsert): Promise<ServiceOrder> {
  const { data, error } = await supabase
    .from("service_orders")
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrder(id: string, updates: ServiceOrderUpdate): Promise<ServiceOrder> {
  const { data, error } = await supabase
    .from("service_orders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from("service_orders").delete().eq("id", id);
  if (error) throw error;
}

export async function confirmPayment(id: string): Promise<ServiceOrder> {
  return updateOrder(id, { status: "Pago" });
}

export async function getMonthlyStats(competencia: string) {
  const { data, error } = await supabase
    .from("service_orders")
    .select("order_value, status")
    .eq("competencia", competencia);
  if (error) throw error;

  const orders = data ?? [];
  const total_previsto = orders.reduce((s, o) => s + o.order_value, 0);
  const total_pago = orders.filter((o) => o.status === "Pago").reduce((s, o) => s + o.order_value, 0);
  const count_pendente = orders.filter((o) => o.status === "Pendente").length;
  const count_pago = orders.filter((o) => o.status === "Pago").length;

  return { total_previsto, total_pago, count_pendente, count_pago };
}

export async function getCompetencias(): Promise<string[]> {
  const { data, error } = await supabase
    .from("service_orders")
    .select("competencia")
    .order("competencia", { ascending: false });
  if (error) throw error;
  const seen = new Set<string>();
  return (data ?? [])
    .map((d) => d.competencia)
    .filter((c) => { if (seen.has(c)) return false; seen.add(c); return true; });
}
