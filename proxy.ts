import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase-middleware";
import { isProtectedPath, isSubscriptionActive } from "@/lib/subscription";
import type { SubscriptionGate } from "@/lib/types";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const isCheckoutPage = pathname === "/checkout";

  // ── 1. Gate de sessão (rápido, sem rede): presença do cookie sb-*-auth-token ──
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.match(/^sb-.+-auth-token/) && c.value
  );

  if (!hasSession && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (hasSession && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // ── 2. Gate de assinatura (só nas rotas do ecossistema) ──────
  // Dashboard (`/`), `/login` e `/checkout` ficam fora do gate de propósito.
  if (hasSession && isProtectedPath(pathname)) {
    const { supabase, response } = createMiddlewareClient(request);

    // getUser() valida a sessão e refresca os cookies via `response`.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .maybeSingle();

      // Fail-open: se a tabela ainda não existe (migração 007 não rodada)
      // ou houve erro transitório de rede, NÃO bloqueia o utilizador.
      if (error) return response;

      const sub = (data ?? null) as SubscriptionGate | null;
      if (!isSubscriptionActive(sub)) {
        const url = request.nextUrl.clone();
        url.pathname = "/checkout";
        return NextResponse.redirect(url);
      }
    } catch {
      return response; // fail-open
    }

    return response; // devolve cookies refrescados
  }

  // Permitir checkout mesmo sem assinatura (precisa estar logado).
  if (isCheckoutPage && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // `/api/*` fica de fora: cada rota já valida a própria autenticação
    // (getUser() no checkout/portal, assinatura HMAC no webhook da Stripe).
    // O webhook nunca envia cookie de sessão — se passasse pelo gate de
    // sessão abaixo, seria redirecionado para /login em vez de processado.
    //
    // manifest.json/sw.js/workbox-*/swe-worker-* também ficam de fora: são
    // gerados pelo next-pwa e precisam ser públicos (o browser os busca
    // antes de qualquer login, para registrar o service worker do PWA).
    // Sem essa exclusão, um visitante deslogado recebia o HTML de /login
    // no lugar do script — o registro do service worker falhava com
    // "Refused to execute script ... MIME type ('text/html')".
    "/((?!api|_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|workbox-.*|swe-worker-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
