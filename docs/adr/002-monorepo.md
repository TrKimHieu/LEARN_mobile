# ADR-002: Monorepo với 3 app và 5 package dùng chung

Trạng thái: Đã chấp nhận · 2026-09-14

## Bối cảnh

Hệ thống có 3 tiến trình chạy độc lập (`apps/web`, `apps/api`, `apps/worker`) nhưng chia sẻ rất
nhiều: schema dữ liệu (Zod), Prisma client, prompt và validate AI, design token UI. Tách thành
nhiều repo riêng sẽ buộc phải publish package nội bộ lên registry riêng và giữ đồng bộ version thủ
công — không khả thi cho một người phát triển vừa build vừa đổi schema liên tục.

## Quyết định

Một repo Git duy nhất, npm workspaces: `apps/{web,api,worker}` và
`packages/{contracts,db,ai,ui,config}`. `packages/contracts` (Zod schema), `packages/db` (Prisma
client + `newId()`), `packages/ai` (prompt, chunker, validate), `packages/ui` (design token),
`packages/config` (Tailwind theme, tsconfig base) đều import bằng alias `@learn/*`, không có
bản build trung gian phải publish.

## Hệ quả

**Tốt:** sửa một schema trong `packages/contracts` báo lỗi type ngay lập tức ở mọi nơi dùng sai
(web/api/worker) mà không cần bump version hay `npm link`. CI chạy một lần `npm run typecheck` cho
toàn bộ, không cần orchestrate nhiều pipeline.

**Xấu:** `npm install` ở root cài dependency cho cả 3 app dù chỉ sửa một app; build production
(`npm run build`) phải build đúng thứ tự (`packages/*` trước `apps/*`) — dễ quên khi thêm app mới.

**Sẽ xem lại khi:** có nhiều hơn một người/đội cùng phát triển và cần release độc lập từng app theo
lịch riêng — khi đó cân nhắc tách `packages/contracts`/`packages/db` thành package publish thật.
