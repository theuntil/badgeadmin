import 'server-only';

// Basit bellek içi hız sınırı (tek container için yeterli).
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryInSec: 0 };
  }
  b.count += 1;
  return { ok: b.count <= limit, retryInSec: Math.ceil((b.resetAt - now) / 1000) };
}

export function reset(key: string) {
  buckets.delete(key);
}

export function clientIp(h: Headers) {
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'unknown').trim();
}
