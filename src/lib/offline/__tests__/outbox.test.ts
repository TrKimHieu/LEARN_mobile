import { ApiClientError } from '@/lib/api-client';
import { memoryOutbox, type OutboxItem } from '@/lib/db/stores';
import {
  enqueue,
  flushOutbox,
  isNetworkError,
  isQueueable,
  queueOrSend,
  setOutboxSink,
} from '../outbox';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'uuid-default' }));

const START = '/api/v1/courses/c1/lessons/l1/start';
const req = { method: 'POST', path: START } as const;

function item(id: string, createdAt: number): OutboxItem {
  return { eventId: id, method: 'POST', path: START, body: null, createdAt, attempts: 0, lastError: null };
}

describe('isQueueable', () => {
  it('chỉ nhận POST lesson start', () => {
    expect(isQueueable('POST', START)).toBe(true);
    expect(isQueueable('GET', START)).toBe(false);
    expect(isQueueable('POST', '/api/v1/lessons/l1/exercise/submit')).toBe(false);
    expect(isQueueable('POST', `${START}/x`)).toBe(false);
  });
});

describe('enqueue', () => {
  it('lưu mục với uuid và thời gian truyền vào', async () => {
    const store = memoryOutbox();
    const it = await enqueue(store, { ...req, body: { a: 1 } }, 100, () => 'u1');
    expect(it).toMatchObject({ eventId: 'u1', createdAt: 100, attempts: 0, body: '{"a":1}' });
    expect(await store.count()).toBe(1);
  });
  it('ném lỗi với path submit', async () => {
    await expect(
      enqueue(memoryOutbox(), { method: 'POST', path: '/api/v1/lessons/l1/exercise/submit' }),
    ).rejects.toThrow();
  });
});

describe('flushOutbox', () => {
  it('gửi theo thứ tự FIFO và xoá mục', async () => {
    const store = memoryOutbox();
    await store.add(item('b', 2));
    await store.add(item('a', 1));
    const order: string[] = [];
    const r = await flushOutbox(store, async (i) => void order.push(i.eventId));
    expect(order).toEqual(['a', 'b']);
    expect(r).toEqual({ sent: 2, dropped: 0, remaining: 0 });
  });

  it('lỗi mạng giữ mục và dừng', async () => {
    const store = memoryOutbox();
    await store.add(item('a', 1));
    await store.add(item('b', 2));
    const send = jest.fn().mockRejectedValue(new Error('net'));
    const r = await flushOutbox(store, send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ sent: 0, dropped: 0, remaining: 2 });
    const [first] = await store.list();
    expect(first).toMatchObject({ eventId: 'a', attempts: 1, lastError: 'net' });
  });

  it('4xx bỏ mục và chạy tiếp', async () => {
    const store = memoryOutbox();
    await store.add(item('a', 1));
    await store.add(item('b', 2));
    const send = jest
      .fn()
      .mockRejectedValueOnce(new ApiClientError(404, 'NOT_FOUND', 'gone'))
      .mockResolvedValueOnce(undefined);
    const r = await flushOutbox(store, send);
    expect(r).toEqual({ sent: 1, dropped: 1, remaining: 0 });
  });

  it('5xx tăng attempts và dừng', async () => {
    const store = memoryOutbox();
    await store.add(item('a', 1));
    await store.add(item('b', 2));
    const send = jest.fn().mockRejectedValue(new ApiClientError(503, undefined, 'down'));
    const r = await flushOutbox(store, send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(r.remaining).toBe(2);
    expect((await store.list())[0].attempts).toBe(1);
  });

  it('flush đồng thời chỉ gửi mỗi mục một lần', async () => {
    const store = memoryOutbox();
    await store.add(item('a', 1));
    const send = jest.fn(() => new Promise<void>((res) => setTimeout(res, 10)));
    const [r1, r2] = await Promise.all([flushOutbox(store, send), flushOutbox(store, send)]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(r2).toEqual(r1);
  });
});

describe('isNetworkError', () => {
  it('false với ApiClientError, true với lỗi khác', () => {
    expect(isNetworkError(new ApiClientError(500, undefined, 'x'))).toBe(false);
    expect(isNetworkError(new Error('x'))).toBe(true);
  });
});

describe('queueOrSend', () => {
  afterEach(() => setOutboxSink(null));

  it('trả kết quả khi gửi được', async () => {
    const sink = jest.fn();
    setOutboxSink(sink);
    await expect(queueOrSend(req, async () => 'ok')).resolves.toBe('ok');
    expect(sink).not.toHaveBeenCalled();
  });
  it('lỗi mạng + queueable + có sink: đưa vào sink', async () => {
    const sink = jest.fn().mockResolvedValue(undefined);
    setOutboxSink(sink);
    await expect(queueOrSend(req, async () => { throw new Error('net'); })).resolves.toBeUndefined();
    expect(sink).toHaveBeenCalledWith(req);
  });
  it('không sink thì ném lại', async () => {
    await expect(queueOrSend(req, async () => { throw new Error('net'); })).rejects.toThrow('net');
  });
  it('không queueable thì ném lại', async () => {
    setOutboxSink(jest.fn());
    await expect(
      queueOrSend({ method: 'POST', path: '/api/v1/lessons/l1/exercise/submit' }, async () => { throw new Error('net'); }),
    ).rejects.toThrow('net');
  });
  it('ApiClientError thì ném lại', async () => {
    const sink = jest.fn();
    setOutboxSink(sink);
    await expect(
      queueOrSend(req, async () => { throw new ApiClientError(500, undefined, 'x'); }),
    ).rejects.toBeInstanceOf(ApiClientError);
    expect(sink).not.toHaveBeenCalled();
  });
});
