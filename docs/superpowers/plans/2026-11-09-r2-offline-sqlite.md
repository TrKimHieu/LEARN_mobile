# R2 — Dữ liệu offline bằng SQLite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mất mạng vẫn mở lại được khóa, bài và bài tập đã xem; thao tác "bắt đầu học" được xếp hàng và tự gửi khi có mạng; đăng xuất không làm mất ngầm hàng chờ.

**Architecture:** Mỗi tài khoản có một file SQLite riêng, tên suy từ environment + origin + userId. Trong file có bảng `kv` (cache React Query đã persist) và `outbox` (thao tác chờ gửi). Logic cache/outbox viết trên interface `KvStore`/`OutboxStore`, nên test chạy bằng bản in-memory; bản SQLite chỉ là lớp mỏng. Trạng thái mạng lấy từ `expo-network` và đưa vào `onlineManager` của React Query.

**Tech Stack:** expo-sqlite 58.0.15, expo-network 58.0.4, @tanstack/react-query-persist-client 5.107.1 (hàm `persistQueryClient`), Jest 30.

**Spec:** `docs/superpowers/plans/2026-11-09-roadmap-next.md` mục R2; `docs/mobile-roadmap-status.md` mục M2.

## Global Constraints

- Không dùng AsyncStorage cho cache/outbox; chỉ SQLite.
- Chỉ đưa vào outbox các request mà server xử lý idempotent. Hiện chỉ có `POST /api/v1/courses/:courseId/lessons/:lessonId/start`. `POST /api/v1/lessons/:lessonId/exercise/submit` chưa idempotent, nên khi offline nút nộp bị khoá, không xếp hàng.
- DB tách theo environment + origin + userId; không bao giờ đọc cache của tài khoản hay server khác.
- Không persist query `['meta']` hay query có key bắt đầu bằng `'admin'`. Buster là `${CONTRACTS_HASH}:${APP_VERSION}`; maxAge 7 ngày.
- Chữ trên UI chỉ khi cần để hành động; tiếng Việt; màu từ `usePalette()`.
- Mỗi task kết thúc với `npx jest <test của task>` qua; typecheck/lint/test toàn bộ chạy ở bước gộp.

## Review Focus

1. Mạng chập chờn: request outbox lỗi mạng giữa chừng không bị xoá; lần sau gửi lại đúng một lần. → Task 3 (`flushOutbox` dừng ở lỗi mạng, giữ mục).
2. Server trả 4xx cho mục outbox (bài đã bị xoá): mục bị bỏ, không chặn các mục sau mãi. → Task 3.
3. Đổi tài khoản trên cùng máy: tài khoản B không thấy cache của A. → Task 1 (`dbNameFor` khác userId cho ra tên khác).
4. Nâng app có đổi contracts: cache cũ bị bỏ, không hydrate dữ liệu sai schema. → Task 2 (buster).
5. Đăng xuất khi còn hàng chờ: hỏi trước, không xoá ngầm. → Task 5.

## Chạy song song

| Bước | Ai | Task | File sở hữu |
| --- | --- | --- | --- |
| 0 | Điều phối | 1 | `src/lib/db/**` |
| 1 | Agent A | 2 | `src/lib/offline/persister.ts`, test |
| 1 | Agent B | 3 | `src/lib/offline/outbox.ts`, test, `src/features/learning/learning-api.ts` |
| 1 | Agent C | 4 | `src/lib/offline/network.ts`, test, `src/lib/query-client.ts`, `src/components/offline-pill.tsx`, `src/features/exercises/components/action-bar.tsx` |
| 2 | Điều phối | 5 | `src/features/offline/**`, `src/app/_layout.tsx`, `src/features/auth/auth-context.tsx`, docs |

---

### Task 1: Lớp DB theo tài khoản

**Files:** Create `src/lib/db/scope.ts`, `src/lib/db/migrations.ts`, `src/lib/db/stores.ts`, `src/lib/db/sqlite.ts`; Test `src/lib/db/__tests__/scope.test.ts`, `migrations.test.ts`, `stores.test.ts`

**Interfaces (Produces):**
- `dbNameFor(s: { environment: string; origin: string; userId: string }): string` → `learn-<env>-<fnv1a32(origin) hex 8>-<userId lọc [A-Za-z0-9_-]>.db`
- `type SqlRunner = { execAsync(sql: string): Promise<void>; getFirstAsync<T>(sql: string): Promise<T | null> }`
- `MIGRATIONS: readonly string[]` (phần tử i là SQL nâng lên version i+1); `migrate(db: SqlRunner): Promise<number>` đọc `PRAGMA user_version`, chạy các migration còn thiếu, ghi `PRAGMA user_version = n`, trả version cuối.
- `type OutboxItem = { eventId: string; method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; path: string; body: string | null; createdAt: number; attempts: number; lastError: string | null }`
- `interface KvStore { get(key): Promise<string | null>; set(key, value): Promise<void>; remove(key): Promise<void> }`
- `interface OutboxStore { add(item: OutboxItem): Promise<void>; list(): Promise<OutboxItem[]> /* createdAt tăng dần */; remove(eventId): Promise<void>; markFailed(eventId, error: string): Promise<void> /* attempts+1 */; count(): Promise<number>; clear(): Promise<void> }`
- `memoryKv(): KvStore`, `memoryOutbox(): OutboxStore` (dùng cho test các task sau)
- `openAccountDb(name): Promise<{ kv: KvStore; outbox: OutboxStore; close(): Promise<void> }>`, `deleteAccountDb(name): Promise<void>` trong `sqlite.ts` (không test bằng Jest, nghiệm thu trên máy)

- [ ] Test: hai userId khác nhau → tên khác; cùng input → cùng tên; origin khác → tên khác; userId có ký tự `/` bị lọc.
- [ ] Test: `migrate` với fake runner ở `user_version` 0 chạy đủ MIGRATIONS rồi ghi version; ở version cuối thì không chạy gì.
- [ ] Test: `memoryOutbox` `list()` theo `createdAt`; `markFailed` tăng `attempts`.
- [ ] Viết code, chạy `npx jest src/lib/db` → PASS, commit `feat(offline): per-account SQLite database and stores`.

### Task 2: Persist cache React Query

**Files:** Create `src/lib/offline/persister.ts`; Test `src/lib/offline/__tests__/persister.test.ts`

**Interfaces:**
- Consumes: `KvStore`, `memoryKv` (Task 1)
- Produces: `createKvPersister(kv: KvStore, key = 'rq-cache'): Persister`; `shouldPersistQuery(q: { queryKey: readonly unknown[]; state: { status: string } }): boolean`; `PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000`; `persistBuster(): string` = `${CONTRACTS_HASH}:${APP_VERSION}` (lấy từ `@/contracts` và `@/lib/server-meta`; mock `expo-constants` trong test).

- [ ] Test: persist rồi restore trả lại đúng object; `removeClient` xoá key; `restoreClient` khi chuỗi hỏng JSON trả `undefined`.
- [ ] Test: `shouldPersistQuery` false với `['meta']`, `['admin', …]`, status `'error'`; true với `['courses']` status `'success'`.
- [ ] Code, `npx jest src/lib/offline/__tests__/persister.test.ts` → PASS.

### Task 3: Outbox và gửi lại

**Files:** Create `src/lib/offline/outbox.ts`; Test `src/lib/offline/__tests__/outbox.test.ts`; Modify `src/features/learning/learning-api.ts:43` (mutation start)

**Interfaces:**
- Consumes: `OutboxStore`, `OutboxItem`, `memoryOutbox` (Task 1); `ApiClientError` (`src/lib/api-client.ts`)
- Produces:
  - `isQueueable(method: string, path: string): boolean`: chỉ khớp `POST` + `/^\/api\/v1\/courses\/[^/]+\/lessons\/[^/]+\/start$/`
  - `enqueue(store, req: { method; path; body?: unknown }, now = Date.now(), uuid = randomUUID): Promise<OutboxItem>`: ném `Error` nếu không queueable. `randomUUID` từ `expo-crypto`.
  - `flushOutbox(store, send: (item: OutboxItem) => Promise<void>): Promise<{ sent: number; dropped: number; remaining: number }>`: lần lượt theo `createdAt`. Thành công thì `remove`. `ApiClientError` 4xx thì `remove` và tính `dropped`. Lỗi khác (mạng, 5xx) thì `markFailed` rồi dừng vòng. Không chạy hai flush cùng lúc trên một store (lần gọi thứ hai trả kết quả của lần đang chạy).
  - `isNetworkError(err: unknown): boolean`: true khi không phải `ApiClientError`.
  - `setOutboxSink(sink: ((req) => Promise<void>) | null)` và `queueOrSend(req, sendNow)`: nếu `sendNow` lỗi mạng, request queueable và có sink, thì đưa vào sink rồi resolve; không thì ném lỗi lại.
- Mutation start dùng `queueOrSend`, nên khi offline không báo lỗi.

- [ ] Test các nhánh: thứ tự FIFO; lỗi mạng giữ mục và dừng; 4xx bỏ mục và chạy tiếp; 5xx tăng attempts; enqueue path submit ném lỗi; flush đồng thời chỉ gửi mỗi mục một lần.
- [ ] Code, `npx jest src/lib/offline/__tests__/outbox.test.ts` → PASS.

### Task 4: Trạng thái mạng và UI offline

**Files:** Create `src/lib/offline/network.ts`, `src/components/offline-pill.tsx`; Test `src/lib/offline/__tests__/network.test.ts`; Modify `src/lib/query-client.ts` (bỏ `onlineManager.setOnline(true)`), `src/features/exercises/components/action-bar.tsx`

**Interfaces:**
- Produces: `isOnlineState(s: { isConnected?: boolean; isInternetReachable?: boolean }): boolean` (`isInternetReachable ?? isConnected ?? true`); `startNetworkSync(): () => void` (đặt `onlineManager.setEventListener` từ `addNetworkStateListener` + giá trị đầu từ `getNetworkStateAsync`); `useIsOnline(): boolean` (`useSyncExternalStore` trên `onlineManager`).
- `OfflinePill`: viên nhỏ "Offline" có icon, chỉ hiện khi `!useIsOnline()`, `accessibilityLiveRegion="polite"`.
- `action-bar.tsx`: nút nộp bài `disabled` khi offline, nhãn đổi thành "Cần mạng để nộp".

- [ ] Test `isOnlineState` mọi tổ hợp; `useIsOnline` đổi khi `onlineManager.setOnline(false)`.
- [ ] Code, `npx jest src/lib/offline/__tests__/network.test.ts` → PASS.

### Task 5: Ghép vào app, đăng xuất, tài liệu

**Files:** Create `src/features/offline/offline-provider.tsx`; Modify `src/app/_layout.tsx` (bọc trong `AuthProvider`, gọi `startNetworkSync` một lần), `src/features/auth/auth-context.tsx` (đăng xuất), `docs/mobile-roadmap-status.md`

- `OfflineProvider`: khi có `user`, mở `openAccountDb(dbNameFor({ environment: config.environment, origin: config.apiUrl, userId: user.id }))`; gọi `persistQueryClient({ queryClient, persister, maxAge, buster, dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery } })`; `setOutboxSink`; flush khi `onlineManager` chuyển sang online và khi AppState thành `active`. Khi user null thì unsubscribe và đóng DB. Expose `useOffline(): { pendingCount: number; flush(): Promise<void> }`.
- Đăng xuất: nếu `pendingCount > 0` thì hỏi qua `src/lib/dialog.ts`: "Còn N thao tác chưa gửi", nút "Gửi rồi đăng xuất" / "Bỏ và đăng xuất" / "Huỷ". Sau khi đăng xuất thì `deleteAccountDb`.
- [ ] Kiểm tra toàn bộ: `npm run typecheck && npm run lint && npm test`, export Android; commit; cập nhật docs.
- [ ] Nghiệm thu thiết bị: xem khóa → bật chế độ máy bay → đóng mở app → vẫn thấy khóa/bài; bắt đầu bài khi offline → tắt máy bay → server ghi nhận; nút nộp bị khoá khi offline; đăng xuất khi còn hàng chờ thì có hỏi.
