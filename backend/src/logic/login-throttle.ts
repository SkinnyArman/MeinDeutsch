/**
 * In-memory brute-force throttle for password sign-in. After `maxFailures`
 * consecutive failures per key (normalized email), the key is locked for
 * `lockMs`. Single-instance only, like the pool refill queues.
 */
export interface LoginThrottle {
  isLocked(key: string, now?: Date): boolean;
  lockedUntil(key: string): Date | null;
  recordFailure(key: string, now?: Date): void;
  reset(key: string): void;
}

export const createLoginThrottle = (options: { maxFailures: number; lockMs: number }): LoginThrottle => {
  const state = new Map<string, { failures: number; lockedUntil: number | null }>();

  return {
    isLocked(key: string, now = new Date()): boolean {
      const entry = state.get(key);
      if (!entry?.lockedUntil) {
        return false;
      }
      if (entry.lockedUntil <= now.getTime()) {
        state.delete(key);
        return false;
      }
      return true;
    },

    lockedUntil(key: string): Date | null {
      const entry = state.get(key);
      return entry?.lockedUntil ? new Date(entry.lockedUntil) : null;
    },

    recordFailure(key: string, now = new Date()): void {
      const entry = state.get(key) ?? { failures: 0, lockedUntil: null };
      entry.failures += 1;
      if (entry.failures >= options.maxFailures) {
        entry.lockedUntil = now.getTime() + options.lockMs;
        entry.failures = 0;
      }
      state.set(key, entry);
    },

    reset(key: string): void {
      state.delete(key);
    }
  };
};
