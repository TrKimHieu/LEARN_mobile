export type SqlRunner = {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string): Promise<T | null>;
};

/** Phần tử i nâng schema lên version i+1. Chỉ thêm phần tử mới; không sửa migration đã phát hành. */
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS kv (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE TABLE IF NOT EXISTS outbox (
     event_id TEXT PRIMARY KEY NOT NULL,
     method TEXT NOT NULL,
     path TEXT NOT NULL,
     body TEXT,
     created_at INTEGER NOT NULL,
     attempts INTEGER NOT NULL DEFAULT 0,
     last_error TEXT
   );
   CREATE INDEX IF NOT EXISTS outbox_created_at ON outbox (created_at);`,
];

/** Chạy các migration còn thiếu theo `PRAGMA user_version`; trả về version sau cùng. */
export async function migrate(db: SqlRunner): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  for (const sql of MIGRATIONS.slice(version)) {
    await db.execAsync(sql);
    version += 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
  return version;
}
