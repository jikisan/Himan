import { describe, it, expect } from 'vitest';
import {
  SyncQueue,
  SyncEngine,
  InMemorySyncStorage,
  type PendingOp,
} from '@himan/shared/grocery';

function makeQueue() {
  let n = 0;
  const genId = () => `op-${++n}`;
  return new SyncQueue(new InMemorySyncStorage(), genId);
}

describe('SyncQueue coalescing', () => {
  it('preserves FIFO order across distinct entities', async () => {
    const q = makeQueue();
    await q.enqueue({ type: 'create', entity: 'store', entityId: 'a' });
    await q.enqueue({ type: 'create', entity: 'product', entityId: 'b' });
    await q.enqueue({ type: 'create', entity: 'list', entityId: 'c' });
    const ids = (await q.list()).map((o) => o.entityId);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('create then update collapses to a single create with merged payload', async () => {
    const q = makeQueue();
    await q.enqueue({ type: 'create', entity: 'product', entityId: 'p', payload: { name: 'Milk' } });
    await q.enqueue({ type: 'update', entity: 'product', entityId: 'p', payload: { price: 5 } });
    const ops = await q.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe('create');
    expect(ops[0].payload).toEqual({ name: 'Milk', price: 5 });
  });

  it('create then delete cancels out entirely', async () => {
    const q = makeQueue();
    await q.enqueue({ type: 'create', entity: 'product', entityId: 'p' });
    await q.enqueue({ type: 'delete', entity: 'product', entityId: 'p' });
    expect(await q.size()).toBe(0);
  });

  it('update then update merges payloads into one update', async () => {
    const q = makeQueue();
    await q.enqueue({ type: 'update', entity: 'product', entityId: 'p', payload: { name: 'A' } });
    await q.enqueue({ type: 'update', entity: 'product', entityId: 'p', payload: { name: 'B', price: 9 } });
    const ops = await q.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe('update');
    expect(ops[0].payload).toEqual({ name: 'B', price: 9 });
  });

  it('update then delete becomes a single delete', async () => {
    const q = makeQueue();
    await q.enqueue({ type: 'update', entity: 'product', entityId: 'p', payload: { name: 'A' } });
    await q.enqueue({ type: 'delete', entity: 'product', entityId: 'p' });
    const ops = await q.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe('delete');
  });
});

class HttpError extends Error {
  status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}
const isRetryable = (err: unknown) => !(err instanceof HttpError && err.status < 500);

describe('SyncEngine push', () => {
  it('drains all ops on success', async () => {
    const q = makeQueue();
    await q.enqueue({ type: 'create', entity: 'store', entityId: 'a' });
    await q.enqueue({ type: 'create', entity: 'store', entityId: 'b' });
    const engine = new SyncEngine(q, async () => {}, isRetryable);
    const res = await engine.push();
    expect(res.pushed).toBe(2);
    expect(res.remaining).toBe(0);
  });

  it('stops and retains order on transient (network) failure', async () => {
    const q = makeQueue();
    await q.enqueue({ type: 'create', entity: 'store', entityId: 'a' });
    await q.enqueue({ type: 'create', entity: 'store', entityId: 'b' });
    const seen: string[] = [];
    const engine = new SyncEngine(
      q,
      async (op: PendingOp) => {
        seen.push(op.entityId);
        if (op.entityId === 'a') throw new Error('network down');
      },
      isRetryable
    );
    const res = await engine.push();
    expect(res.stoppedOnNetworkError).toBe(true);
    expect(res.pushed).toBe(0);
    expect(res.remaining).toBe(2);
    expect(seen).toEqual(['a']); // did not proceed to 'b'
  });

  it('drops permanent (4xx) failures and continues', async () => {
    const q = makeQueue();
    await q.enqueue({ type: 'create', entity: 'store', entityId: 'a' });
    await q.enqueue({ type: 'create', entity: 'store', entityId: 'b' });
    const engine = new SyncEngine(
      q,
      async (op: PendingOp) => {
        if (op.entityId === 'a') throw new HttpError(400);
      },
      isRetryable
    );
    const res = await engine.push();
    expect(res.pushed).toBe(1);
    expect(res.dropped).toHaveLength(1);
    expect(res.dropped[0].op.entityId).toBe('a');
    expect(res.remaining).toBe(0);
  });
});
