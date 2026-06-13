import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe, STRIPE_PRICE_ID } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Cria uma Checkout Session da Stripe e devolve a URL para redirecionar.
 * Reutiliza (ou cria) o customer Stripe do utilizador e grava o user_id
 * em metadata/client_reference_id para o webhook conseguir reconciliar.
 */
export async function POST() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!STRIPE_PRICE_ID) return NextResponse.json({ error: "STRIPE_PRICE_ID não configurado" }, { status: 500 });

  try {
    const stripe = getStripe();
    const admin = createSupabaseAdmin();
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim() || "http://localhost:3000";

    // Customer existente?
    const { data: sub } = await admin
      .from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();

    let customerId = sub?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      // grava só o customer_id (não mexe no status)
      await admin.from("subscriptions").upsert(
        { user_id: user.id, stripe_customer_id: customerId },
        { onConflict: "user_id" }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id } },
      allow_promotion_codes: true,
      success_url: `${site}/?checkout=success`,
      cancel_url: `${site}/checkout?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao criar checkout";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
