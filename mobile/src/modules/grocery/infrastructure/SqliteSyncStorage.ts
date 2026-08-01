import type { SyncStorage, PendingOp } from '@himan/shared/grocery';
import { getDb } from './db';

interface OutboxRow {
  op_id: string;
  seq: number;
  type: string;
  entity: string;
  entity_id: string;
  payload: string;
  base_updated_at: string | null;
  created_at: string;
  retries: number;
}

/** expo-sqlite backed outbox. FIFO by (created_at, seq). */
export class SqliteSyncStorage implements SyncStorage {
  private seq = Date.now();

  async enqueue(op: PendingOp): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_outbox
        (op_id, seq, type, entity, entity_id, payload, base_updated_at, created_at, retries)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        op.opId,
        this.seq++,
        op.type,
        op.entity,
        op.entityId,
        JSON.stringify(op.payload),
        op.baseUpdatedAt,
        op.createdAt,
        op.retries,
      ]
    );
  }

  async peekAll(): Promise<PendingOp[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<OutboxRow>(
      'SELECT * FROM sync_outbox ORDER BY created_at ASC, seq ASC'
    );
    return rows.map(this.toOp);
  }

  async update(op: PendingOp): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      'UPDATE sync_outbox SET payload = ?, base_updated_at = ?, retries = ? WHERE op_id = ?',
      [JSON.stringify(op.payload), op.baseUpdatedAt, op.retries, op.opId]
    );
  }

  async remove(opId: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM sync_outbox WHERE op_id = ?', [opId]);
  }

  async clear(): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM sync_outbox');
  }

  private toOp(row: OutboxRow): PendingOp {
    return {
      opId: row.op_id,
      type: row.type as PendingOp['type'],
      entity: row.entity as PendingOp['entity'],
      entityId: row.entity_id,
      payload: JSON.parse(row.payload) as Record<string, unknown>,
      baseUpdatedAt: row.base_updated_at,
      createdAt: row.created_at,
      retries: row.retries,
    };
  }
}
