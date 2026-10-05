# LEARN Mobile

Ứng dụng di động của **LEARN**: biến tài liệu của bạn thành bài học và bài tập tương tác. App dùng
chung API với bản web (repo [LEARN_website](https://github.com/TrKimHieu/LEARN_website), `apps/api`). Có đủ các màn người học như web và **Quản trị
bản rút gọn** cho tài khoản ADMIN. Bảng đối chiếu từng tính năng: `docs/PARITY.md` trong repo LEARN_website.

**Trạng thái: Đang phát triển** — đã kiểm bằng unit test và e2e trên bản web, **chưa** chạy đạt
checklist trên điện thoại thật (mục cuối README).

| Sáng | Tối | Bài học | Kết quả |
| --- | --- | --- | --- |
| ![Tổng quan](docs/screenshots/light-02-overview.png) | ![Tổng quan tối](docs/screenshots/dark-02-overview.png) | ![Đọc bài](docs/screenshots/light-06-lesson.png) | ![Kết quả](docs/screenshots/light-09-result.png) |

## Bắt đầu nhanh

App này **chỉ là phần giao diện di động**. Mọi dữ liệu (đăng nhập, khóa học, sinh bài bằng AI) đến từ
API của repo **[LEARN_website](https://github.com/TrKimHieu/LEARN_website)**, nên phải dựng backend
đó trước, nếu không app sẽ dừng ở màn đăng nhập.

**Cần có:** Node ≥ 20, Docker Desktop, Git, app **Expo Go** trên điện thoại (hoặc trình giả lập
Android/iOS). Điện thoại và máy tính phải **cùng mạng Wi‑Fi**.

**Bước 1 — Dựng backend** (đặt `LEARN_website` cạnh thư mục này, tên thư mục `LEARN`):

```bash
git clone https://github.com/TrKimHieu/LEARN_website.git ../LEARN
cd ../LEARN
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
npm install
docker compose -f infra/docker-compose.yml up -d
npm run db:migrate
npm run db:seed                 # tạo tài khoản demo
npm run dev:api                 # terminal 1: API :4000
npm run dev:worker              # terminal 2: worker sinh bài bằng AI
```

Muốn sinh bài bằng AI thật thì điền `LLM_API_KEY` trong `.env` của LEARN. Chỉ xem giao diện thì
không cần.

**Bước 2 — Chạy app mobile** (terminal mới, trong thư mục này):

```bash
npm install
npm start
```

Quét mã QR bằng Expo Go (Android) hoặc app Camera (iPhone). Đăng nhập bằng tài khoản demo
`demo@learn.ai` / `Demo@12345` (quản trị: `admin@learn.ai` / `Admin@12345`).

**Gặp lỗi?**

| Triệu chứng | Cách xử lý |
| --- | --- |
| App báo không kết nối được | Kiểm tra API đang chạy ở `:4000`; điện thoại cùng Wi‑Fi; tường lửa cho phép cổng 4000 và 8081 |
| Mạng chặn kết nối LAN | `npx expo start --tunnel` và đặt `EXPO_PUBLIC_API_URL` (xem mục Chạy) |
| Tải tài liệu lên bị lỗi | Đặt `S3_PUBLIC_ENDPOINT=http://<IP LAN>:9000` trong `.env` của LEARN rồi khởi động lại API |
| Muốn xem nhanh trên trình duyệt | `npm run web` (phiên đăng nhập mất khi tải lại trang) |

Lệnh kiểm tra trước khi commit: `npm run typecheck`, `npm run lint`, `npm test`.

## Có gì

| Màn | Việc làm được |
| --- | --- |
| Đăng nhập · Đăng ký · Quên / đặt lại mật khẩu | Báo lỗi ngay dưới ô sai, giữ phiên đăng nhập giữa các lần mở app; đặt lại mật khẩu mở từ trang web bằng `learn://` |
| **Tổng quan** (tab) | Thẻ "Học tiếp" mở thẳng bài kế tiếp, 4 số liệu, khóa học, hoạt động gần đây |
| **Khóa học** (tab) | Danh sách có bìa theo khóa, tạo khóa mới (modal) |
| Chi tiết khóa học | Lộ trình bài học (sắp xếp lên/xuống), sinh bài bằng AI có chọn độ khó và theo dõi tiến độ trực tiếp, tải tài liệu lên (PDF/DOCX/PPTX/TXT/MD), trạng thái trích xuất tự cập nhật |
| Đọc bài | Nội dung Markdown, mục lục, cảnh báo bài lệch nguồn, đoạn tài liệu gốc, bài trước/sau, sửa và xoá bài |
| Bài tập | 4 loại câu hỏi, nhiều bài tập mỗi bài học, báo câu còn thiếu, chấm điểm ở server, xem lại từng câu, làm lại, đi tiếp |
| **Tiến trình** (tab) | Tiến độ theo khóa, lịch sử làm bài phân trang |
| **Cài đặt** (tab) | Hồ sơ, chọn giao diện Sáng/Tối/Tự động, gói đăng ký và hạn mức (demo), đăng xuất, đăng xuất mọi thiết bị |
| **Quản trị** (tab, chỉ ADMIN) | Số liệu tổng, chi phí LLM 7 ngày, danh sách AI Job (lọc trạng thái), chi tiết + chạy lại job lỗi + nhật ký thao tác. Bảng người dùng/khóa học/gói: chỉ trên web |

Màn nào có dữ liệu cũng có đủ 5 trạng thái: Đang tải · Trống · Lỗi (kèm mã yêu cầu và nút thử
lại) · Một phần · Thành công. Kéo xuống để tải lại.

## Công nghệ

| Thành phần | Chọn |
| --- | --- |
| Nền tảng | Expo SDK 57 (`expo ~57.0.26`), React Native 0.86, React 19.2, TypeScript strict + `noUncheckedIndexedAccess` |
| Điều hướng | Expo Router: route theo file trong `src/app/`, typed routes, `Stack.Protected` |
| Dữ liệu | TanStack Query (cùng query key với web), Zod schema chép từ `@learn/contracts` |
| Phiên đăng nhập | Refresh token trong `expo-secure-store` (Keychain/Keystore), access token chỉ ở bộ nhớ — ADR 016 của LEARN |
| Giao diện | Hanken Grotesk, icon Phosphor, SVG (`react-native-svg`) cho bìa khóa học và mascot Circle (dữ liệu 25 biểu cảm sinh từ bản web) |
| Tài liệu | `expo-document-picker` + `expo-file-system` + `expo-crypto` (SHA-256), PUT thẳng lên S3/MinIO bằng presigned URL |

Mọi thư viện đều có sẵn trong **Expo Go**, không cần bản build riêng.

### Điều hướng

Cây điều hướng theo bài giảng *Chương 4 — Navigation* (`DocsTest` trong repo LEARN_website):

```
Root Stack
├─ (auth)   Stack.Protected guard = chưa đăng nhập
│   └─ login · register · forgot-password
└─          Stack.Protected guard = đã đăng nhập
    ├─ (tabs)  Tổng quan · Khóa học · Tiến trình · Cài đặt   backBehavior="history"
    ├─ course/new                                       modal
    ├─ course/[courseId]                                che tab bar
    ├─ course/[courseId]/lesson/[lessonId]              che tab bar
    ├─ course/[courseId]/lesson/[lessonId]/practice     ?exercise=<id>
    └─ course/[courseId]/lesson/[lessonId]/edit         modal
```

- Chưa đăng nhập thì các route trong app **không tồn tại**. Đăng nhập xong app tự chuyển vào,
  không cần gọi `router.replace` bằng tay.
- Params chỉ mang ID. Màn đích tự đọc dữ liệu mới nhất từ query cache hoặc API.
- Deep link: scheme `learn://`, ví dụ `learn://course/<id>`.

### Màu sắc

Giao diện vẫn đơn sắc như web: chỉ dùng xám trung tính, không có màu. Khác web ở một điểm: **không
dùng cặp gần-trắng/gần-đen**. Chữ màu xám than trên nền xám rất nhạt, nút chính màu xám đậm. Độ
tương phản vẫn đạt WCAG. Chi tiết và số đo ở [ADR 001](docs/adr/001-don-sac-diu.md).

## Chạy

Các bước dựng backend và chạy app nằm ở [Bắt đầu nhanh](#bắt-đầu-nhanh). Phần dưới là tuỳ chọn thêm.

- **Địa chỉ API** tự suy từ máy đang chạy Metro (`http://<IP LAN>:4000`). Muốn đặt khác thì tạo
  `.env` từ `.env.example` và điền `EXPO_PUBLIC_API_URL`.
- **Tải tài liệu lên từ điện thoại:** đặt `S3_PUBLIC_ENDPOINT=http://<IP LAN>:9000` trong `.env`
  của LEARN rồi khởi động lại API. Presigned URL được ký kèm tên máy, nên phải ký bằng địa chỉ mà
  điện thoại tới được, không phải `localhost`.
- Mạng chặn kết nối LAN: `npx expo start --tunnel`. Khi đó API cũng phải tới được qua mạng
  (ví dụ đặt `EXPO_PUBLIC_API_URL` bằng địa chỉ public).
- `npm run web` chạy bản web của app, chỉ để xem nhanh lúc dev. Trên bản web, phiên đăng nhập chỉ
  giữ trong bộ nhớ, tải lại trang là phải đăng nhập lại.

Tài khoản demo (dữ liệu seed của LEARN): `demo@learn.ai` / `Demo@12345`.

## Phát hành cho người ở mọi nơi (không cần chung mạng)

Cần máy chủ LEARN chạy công khai (`docs/DEPLOY.md` trong repo LEARN_website, ví dụ `https://3-1-2-4.sslip.io`)
và một tài khoản Expo miễn phí. Các bước đăng nhập bạn tự làm, mình không làm thay:

```bash
npx eas-cli@latest login
npx eas-cli@latest init                     # gắn projectId vào app.json
npx eas-cli@latest update:configure         # thêm updates.url
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://<DOMAIN> --visibility plaintext
```

| Cách | Lệnh | Ai mở được |
| --- | --- | --- |
| **Expo Go + QR** | `npx eas-cli@latest update --channel preview --environment preview --message "..."` → trang update trên expo.dev có mã QR | Android: ai có Expo Go (bản hỗ trợ SDK 57). iPhone: **chỉ** tài khoản Expo chủ project — giới hạn của Expo Go trên iOS |
| **File APK** | `npx eas-cli@latest build -p android --profile preview` → link tải APK | Mọi máy Android (cho phép cài từ nguồn ngoài) |

Sau khi có APK, mỗi lần sửa giao diện chỉ cần chạy lại `update` (kênh `preview`): app đã cài tự
nhận bản mới khi mở lại, không phải cài lại. Đổi thư viện native hoặc tăng `version` trong
`app.json` thì phải build APK mới (`runtimeVersion` theo `appVersion`).

Khi API đổi contract mà app cũ không còn chạy đúng: tăng `MIN_MOBILE_VERSION` ở máy chủ → app cũ hiện
thông báo "Có phiên bản mới" ở Tổng quan (`GET /api/v1/meta`).

## Kiểm tra trên điện thoại thật (bắt buộc trước khi coi là xong)

Android qua Expo Go **và** APK, iPhone qua Expo Go (tài khoản chủ project):

- [ ] Bàn phím không che ô nhập (đăng nhập, tạo khóa học, sửa bài, câu tự luận)
- [ ] Safe area: tai thỏ / thanh home không che header, tab bar, thanh "Nộp bài"
- [ ] Nút Back Android: chi tiết → danh sách → tab trước; không thoát app ngoài ý muốn
- [ ] Chọn tệp + tải lên (PDF, DOCX, MD) → trạng thái tự đổi sang "Đã trích xuất"
- [ ] Chế độ tối của hệ thống + chọn tay Sáng/Tối trong Cài đặt
- [ ] TalkBack / VoiceOver đọc được nút chính, lựa chọn đáp án, thanh tiến độ
- [ ] Mở lại app sau khi tắt hẳn: vẫn đăng nhập (SecureStore); mất mạng lúc mở: màn "Không kết nối"
- [ ] Web và app cùng tài khoản: làm bài trên điện thoại → web thấy lịch sử mới

## Lệnh

```bash
npm start                 # dev server cho Expo Go
npm run typecheck         # so contracts với LEARN + tsc --noEmit
npm test                  # unit test (jest-expo): format, phiên đăng nhập/refresh, AI Job một phần
npm run e2e               # Playwright trên bản web (cần API + worker mock + `npm run web`), kèm axe
npm run sync:contracts    # chép lại @learn/contracts khi LEARN đổi schema
npm run icons             # sinh lại icon app từ logo Circle
npm run doctor            # expo-doctor: thư viện khớp SDK 57
npx expo install <pkg>    # LUÔN dùng lệnh này để thêm thư viện
```

E2E tạo tài khoản `e2e-mobile-…`; dọn bằng `npm run db:cleanup:e2e` bên LEARN.

## Cấu trúc

```
src/
  app/                 route (Expo Router) — mỗi file là một màn
  components/          mascot, bìa khóa học, Markdown, ui/ (nút, thẻ, ô nhập, trạng thái…)
  contracts/           SINH TỰ ĐỘNG từ LEARN/packages/contracts — không sửa tay
  features/            hook API + component theo nghiệp vụ (auth, courses, documents, learning, ai, settings, admin)
  lib/                 api-client, token-store, query-client, routes, format, dialog, server-meta
  theme/               token màu/chữ/khoảng cách + ThemeProvider
e2e/                   Playwright trên bản web (learner · create · admin) + fixture tài liệu
scripts/               sync-contracts, gen-icons, gen-circle-data
docs/adr/              quyết định riêng của app
```
#   L E A R N _ m o b i l e  
 