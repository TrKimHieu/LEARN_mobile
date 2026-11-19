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
- [x] Tab "Thẻ" (`(tabs)/decks.tsx`): danh sách bộ kèm Mới / Đang học / Đến hạn, tạo bộ có gắn khóa tùy chọn; chi tiết bộ đổi tên, đổi khóa, xoá có xác nhận (2026-11-16)
- [x] Chi tiết bộ (`deck/[deckId].tsx`): thêm, sửa, xoá, chuyển thẻ; báo lỗi tiếng Việt khi trống hoặc quá 2000 ký tự (giới hạn client, server kiểm lại)
- [x] Ôn một bộ và "Ôn thẻ hôm nay" (`deck-review.tsx`): lật thẻ → Quên / Khó / Tốt / Dễ; key và giờ chấm giữ nguyên khi gửi lại; mất mạng thì vào outbox (`/cards/:id/review` thêm vào danh sách cho phép)
- [x] Cache: query `decks` được persist SQLite. Huy hiệu số thẻ tự tạo đến hạn trên tab Thẻ và thẻ "Ôn thẻ" ở Tổng quan (2026-11-16)
- [~] Phiên ôn trống hiện thời điểm thẻ kế tiếp. TalkBack/VoiceOver dùng `FlipCard` như R5, chưa thử trên thiết bị

Chưa kiểm với backend thật: backend trong `LEARN_backend_unified` hiện chưa có route `/decks` (nằm ở nhánh backend khác); mobile dựng theo contracts 1.5.0, giống web. Kiểm tra: typecheck, lint 0 lỗi, 242 Jest.

### W2 — AI sinh thẻ nháp
- [x] 2026-11-16: `flashcards-generate.tsx` (chọn khóa, một bài học hoặc một tài liệu đã trích xuất, 1–30 thẻ; tiến độ, dừng, lỗi theo mã, báo hết hạn mức) và `flashcards-drafts.tsx` (chọn sẵn tất cả, sửa, bỏ, thêm vào bộ có sẵn hoặc bộ mới rồi mở bộ đó). Lối vào ở tab Thẻ. Chưa kiểm với backend thật
- [x] Màn "Sinh thẻ bằng AI": chọn khóa, nguồn (một bài học hoặc một tài liệu), số thẻ tối đa 1–30
- [x] Theo dõi job (tiến độ, huỷ, lỗi), báo hết hạn mức AI của gói
- [x] Màn duyệt thẻ nháp: sửa, bỏ bớt, thêm vào bộ có sẵn hoặc bộ mới; thẻ nháp không có lịch ôn cho đến khi chấp nhận

### W3 — Pomodoro và nhắc ôn
- [x] Bộ đếm học/nghỉ chỉnh được, tính từ mốc thời gian thật — xem T3-1/T3-2
- [x] Thông báo cục bộ khi hết giờ và nhắc ôn khi có thẻ đến hạn — xem T3-3
- [x] Không ghi phiên lên backend, không XP (thời gian học chỉ lưu cục bộ, T3-5)

### W4 — Tài liệu và khóa học
- [x] Word (.docx), PowerPoint (.pptx) trích tại máy — xem T1-4 (2026-11-16)
- [x] Xoá khóa học (cuối màn khóa) và xoá từng tài liệu, đều có xác nhận; xoá tài liệu xoá luôn bản gốc trên máy. Nhãn "Đã lưu trữ" đã có trên thẻ khóa học (2026-11-16)
- [x] Nhãn trạng thái tài liệu (Chờ tải lên / Đã tải lên / Đang trích xuất / Đã trích xuất / Lỗi) đã có từ trước

### W5 — Tiến trình
- [x] Thẻ "lần làm bài 7 ngày gần nhất" ở tab Tiến trình, cùng logic `weekly-activity.ts` với web (2026-11-16)
- [x] Chuỗi ngày học, bài đã xong, điểm trung bình đã có ở Tổng quan (`ProgressStats`)

### W6 — Quản trị
- [x] Màn `admin/directory` (mở từ tab Quản trị): người dùng tìm theo email, khóa học tìm theo tên, gói trả phí; chỉ xem, không lưu offline (2026-11-16)
- [x] Bộ lọc trạng thái job AI đã có từ trước (mặc định "Thất bại")

### Cài đặt
- [x] Nâng cấp / huỷ gói đã có trong Cài đặt (`plan-list`, `current-plan`); thanh toán vẫn ở chế độ demo

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
- [x] **P-6** EAS đã xác minh 2026-11-18: `eas-cli project:info` ra `@trankimhieu/learn-mobile`, ID `1d60d1e2-0017-4a99-ac67-1f02f5454443`; bản development Android build và cài được. Lệnh EAS không phải build (`project:info`, `credentials`) không đọc `.env`: đặt `EXPO_PUBLIC_API_URL` trong terminal trước khi chạy

### T1 — Tệp gốc (đã chốt giữ bản sao cục bộ)
- [x] **T1-2** Sau khi server nhận văn bản, tệp được sao vào `Paths.document/sources/<tên DB tài khoản>/` và ghi chỉ mục ở bảng SQLite `source_files` (migration 2: mã tài liệu, khóa, tên, mime, kích thước, SHA-256, URI). Đăng xuất hẳn xoá cả thư mục; chế độ Testing không lưu. Lỗi sao chép không làm hỏng tài liệu (2026-11-16, `src/lib/source-files.ts`, 4 test). Chưa thử trên thiết bị
- [x] **T1-4** DOCX/PPTX trích tại máy (`extract/office.ts`, `fflate` giải nén, đọc `<w:t>`/`<a:t>`): DOCX cắt khối 20.000 ký tự, PPTX mỗi slide một trang theo số tệp, tối đa 100; chặn giải nén quá 100 MiB. Method gửi server là `TEXT`. 8 test, bundle Android build được (2026-11-16). Chưa đo thời gian/RAM với tệp thật; bảng, ghi chú diễn giả và slide ẩn chưa xử lý riêng
- [x] **T1-7** Danh sách tài liệu hiện "Bản gốc đang lưu trên máy này" hoặc "Tệp gốc không còn trên máy này" theo chỉ mục + `File.exists` (2026-11-16)
- [x] **T1-8** Nút "Gắn lại tệp": chọn tệp cùng loại, chỉ nhận khi SHA-256 trùng; sai thì báo "SHA-256 không khớp" (2026-11-16)
- [x] **T1-9** Màn `/storage` "Quản lý dung lượng" mở từ Cài đặt: tổng dung lượng, danh sách, xoá từng bản sao có xác nhận; không xoá tài liệu hay bài học (2026-11-16)
- [~] **T1-10** Tài liệu cũ và tài liệu từ web không có dòng bản gốc, không bị ép di chuyển (đã có). Còn thiếu "Tải về máy": contracts 1.5.0 chưa có endpoint tải tệp gốc cho mobile; chờ backend

Kiểm tra T1-7 → T1-9: typecheck, lint 0 lỗi, 221 Jest, export web bundle được. Chưa thử trên thiết bị (gỡ app, đổi máy, chọn lại tệp thật).
- [ ] Kết nối Google Drive (R7)

### T2 — Ôn tập
- [x] **T2-1** `src/features/reviews/sm2.ts` chép đúng SM-2 của backend (`core/srs/sm2.ts`), thêm `predictDueAt`; 9 test cùng bảng giá trị với backend (2026-11-16). Chưa nối vào UI
- [x] **T2-2** Trùng W1/W2, đã làm ở `features/flashcards/flashcards-api.ts`
- [x] **T2-5** Test `due-clock.test.tsx`: đặt giờ máy sang năm sau, app vẫn gọi `/api/v1/reviews/due` không kèm giờ máy và hiện đúng số đến hạn của server (2026-11-16). Chưa thử đổi giờ trên thiết bị thật
- [x] **T2-7** `ReviewEntry` thêm vào cuối màn bài học, chỉ hiện khi có thẻ đến hạn (2026-11-16)

### T3 — Thời gian học
- [x] **T3-1** `src/features/focus/timer.ts` cùng logic `pomodoro.ts` của web; 18 test (2026-11-16). Chưa có UI
- [x] **T3-3** Thông báo cục bộ khi hết chu kỳ, kể cả app ở nền (`src/lib/notifications.ts`, `expo-notifications`). Hỏi quyền lúc bấm Bắt đầu; từ chối thì bộ đếm vẫn chạy, không hỏi lại. Tạm dừng/đặt lại thì huỷ lịch (2026-11-16)
- [x] **W3 nhắc ôn** Công tắc trong Cài đặt (mặc định tắt). Bật thì hẹn 19:00 khi server báo có thẻ đến hạn, không có thì huỷ. Cần development build mới vì là module native (2026-11-16)
- [x] **T3-2** Màn `/focus` (Pomodoro), mở từ Tổng quan; học/nghỉ chỉnh được, lưu cục bộ bằng AsyncStorage (2026-11-16)
- [x] **T3-4** Tạm dừng/tiếp tục; rời màn khi đang chạy thì hỏi, đồng ý thì tạm dừng rồi mới rời (`usePreventRemove`) (2026-11-16)
- [x] **T3-5** Nút "Học tập trung (Pomodoro)" ở màn bài học mở `/focus?courseId&lessonId`; mỗi chu kỳ học chạy hết ghi số phút theo ngày, khóa và bài vào kv của DB SQLite tài khoản (giữ 90 ngày, không gửi server). Phiên ôn (câu hỏi và thẻ) có nút đồng hồ trên thanh tiêu đề mở Pomodoro, không gắn khóa/bài; chu kỳ bỏ dở không tính (2026-11-16)
- [x] **T3-6** Thẻ "Thời gian học 7 ngày" ở tab Tiến trình, chỉ số liệu của máy này (2026-11-16)

### T4 — Mục tiêu và XP
- [x] **T4-1** Ngày đã học = có nộp bài luyện tập hoặc chấm Mức nhớ một thẻ; đọc bài và câu hỏi nhanh không tính. Backend tính theo `APP_TIMEZONE`, trả `activeStreak` và `lastStudyDay` (backend #15, contracts 1.7.0)
- [~] **T4-2** Chuỗi ngày do server tính đã hiện ở màn Học (🔥 N, mascot theo nhịp học; mobile GĐ1, PR #17). Còn thiếu XP: spec web xếp XP vào "không phải mục tiêu lần này"
- [~] **T4-3** Vòng mục tiêu ngày `X/Y` ở màn Học (PR #17); mục tiêu = 2–4 việc hôm nay do hệ thống gom, người dùng chưa tự chọn số mục tiêu
- [x] **T4-4** Nhắc học 19:00 theo việc hôm nay còn dở (thông báo liệt kê việc); xong hết thì huỷ nhắc; qua 19:00 thì nhắc ngày mai bằng câu chung. Công tắc "Nhắc học" trong Cài đặt (2026-11-19)
- [x] **T4-5** Thông báo 19:00 đổi thành "Giữ chuỗi N ngày" khi đang có chuỗi mà hôm nay chưa có ngày học theo server (chưa nộp bài, chưa ôn thẻ); vẫn nhắc cả khi việc hôm nay đã xong. Không trách móc (2026-11-20)

### T5 — Bạn bè và xếp hạng
- [ ] **T5-1** Kết bạn bằng mã mời hoặc email; chấp nhận, từ chối, huỷ
- [ ] **T5-2** Bảng xếp hạng tuần theo XP trong nhóm bạn bè
- [ ] **T5-3** Chế độ hiển thị tên, mặc định chỉ bạn bè thấy
- [ ] **T5-4** Chống gian lận: chỉ tính XP do server, giới hạn XP tối đa mỗi ngày
- [ ] **T5-5** Không lộ email, lịch sử học, nội dung khoá học cho người không phải bạn bè
- [ ] **T5-6** Giới hạn tần suất lời mời (server)
- [ ] **T5-7** Lối vào bạn bè và xếp hạng từ tab Tiến trình

### X — Thiết kế
- [x] **X-1** Không cần design system mới: ADR 002 đã thay ADR 001; token sáng/tối, bo góc 14/20/24 và font Inter/Plus Jakarta trong `src/theme/tokens.ts` khớp `theme.css` web ngày 2026-11-16. Màu trạng thái ok/bad/warn của web chưa có token riêng ở mobile; thêm khi tính năng cần
- [x] **X-2** `components/ui/**` đã dùng token của `tokens.ts`; không cần đổi (2026-11-16)
- [~] **X-3** Rà trên bản web (375×812, chế độ Testing) 2026-11-16, cả tối và sáng: Tổng quan, Pomodoro (chạy/tạm dừng/đặt lại), tab Thẻ, Sinh thẻ bằng AI, Thẻ nháp (trạng thái lỗi), Tiến trình (biểu đồ 7 ngày), Cài đặt, Quản lý dung lượng (trạng thái trống) đều đúng bố cục; đã sửa công tắc nhắc ôn thiếu tiêu đề. Chưa rà được: chi tiết bộ thẻ và phiên ôn thẻ (dữ liệu demo không có API bộ thẻ), màn admin (tài khoản demo không phải ADMIN), và mọi màn trên thiết bị thật

### Thứ tự đề xuất
P-1 → P-3 (gồm sửa ADR 004) → P-2 → P-5 → X-1 → X-2 → T1 → T2 → T3 → T4 → T5 → X-3. Nhóm W (website) xen vào T2/T3/T5 vì trùng nội dung; làm một lần, không làm hai bản.
