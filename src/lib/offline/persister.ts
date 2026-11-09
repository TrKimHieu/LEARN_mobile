import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { CONTRACTS_HASH } from '@/contracts';
import type { KvStore } from '@/lib/db/stores';
import { APP_VERSION } from '@/lib/server-meta';

export const PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function persistBuster(): string {
  return `${CONTRACTS_HASH}:${APP_VERSION}`;
}

export function createKvPersister(kv: KvStore, key = 'rq-cache'): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await kv.set(key, JSON.stringify(client));
    },
    restoreClient: async () => {
      const raw = await kv.get(key);
      if (raw === null) return undefined;
      try {
        return JSON.parse(raw) as PersistedClient;
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      await kv.remove(key);
    },
  };
}

export function shouldPersistQuery(q: {
  queryKey: readonly unknown[];
  state: { status: string };
}): boolean {
  if (q.state.status !== 'success') return false;
  const head = q.queryKey[0];
  return head !== 'meta' && head !== 'admin';
}
