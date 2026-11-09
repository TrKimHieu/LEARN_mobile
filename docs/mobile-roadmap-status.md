# LEARN Mobile — tình trạng triển khai

Nguồn yêu cầu: kế hoạch M1–M8 được người dùng giao ngày 2026-11-09. Nhánh `feat/mobile-roadmap`, baseline `7dc9c39`. Repo gốc được giữ nguyên. Các kết quả cục bộ bên dưới không xác nhận staging hay thiết bị thật.

## M1 — đối chiếu màn và gate

| Website / luồng | Native hiện có | Điều chỉnh / còn cần nghiệm thu |
| --- | --- | --- |
| Đăng nhập/đăng ký/quên mật khẩu | `(auth)/*` | Token giao diện mới; kiểm bàn phím/chữ lớn/VoiceOver/TalkBack trên máy thật |
| Tổng quan | `(tabs)/index.tsx` | Resume, tiến độ, trạng thái dữ liệu; SRS chưa có backend |
| Khóa học / tạo khóa | `(tabs)/courses.tsx`, `course/new.tsx` | Giữ hành vi CRUD hiện tại; kiểm staging |
| Chi tiết khóa | `course/[courseId]/index.tsx` | Bài và nguồn cũ giữ nguyên; khóa nhập bản gốc ở cả UI và mutation |
| Bài học / sửa / nguồn | `course/[courseId]/lesson/[lessonId]/*`, `lesson-sources.tsx` | API cũ; chưa có revision bất biến của M4 |
| Luyện tập / kết quả | `practice.tsx`, `exercise-session.tsx` | Giữ chấm điểm server và không lộ đáp án trước nộp |
| Tiến trình | `(tabs)/progress.tsx` | Chưa có XP/SRS/social theo roadmap mới |
| Cài đặt | `(tabs)/settings.tsx` | Sáng/tối/hệ thống, tài khoản và gói hiện có |
| Quản trị | `(tabs)/admin.tsx`, `admin/ai-jobs/*` | Giữ màn role ADMIN; quyền thật do backend kiểm |

Token dùng màu/bo góc website. Các component skeleton, empty, error/retry, field và ring đã tồn tại; ring/bar và tab active dùng primary mới. Nút co giãn chiều cao để không cắt chữ lớn. FlipCard không animation, không mount đáp án khi chưa lật. Typography: Inter cho thân bài, Plus Jakarta Sans cho tiêu đề (2026-11-09); cần kiểm dấu tiếng Việt trên thiết bị.

Mọi môi trường cần `EXPO_PUBLIC_API_URL` là origin tường minh. Preview/production từ chối HTTP, loopback, credentials và path/query/fragment; không suy từ Metro. Refresh token vẫn ở SecureStore với khóa riêng theo environment + origin, access token ở bộ nhớ. Token cũ chưa phân vùng không được chuyển tự động vì không biết server phát hành; cần đăng nhập lại một lần khi nâng cấp. EAS có channel riêng và updates URL từ projectId đã có; runtime fingerprint ngăn OTA xuyên thay đổi native. ProjectId/owner trên tài khoản Expo chưa xác minh. Chưa có development binary Android/iOS.

## M2 — artifact

`npm run sync:contracts` xác minh SHA-256 tin cậy trong `vendor/checksums.json`, tên/phiên bản và entry JS/declarations trong tarball. `--source <đường-dẫn-tgz>` chỉ thay tệp đã pin sau xác minh; nguồn thiếu/hash sai dừng lỗi, giữ tệp cũ. Không lấy source backend. Khi nâng version cùng major: cập nhật pin, checksum do publisher cung cấp, đồng bộ artifact, chạy `npm ci`, typecheck và mock/contract tests. Major khác bị chặn cho đến khi rà soát tương thích.

Sau khi đổi pin/artifact, chạy `npm install --package-lock-only --ignore-scripts` để cập nhật lockfile rồi mới dùng `npm ci` kiểm cài mới độc lập; không commit pin mới với lockfile cũ. Typecheck và mock/contract tests là gate tương thích thực tế của các consumer; kiểm metadata/major trong script không chứng minh mọi thay đổi cùng major đều tương thích.

Artifact cục bộ là `@learn/api-contracts` 1.0.0. Backend đang chạy tương ứng hash/version nào chưa xác minh trực tiếp. Backend source cục bộ chưa có CardSchedule, DailyGoal, Friendship hay endpoint STO mới. Không coi mock là endpoint đã triển khai.

SQLite chưa tích hợp: Expo install offline thất bại ENOTCACHED, npm registry thất bại EACCES. Không thêm dependency chưa có lockfile, không thay bằng AsyncStorage để nhận là đạt gate. Khi có package, triển khai cache/outbox theo tài khoản + origin + environment, transaction, version, eventId, serverTime/timezone và xác nhận logout có hàng chờ. Hiện chưa có dữ liệu/outbox mới cần di chuyển.

## M3–M8 — chưa triển khai

Giữ nguyên thứ tự: SQLite → nhập/trích xuất local và endpoint text-only → revision/căn cứ AI → SRS offline → timer/XP → voice/Drive/deep link/notification → social/release. Các model server mới phải phát hành contracts theo tính năng, migration bổ sung, không reset DB. Không bật upload gốc tạm thời để lách gate.

Đầu vào còn thiếu: quyền tải dependency; HTTPS origin staging; xác nhận EAS project và signing; Android/iOS thật; bộ PDF thực; APNs/FCM/OAuth ở mốc liên quan. PDF chỉ bật từng nền tảng sau gate 100 trang/25 MiB, 30 giây, tăng RAM ≤150 MiB. OCR/STT phải tại máy; không fallback cloud.

## Kiểm chứng

Chạy `npm run sync:contracts`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:tooling`, `APP_ENV=preview EXPO_PUBLIC_API_URL=https://api.example.com npm run export`. URL example chỉ dùng build tĩnh; không chứng minh API hoạt động. Chạy mock trên máy dev với origin HTTP tường minh ở development. Export web không thay build native.

Kết quả cục bộ ngày 2026-11-09: typecheck, SHA artifact và các bộ test Jest/Node tooling đã chạy; kết quả cuối được ghi trong progress của task. Export web/iOS/Android đã tạo JS/Hermes bundle, chưa phải binary ký/cài lên thiết bị. Kiểm thử UI Playwright chưa chạy được vì bộ duyệt tự động từ chối lệnh mở Expo dev server. Mock API thử nghiệm đã dừng sau đó. Các test chống downgrade environment, loopback, phân vùng token, reset thẻ và thông báo screen reader đã được thấy thất bại trước sửa. Kiểm kích thước chữ/bố cục thật vẫn cần thiết bị.

Chưa nghiệm thu: staging login → khóa → bài/nguồn → luyện tập → tiến trình; Android/iOS safe area/Back/keyboard/dark mode/chữ lớn/screen reader; cài mới/nâng cấp; ownership/live AI/recovery của roadmap đầy đủ.

## Responsive và xoay ngang (2026-11-09)

Theo `docs/adr/003-responsive-layout.md` và plan `docs/superpowers/plans/2026-11-09-responsive-landscape.md`. App mở xoay; `useLayout()` phân loại cửa sổ compact/medium/expanded (600/840 dp) và `shortHeight` (< 480). `Screen` và thanh hành động chừa tai thỏ hai bên, nội dung giới hạn 480/720/1200. Lưới khóa học 1/2/3 cột, số liệu 2/4 cột. Cửa sổ rộng dùng rail trái. Tablet ngang có mục lục bài học thành cột. Đăng nhập chia đôi khi điện thoại ngang.

Kiểm tra tự động: typecheck, lint (0 lỗi), 77 Jest, 6 tooling và bundle web/Android/iOS đều qua.

2026-11-09: người dùng báo test trên điện thoại thật qua Expo Go (backend staging) thành công. Các mục dưới chưa được xác nhận riêng từng dòng:
- [ ] Điện thoại dọc/ngang: mọi tab, chi tiết khóa, bài học, làm bài, kết quả, đăng nhập
- [ ] Xoay khi đang gõ đăng nhập; xoay khi mục lục mở; xoay giữa bài làm
- [ ] Tai thỏ ở cả hai hướng ngang
- [ ] Chữ hệ thống lớn nhất, dọc và ngang
- [ ] Tablet dọc/ngang; chia đôi màn hình Android
- [ ] Sáng và tối

## R2 — Dữ liệu offline SQLite (2026-11-09)

Plan: `docs/superpowers/plans/2026-11-09-r2-offline-sqlite.md`. Mỗi tài khoản một file SQLite (`learn-<env>-<hash origin>-<userId>.db`, migration theo `PRAGMA user_version`) gồm bảng `kv` và `outbox`.

- Cache React Query của khóa, bài, bài tập được lưu và khôi phục khi mở app. Không lưu `meta` và màn quản trị. Bỏ cache khi đổi contracts hoặc phiên bản app; cache tồn tại tối đa 7 ngày.
- Mở app khi mất mạng mà phiên còn: vào bằng tài khoản gần nhất (`last-user.ts`, SecureStore theo environment + origin) để đọc cache. Có mạng lại thì api-client tự làm mới phiên.
- Hàng chờ gửi chỉ nhận `POST …/lessons/:id/start` (server idempotent). Gửi lại khi có mạng và khi app về foreground; 4xx thì bỏ mục, lỗi mạng hoặc 5xx thì giữ lại.
- Nộp bài chưa idempotent ở backend nên khi offline nút bị khoá ("Cần mạng để nộp"). Muốn nộp offline, backend cần nhận `Idempotency-Key` trước.
- Đăng xuất: gửi hàng chờ trước, còn sót thì hỏi; sau đó xoá DB của tài khoản. Hết phiên thì chỉ đóng DB.
- Bản web dùng store trong bộ nhớ (`sqlite.web.ts`), không lưu bền.

Kiểm tra tự động: typecheck, lint (0 lỗi), 120 Jest, bundle web/Android/iOS đều qua. Chưa nghiệm thu trên thiết bị:
- [ ] Xem khóa → bật chế độ máy bay → đóng hẳn app → mở lại → vẫn thấy khóa, bài, bài tập
- [ ] Bắt đầu bài khi offline → tắt chế độ máy bay → server ghi nhận đúng một lần
- [ ] Viên "Offline" hiện/ẩn đúng; nút nộp bị khoá khi offline
- [ ] Đăng xuất khi còn hàng chờ thì có hỏi; đăng nhập tài khoản khác không thấy cache cũ
