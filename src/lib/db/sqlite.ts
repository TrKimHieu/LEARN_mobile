import { deleteDatabaseAsync, openDatabaseAsync } from 'expo-sqlite';
import { migrate } from './migrations';
import type { KvStore, OutboxItem, OutboxStore, SourceFile, SourceFileStore } from './stores';

type SourceRow = {
  document_id: string; course_id: string; filename: string; mime: string;
  size_bytes: number; sha256: string; uri: string; created_at: number;
};

const toSource = (r: SourceRow): SourceFile => ({
  documentId: r.document_id, courseId: r.course_id, filename: r.filename, mime: r.mime,
  sizeBytes: r.size_bytes, sha256: r.sha256, uri: r.uri, createdAt: r.created_at,
});

type OutboxRow = {
  event_id: string;
  method: OutboxItem['method'];
  path: string;
  body: string | null;
  created_at: number;
  attempts: number;
  last_error: string | null;
};

/** Mở DB của một tài khoản (tên từ `dbNameFor`), chạy migration, trả về hai store. */
export async function openAccountDb(
  name: string,
): Promise<{ kv: KvStore; outbox: OutboxStore; sourceFiles: SourceFileStore; close(): Promise<void> }> {
  const db = await openDatabaseAsync(name);
  await db.execAsync('PRAGMA journal_mode = WAL');
  await migrate(db);

  const kv: KvStore = {
    get: async (key) => (await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key))?.value ?? null,
    set: async (key, value) => {
      await db.runAsync(
        'INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
        key, value, Date.now(),
      );
    },
    remove: async (key) => void (await db.runAsync('DELETE FROM kv WHERE key = ?', key)),
  };

  const outbox: OutboxStore = {
    add: async (i) => {
      await db.runAsync(
        'INSERT OR IGNORE INTO outbox (event_id, method, path, body, created_at, attempts, last_error) VALUES (?, ?, ?, ?, ?, ?, ?)',
        i.eventId, i.method, i.path, i.body, i.createdAt, i.attempts, i.lastError,
      );
    },
    list: async () =>
      (await db.getAllAsync<OutboxRow>('SELECT * FROM outbox ORDER BY created_at ASC')).map((r) => ({
        eventId: r.event_id, method: r.method, path: r.path, body: r.body,
        createdAt: r.created_at, attempts: r.attempts, lastError: r.last_error,
      })),
    remove: async (id) => void (await db.runAsync('DELETE FROM outbox WHERE event_id = ?', id)),
    markFailed: async (id, error) =>
      void (await db.runAsync('UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE event_id = ?', error, id)),
    count: async () => (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM outbox'))?.n ?? 0,
    clear: async () => void (await db.runAsync('DELETE FROM outbox')),
  };

  const sourceFiles: SourceFileStore = {
    put: async (f) => {
      await db.runAsync(
        'INSERT OR REPLACE INTO source_files (document_id, course_id, filename, mime, size_bytes, sha256, uri, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        f.documentId, f.courseId, f.filename, f.mime, f.sizeBytes, f.sha256, f.uri, f.createdAt,
      );
    },
    get: async (id) => {
      const r = await db.getFirstAsync<SourceRow>('SELECT * FROM source_files WHERE document_id = ?', id);
      return r ? toSource(r) : null;
    },
    list: async () => (await db.getAllAsync<SourceRow>('SELECT * FROM source_files ORDER BY created_at DESC')).map(toSource),
    remove: async (id) => void (await db.runAsync('DELETE FROM source_files WHERE document_id = ?', id)),
  };

  return { kv, outbox, sourceFiles, close: () => db.closeAsync() };
}

export async function deleteAccountDb(name: string): Promise<void> {
  try {
    await deleteDatabaseAsync(name);
  } catch {
    // Chưa từng mở (đăng xuất ngay sau đăng nhập lỗi) — không có gì để xoá.
  }
}
