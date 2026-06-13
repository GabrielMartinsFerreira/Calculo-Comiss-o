import type { SubscriptionGate } from "./types";

// ⚠️ Este módulo é importado pelo middleware (Edge Runtime) — manter PURO,
// sem importar o cliente Supabase nem nenhuma API Node. O acesso à base
// fica em `lib/subscription-db.ts`.

/**
 * Rotas do "ecossistema" que exigem assinatura ativa/trial.
 * O Dashboard (`/`) e o `/checkout` ficam sempre acessíveis de propósito:
 * o Dashboard funciona como vitrine e o checkout precisa ser alcançável
 * mesmo com a assinatura vencida.
 */
export const PROTECTED_PREFIXES = ["/financas", "/lancamentos", "/relatorios"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/**
 * Decisão pura e sem dependências (roda no edge runtime do middleware
 * e também no cliente). Liberado quando:
 *   - status ∈ {active, trial}
 *   - E o período ainda não expirou (ou é nulo/perpétuo)
 * Bloqueado para {past_due, canceled} ou período vencido.
 */
export function isSubscriptionActive(
  sub: SubscriptionGate | null | undefined,
  now: Date = new Date()
): boolean {
  if (!sub) return false;
  if (sub.status !== "active" && sub.status !== "trial") return false;
  if (sub.current_period_end) {
    const end = new Date(sub.current_period_end);
    if (!Number.isNaN(end.getTime()) && end.getTime() < now.getTime()) {
      return false;
    }
  }
  return true;
}

/** Texto amigável para a UI de cobrança. */
export function describeSubscription(sub: SubscriptionGate | null): string {
  if (!sub) return "Sem assinatura ativa.";
  switch (sub.status) {
    case "trial":     return "Período de avaliação (trial).";
    case "active":    return "Assinatura ativa.";
    case "past_due":  return "Pagamento em atraso.";
    case "canceled":  return "Assinatura cancelada.";
  }
}
