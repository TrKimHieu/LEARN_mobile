import { memoryKv } from '@/lib/db/stores';
import { CONTRACTS_HASH } from '@/contracts';
import {
  PERSIST_MAX_AGE,
  createKvPersister,
  persistBuster,
  shouldPersistQuery,
} from '../persister';

jest.mock('@/lib/server-meta', () => ({ APP_VERSION: '1.2.3' }));

const client = {
  timestamp: 123,
  buster: 'b',
  clientState: { mutations: [], queries: [] },
};

describe('createKvPersister', () => {
  it('persist rồi restore trả lại đúng object', async () => {
    const p = createKvPersister(memoryKv());
    await p.persistClient(client);
    expect(await p.restoreClient()).toEqual(client);
  });

  it('removeClient xoá key', async () => {
    const kv = memoryKv();
    const p = createKvPersister(kv, 'k');
    await p.persistClient(client);
    expect(await kv.get('k')).not.toBeNull();
    await p.removeClient();
    expect(await kv.get('k')).toBeNull();
    expect(await p.restoreClient()).toBeUndefined();
  });

  it('restore chuỗi hỏng JSON trả undefined', async () => {
    const kv = memoryKv();
    await kv.set('rq-cache', '{not json');
    expect(await createKvPersister(kv).restoreClient()).toBeUndefined();
  });
});

describe('shouldPersistQuery', () => {
  it('chặn meta, admin và lỗi; nhận success', () => {
    expect(shouldPersistQuery({ queryKey: ['meta'], state: { status: 'success' } })).toBe(false);
    expect(shouldPersistQuery({ queryKey: ['admin', 'x'], state: { status: 'success' } })).toBe(false);
    expect(shouldPersistQuery({ queryKey: ['courses'], state: { status: 'error' } })).toBe(false);
    expect(shouldPersistQuery({ queryKey: ['courses'], state: { status: 'success' } })).toBe(true);
  });
});

describe('hằng', () => {
  it('maxAge 7 ngày, buster = hash:version', () => {
    expect(PERSIST_MAX_AGE).toBe(7 * 24 * 60 * 60 * 1000);
    expect(persistBuster()).toBe(`${CONTRACTS_HASH}:1.2.3`);
  });
});
