import { AiUnavailableError, type AiRunner } from "./ai";

/*
 * Spending limits for the Workers AI fallback. Every unique phrase the catalog can't read costs
 * ~30 neurons (free tier: 10,000/day, reset 00:00 UTC), so without limits one person could use
 * up the day for everyone. When a limit is hit the AI simply counts as unavailable: the pipeline
 * returns "unavailable"/"partial" and the add sheet offers manual entry, so logging never blocks.
 */
export const AI_LIMITS = {
  userPerHour: 20,
  userPerDay: 50,
  /** ~7,500 neurons: leaves headroom under the free 10,000 for retries and the eval script. */
  globalPerDay: 250,
};

/** Consecutive AI failures that open the breaker, and how long it stays open. */
export const BREAKER = { failures: 3, openMs: 5 * 60 * 1000 };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Atomic counters (D1 in production). Keys carry their time bucket, so they never need resetting. */
export interface UsageStore {
  /** Adds one to `key` and returns the new count. `expiresAt` (epoch ms) is when it can be pruned. */
  increment(key: string, expiresAt: number): Promise<number>;
  /** Raises `key` to at least `count` (used to stop every isolate once the provider says we're out). */
  raiseTo(key: string, count: number, expiresAt: number): Promise<void>;
}

export function usageKeys(userId: string, now: number) {
  const hour = Math.floor(now / HOUR_MS);
  const day = Math.floor(now / DAY_MS); // UTC day, matching the Workers AI reset
  return {
    userHour: { key: `ai:u:${userId}:h:${hour}`, expiresAt: (hour + 1) * HOUR_MS + DAY_MS },
    userDay: { key: `ai:u:${userId}:d:${day}`, expiresAt: (day + 2) * DAY_MS },
    globalDay: { key: `ai:global:d:${day}`, expiresAt: (day + 2) * DAY_MS },
  };
}

/** Per-isolate circuit breaker: stops calling an AI that keeps failing, so requests fail fast. */
export class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;

  isOpen(now: number) {
    return now < this.openUntil;
  }
  success() {
    this.failures = 0;
  }
  failure(now: number) {
    this.failures += 1;
    if (this.failures >= BREAKER.failures) {
      this.openUntil = now + BREAKER.openMs;
      this.failures = 0;
    }
  }
}

/** Workers AI errors that mean the account is out of neurons or limited (e.g. 4006, 3036). */
export const isQuotaError = (err: unknown) =>
  err instanceof Error && /\b(4006|3036)\b|daily free allocation|neurons|account limited/i.test(err.message);

export type LimitReason = "breaker" | "user_hour" | "user_day" | "global_day";

/**
 * Wraps the AI binding so each call first takes a slot from the per-user and global budgets.
 * Store errors fail closed (no AI call), since the AI is optional and the budget is the point.
 */
export function limitAi(
  ai: AiRunner | null,
  opts: {
    userId: string;
    store: UsageStore;
    breaker: CircuitBreaker;
    now?: () => number;
    onLimited?: (reason: LimitReason) => void;
  },
): AiRunner | null {
  if (!ai) return null;
  const now = opts.now ?? Date.now;
  const deny = (reason: LimitReason): never => {
    opts.onLimited?.(reason);
    throw new AiUnavailableError(`AI limit reached (${reason})`);
  };

  return {
    async run(model, inputs) {
      const t = now();
      if (opts.breaker.isOpen(t)) deny("breaker");

      const keys = usageKeys(opts.userId, t);
      // User budgets first, so someone who is over their own limit never spends the global one.
      if ((await opts.store.increment(keys.userHour.key, keys.userHour.expiresAt)) > AI_LIMITS.userPerHour) deny("user_hour");
      if ((await opts.store.increment(keys.userDay.key, keys.userDay.expiresAt)) > AI_LIMITS.userPerDay) deny("user_day");
      if ((await opts.store.increment(keys.globalDay.key, keys.globalDay.expiresAt)) > AI_LIMITS.globalPerDay) deny("global_day");

      try {
        const out = await ai.run(model, inputs);
        opts.breaker.success();
        return out;
      } catch (err) {
        opts.breaker.failure(now());
        if (isQuotaError(err)) {
          // Out of neurons for today: stop every isolate until the UTC reset.
          await opts.store.raiseTo(keys.globalDay.key, AI_LIMITS.globalPerDay, keys.globalDay.expiresAt).catch(() => undefined);
        }
        throw err;
      }
    },
  };
}
