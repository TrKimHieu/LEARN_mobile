import {
  memoryKv, memoryOutbox, memorySourceFiles, type KvStore, type OutboxStore, type SourceFileStore,
} from './stores';

/**
 * Bản web của app chỉ để xem nhanh lúc dev (như `token-store.ts`): không lưu bền, không kéo
 * wasm của expo-sqlite vào bundle. Tải lại trang là mất cache và hàng chờ.
 */
export async function openAccountDb(
  _name: string,
): Promise<{ kv: KvStore; outbox: OutboxStore; sourceFiles: SourceFileStore; close(): Promise<void> }> {
  return { kv: memoryKv(), outbox: memoryOutbox(), sourceFiles: memorySourceFiles(), close: async () => {} };
}

export async function deleteAccountDb(_name: string): Promise<void> {}
