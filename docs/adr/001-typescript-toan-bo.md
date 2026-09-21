# ADR-001: TypeScript toàn bộ thay vì worker Python

Trạng thái: Đã chấp nhận · 2026-09-14

## Bối cảnh

AI Worker cần trích xuất văn bản, chunk tài liệu, gọi LLM và validate output — công việc mà hệ
sinh thái Python (đặc biệt cho OCR/PDF: `pypdf`, `pytesseract`) thường thuận tiện hơn Node. Nhưng
`apps/web` và `apps/api` cần chung kiểu dữ liệu với worker (đặc biệt là schema Zod validate output
LLM và hình dạng `AIJob`), và nhóm chỉ có một người phát triển.

## Quyết định

Toàn bộ hệ thống — `apps/web`, `apps/api`, `apps/worker` — dùng TypeScript, tổ chức trong một
monorepo. `packages/contracts` định nghĩa schema Zod dùng chung; `packages/ai` chứa prompt,
schema validate và chunker dùng chung giữa API (tạo job) và worker (chạy job).

## Hệ quả

**Tốt:** một schema Zod cho input/output LLM dùng chung ba tiến trình — đổi hình dạng dữ liệu chỉ
sửa một chỗ, TypeScript báo lỗi biên dịch ngay ở nơi dùng sai, không cần đồng bộ thủ công giữa
service viết bằng hai ngôn ngữ khác nhau.

**Xấu:** trích xuất PDF/PPTX/DOCX ở Node yếu hơn Python — `pdfjs-dist` xử lý tốt PDF có text layer
nhưng OCR (`tesseract.js`) chậm hơn `pytesseract`, và PPTX/DOCX (`officeparser`/`mammoth`) chưa
được kiểm chứng kỹ với tài liệu phức tạp.

**Sẽ xem lại khi:** tiêu chí đánh giá chất lượng trích xuất ở HANDBOOK §8.2 cho thấy > 15% đoạn bị
mất hoặc lộn xộn thứ tự trên bộ 20 tài liệu mẫu — khi đó cân nhắc tách riêng một service Python chỉ
làm trích xuất, giao tiếp qua HTTP nội bộ hoặc queue, giữ nguyên phần còn lại bằng TypeScript.
