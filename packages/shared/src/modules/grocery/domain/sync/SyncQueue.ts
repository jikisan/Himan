import type { PendingOp, SyncEntity, SyncOpType } from './SyncTypes.js';
import type { SyncStorage } from './SyncStorage.js';

export interface EnqueueInput {
  type: SyncOpType;
  entity: SyncEntity;
  entityId: string;
  payload?: Record<string, unknown>;
  baseUpdatedAt?: string | null;
}

function defaultGenId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback RFC4122-ish
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Ordered outbox with coalescing. Collapses redundant writes to the same
 * entity row before they reach the network:
 *   create → update    ⇒ single create (merged payload)
 *   create → delete     ⇒ nothing (row never reached server)
 *   update → update     ⇒ single update (merged payload)
 *   update → delete     ⇒ single delete
 * Coalescing preserves the earliest op's queue position and `baseUpdatedAt`
 * so last-write-wins reconciliation stays anchored to the first seen state.
 */
export class SyncQueue {
  private storage: SyncStorage;
  private genId: () => string;

  constructor(storage: SyncStorage, genId: () => string = defaultGenId) {
    this.storage = storage;
    this.genId = genId;
  }

  async enqueue(input: EnqueueInput): Promise<void> {
    const existing = (await this.storage.peekAll()).filter(
      (o) => o.entity === input.entity && o.entityId === input.entityId
    );

    const payload = input.payload ?? {};

    if (input.type === 'delete') {
      const hasUnsyncedCreate = existing.some((o) => o.type === 'create');
      // Drop all pending ops for this row.
      for (const o of existing) await this.storage.remove(o.opId);
      // If the row was only ever created locally, the delete is a no-op.
      if (hasUnsyncedCreate) return;
      await this.storage.enqueue(this.build(input, payload));
      return;
    }

    if (input.type === 'update') {
      const mergeable = existing.find(
        (o) => o.type === 'create' || o.type === 'update'
      );
      if (mergeable) {
        await this.storage.update({
          ...mergeable,
          payload: { ...mergeable.payload, ...payload },
        });
        return;
      }
      await this.storage.enqueue(this.build(input, payload));
      return;
    }

    // create
    await this.storage.enqueue(this.build(input, payload));
  }

  async list(): Promise<PendingOp[]> {
    return this.storage.peekAll();
  }

  async size(): Promise<number> {
    return (await this.storage.peekAll()).length;
  }

  async markDone(opId: string): Promise<void> {
    await this.storage.remove(opId);
  }

  async markFailed(op: PendingOp): Promise<void> {
    await this.storage.update({ ...op, retries: op.retries + 1 });
  }

  async clear(): Promise<void> {
    await this.storage.clear();
  }

  private build(input: EnqueueInput, payload: Record<string, unknown>): PendingOp {
    return {
      opId: this.genId(),
      type: input.type,
      entity: input.entity,
      entityId: input.entityId,
      payload,
      baseUpdatedAt: input.baseUpdatedAt ?? null,
      createdAt: new Date().toISOString(),
      retries: 0,
    };
  }
}
