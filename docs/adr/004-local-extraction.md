# ADR 004 — Trích chữ tài liệu tại máy, chỉ gửi văn bản

Trạng thái: chấp nhận ngày 2026-11-09 (người dùng chọn "Làm đủ R3").

## Bối cảnh

Từ M1 app đã khoá luồng tải tệp gốc (presigned URL → S3 → worker trích chữ), vì tệp gốc không được rời khỏi máy. Vì vậy trên thiết bị thật không còn cách nào thêm tài liệu.

## Quyết định

- App trích chữ ngay trên máy rồi gửi văn bản qua `POST /api/v1/courses/:courseId/documents/text` (contracts 1.1.0, `importTextDocumentSchema`). Server cắt chunk và lưu tài liệu ở trạng thái `EXTRACTED` luôn, không qua S3/worker. `storageKey` của các tài liệu này có dạng `text/<id>` và không có tệp gốc để tải về.
- Văn bản `.txt`/`.md`: đọc UTF-8 bằng `expo-file-system`.
- PDF có lớp chữ: dùng pdf.js (`pdfjs-dist` bản legacy) chạy trong WebView ẩn. Thư viện được đóng gói sẵn trong app, nên không tải gì từ mạng.
- Ảnh, và các trang PDF có dưới 20 ký tự chữ (trang quét): pdf.js render trang thành ảnh PNG, rồi ML Kit Text Recognition (`@react-native-ml-kit/text-recognition`, Latin) nhận dạng chữ tại máy. ML Kit có tiếng Việt ở mức "Supported".
- Không có phương án dự phòng dùng OCR hay trích chữ trên cloud.
- Giới hạn mỗi tài liệu: 100 trang, 25 MiB, xử lý trong 30 giây. Server kiểm lại số trang, số ký tự và hạn mức theo gói.

## Hệ quả

- ML Kit là module native, nên app cần development build (`expo-dev-client`). Expo Go vẫn nhập được văn bản và PDF có chữ; với ảnh và trang quét thì báo cần bản cài đặt đầy đủ.
- pdf.js làm bundle JS nặng thêm khoảng 1,9 MB (thư viện và worker).
- Luồng upload gốc ở server vẫn giữ cho web; mobile không gọi tới.
- Tiêu chí RAM tăng ≤ 150 MiB, thời gian 30 giây với PDF 100 trang và độ chính xác dấu tiếng Việt chỉ nghiệm thu được trên thiết bị thật.
