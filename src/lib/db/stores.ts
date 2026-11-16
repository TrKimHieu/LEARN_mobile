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

/** Chỉ mục bản sao tệp gốc trên máy (ADR 004 sửa đổi 2026-11-16). Tệp không bao giờ lên server. */
export type SourceFile = {
  documentId: string;
  courseId: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  sha256: string;
  /** URI tệp trong thư mục riêng của app. */
  uri: string;
  createdAt: number;
};

export interface SourceFileStore {
  put(file: SourceFile): Promise<void>;
  get(documentId: string): Promise<SourceFile | null>;
  /** Mới nhất trước. */
  list(): Promise<SourceFile[]>;
  remove(documentId: string): Promise<void>;
}

export function memorySourceFiles(): SourceFileStore {
  const m = new Map<string, SourceFile>();
  return {
    put: async (f) => void m.set(f.documentId, { ...f }),
    get: async (id) => (m.has(id) ? { ...m.get(id)! } : null),
    list: async () => [...m.values()].sort((a, b) => b.createdAt - a.createdAt).map((f) => ({ ...f })),
    remove: async (id) => void m.delete(id),
  };
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
