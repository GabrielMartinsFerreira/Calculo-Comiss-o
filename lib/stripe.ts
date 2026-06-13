import Stripe from "stripe";
import type { SubscriptionStatus } from "./types";

// Inicialização preguiçosa: evita instanciar (e potencialmente lançar) no build,
// quando as variáveis de ambiente ainda podem não existir. Só cria no 1º request.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
    if (!key) throw new Error("STRIPE_SECRET_KEY não configurada");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export const STRIPE_PRICE_ID = (process.env.STRIPE_PRICE_ID ?? "").trim();

/** Mapeia os status da Stripe para o enum interno (trial|active|past_due|canceled). */
export function normalizeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":           return "trial";
    case "active":             return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "paused":             return "past_due";
    case "canceled":
    case "incomplete_expired": return "canceled";
    default:                   return "past_due";
  }
}
