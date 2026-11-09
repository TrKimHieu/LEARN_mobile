import { randomUUID } from 'expo-crypto';
import { ApiClientError } from '@/lib/api-client';
import type { OutboxItem, OutboxStore } from '@/lib/db/stores';

export type OutboxRequest = {
  method: OutboxItem['method'];
  path: string;
  body?: unknown;
  /** Key đã dùng cho lần gửi trực tiếp — giữ nguyên khi xếp hàng để server nhận ra lần gửi lại. */
  eventId?: string;
};

/**
 * Chỉ request server xử lý idempotent mới được xếp hàng: bắt đầu bài (idempotent sẵn) và nộp bài
 * (server nhận `Idempotency-Key` = `eventId`, LEARN_backend#7), chấm thẻ ôn tập (R5, cùng cơ chế key).
 */
const QUEUEABLE = [
  /^\/api\/v1\/courses\/[^/]+\/lessons\/[^/]+\/start$/,
  /^\/api\/v1\/lessons\/[^/]+\/exercise\/submit$/,
  /^\/api\/v1\/reviews\/[^/]+$/,
];

export function isQueueable(method: string, path: string): boolean {
  return method === 'POST' && QUEUEABLE.some((re) => re.test(path));
}

/** Không tới được server: lỗi ném thẳng từ fetch, hoặc `ApiClientError` status 0 do `apiFetch` bọc lại. */
export function isNetworkError(err: unknown): boolean {
  return !(err instanceof ApiClientError) || err.status === 0;
}

export async function enqueue(
  store: OutboxStore,
  req: OutboxRequest,
  now: number = Date.now(),
  uuid: () => string = randomUUID,
): Promise<OutboxItem> {
  if (!isQueueable(req.method, req.path)) {
    throw new Error(`Request không được xếp hàng: ${req.method} ${req.path}`);
  }
  const item: OutboxItem = {
    eventId: req.eventId ?? uuid(),
    method: req.method,
    path: req.path,
    body: req.body === undefined ? null : JSON.stringify(req.body),
    createdAt: now,
    attempts: 0,
    lastError: null,
  };
  await store.add(item);
  return item;
}

export type FlushResult = { sent: number; dropped: number; remaining: number };

const inFlight = new WeakMap<OutboxStore, Promise<FlushResult>>();

async function runFlush(
  store: OutboxStore,
  send: (item: OutboxItem) => Promise<void>,
): Promise<FlushResult> {
  let sent = 0;
  let dropped = 0;
  for (const item of await store.list()) {
    try {
      await send(item);
      await store.remove(item.eventId);
      sent += 1;
    } catch (err) {
      if (err instanceof ApiClientError && err.status >= 400 && err.status < 500) {
        await store.remove(item.eventId);
        dropped += 1;
        continue;
      }
      await store.markFailed(item.eventId, err instanceof Error ? err.message : String(err));
      break;
    }
  }
  return { sent, dropped, remaining: await store.count() };
}

/** Gửi lần lượt theo `createdAt`. Lần gọi thứ hai khi đang chạy trả lại promise đang chạy. */
export function flushOutbox(
  store: OutboxStore,
  send: (item: OutboxItem) => Promise<void>,
): Promise<FlushResult> {
  const running = inFlight.get(store);
  if (running) return running;
  const p = runFlush(store, send).finally(() => inFlight.delete(store));
  inFlight.set(store, p);
  return p;
}

type Sink = (req: OutboxRequest) => Promise<void>;
let sink: Sink | null = null;

export function setOutboxSink(next: Sink | null): void {
  sink = next;
}

/** Gửi ngay; lỗi mạng + request queueable + có sink thì xếp hàng và resolve `undefined`. */
export async function queueOrSend<T>(
  req: OutboxRequest,
  sendNow: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await sendNow();
  } catch (err) {
    if (isNetworkError(err) && isQueueable(req.method, req.path) && sink) {
      await sink(req);
      return undefined;
    }
    throw err;
  }
}
