import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api-client';
import { config } from '@/lib/config';
import { dbNameFor } from '@/lib/db/scope';
import { deleteAccountDb, openAccountDb } from '@/lib/db/sqlite';
import type { OutboxStore } from '@/lib/db/stores';
import { enqueue, flushOutbox, setOutboxSink } from '@/lib/offline/outbox';
import { createKvPersister, PERSIST_MAX_AGE, persistBuster, shouldPersistQuery } from '@/lib/offline/persister';

type OfflineValue = {
  /** Số thao tác đang chờ gửi lên máy chủ. */
  pendingCount: number;
  countPending: () => Promise<number>;
  flush: () => Promise<void>;
  /** Đăng xuất hẳn: ngừng lưu cache, xoá DB của tài khoản này khỏi máy. */
  discard: () => Promise<void>;
};

const OfflineContext = createContext<OfflineValue>({
  pendingCount: 0,
  countPending: async () => 0,
  flush: async () => {},
  discard: async () => {},
});

type Session = { name: string; outbox: OutboxStore; close: () => Promise<void>; stopPersist: () => void };

/**
 * Cache đọc + hàng chờ gửi theo tài khoản (ADR R2). Mở DB khi có user, đóng khi user rời đi.
 * Hết phiên (không phải đăng xuất) chỉ đóng DB — đăng nhập lại cùng tài khoản vẫn còn hàng chờ.
 */
export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const userId = useAuth().user?.id ?? null;
  const session = useRef<Session | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCount = useCallback(async () => {
    setPendingCount(session.current ? await session.current.outbox.count() : 0);
  }, []);

  const flush = useCallback(async () => {
    const s = session.current;
    if (!s || !onlineManager.isOnline()) return;
    const { sent } = await flushOutbox(s.outbox, (item) =>
      apiFetch(item.path, {
        method: item.method,
        body: item.body ? JSON.parse(item.body) : undefined,
        // Gửi lại cùng key: server trả kết quả lần đầu thay vì ghi thêm (LEARN_backend#7).
        headers: { 'Idempotency-Key': item.eventId },
      }).then(() => undefined),
    );
    await refreshCount();
    // Bài nộp / bài bắt đầu từ hàng chờ đã tới server: tiến độ và điểm trên máy đã cũ.
    if (sent > 0) await queryClient.invalidateQueries();
  }, [refreshCount, queryClient]);

  const closeSession = useCallback(async () => {
    const s = session.current;
    session.current = null;
    setOutboxSink(null);
    setPendingCount(0);
    if (!s) return null;
    s.stopPersist();
    await s.close().catch(() => undefined);
    return s.name;
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const name = dbNameFor({ environment: config.environment, origin: config.apiUrl, userId });
    (async () => {
      const db = await openAccountDb(name);
      if (cancelled) {
        await db.close();
        return;
      }
      const [stopPersist] = persistQueryClient({
        queryClient,
        persister: createKvPersister(db.kv),
        maxAge: PERSIST_MAX_AGE,
        buster: persistBuster(),
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      });
      session.current = { name, outbox: db.outbox, close: db.close, stopPersist };
      setOutboxSink(async (req) => {
        await enqueue(db.outbox, req);
        await refreshCount();
      });
      await refreshCount();
      await flush();
    })().catch(() => {
      // Không mở được DB: app vẫn chạy online như trước, chỉ thiếu cache offline.
    });
    return () => {
      cancelled = true;
      void closeSession();
    };
  }, [userId, queryClient, refreshCount, flush, closeSession]);

  // Gửi hàng chờ khi có mạng lại và khi app quay về foreground.
  useEffect(() => {
    const offOnline = onlineManager.subscribe((online) => {
      if (online) void flush();
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flush();
    });
    return () => {
      offOnline();
      sub.remove();
    };
  }, [flush]);

  const discard = useCallback(async () => {
    const name = await closeSession();
    if (name) await deleteAccountDb(name);
  }, [closeSession]);

  const countPending = useCallback(async () => (session.current ? session.current.outbox.count() : 0), []);
  const value = useMemo(
    () => ({ pendingCount, countPending, flush, discard }),
    [pendingCount, countPending, flush, discard],
  );
  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline(): OfflineValue {
  return useContext(OfflineContext);
}
