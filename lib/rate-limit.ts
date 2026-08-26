import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting com upgrade automático: usa Upstash Redis (distribuído,
 * correto em serverless) quando UPSTASH_REDIS_REST_URL/TOKEN estão
 * configuradas; cai para um limiter em memória por instância enquanto
 * essas variáveis não existem. Nenhuma mudança de código é necessária
 * para ativar o Upstash — basta configurar as duas env vars.
 *
 * Limitação do fallback em memória: cada instância serverless da Vercel
 * tem seu próprio mapa — não é um limite globalmente exato, mas já barra
 * abuso rápido/automatizado de uma mesma instância quente.
 */

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const upstashLimiter = hasUpstash
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "ratelimit",
    })
  : null;

const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 500;

function memoryRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

/** true = permitido, false = limite excedido. `limit`/`windowMs` só valem para o fallback em memória (o Upstash usa 5/60s fixo acima). */
export async function rateLimit(key: string, limit = 5, windowMs = 60_000): Promise<boolean> {
  if (upstashLimiter) {
    const { success } = await upstashLimiter.limit(key);
    return success;
  }
  return memoryRateLimit(key, limit, windowMs);
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
