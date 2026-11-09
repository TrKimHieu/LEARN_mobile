# R3 — Nhập tài liệu, trích chữ tại máy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người dùng chọn PDF, ảnh hoặc tệp văn bản trên điện thoại. App trích chữ ngay trên máy, cho xem và sửa, rồi chỉ gửi văn bản lên server. Không tệp gốc nào rời khỏi máy.

**Architecture:** Backend thêm `POST /api/v1/courses/:courseId/documents/text`. Endpoint này nhận các trang văn bản, cắt chunk bằng `chunkPages` của `@learn/ai` và lưu Document ở trạng thái `EXTRACTED` ngay (không qua S3/worker). Mobile có ba bộ trích chữ cùng một kiểu đầu ra:
- văn bản (`.txt`/`.md`) đọc bằng `expo-file-system`;
- PDF có lớp chữ đọc bằng pdf.js chạy trong WebView ẩn, thư viện đóng gói sẵn trong app nên không tải gì từ mạng;
- ảnh và PDF quét dùng ML Kit Text Recognition (Latin, có tiếng Việt), chạy tại máy.

Sau khi trích, màn xem lại cho đổi tên và sửa từng trang trước khi gửi.

**Tech Stack:** Expo SDK 58 + `expo-dev-client` (development build, vì ML Kit là module native), `react-native-webview`, `pdfjs-dist` 6.x (legacy build), `@react-native-ml-kit/text-recognition` 2.0.0, contracts `@learn/api-contracts` 1.1.0.

**Spec:** `docs/superpowers/plans/2026-11-09-roadmap-next.md` mục R3; `docs/mobile-roadmap-status.md` mục M3–M8; lựa chọn của người dùng ngày 2026-11-09: "Làm đủ R3 (PDF/ảnh tại máy)".

## Global Constraints

- Không gửi tệp gốc, ảnh hay byte PDF lên server. Không gọi dịch vụ OCR hay trích chữ trên cloud.
- Giới hạn mỗi tài liệu: tối đa 100 trang, 25 MiB (26214400 byte), xử lý trong 30 giây. Vượt thì dừng và báo rõ lý do; không gửi phần dở.
- RAM tăng ≤ 150 MiB là cổng nghiệm thu trên thiết bị, không kiểm được bằng Jest.
- Server kiểm lại: tối đa 100 trang, mỗi trang tối đa 200000 ký tự, tổng tối đa 2000000 ký tự, ít nhất 1 ký tự khác khoảng trắng. Hạn mức `DOCUMENTS_UPLOADED` và giới hạn trang theo gói áp dụng như upload cũ.
- Đường upload gốc cũ (`upload-url`/`confirm`) giữ nguyên ở server cho web; mobile không gọi lại.
- Contracts mới phát hành bản 1.1.0 (cùng major 1), có `CONTRACTS_HASH` mới. Bản app cũ chỉ thấy cảnh báo lệch hash dành cho dev.
- Chữ trên UI bằng tiếng Việt, chỉ khi cần để hành động; màu từ token.

## Review Focus

1. PDF quét (không có lớp chữ) hoặc có trang trống xen kẽ: các trang trống được OCR, không gửi lên tài liệu rỗng. → Task 4 (`planPdfPages`).
2. PDF có mật khẩu hoặc tệp hỏng: báo lỗi đọc được, không treo WebView. → Task 4 (thông điệp `error` và timeout 30 giây).
3. Ảnh xoay ngang, chữ tiếng Việt có dấu: ML Kit nhận đúng dấu (cổng thiết bị); ghép dòng theo thứ tự khối. → Task 5.
4. Mở app bằng Expo Go (không có module ML Kit): nhập văn bản và PDF có chữ vẫn chạy, ảnh báo cần bản cài đặt đầy đủ, không crash. → Task 5 (`isOcrAvailable`).
5. Gửi trùng nội dung đã có trong khóa (cùng checksum): 409 với tên tài liệu cũ, như upload cũ. → Task 2.

## Chạy song song

| Bước | Ai | Task | File sở hữu |
| --- | --- | --- | --- |
| 0 | Điều phối | 1 | backend `packages/contracts/**`, `scripts/contracts/**`; mobile `vendor/**`, `package.json`, `package-lock.json` |
| 1 | Agent A | 2 | backend `apps/api/src/domains/documents/**` |
| 1 | Agent B | 3, 4, 5 | mobile `src/features/import/extract/**` |
| 1 | Agent C | 6 | mobile `src/features/import/*.ts(x)` ngoài `extract/`, `src/features/documents/**`, `app.json` |
| 2 | Điều phối | 7 | gộp, docs, PR |

---

### Task 1: Contracts 1.1.0 và artifact cho mobile

**Files:** backend `packages/contracts/src/document.ts`, `packages/contracts/src/version.ts`, `scripts/contracts/build-release.mjs` (version đọc từ tham số `--version`, mặc định `1.1.0`), `package.json` (script `contracts:pack` theo version); mobile `vendor/learn-api-contracts-1.1.0.tgz`, `vendor/checksums.json`, `package.json`.

**Interfaces (Produces):**
- `importTextDocumentSchema = z.object({ filename: z.string().min(1).max(255), sourceMimeType: z.string().min(1).max(100), sourceSizeBytes: z.number().int().positive().max(26214400), method: z.enum(['TEXT', 'PDF_TEXT', 'OCR']), pages: z.array(z.object({ page: z.number().int().positive().nullable(), text: z.string().max(200000) }).strict()).min(1).max(100) }).strict()` cùng kiểu `ImportTextDocumentInput`; response là `DocumentList`.
- `importTextLimits = { maxPages: 100, maxCharsPerPage: 200000, maxTotalChars: 2000000 } as const`

- [ ] Thêm schema và test trong `packages/contracts/src/__tests__` (strict từ chối khoá lạ; quá 100 trang bị từ chối; `page: null` hợp lệ).
- [ ] `npm run contracts:hash`; `npm run contracts:pack -- --version 1.1.0`; chạy `contracts:consumer`.
- [ ] Mobile: chép tgz, ghi SHA-256 vào `vendor/checksums.json`, đổi pin trong `package.json`, `npm install --package-lock-only --ignore-scripts`, `npm ci`, `npm run sync:contracts`, typecheck.

### Task 2: Backend `POST /courses/:courseId/documents/text`

**Files:** `apps/api/src/domains/documents/application/documents.service.ts` (`importText`), `.../presentation/documents.controller.ts`, `.../infrastructure/repositories/document.repository.ts` (`createExtracted`), `apps/api/src/domains/documents/application/__tests__/import-text.test.ts`.

**Interfaces:**
- Consumes: `importTextDocumentSchema`, `importTextLimits` (Task 1); `chunkPages` từ `@learn/ai`; `UsageService.consume(userId, 'DOCUMENTS_UPLOADED', fn)`.
- Produces: `DocumentsService.importText(userId: string, courseId: string, input: ImportTextDocumentInput): Promise<DocumentList>`.

Luồng xử lý:
1. Kiểm quyền sở hữu khóa học.
2. Chuẩn hoá: bỏ `\u0000`, đưa xuống dòng về `\n`. Kiểm tổng ký tự và nội dung không rỗng (400).
3. Kiểm giới hạn trang theo gói: hàm `getPagesPerDocumentLimit` của worker, chuyển thành helper dùng chung hoặc viết bản tương đương ở API.
4. Tính `checksumSha256` từ văn bản đã chuẩn hoá; chặn trùng bằng `findDuplicateInCourse` (409).
5. Trong `usage.consume`: tạo Document (`storageKey = text/<id>`, `mimeType = 'text/plain'`, `filename` giữ tên gốc, `sizeBytes = sourceSizeBytes`, `pageCount = method === 'TEXT' ? null : pages.length`, `status = 'EXTRACTED'`, `extractedAt = now`) và chunk từ `chunkPages`. Với `TEXT`, chunk không mang số trang, giống worker.
6. `getDownload` của tài liệu `text/…` trả 404 "Tài liệu nhập từ điện thoại không có tệp gốc". `remove` bỏ qua S3 với key `text/`.

- [ ] Test trên fake repo: thành công tạo chunk và trừ hạn mức; khoá lạ bị zod chặn; toàn khoảng trắng → 400; quá giới hạn trang của gói → 413/403 như mã lỗi worker (`QUOTA_EXCEEDED`); trùng checksum → 409; không sở hữu → 404; download/xoá tài liệu text không gọi S3.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` đều qua.

### Task 3: Kiểu chung, giới hạn, văn bản thuần

**Files:** mobile `src/features/import/extract/types.ts`, `limits.ts`, `plain.ts`, `__tests__/limits.test.ts`, `__tests__/plain.test.ts`

**Interfaces (Produces):**
- `type ExtractedPage = { page: number | null; text: string }`
- `type Extracted = { method: 'TEXT' | 'PDF_TEXT' | 'OCR'; pages: ExtractedPage[]; pageCount: number | null }`
- `class ImportError extends Error { code: 'TOO_LARGE' | 'TOO_MANY_PAGES' | 'TIMEOUT' | 'EMPTY' | 'UNSUPPORTED' | 'UNREADABLE' | 'OCR_UNAVAILABLE' }`, message tiếng Việt
- `LIMITS = { maxBytes: 26214400, maxPages: 100, timeoutMs: 30000 }`
- `kindOf(name: string, mime: string | null): 'text' | 'pdf' | 'image' | null` (`.txt`/`.md`/`text/*`; `.pdf`; `.jpg`/`.jpeg`/`.png`/`.heic`/`image/*`)
- `assertSize(bytes: number): void`, `withTimeout<T>(p: Promise<T>, ms = LIMITS.timeoutMs): Promise<T>`
- `normalizeText(s: string): string` (CRLF→LF, bỏ `\u0000`, gộp quá 2 dòng trống, trim cuối dòng)
- `extractPlain(uri: string): Promise<Extracted>` (đọc UTF-8, một trang `page: null`, rỗng → `EMPTY`)

### Task 4: PDF bằng pdf.js trong WebView

**Files:** `src/features/import/extract/pdf-bridge.ts` (thuần, test được), `pdf-extractor.tsx` (component WebView ẩn), `pdf-html.ts` (HTML nạp pdf.js từ asset), `__tests__/pdf-bridge.test.ts`; `metro.config.js` (thêm `mjs` vào `assetExts` nếu cần cho asset pdf.js).

**Interfaces (Produces):**
- Thông điệp từ WebView: `{ type: 'meta'; pageCount: number } | { type: 'page'; page: number; text: string; imageDataUrl?: string } | { type: 'done' } | { type: 'error'; reason: 'PASSWORD' | 'INVALID' | 'OTHER' }`
- `parseBridgeMessage(raw: string): BridgeMessage | null`
- `planPdfPages(pages: { page: number; text: string }[]): { textPages: ExtractedPage[]; needsOcr: number[] }`: trang có dưới 20 ký tự chữ thì cần OCR
- `usePdfExtractor(): { element: React.ReactElement | null; extract(uri: string): Promise<{ pageCount: number; pages: { page: number; text: string; imageDataUrl?: string }[] }> }`. WebView chỉ render khi đang trích; pdf.js render trang cần OCR ra PNG (scale 2) và gửi `imageDataUrl`; quá 100 trang thì dừng với `TOO_MANY_PAGES`.

### Task 5: OCR bằng ML Kit

**Files:** `src/features/import/extract/ocr.ts`, `__tests__/ocr.test.ts`

**Interfaces (Produces):**
- `isOcrAvailable(): boolean` (module native có mặt; Expo Go trả false)
- `recognizeImage(uri: string): Promise<string>`: ghép `blocks[].text` theo thứ tự, mỗi khối một đoạn
- `dataUrlToCacheFile(dataUrl: string): Promise<string>` (ghi PNG tạm vào `Paths.cache` để ML Kit đọc, xoá sau khi dùng)
- `extractImage(uri: string): Promise<Extracted>` (method `OCR`, `pageCount: 1`)

### Task 6: Luồng nhập trên app

**Files:** `src/features/import/import-api.ts` (`useImportText(courseId)` POST endpoint Task 2, invalidate `['courses', courseId, 'documents']`), `src/features/import/use-import.ts` (state machine: idle → picking → extracting(progress) → review → sending → done/error), `src/features/import/components/import-review.tsx` (đổi tên, xem/sửa từng trang bằng `Field` multiline, đếm ký tự, nút "Gửi văn bản"/"Huỷ"), `src/features/documents/components/document-upload.tsx` (bỏ khoá, nút "Nhập tài liệu" mở picker với PDF/ảnh/văn bản), `src/features/documents/documents-api.ts` (giữ chặn upload gốc), `app.json` (plugin `expo-dev-client`, `@react-native-ml-kit/text-recognition` nếu cần), test `src/features/import/__tests__/use-import.test.ts`.

- Ghép các bộ trích: `text` → `extractPlain`; `image` → `extractImage`; `pdf` → `usePdfExtractor`, rồi OCR các trang `needsOcr` (thiếu module OCR thì giữ các trang có chữ và báo số trang bỏ qua).
- Không gửi khi mọi trang rỗng. Gửi `{ filename, sourceMimeType, sourceSizeBytes, method, pages }`.
- Test state machine bằng extractor giả: đi đủ trạng thái; lỗi `TOO_MANY_PAGES` dừng ở error; người dùng sửa trang rồi gửi đúng nội dung đã sửa.

### Task 7: Gộp, kiểm tra, tài liệu

- [ ] Backend: typecheck, lint, test. Mobile: typecheck, lint 0 lỗi, Jest, export web/Android/iOS.
- [ ] Cập nhật `docs/mobile-roadmap-status.md` (mục R3 và checklist thiết bị), ADR `docs/adr/004-local-extraction.md` (giới hạn, thư viện, không fallback cloud). Ghi `docs/progress/*` ở backend.
- [ ] PR backend vào `TrKimHieu/LEARN_backend`, PR mobile vào `TrKimHieu/LEARN_mobile`. Không deploy.
- [ ] Cổng thiết bị (làm khi bật server, bằng development build): PDF 100 trang có chữ trong 30 giây; PDF quét; ảnh chữ tiếng Việt; Expo Go báo thiếu OCR; RAM ≤ 150 MiB.
