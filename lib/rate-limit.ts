const attemptStore = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL = 60_000;
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

let lastCleanup = Date.now();

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number | null } {
  const now = Date.now();

  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [key, entry] of attemptStore) {
      if (entry.resetAt < now) {
        attemptStore.delete(key);
      }
    }
    lastCleanup = now;
  }

  const entry = attemptStore.get(ip);

  if (!entry || entry.resetAt < now) {
    attemptStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: null };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true, retryAfter: null };
}
