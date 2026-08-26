import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // Força Secure em produção e SameSite=strict — ver mesma nota em supabase-middleware.ts.
              cookieStore.set(name, value, { ...options, secure: process.env.NODE_ENV === "production", sameSite: "strict" })
            );
          } catch {
            // setAll em Server Components de leitura — ignorar
          }
        },
      },
    }
  );
}
