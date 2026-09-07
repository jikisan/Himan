import type { PendingOp } from './SyncTypes.js';

/**
 * Persistence contract for the outbox. Platform provides a concrete
 * implementation (SQLite on mobile). Ops must be returned in FIFO order
 * (ascending createdAt, tie-broken by insertion order).
 */
export interface SyncStorage {
  enqueue(op: PendingOp): Promise<void>;
  /** All pending ops in FIFO order. */
  peekAll(): Promise<PendingOp[]>;
  update(op: PendingOp): Promise<void>;
  remove(opId: string): Promise<void>;
  clear(): Promise<void>;
}

/** In-memory storage — default for tests and as a fallback. */
export class InMemorySyncStorage implements SyncStorage {
  private ops: PendingOp[] = [];

  async enqueue(op: PendingOp): Promise<void> {
    this.ops.push(op);
  }

  async peekAll(): Promise<PendingOp[]> {
    return [...this.ops].sort((a, b) => {
      if (a.createdAt === b.createdAt) return 0;
      return a.createdAt < b.createdAt ? -1 : 1;
    });
  }

  async update(op: PendingOp): Promise<void> {
    const idx = this.ops.findIndex((o) => o.opId === op.opId);
    if (idx >= 0) this.ops[idx] = op;
  }

  async remove(opId: string): Promise<void> {
    this.ops = this.ops.filter((o) => o.opId !== opId);
  }

  async clear(): Promise<void> {
    this.ops = [];
  }
}
