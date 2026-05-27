/**
 * Simple in-process rate limiter.
 *
 * NOTE: This works per-process. On Vercel (serverless / edge), each cold-start
 * gets a fresh Map. For production at scale, replace with Upstash Redis:
 *   https://github.com/upstash/ratelimit
 */

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>();

/**
 * Returns true if the request should be allowed, false if rate-limited.
 * @param key      Unique key (e.g. `login:${ip}` or `signup:${email}`)
 * @param max      Maximum requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count++;
  return true;
}

/** Extract the best available IP from request headers (Vercel-aware). */
export function getClientIp(req: Request): string {
  return (
    (req.headers as Headers).get('x-forwarded-for')?.split(',')[0].trim() ||
    (req.headers as Headers).get('x-real-ip') ||
    'unknown'
  );
}
