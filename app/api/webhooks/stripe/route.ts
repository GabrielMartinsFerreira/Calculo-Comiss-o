import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, normalizeStatus } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook da Stripe — fonte de verdade do estado da assinatura.
 * Valida a assinatura do evento com STRIPE_WEBHOOK_SECRET e atualiza a tabela
 * `subscriptions` via service_role (ignora RLS, pois não há utilizador logado).
 */
export async function POST(req: Request) {
  const whSecret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  const sig = req.headers.get("stripe-signature");
  if (!sig || !whSecret) {
    return NextResponse.json({ error: "assinatura ausente" }, { status: 400 });
  }

  const stripe = getStripe();
  const body = await req.text(); // corpo cru é obrigatório para validar a assinatura

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  const updateByUser = (userId: string, patch: Record<string, unknown>) =>
    admin.from("subscriptions").update(patch).eq("user_id", userId);
  const updateByCustomer = (customerId: string, patch: Record<string, unknown>) =>
    admin.from("subscriptions").update(patch).eq("stripe_customer_id", customerId);

  const toIso = (unixSeconds: number | null | undefined) =>
    unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;

  // Robusto entre versões da API: o fim do período migrou do root da
  // subscription para cada item (`items.data[].current_period_end`).
  const subPeriodEnd = (sub: Stripe.Subscription): number | null => {
    const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
    const fromRoot = (sub as unknown as { current_period_end?: number }).current_period_end;
    return item?.current_period_end ?? fromRoot ?? null;
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.client_reference_id ?? (s.metadata?.user_id as string | undefined);
        const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
        const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null;

        let status = "active";
        let periodEnd: string | null = null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          status = sub.status;
          periodEnd = toIso(subPeriodEnd(sub));
        }

        const patch = {
          status: normalizeStatus(status),
          stripe_subscription_id: subId,
          stripe_customer_id: customerId,
          current_period_end: periodEnd,
        };
        if (userId) await updateByUser(userId, patch);
        else if (customerId) await updateByCustomer(customerId, patch);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id as string | undefined;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const patch = {
          status: event.type.endsWith("deleted") ? "canceled" : normalizeStatus(sub.status),
          stripe_subscription_id: sub.id,
          current_period_end: toIso(subPeriodEnd(sub)),
        };
        if (userId) await updateByUser(userId, patch);
        else await updateByCustomer(customerId, patch);
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (customerId) await updateByCustomer(customerId, { status: "past_due" });
        break;
      }

      default:
        break; // outros eventos: ignorados de propósito
    }
  } catch (err: unknown) {
    console.error("[api/webhooks/stripe]", err);
    return NextResponse.json({ error: "erro ao processar evento" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
