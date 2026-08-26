import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

// CSP pragmática para Next.js App Router: 'unsafe-inline' em script-src é
// necessário porque o RSC injeta scripts inline (__next_f.push) para o
// streaming do payload — sem isso a hidratação quebra. worker-src cobre o
// service worker do next-pwa. challenges.cloudflare.com é o widget Turnstire
// (anti-bot no login/cadastro) — inofensivo mesmo sem a site key configurada,
// pois o script só é carregado quando NEXT_PUBLIC_TURNSTILE_SITE_KEY existe.
// Nenhum outro domínio de terceiro é preciso: o checkout da Stripe é redirect
// de página inteira (window.location), não iframe nem Stripe.js no cliente.
// 'unsafe-eval' só em dev: o webpack usa eval() para os source maps do modo
// de desenvolvimento (next dev). O build de produção (o que a Vercel serve)
// não usa eval, então fica de fora do script-src real.
const isDev = process.env.NODE_ENV === "development";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withPWA(nextConfig);
