import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Abre o Customer Portal da Stripe (cancelar, trocar cartão, ver faturas).
 * Usado pelo botão "Gerir cobrança" quando a assinatura está ativa.
 */
export async function POST(request: Request) {
  if (!(await rateLimit(`portal:${clientIp(request)}`))) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um momento." }, { status: 429 });
  }

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const admin = createSupabaseAdmin();
    const { data: sub } = await admin
      .from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: "Sem cliente Stripe — assine primeiro." }, { status: 400 });
    }

    const stripe = getStripe();
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim() || "http://localhost:3000";
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${site}/checkout`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err: unknown) {
    console.error("[api/portal]", err);
    return NextResponse.json({ error: "Não foi possível abrir o portal. Tente novamente." }, { status: 500 });
  }
}
