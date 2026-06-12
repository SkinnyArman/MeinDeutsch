/**
 * In-process background work queue with per-key deduplication and a
 * concurrency cap. Used for pool refills (Alltagssprache prompts, Daily Talk
 * questions): a key that is already scheduled or running is not enqueued
 * again, and at most `maxConcurrent` jobs run at once.
 *
 * Single-instance only: state lives in process memory.
 */
export interface RefillQueue<T> {
  schedule(key: string, item: T): boolean;
}

export const createRefillQueue = <T>(options: {
  maxConcurrent: number;
  run: (item: T) => Promise<void>;
  onError: (item: T, error: unknown) => void;
}): RefillQueue<T> => {
  const scheduledKeys = new Set<string>();
  const pending: Array<{ key: string; item: T }> = [];
  let activeCount = 0;

  const drain = (): void => {
    while (activeCount < options.maxConcurrent && pending.length > 0) {
      const next = pending.shift();
      if (!next) {
        return;
      }

      activeCount += 1;
      setImmediate(() => {
        options
          .run(next.item)
          .catch((error: unknown) => {
            options.onError(next.item, error);
          })
          .finally(() => {
            activeCount -= 1;
            scheduledKeys.delete(next.key);
            drain();
          });
      });
    }
  };

  return {
    schedule(key: string, item: T): boolean {
      if (scheduledKeys.has(key)) {
        return false;
      }

      scheduledKeys.add(key);
      pending.push({ key, item });
      drain();
      return true;
    }
  };
};
