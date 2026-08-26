import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Cria um cliente Supabase ligado aos cookies do request/response no edge
 * runtime do middleware. Segue o padrão oficial @supabase/ssr: a `response`
 * acumula os cookies de sessão refrescados e deve ser devolvida ao final.
 */
export function createMiddlewareClient(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Força Secure em produção e SameSite=strict — o default do
            // @supabase/ssr é lax/sem secure. strict é seguro aqui porque
            // não há fluxo de OAuth com redirect de terceiro (só email/senha).
            const hardened = { ...options, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const };
            request.cookies.set(name, value);
            response.cookies.set(name, value, hardened);
          });
        },
      },
    }
  );

  return { supabase, response };
}
