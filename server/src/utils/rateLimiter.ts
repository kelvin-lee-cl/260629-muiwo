export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefillMs: number;

  constructor(
    private readonly ratePerSecond: number,
    private readonly burst: number,
  ) {
    this.tokens = burst;
    this.lastRefillMs = Date.now();
  }

  tryConsume(): boolean {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillMs) / 1000;
    this.tokens = Math.min(
      this.burst,
      this.tokens + elapsedSeconds * this.ratePerSecond,
    );
    this.lastRefillMs = now;

    if (this.tokens < 1) {
      return false;
    }

    this.tokens -= 1;
    return true;
  }
}

export const sharedRateLimiter = new TokenBucketRateLimiter(5, 10);

export function rateLimitMiddleware(
  _req: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } },
  next: () => void,
): void {
  if (!sharedRateLimiter.tryConsume()) {
    res.status(429).json({ error: "Too many requests. Please wait a moment." });
    return;
  }

  next();
}
