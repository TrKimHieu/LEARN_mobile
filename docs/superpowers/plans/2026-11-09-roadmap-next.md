# LEARN Mobile — lộ trình tính năng tiếp theo

Cập nhật 2026-11-09, sau khi nâng Expo SDK 58 (commit `a3bb0a7`, branch `feat/expo-sdk-58`) và nối app với backend staging `https://3-107-190-42.sslip.io`.

Đây là bản tổng thể: mỗi chặng có mục tiêu, điều kiện bắt đầu, việc chính và cổng nghiệm thu. Bắt đầu chặng nào thì viết plan TDD chi tiết riêng cho chặng đó (như `2026-11-09-responsive-landscape.md`). Lý do: từ R3 trở đi app cần endpoint backend chưa có, nên tên trường và kiểu dữ liệu chỉ chốt được khi contracts mới phát hành.

Thứ tự giữ theo `docs/mobile-roadmap-status.md`; chỉ chèn thêm R1 (responsive). Không bỏ qua cổng nghiệm thu để làm chặng sau.

## Tình trạng hiện tại

| Hạng mục | Trạng thái |
| --- | --- |
| SDK 58, RN 0.88, React 19.3 | Xong; 53 test, typecheck, lint 0 lỗi, export 3 nền tảng |
| Backend staging | Sống; `contractsHash` `f93391e681bf` khớp app |
| Thiết bị thật | Chưa thử |
| npm registry | Đã tải được (trước đây bị EACCES/ENOTCACHED), nên font và SQLite không còn bị chặn |

Backend (`LEARN_backend_unified/packages/db/prisma/schema.prisma`) hiện có: User, Course, Document, Lesson, Exercise, Submission, LearningProgress, Plan/Subscription, AIJob. Chưa có CardSchedule, DailyGoal, Friendship, revision tài liệu hay endpoint nhập văn bản.

## R0 — Nghiệm thu nền trên staging (M1 còn lại)

**Mục tiêu:** chứng minh app chạy thật với backend đã host, và hoàn tất typography.

- Đổi font sang Inter (thân bài) và Plus Jakarta Sans (tiêu đề) qua `@expo-google-fonts/inter`, `@expo-google-fonts/plus-jakarta-sans`; bỏ Hanken Grotesk; kiểm dấu tiếng Việt và chân chữ "g", "q" ở nhãn tab.
- Expo Go trên điện thoại thật: đăng ký → đăng nhập → tạo khóa → sinh bài bằng AI → đọc bài → làm bài → tiến trình → đăng xuất.
- Xác minh EAS project `trankimhieu/learn-mobile`, build APK preview (`npm run build:apk`), cài lên Android và chạy lại luồng trên.
- Push `feat/expo-sdk-58` và mở PR vào `TrKimHieu/LEARN_mobile`.

**Cổng:** luồng trên chạy hết trên Android thật (và iOS nếu có máy); Back của Android, bàn phím, sáng/tối, chữ lớn đều ổn.

## R1 — Giao diện linh hoạt và xoay ngang

Plan chi tiết: `docs/superpowers/plans/2026-11-09-responsive-landscape.md` (7 task).

**Cổng:** checklist thiết bị ở Task 7 của plan đó đều đạt.

## R2 — Dữ liệu cục bộ SQLite (M2 còn lại)

**Mục tiêu:** xem lại khóa/bài đã tải khi mất mạng; thao tác ghi xếp hàng rồi gửi khi có mạng.

- `expo-sqlite` (có sẵn trong Expo Go). Mỗi DB tách theo tài khoản + origin + environment, giống khoá token hiện tại.
- Bảng cache cho khóa, bài, bài tập (đọc). Bảng outbox có `eventId` (UUID), `createdAt`, `attempts`, `serverTime`/timezone.
- Migration có số version; chạy trong transaction.
- Đăng xuất khi outbox còn hàng: hỏi người dùng gửi tiếp hay bỏ, không xoá ngầm.
- Không thay SQLite bằng AsyncStorage.

**Phụ thuộc backend:** các endpoint ghi phải nhận `eventId` để chống ghi trùng. Cần kiểm tra trước khi viết plan.

**Cổng:** bật chế độ máy bay → mở lại khóa đã xem → làm bài → tắt chế độ máy bay → server nhận đúng một lần.

## R3 — Nhập tài liệu tại máy, chỉ gửi văn bản (M3)

**Mục tiêu:** người dùng chọn PDF/ảnh/văn bản; app trích chữ tại máy, cho xem và sửa, rồi chỉ gửi văn bản lên server. Không gửi file gốc; tính năng upload gốc vẫn tắt.

- ADR về giới hạn: PDF tối đa 100 trang / 25 MiB, xử lý ≤ 30 giây, RAM tăng ≤ 150 MiB; vượt thì báo lỗi rõ.
- OCR tại máy, không fallback lên cloud. Cần module native nên phải chuyển sang development build (Expo Go không đủ).
- Màn quản lý tài liệu đã nhập: xem, đổi tên, xoá.

**Phụ thuộc backend:** endpoint nhận văn bản và contracts version mới. Thêm migration, không reset DB.

**Cổng:** bộ PDF thật (tiếng Việt, có bảng, có ảnh quét) qua giới hạn trên cả Android và iOS.

## R4 — Revision và trích dẫn nguồn khi sinh bài (M4)

- Mỗi lần sửa văn bản nguồn tạo một revision bất biến; bài sinh ra ghi revision đã dùng.
- Bài học hiển thị trích dẫn tới đoạn nguồn; bấm vào để mở đúng đoạn.
- Đánh giá câu khẳng định có căn cứ trên một bộ mẫu cố định.

**Phụ thuộc backend:** model revision và citation.

## R5 — Ôn tập ngắt quãng SRS (M5)

- SM-2 tính trên server (server quyết định lịch), app chỉ gửi kết quả ôn.
- Ôn khi mất mạng: kết quả vào outbox của R2; server giải quyết xung đột theo `eventId` và thời điểm.
- Màn "Ôn hôm nay" ở Tổng quan dùng FlipCard hiện có.

**Phụ thuộc backend:** model CardSchedule và endpoint review.

## R6 — Thời gian học, mục tiêu ngày, XP (M6)

- Bộ đếm theo timestamp (không đếm bằng setInterval), đúng khi app xuống nền.
- Mục tiêu ngày; XP do server cộng; ngày tính theo timezone của người dùng.

**Phụ thuộc backend:** model DailyGoal và sổ XP.

## R7 — Tính năng native (M7)

- Đọc to bài học (`expo-speech`); nhận giọng nói tại máy, không gửi cloud.
- Chọn file từ Google Drive; nhận nội dung chia sẻ từ app khác; deep link `learn://` và universal/app links tới `3-107-190-42.sslip.io` (hoặc domain thật sau này).
- Thông báo nhắc ôn tập (`expo-notifications`, cần FCM/APNs); đồng bộ outbox ở nền.
- Toàn bộ chặng này cần development build và cấu hình signing.

## R8 — Bạn học, bảng xếp hạng và phát hành (M8)

- Kết bạn riêng tư, giải đấu theo tuần; server giới hạn tần suất và có cờ bật/tắt.
- Đổi backend production sang domain riêng thay sslip.io; cập nhật `eas.json` (profile production đang trỏ staging).
- Phát hành Play Store / App Store; nghiệm thu cài mới và nâng cấp từ bản cũ.

**Phụ thuộc backend:** model Friendship và League.

## Đầu vào cần từ người dùng

| Chặng | Cần |
| --- | --- |
| R0 | Điện thoại Android (và iOS nếu có); xác nhận tài khoản Expo |
| R3, R7 | Đồng ý chuyển sang development build; bộ PDF mẫu |
| R7 | Tài khoản Firebase (FCM), Apple Developer (APNs), Google Cloud OAuth cho Drive |
| R8 | Domain riêng; tài khoản Play Console / App Store Connect |
