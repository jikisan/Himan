// Offline sync primitives — platform-agnostic (no RN / DOM imports).

export type SyncEntity =
  | 'store'
  | 'product'
  | 'productStore'
  | 'list'
  | 'listItem'
  | 'session'
  | 'sessionItem'
  | 'preferences';

export type SyncOpType = 'create' | 'update' | 'delete';

/**
 * A pending write in the offline outbox. Ops are drained in FIFO order.
 * `entityId` is the client-generated UUID of the affected row so that
 * dependent offline ops (e.g. add item to a not-yet-synced session) need
 * no server-side id remapping. `baseUpdatedAt` is the row's `updated_at`
 * the client last saw — used for last-write-wins reconciliation on pull.
 */
export interface PendingOp {
  opId: string;
  type: SyncOpType;
  entity: SyncEntity;
  entityId: string;
  payload: Record<string, unknown>;
  baseUpdatedAt: string | null;
  createdAt: string; // ISO
  retries: number;
}

export interface PushResult {
  pushed: number;
  dropped: DroppedOp[];
  remaining: number;
  stoppedOnNetworkError: boolean;
}

export interface DroppedOp {
  op: PendingOp;
  reason: string;
}

export type SyncStatus =
  | { kind: 'synced' }
  | { kind: 'syncing' }
  | { kind: 'offline-pending'; count: number }
  | { kind: 'error'; message: string };
