import type { PendingOp, PushResult, DroppedOp } from './SyncTypes.js';
import type { SyncQueue } from './SyncQueue.js';

/**
 * Executes a single op against the backend. Implemented by the platform
 * layer (maps op → repository call). Throw to signal failure; classify the
 * failure via `isRetryable`.
 */
export type OpExecutor = (op: PendingOp) => Promise<void>;

/**
 * Returns true if the error is transient (network/5xx) and the op should be
 * retained for a later drain; false if permanent (4xx) and the op should be
 * dropped and surfaced.
 */
export type RetryClassifier = (err: unknown) => boolean;

export interface SyncEngineOptions {
  maxRetries?: number; // drop after this many attempts even if "retryable"
}

export class SyncEngine {
  private draining = false;
  private queue: SyncQueue;
  private executor: OpExecutor;
  private isRetryable: RetryClassifier;
  private options: SyncEngineOptions;

  constructor(
    queue: SyncQueue,
    executor: OpExecutor,
    isRetryable: RetryClassifier,
    options: SyncEngineOptions = {}
  ) {
    this.queue = queue;
    this.executor = executor;
    this.isRetryable = isRetryable;
    this.options = options;
  }

  get isDraining(): boolean {
    return this.draining;
  }

  /**
   * Drain the outbox in FIFO order. Stops early on the first transient
   * failure (network is down — retain everything after it). Permanent
   * failures drop the offending op and continue.
   */
  async push(): Promise<PushResult> {
    if (this.draining) {
      return { pushed: 0, dropped: [], remaining: await this.queue.size(), stoppedOnNetworkError: false };
    }
    this.draining = true;
    const maxRetries = this.options.maxRetries ?? 8;
    const dropped: DroppedOp[] = [];
    let pushed = 0;
    let stoppedOnNetworkError = false;

    try {
      const ops = await this.queue.list();
      for (const op of ops) {
        try {
          await this.executor(op);
          await this.queue.markDone(op.opId);
          pushed++;
        } catch (err) {
          const retryable = this.isRetryable(err);
          if (retryable && op.retries + 1 < maxRetries) {
            await this.queue.markFailed(op);
            stoppedOnNetworkError = true;
            break; // network down — stop; preserve order for the rest
          }
          // Permanent (4xx) or exhausted retries → drop and surface.
          await this.queue.markDone(op.opId);
          dropped.push({
            op,
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } finally {
      this.draining = false;
    }

    return {
      pushed,
      dropped,
      remaining: await this.queue.size(),
      stoppedOnNetworkError,
    };
  }
}

/** Exponential backoff with jitter, capped. */
export function backoffDelayMs(attempt: number, capMs = 60_000): number {
  const base = Math.min(capMs, 1000 * 2 ** attempt);
  return base / 2 + Math.random() * (base / 2);
}
