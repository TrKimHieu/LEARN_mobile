# ADR 004 — Trích chữ tài liệu tại máy, chỉ gửi văn bản

Trạng thái: chấp nhận ngày 2026-11-09 (người dùng chọn "Làm đủ R3"). Sửa đổi ngày 2026-11-16: thêm bản sao tệp gốc cục bộ và DOCX/PPTX (xem phần cuối). Phần sửa đổi được người dùng xác nhận ngày 2026-11-16; chưa triển khai.

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

## Sửa đổi 2026-11-16 — giữ bản sao tệp gốc trên máy, thêm DOCX/PPTX

Người dùng chọn giữ bản sao cục bộ (roadmap nhóm T1). Các điểm trên giữ nguyên, trừ chỗ ghi rõ dưới đây.

- **Tệp gốc vẫn không rời máy.** Sau khi chọn tệp, app sao vào thư mục riêng của app (theo tài khoản) và ghi chỉ mục cục bộ trong SQLite của tài khoản: mã tài liệu, tên, kích thước, SHA-256, đường dẫn. Server vẫn chỉ nhận văn bản và metadata; không có bước PUT tệp lên kho lưu trữ. Gửi kèm SHA-256 và kích thước là metadata của văn bản, không phải tệp.
- **Mất tệp.** Gỡ app hoặc đổi máy thì bản sao mất. Tài liệu hiện "Tệp gốc không còn trên máy này"; văn bản đã trích vẫn dùng được cho bài học và thẻ. Người dùng có thể gắn lại tệp; app tính SHA-256 và chỉ chấp nhận khi trùng với giá trị đã lưu.
- **Quản lý dung lượng.** Màn hiện tổng dung lượng bản sao và cho xoá từng tệp. Xoá bản sao không xoá tài liệu đã trích, không xoá bài học.
- **Tài liệu cũ.** Các tài liệu đã nhập trước thay đổi này (không có bản sao) giữ nguyên, không ép di chuyển. Có tuỳ chọn "Tải về máy" cho tài liệu còn tệp gốc trên server (tài liệu thêm từ web); không có thì chỉ có văn bản.
- **DOCX và PPTX** trích tại máy theo cùng nguyên tắc: không dùng cloud. Giới hạn 100 trang/slide-tương-đương, 25 MiB, 30 giây áp dụng như PDF. Chọn thư viện giải nén OOXML trước khi làm; nếu không trích được đủ ổn định trong giới hạn thì định dạng đó bị chặn và báo rõ, như từng làm với PDF.
- **Spike PDF trước.** Chốt có hỗ trợ PDF hay không bằng ít nhất 5 PDF thật (tiếng Việt, bảng, ảnh quét), đo thời gian và RAM trên thiết bị; nếu không đạt thì ghi rõ PDF không được hỗ trợ.
- **Quyền riêng tư.** Bản sao nằm trong vùng lưu trữ riêng của app, không đưa vào bản sao lưu đám mây của hệ điều hành nếu nền tảng cho phép loại trừ; không ghi tên tệp gốc vào log.
- **Google Drive** (R7) chỉ là nguồn chọn tệp; tệp được tải về máy rồi xử lý như trên.

Hệ quả thêm: tốn dung lượng máy theo số tệp; cần migration SQLite cho bảng chỉ mục (theo `PRAGMA user_version`); cần cập nhật mock API và test contracts cho metadata mới (T1-11).
