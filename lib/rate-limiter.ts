export const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 10; // 10 requests per window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

export function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const userLimits = rateLimitStore.get(userId);

  if (!userLimits || now > userLimits.resetTime) {
    // Reset or initialize rate limit
    const resetTime = now + RATE_LIMIT_WINDOW;
    rateLimitStore.set(userId, { count: 1, resetTime });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, resetTime };
  }

  if (userLimits.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: userLimits.resetTime };
  }

  // Increment count
  userLimits.count++;
  rateLimitStore.set(userId, userLimits);

  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - userLimits.count, resetTime: userLimits.resetTime };
}
