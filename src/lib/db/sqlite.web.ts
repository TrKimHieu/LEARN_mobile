import { memoryKv, memoryOutbox, type KvStore, type OutboxStore } from './stores';

/**
 * Bản web của app chỉ để xem nhanh lúc dev (như `token-store.ts`): không lưu bền, không kéo
 * wasm của expo-sqlite vào bundle. Tải lại trang là mất cache và hàng chờ.
 */
export async function openAccountDb(_name: string): Promise<{ kv: KvStore; outbox: OutboxStore; close(): Promise<void> }> {
  return { kv: memoryKv(), outbox: memoryOutbox(), close: async () => {} };
}

export async function deleteAccountDb(_name: string): Promise<void> {}
