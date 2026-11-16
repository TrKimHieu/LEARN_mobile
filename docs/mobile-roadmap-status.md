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
- Nộp bài khi offline: lượt nộp vào hàng chờ với `Idempotency-Key` = `eventId` (cùng key với lần gửi trực tiếp), server trả lại kết quả lần đầu nếu nhận trùng (LEARN_backend#7). Cần deploy backend đó trước khi phát hành bản app này.
- Sửa lỗi 2026-11-09: `apiFetch` báo mất mạng bằng `ApiClientError` status 0, trước đây không được coi là lỗi mạng nên hàng chờ không bao giờ nhận request khi offline thật.
- Đăng xuất: gửi hàng chờ trước, còn sót thì hỏi; sau đó xoá DB của tài khoản. Hết phiên thì chỉ đóng DB.
- Bản web dùng store trong bộ nhớ (`sqlite.web.ts`), không lưu bền.

Kiểm tra tự động: typecheck, lint (0 lỗi), 120 Jest, bundle web/Android/iOS đều qua. Chưa nghiệm thu trên thiết bị:
- [ ] Xem khóa → bật chế độ máy bay → đóng hẳn app → mở lại → vẫn thấy khóa, bài, bài tập
- [ ] Bắt đầu bài khi offline → tắt chế độ máy bay → server ghi nhận đúng một lần
- [ ] Viên "Offline" hiện/ẩn đúng; nộp bài khi offline hiện "Đã lưu bài làm" và server nhận đúng một lượt khi có mạng lại
- [ ] Đăng xuất khi còn hàng chờ thì có hỏi; đăng nhập tài khoản khác không thấy cache cũ

## R3 — Nhập tài liệu, trích chữ tại máy (2026-11-09)

Plan: `docs/superpowers/plans/2026-11-09-r3-local-import.md`; quyết định: `docs/adr/004-local-extraction.md`. Nút "Nhập tài liệu" thay cho thông báo tạm khoá. Chọn PDF, ảnh hoặc `.txt`/`.md` → trích chữ tại máy → xem lại, đổi tên, sửa từng trang → gửi văn bản tới `POST /courses/:courseId/documents/text` (LEARN_backend#8, contracts 1.1.0). Upload tệp gốc vẫn bị chặn ở mobile.

- PDF có chữ: pdf.js trong WebView ẩn, thư viện nằm sẵn trong bundle (`pdfjs-source.generated.ts`, tạo bằng `npm run gen:pdfjs`).
- Ảnh và trang quét (dưới 20 ký tự): ML Kit Text Recognition tại máy. Expo Go không có module này, nên giữ các trang có chữ và báo số trang bị bỏ qua.
- Giới hạn: 100 trang, 25 MiB, 30 giây. Server kiểm lại số ký tự và hạn mức.
- Cần development build (`expo-dev-client`) để có OCR.

Kiểm tra tự động: typecheck, lint (0 lỗi), 166 Jest, bundle web/Android/iOS đều qua. Chưa nghiệm thu trên thiết bị:
- [ ] Development build Android/iOS cài được (`eas build --profile development`)
- [ ] pdf.js nạp từ Blob URL trong Android WebView và iOS WKWebView (rủi ro lớn nhất; nếu lỗi thì nhúng thư viện dạng script thường)
- [ ] PDF 100 trang có chữ xong trong 30 giây; RAM tăng ≤ 150 MiB
- [ ] PDF quét và ảnh chụp chữ tiếng Việt có dấu được OCR đúng
- [ ] PDF có mật khẩu hoặc tệp hỏng báo lỗi, không treo
- [ ] Expo Go: nhập văn bản và PDF có chữ chạy được; ảnh báo cần bản cài đặt đầy đủ
- [ ] Tài liệu nhập xong dùng được để sinh bài bằng AI

## R5 — Ôn tập ngắt quãng (2026-11-09)

Plan: `docs/superpowers/plans/2026-11-09-r5-srs.md`. Thẻ là câu hỏi của bài tập đã nộp, nên đáp án không lộ trước khi nộp. Server giữ lịch SM-2 (LEARN_backend, contracts 1.2.0). Tổng quan hiện "Ôn hôm nay" khi có thẻ đến hạn; màn `/review` lật thẻ rồi chấm "Quên / Khó / Được / Dễ". Lượt chấm gửi kèm `Idempotency-Key`; khi offline thì vào hàng chờ, và thẻ được bỏ khỏi cache để ôn tiếp được. `FlipCard` có thêm `onFlip`, để nút chấm mở được cả khi lật bằng TalkBack/VoiceOver.

Kiểm tra tự động: typecheck, lint (0 lỗi), 177 Jest, bundle web/Android/iOS đều qua. Chưa nghiệm thu:
- [ ] Ôn 10 thẻ offline rồi có mạng: server ghi đúng 10 lượt, lịch hôm sau đúng
- [ ] Đổi giờ máy sang tương lai: lịch không bị đẩy xa
- [ ] TalkBack/VoiceOver: lật thẻ rồi chấm được

## W — Đồng bộ tính năng từ website (kế hoạch, 2026-11-16)

Nguồn: rà soát `LEARN_web_standalone` (contracts 1.5.0) và `SPEC_flashcards_review_pomodoro.md`. Mobile hiện pin contracts thấp hơn web, nên mọi mục dưới đây bắt đầu bằng `npm run sync:contracts` lên bản có schema tương ứng, rồi typecheck và mock tests. Tuân thủ `UI_PLATFORM_RULES.md`: element mobile viết riêng, không chép layout web. Chưa triển khai mục nào; mọi ô còn trống.

Thứ tự đề xuất: W1 → W2 → W3 → W4 → W5 → W6. W1–W3 dùng backend sẵn có; W4–W6 chỉ làm khi backend đã phát hành endpoint tương ứng.

### W1 — Bộ thẻ và thẻ tự tạo (web: `features/flashcards`)
Tách biệt khỏi ôn câu hỏi bài tập ở R5 (theo spec, thẻ web và thẻ bài tập là hai thực thể khác nhau). Tab "Thẻ" mới, hoặc mục trong Tổng quan nếu hết chỗ trên thanh tab.
- [ ] Danh sách bộ thẻ kèm số thẻ mới / đang học / đến hạn; tạo, đổi tên, xoá (có xác nhận) bộ thẻ; gắn khóa học tùy chọn
- [ ] Chi tiết bộ: thêm, sửa, xoá, chuyển thẻ sang bộ khác; báo lỗi tiếng Việt khi mặt trước/sau trống hoặc quá dài
- [ ] Ôn một bộ và "Ôn hôm nay" (gộp mọi thẻ đến hạn): lật thẻ → Quên / Khó / Tốt / Dễ theo SM-2, `Idempotency-Key`, vào outbox khi offline
- [ ] Cache SQLite cho bộ thẻ và thẻ đến hạn; huy hiệu số thẻ đến hạn trên tab và Tổng quan
- [ ] Phiên ôn trống hiện thời điểm thẻ kế tiếp đến hạn; TalkBack/VoiceOver lật và chấm được

### W2 — AI sinh thẻ nháp
- [ ] Màn "Sinh thẻ bằng AI": chọn khóa, nguồn (một bài học hoặc một tài liệu), số thẻ tối đa 1–30
- [ ] Theo dõi job (tiến độ, huỷ, thành công một phần, lỗi), báo hết hạn mức AI của gói
- [ ] Màn duyệt thẻ nháp: sửa, bỏ bớt, thêm vào bộ có sẵn hoặc bộ mới; thẻ nháp không có lịch ôn cho đến khi chấp nhận

### W3 — Pomodoro và nhắc ôn
- [ ] Bộ đếm học/nghỉ chỉnh được (mặc định 25/5), tính giờ từ mốc thời gian thật để đúng khi app nền hoặc xoay màn; lưu cài đặt cục bộ
- [ ] Thông báo cục bộ khi hết giờ và khi có thẻ đến hạn (expo-notifications, chỉ khi người dùng cấp quyền; từ chối vẫn dùng đủ tính năng); công tắc tắt trong Cài đặt
- [ ] Không ghi phiên lên backend, không XP, giống phạm vi web

### W4 — Tài liệu và khóa học
- [ ] Hỗ trợ Word, PowerPoint ngoài PDF/ảnh/văn bản: giữ nguyên nguyên tắc trích chữ tại máy (ADR 004); nếu không trích được tại máy thì giữ chặn, không bật upload tệp gốc để lách gate
- [ ] Xoá khóa học và xoá tài liệu có xác nhận (web có, mobile chưa); danh sách "Đã lưu trữ"
- [ ] Trạng thái tài liệu (chờ tải / đang đọc / sẵn sàng / lỗi) khớp web

### W5 — Tiến trình
- [ ] Biểu đồ hoạt động 7 ngày gần nhất
- [ ] Tổng quan thêm chuỗi ngày học, số bài đã xong, điểm trung bình

### W6 — Quản trị
- [ ] Trang người dùng (tìm theo email), khóa học (tìm theo tên), gói đăng ký trả phí; chỉ ADMIN, backend kiểm quyền thật
- [ ] Bộ lọc trạng thái ở danh sách job AI

### Cài đặt
- [ ] Nâng cấp / huỷ gói trong app (hiện chỉ xem gói); giữ thanh toán ở chế độ demo cho tới khi backend có cổng thật

### Không đưa sang mobile
Kéo thả tệp, trang `/dev/*`, nhắc ôn bằng Web Notification API, lưu Pomodoro bằng localStorage (thay bằng bộ nhớ cục bộ của app).

## Bổ sung từ danh sách P / T / X (2026-11-16)

Gộp các mục chưa có hoặc mới có một phần. Mục đã xong hoặc đã nằm ở R0–R8 không lặp lại. Mã giữ nguyên để đối chiếu.

### Cần quyết trước khi làm
- [x] **Lưu tệp gốc trên máy (T1-2, T1-7 → T1-10):** đã chọn giữ bản sao cục bộ (2026-11-16). Tệp gốc chỉ nằm trên máy, không upload lên server; server chỉ nhận văn bản và metadata. Việc kèm theo: cập nhật ADR 004 (lưu bản sao, SHA-256, dung lượng) trước T1-2; mục ADR (a) của P-3 gộp vào đó.
- [x] **Thời gian học (T3-5):** đã chọn chỉ lưu cục bộ (2026-11-16), khớp W3. Ghi theo khóa/bài trong SQLite của tài khoản; không gửi lên server, không cần backend hay contracts mới. T3-6 đọc từ SQLite này, nên chỉ có trên máy đã học.
- [x] **Hai hệ thẻ:** thẻ từ câu hỏi bài tập (R5) và thẻ tự tạo (W1) là hai thực thể riêng, dùng chung SM-2. Đã ghi ở `docs/adr/005-srs-two-card-systems.md` (đã xác nhận); đây là phần (b) của P-3.

### Nền móng
- [x] **P-1** Commit baseline sạch trên nhánh `chore/baseline-testing-mode-docs` (2026-11-16, chưa push, chưa PR). Thực tế nội dung là chế độ Testing, sửa lỗi offline và tài liệu; không tìm thấy refactor "tách component theo feature" chưa commit. typecheck 0 lỗi, lint 0 lỗi (37 cảnh báo), 187 Jest qua
- [~] **P-2** Nâng pin lên contracts 1.5.0 (2026-11-16, nhánh `chore/contracts-1.5.0`): tgz lấy từ web vendor, SHA-256 `fc954293…abccc` khớp pin tin cậy của web; `sync:contracts`, typecheck, lint (0 lỗi), 187 Jest và 6 tooling đều qua. 1.5.0 thêm module `flashcard` (Deck, Card, `reviewCard`, `createDeckSchema`, `patchDeckSchema`), đủ cho W1/W2. **Chưa có** trong bất kỳ bản nào: CardSchedule, StudySession, XpEvent, DailyGoal, Friendship, LeagueEntry, endpoint STO nhận văn bản mới; các mục T3-5 (cục bộ), T4, T5 chờ backend phát hành. Chưa kiểm hash với staging (`/meta` chỉ cảnh báo `contractsDiffer`); chưa chạy `npm run export`
- [x] **P-3** ADR đã viết và được xác nhận 2026-11-16: (a) trích xuất và bản sao cục bộ — sửa đổi 2026-11-16 ở `adr/004-local-extraction.md`; (b) SRS — `adr/005-srs-two-card-systems.md`; (c) XP và chống gian lận — `adr/006-xp-and-anti-cheat.md`
- [x] **P-5** Quy trình dependency ở `docs/dependencies.md` (2026-11-16): `npx expo install` theo đợt, mỗi đợt một nhánh và một commit lockfile, cách cài khi mạng chập chờn, đợt D1 (thông báo), D2 (DOCX/PPTX), D3 (R7). Chưa cài gói nào
- [ ] **P-6** Xác minh owner/projectId EAS `1d60d1e2-0017-4a99-ac67-1f02f5454443` và `updates.url` (đã khai trong `app.json`, chưa xác minh)

### T1 — Tệp gốc (đã chốt giữ bản sao cục bộ)
- [ ] **T1-2** Chọn tệp, sao vào thư mục riêng, ghi chỉ mục cục bộ (mã, tên, kích thước, SHA-256, đường dẫn)
- [ ] **T1-4** Trích xuất DOCX và PPTX trên máy (độc lập với (b); ADR 004 chưa có hai định dạng này)
- [ ] **T1-7** Trạng thái "Tệp gốc không còn trên máy này" khi mất tệp (gỡ app, đổi máy)
- [ ] **T1-8** Gắn lại tệp gốc, kiểm bằng SHA-256
- [ ] **T1-9** Màn "Quản lý dung lượng": tổng dung lượng, xoá từng tệp, không xoá bài học
- [ ] **T1-10** Giữ nguyên tài liệu cũ; tuỳ chọn "Tải về máy", không ép di chuyển
- [ ] Kết nối Google Drive (R7)

### T2 — Ôn tập
- [ ] **T2-1** Hàm thuần `sm2.ts` + unit test bộ ví dụ cố định, để kiểm lịch server trả về và dự đoán "đến hạn" offline
- [ ] **T2-2** API + hook sinh thẻ (AI Job), sửa, thêm, xoá thẻ (trùng W1/W2)
- [ ] **T2-5** Kiểm "đến hạn" theo múi giờ máy chủ bằng test đổi giờ máy
- [ ] **T2-7** Lối vào ôn tập ở màn bài học (đã có ở Tổng quan)

### T3 — Thời gian học
- [ ] **T3-1** `timer.ts` thuần, tính từ mốc thời gian thật + unit test (trùng W3)
- [ ] **T3-2, T3-3** Chu kỳ học/nghỉ chỉnh được; thông báo cục bộ khi hết chu kỳ kể cả app ở nền; xử lý khi từ chối quyền
- [ ] **T3-4** Xác nhận khi thoát giữa chu kỳ; tạm dừng và tiếp tục
- [ ] **T3-5** Bắt đầu từ bài học hoặc phiên SRS; ghi thời gian theo khóa và bài vào SQLite cục bộ (không gửi server)
- [ ] **T3-6** Thống kê thời gian học theo ngày ở tab Tiến trình

### T4 — Mục tiêu và XP
- [ ] **T4-1** Định nghĩa "ngày đã học" (hoàn thành bài / nộp bài / phiên SRS) theo múi giờ máy chủ; ghi vào ADR XP
- [ ] **T4-2** Hiển thị XP và chuỗi ngày do server tính, client chỉ hiển thị
- [ ] **T4-3** Chọn mục tiêu ngày + `ring` ở Tổng quan
- [ ] **T4-4** Nhắc học cục bộ theo giờ, chỉ khi hôm nay chưa đạt mục tiêu
- [ ] **T4-5** (Có thể) cảnh báo khi chuỗi sắp đứt

### T5 — Bạn bè và xếp hạng
- [ ] **T5-1** Kết bạn bằng mã mời hoặc email; chấp nhận, từ chối, huỷ
- [ ] **T5-2** Bảng xếp hạng tuần theo XP trong nhóm bạn bè
- [ ] **T5-3** Chế độ hiển thị tên, mặc định chỉ bạn bè thấy
- [ ] **T5-4** Chống gian lận: chỉ tính XP do server, giới hạn XP tối đa mỗi ngày
- [ ] **T5-5** Không lộ email, lịch sử học, nội dung khoá học cho người không phải bạn bè
- [ ] **T5-6** Giới hạn tần suất lời mời (server)
- [ ] **T5-7** Lối vào bạn bè và xếp hạng từ tab Tiến trình

### X — Thiết kế
- [ ] **X-1** Chốt design system mới (token) + ADR thay ADR 001 (ADR 001 chỉ còn ở `LEARN_mobile/docs/adr`; ADR 002 đã chuyển token từ website)
- [ ] **X-2** Cập nhật `components/ui/**` theo token mới trước khi tính năng dựng UI
- [ ] **X-3** Visual pass từng tính năng sau khi luồng ổn định

### Thứ tự đề xuất
P-1 → P-3 (gồm sửa ADR 004) → P-2 → P-5 → X-1 → X-2 → T1 → T2 → T3 → T4 → T5 → X-3. Nhóm W (website) xen vào T2/T3/T5 vì trùng nội dung; làm một lần, không làm hai bản.
