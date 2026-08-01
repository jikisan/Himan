import {
  StoreRepository,
  ProductCatalogRepository,
  ProductStoreRepository,
  GroceryListRepository,
  GroceryItemRepository,
  GrocerySessionRepository,
  UserPreferencesRepository,
} from '@himan/shared/grocery';
import type {
  OpExecutor,
  RetryClassifier,
  PendingOp,
  CreateStoreDto,
  UpdateStoreDto,
  CreateProductDto,
  UpdateProductDto,
  UpsertProductStoreDto,
  CreateGroceryListDto,
  UpdateGroceryListDto,
  CreateGroceryItemDto,
  UpdateGroceryItemDto,
  CreateGrocerySessionDto,
  AddSessionItemDto,
  UpdateSessionItemDto,
  UpdateUserPreferencesDto,
} from '@himan/shared/grocery';

const stores = new StoreRepository();
const products = new ProductCatalogRepository();
const productStores = new ProductStoreRepository();
const lists = new GroceryListRepository();
const items = new GroceryItemRepository();
const sessions = new GrocerySessionRepository();
const prefs = new UserPreferencesRepository();

type P = Record<string, unknown>;

/**
 * Maps an outbox op to the matching repository call. Client-generated UUIDs
 * live in the payload/entityId, so no server-side id remapping is needed.
 */
export function createOpExecutor(userId: string): OpExecutor {
  return async (op: PendingOp): Promise<void> => {
    const p = op.payload as P;

    switch (op.entity) {
      case 'store':
        if (op.type === 'create') await stores.create(p as unknown as CreateStoreDto, userId);
        else if (op.type === 'update') await stores.update(op.entityId, p as unknown as UpdateStoreDto);
        else await stores.delete(op.entityId);
        return;

      case 'product':
        if (op.type === 'create') await products.upsert(userId, p as unknown as CreateProductDto);
        else if (op.type === 'update') await products.update(op.entityId, p as unknown as UpdateProductDto);
        else await products.delete(op.entityId);
        return;

      case 'productStore':
        if (op.type === 'delete') {
          await productStores.delete(p.productId as string, p.storeId as string);
        } else {
          await productStores.upsert(p as unknown as UpsertProductStoreDto);
        }
        return;

      case 'list':
        if (op.type === 'create') await lists.create(p as unknown as CreateGroceryListDto, userId);
        else if (op.type === 'update') await lists.update(op.entityId, p as unknown as UpdateGroceryListDto);
        else await lists.delete(op.entityId);
        return;

      case 'listItem':
        if (op.type === 'create') await items.create(p as unknown as CreateGroceryItemDto, userId);
        else if (op.type === 'update') await items.update(op.entityId, p as unknown as UpdateGroceryItemDto);
        else await items.delete(op.entityId);
        return;

      case 'session':
        if (op.type === 'create') await sessions.create(p as unknown as CreateGrocerySessionDto, userId);
        else if (op.type === 'update') await sessions.complete(op.entityId);
        else await sessions.cancel(op.entityId);
        return;

      case 'sessionItem':
        if (op.type === 'create') await sessions.addSessionItem(p as unknown as AddSessionItemDto);
        else if (op.type === 'update') await sessions.updateSessionItem(op.entityId, p as unknown as UpdateSessionItemDto);
        // session items are removed via cascade / session cancel; no direct delete op
        return;

      case 'preferences':
        await prefs.update(userId, p as unknown as UpdateUserPreferencesDto);
        return;
    }
  };
}

const NETWORK_HINTS = [
  'network request failed',
  'failed to fetch',
  'network error',
  'timeout',
  'timed out',
  'connection',
  'fetch failed',
  'load failed',
];

/**
 * Retain ops on transient/network errors; drop on anything that looks like a
 * server rejection (PostgREST 4xx surfaces as a non-network message).
 */
export const isRetryableError: RetryClassifier = (err: unknown): boolean => {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return NETWORK_HINTS.some((hint) => msg.includes(hint));
};
