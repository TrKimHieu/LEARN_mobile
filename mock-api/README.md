# API mock

Server giả lập API của LEARN để **làm giao diện mà không cần backend thật** (không Docker, không
Postgres/Redis/MinIO, không repo LEARN_website, không API key).

```bash
npm run mock
```

Server lắng nghe ở cổng **4000** (cổng app tự tìm), trên mọi card mạng nên điện thoại cùng Wi‑Fi
gọi được. Sau đó chạy app như bình thường (`npm start`) — không cần cấu hình gì thêm.

> [!WARNING]
> Chỉ để phát triển giao diện. Không có bảo mật thật, dữ liệu **mất khi tắt server**, nội dung bài
> học do AI "giả" sinh ra từ mẫu cố định.

## Tài khoản

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Người học | `demo@learn.ai` | `Demo@12345` |
| Quản trị | `admin@learn.ai` | `Admin@12345` |

Đăng ký tài khoản mới cũng được: tài khoản mới có workspace **trống** (để thử màn trống).

## Dữ liệu seed

| Gì | Có sẵn |
| --- | --- |
| Khóa **Lập trình TypeScript** (demo) | 1 tài liệu đã trích xuất, 4 bài học, bài 1 hoàn thành, bài 2 đang học, có lịch sử làm bài 3 ngày liên tiếp (chuỗi ngày học = 3), 1 bài có độ tin cậy thấp |
| Khóa **Tiếng Anh giao tiếp** (demo) | 1 tài liệu đã trích xuất, **chưa có bài học** — dùng để thử "Sinh bài học" |
| AI Job | 1 thành công, 1 **thất bại** (`AI_GENERATION_TIMEOUT`) để thử màn quản trị và "chạy lại" |
| Gói | Demo và admin ở gói **FREE** |

Đặt lại về seed mà không tắt server: `curl -X POST http://localhost:4000/__mock/reset`.

## Hành vi mô phỏng

| Tình huống | Cách mock thể hiện |
| --- | --- |
| Tải tài liệu | `upload-url` trả URL trỏ về chính mock (theo `Host` của request), nên **điện thoại trong LAN tải được** mà không cần `S3_PUBLIC_ENDPOINT`. Nội dung tệp bị bỏ đi. |
| Trích xuất tài liệu | `UPLOADED` → `EXTRACTING` (sau 1 giây) → `EXTRACTED` (sau ~3 giây) |
| Sinh bài học | `QUEUED` (1 giây) → `RUNNING` (tiến độ tăng dần trong 6 giây, đổi nhãn theo bước) → `SUCCEEDED`, rồi tạo 4 bài học kèm bài tập |
| Phiên đăng nhập | Access token sống 15 phút; refresh token **xoay vòng**, dùng lại token cũ sẽ thu hồi cả họ token (giống máy chủ thật) |
| Chấm bài | Chấm thật theo đáp án trong mock; đáp án đúng chỉ trả về **sau khi nộp** |
| Hạn mức | Gói FREE: 5 khóa học, 10 tài liệu/tháng, 5 lượt sinh bài/tháng. Vượt → `402 QUOTA_EXCEEDED` kèm `{metric, limit, used}`. Đổi sang gói PRO (Cài đặt) để bỏ giới hạn |
| Lỗi | Dạng `{type, title, status, code, detail, requestId, meta?}` như máy chủ thật |

### Kích hoạt trạng thái lỗi (để thử giao diện)

| Muốn thử | Cách làm |
| --- | --- |
| Trích xuất tài liệu thất bại | Tải tệp có tên chứa `lỗi`, `loi`, `error` hoặc `fail` (ví dụ `bai-loi.pdf`) |
| AI Job thất bại | Đặt tên **khóa học** chứa `lỗi`, `loi`, `error` hoặc `fail`, tải một tài liệu rồi sinh bài |
| Hết hạn mức | Tạo khóa học thứ 6 với gói FREE |
| Mất mạng | Tắt server mock |
| Hết phiên đăng nhập | `MOCK_ACCESS_TTL_S=20 npm run mock` rồi dùng app quá 20 giây: app tự refresh |
| Màn "Đang tải" | `MOCK_LATENCY_MS=1500 npm run mock` |
| Tài khoản bị từ chối | Đăng nhập sai mật khẩu |

## Cấu hình

| Biến môi trường | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `PORT` | `4000` | Cổng lắng nghe. Đổi cổng thì phải đặt `EXPO_PUBLIC_API_URL` cho app |
| `MOCK_LATENCY_MS` | `0` | Độ trễ cộng thêm cho mỗi request |
| `MOCK_ACCESS_TTL_S` | `900` | Thời hạn access token (giây) |
| `MOCK_JOB_MS` | `6000` | Thời gian chạy một AI Job giả (mili giây) |

Ví dụ (bash): `MOCK_LATENCY_MS=1500 npm run mock`. PowerShell: `$env:MOCK_LATENCY_MS=1500; npm run mock`.

## Endpoint hỗ trợ

Mọi endpoint mà app đang dùng (xem các file `src/features/*/*-api.ts` và `src/app/(auth)/`):

| Nhóm | Đường dẫn |
| --- | --- |
| Hệ thống | `GET /api/v1/health`, `GET /api/v1/meta` |
| Xác thực | `POST /api/v1/auth/{register,login,refresh,logout,logout-all,forgot-password,reset-password}` |
| Khóa học | `GET /api/v1/workspace`, `POST /api/v1/courses`, `GET /api/v1/courses/:id` |
| Tài liệu | `GET /api/v1/courses/:id/documents`, `POST …/documents/upload-url`, `PUT /mock-storage/:docId`, `POST /api/v1/documents/:id/confirm` |
| AI | `POST /api/v1/ai/courses/:id/generate-lessons`, `GET /api/v1/ai/jobs/:id`, `POST …/cancel` |
| Bài học | `GET /api/v1/courses/:id/lessons`, `GET/PATCH/DELETE …/lessons/:lessonId`, `GET …/sources`, `POST …/start`, `PATCH …/lessons/reorder` |
| Bài tập | `GET /api/v1/lessons/:id/exercise`, `POST …/exercise/submit` |
| Tiến trình | `GET /api/v1/progress/{overview,courses,history}` |
| Gói | `GET /api/v1/plans`, `GET /api/v1/subscription`, `POST …/subscription/{checkout,cancel}` |
| Quản trị | `GET /api/v1/admin/{metrics,ai-jobs}`, `GET …/ai-jobs/:id`, `…/audit-log`, `POST …/retry` |
| Công cụ mock | `POST /__mock/reset` |

Quên mật khẩu: mock **in đường dẫn đặt lại** (`learn://reset-password?token=…`) ra terminal đang chạy
`npm run mock`, thay cho việc gửi thư.

## Giữ mock khớp với backend thật

- `npm test` chạy `mock-api/__tests__/mock-api.test.ts`: khởi động mock và kiểm **mọi response** bằng
  Zod schema trong `src/contracts/`. Contracts đổi mà mock lệch thì test đỏ.
- Dấu vân tay contracts (`/api/v1/meta`) được đọc từ `src/contracts/version.ts`, nên tự khớp sau
  `npm run sync:contracts`.
- Thêm endpoint mới vào app thì thêm route vào `app.js` rồi thêm một ca vào test.
- `npm run e2e` chạy được trên mock: `npm run mock` + `npm run web` + `npm run e2e`.

## Cấu trúc

```text
mock-api/
├─ server.js     Điểm vào: đọc biến môi trường, mở cổng, in địa chỉ
├─ app.js        Bộ định tuyến và xử lý từng endpoint
├─ state.js      Dữ liệu seed, đồng hồ đẩy tài liệu/AI Job qua các trạng thái
├─ content.js    Nội dung bài học và bài tập mẫu
└─ __tests__/    Kiểm response theo contracts
```
