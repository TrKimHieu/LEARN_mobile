import { migrate, MIGRATIONS, type SqlRunner } from '../migrations';
import { dbNameFor } from '../scope';
import { memoryOutbox, type OutboxItem } from '../stores';

const base = { environment: 'development', origin: 'https://3-107-190-42.sslip.io', userId: 'u1' };

describe('dbNameFor', () => {
  it('is stable for the same account', () => expect(dbNameFor(base)).toBe(dbNameFor({ ...base })));
  it('separates users, origins and environments', () => {
    const names = new Set([
      dbNameFor(base),
      dbNameFor({ ...base, userId: 'u2' }),
      dbNameFor({ ...base, origin: 'https://api.example.com' }),
      dbNameFor({ ...base, environment: 'preview' }),
    ]);
    expect(names.size).toBe(4);
  });
  it('keeps the file name safe', () => {
    expect(dbNameFor({ ...base, userId: '../a/b' })).toMatch(/^learn-development-[0-9a-f]{8}-[A-Za-z0-9_-]+\.db$/);
  });
});

function fakeRunner(version: number) {
  const executed: string[] = [];
  const db: SqlRunner = {
    execAsync: async (sql) => {
      executed.push(sql);
      const m = /PRAGMA user_version = (\d+)/.exec(sql);
      if (m) version = Number(m[1]);
    },
    getFirstAsync: async <T,>() => ({ user_version: version }) as T,
  };
  return { db, executed };
}

describe('migrate', () => {
  it('applies every migration on a fresh database', async () => {
    const { db, executed } = fakeRunner(0);
    expect(await migrate(db)).toBe(MIGRATIONS.length);
    expect(executed.filter((s) => MIGRATIONS.includes(s))).toEqual([...MIGRATIONS]);
  });
  it('does nothing when already current', async () => {
    const { db, executed } = fakeRunner(MIGRATIONS.length);
    expect(await migrate(db)).toBe(MIGRATIONS.length);
    expect(executed).toEqual([]);
  });
});

describe('memoryOutbox', () => {
  const item = (eventId: string, createdAt: number): OutboxItem => ({
    eventId, method: 'POST', path: '/p', body: null, createdAt, attempts: 0, lastError: null,
  });
  it('lists oldest first and counts failures', async () => {
    const box = memoryOutbox();
    await box.add(item('b', 2));
    await box.add(item('a', 1));
    expect((await box.list()).map((i) => i.eventId)).toEqual(['a', 'b']);
    await box.markFailed('a', 'offline');
    expect((await box.list())[0]).toMatchObject({ attempts: 1, lastError: 'offline' });
    await box.remove('a');
    expect(await box.count()).toBe(1);
  });
});
