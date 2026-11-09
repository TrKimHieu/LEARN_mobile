export type OutboxItem = {
  eventId: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body: string | null;
  createdAt: number;
  attempts: number;
  lastError: string | null;
};

export interface KvStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface OutboxStore {
  add(item: OutboxItem): Promise<void>;
  /** Cũ nhất trước (`createdAt` tăng dần). */
  list(): Promise<OutboxItem[]>;
  remove(eventId: string): Promise<void>;
  /** Tăng `attempts`, ghi lỗi gần nhất. */
  markFailed(eventId: string, error: string): Promise<void>;
  count(): Promise<number>;
  clear(): Promise<void>;
}

/** Bản trong bộ nhớ — cho test và khi chưa mở được DB. */
export function memoryKv(): KvStore {
  const m = new Map<string, string>();
  return {
    get: async (k) => m.get(k) ?? null,
    set: async (k, v) => void m.set(k, v),
    remove: async (k) => void m.delete(k),
  };
}

export function memoryOutbox(): OutboxStore {
  const m = new Map<string, OutboxItem>();
  return {
    add: async (item) => void m.set(item.eventId, { ...item }),
    list: async () => [...m.values()].sort((a, b) => a.createdAt - b.createdAt).map((i) => ({ ...i })),
    remove: async (id) => void m.delete(id),
    markFailed: async (id, error) => {
      const i = m.get(id);
      if (i) m.set(id, { ...i, attempts: i.attempts + 1, lastError: error });
    },
    count: async () => m.size,
    clear: async () => m.clear(),
  };
}
