# Bắt đầu: cài đặt và chạy app

Hướng dẫn từ máy trống đến lúc đăng nhập được vào app. Làm đúng thứ tự; mỗi bước có cách kiểm tra
để biết đã xong.

**Mục lục:** [1. Cần hiểu trước](#1-cần-hiểu-trước) ·
[2. Yêu cầu](#2-yêu-cầu-môi-trường) ·
[3A. API mock](#3a-cách-a--chạy-api-mock-nhanh-nhất) ·
[3B. Backend thật](#3b-cách-b--dựng-backend-thật-branch-worker) ·
[4. Chạy app](#4-chạy-app-mobile-repo-này) ·
[5. Dùng thử](#5-dùng-thử-luồng-cơ-bản) ·
[6. Tài khoản](#6-tài-khoản-thử-nghiệm) ·
[7. Cấu hình thêm](#7-các-tình-huống-cần-cấu-hình-thêm) ·
[8. Sự cố](#8-xử-lý-sự-cố)

---

## 1. Cần hiểu trước

LEARN Mobile **không có backend riêng**. Mọi dữ liệu (đăng nhập, khóa học, bài học, kết quả làm bài)
đi qua một API. Bạn chọn một trong hai cách dựng API đó:

| Cách | Khi nào dùng | Cần gì |
| --- | --- | --- |
| **A. API mock** *(có sẵn trong repo)* | Làm giao diện, thử luồng, demo. **Khuyến nghị cho người mới.** | Chỉ Node |
| **B. Backend thật** (branch `worker` của repo này) | Kiểm tra tích hợp thật, sinh bài bằng AI thật | Docker + mở branch `worker` |

```mermaid
flowchart LR
    subgraph PHONE["Điện thoại"]
        GO["Expo Go"]
    end
    subgraph PC["Máy tính (cùng Wi‑Fi)"]
        METRO["Metro bundler<br/>:8081<br/><i>repo LEARN_mobile</i>"]
        API["API :4000"]
    end
    GO -- "tải JavaScript" --> METRO
    GO -- "gọi API" --> API
    MOCK["A · npm run mock"] -.-> API
    REAL["B · branch worker + Docker"] -.-> API
```

> [!NOTE]
> Cả hai cách đều lắng nghe ở **cổng 4000**, nên app không cần đổi cấu hình khi chuyển qua lại.

## 2. Yêu cầu môi trường

| Thứ cần có | Ghi chú |
| --- | --- |
| Node.js ≥ 20 và npm | Kiểm tra: `node -v` |
| Git | |
| Docker Desktop | **Chỉ cho cách B.** Phải đang mở trước khi chạy `docker compose` |
| Expo Go (điện thoại) | Bản hỗ trợ **SDK 57**, cài từ App Store / Google Play |
| Cùng mạng Wi‑Fi | Điện thoại và máy tính phải chung một mạng |

Có thể thay điện thoại bằng trình giả lập Android (Android Studio) hoặc iOS Simulator (chỉ macOS).

## 3A. Cách A — chạy API mock (nhanh nhất)

Trong thư mục LEARN_mobile:

```bash
npm install
npm run mock
```

Terminal in ra địa chỉ API (cổng 4000) và tài khoản. **Để terminal này chạy liên tục.** Dữ liệu mẫu,
cách thử trạng thái lỗi và các biến cấu hình: [mock-api/README.md](../mock-api/README.md).

 **Kiểm tra:** mở `http://localhost:4000/api/v1/health` trên trình duyệt máy tính; phải thấy
`{"status":"ok","mock":true}`.

Xong thì chuyển sang [mục 4](#4-chạy-app-mobile-repo-này), bỏ qua 3B.

## 3B. Cách B — dựng backend thật (branch worker)

Mã nguồn backend LEARN (API + AI worker) nằm ở branch **`worker`** của chính repo LEARN_mobile, đúng
phiên bản khớp với app. Không cần quyền vào repo LEARN_website.

Trong thư mục LEARN_mobile, mở branch đó thành thư mục `../LEARN` **cạnh** LEARN_mobile (script đồng
bộ contracts của app tìm backend ở đây):

```bash
git fetch origin worker
git worktree add ../LEARN worker
```

Tạo ba file cấu hình trong `../LEARN`. Chúng bị gitignore, **mỗi người tự tạo**. API, worker và
Prisma chỉ đọc `.env` trong thư mục của chính chúng, **không** đọc `.env` ở gốc repo:

| Copy | Thành | Sửa gì |
| --- | --- | --- |
| `.env.example` (gốc) | `packages/db/.env` | Không cần sửa: Prisma lấy `DATABASE_URL` ở đây |
| `apps/api/.env.example` | `apps/api/.env` | `S3_PUBLIC_ENDPOINT` = IP Wi‑Fi máy bạn, cổng 9000 ([mục 7](#7-các-tình-huống-cần-cấu-hình-thêm)) |
| `apps/worker/.env.example` | `apps/worker/.env` | Giữ `LLM_MODE=mock`, hoặc AI thật (xem dưới) |

Rồi, trong `../LEARN`:

```bash
npm install
docker compose -f infra/docker-compose.yml up -d
npm run db:migrate
npm run db:seed
```

| Lệnh | Việc làm |
| --- | --- |
| `docker compose … up -d` | Chạy ngầm 3 container: **Postgres 16** (dữ liệu), **Redis 7** (hàng đợi job AI), **MinIO** (kho lưu tài liệu, giống S3). `minio-init` chạy một lần để tạo bucket. Docker chỉ chạy hạ tầng; API và worker chạy bằng Node ở bước sau. |
| `npm run db:migrate` | Tạo các bảng trong Postgres. |
| `npm run db:seed` | Tạo dữ liệu mẫu, gồm tài khoản demo và admin ([mục 6](#6-tài-khoản-thử-nghiệm)). |

Sau đó mở **hai terminal** và để chúng chạy liên tục:

```bash
npm run dev:api       # terminal 1 — API ở cổng 4000
npm run dev:worker    # terminal 2 — worker sinh bài học bằng AI
```

> [!WARNING]
> Thiếu worker thì khi bấm "Sinh bài học", job treo mãi ở trạng thái chờ.

**AI giả hay AI thật?** `apps/worker/.env` mặc định `LLM_MODE=mock`: worker trả nội dung mẫu,
không gọi mạng và **không cần API key**. Chỉ khi muốn sinh bài bằng mô hình thật mới đặt
`LLM_MODE=live` và điền `LLM_API_KEY` **của chính bạn** (mỗi lượt sinh bài tính tiền vào key đó).

Cập nhật backend khi branch `worker` có bản mới: `git pull` trong `../LEARN`.

 **Kiểm tra:** mở `http://localhost:4000/api/v1/health` trên trình duyệt máy tính; API phải trả về
trạng thái hoạt động.

## 4. Chạy app mobile (repo này)

Mở terminal mới (API ở mục 3 vẫn đang chạy), trong thư mục LEARN_mobile:

```bash
npm install     # bỏ qua nếu đã chạy ở bước 3A
npm start
```

`npm start` chạy `expo start`, tức **Metro bundler** ở cổng 8081 và in mã QR. Lệnh này **không** tự
mở trình duyệt hay trình giả lập.

| Thiết bị | Cách mở |
| --- | --- |
|  Android thật | Mở Expo Go → *Scan QR code* → quét mã |
|  iPhone thật | Mở app Camera → quét mã → mở bằng Expo Go |
| Trình giả lập Android | Trong terminal đang chạy Metro, bấm phím `a` |
| iOS Simulator (macOS) | Bấm phím `i` |
|  Trình duyệt (xem nhanh) | Bấm phím `w`, hoặc `npm run web` |

> [!NOTE]
> Bản web chỉ để xem nhanh lúc phát triển: phiên đăng nhập không được lưu, tải lại trang là phải
> đăng nhập lại.

**Địa chỉ API** được app tự suy từ máy đang chạy Metro: nếu Metro ở `192.168.1.20:8081` thì API là
`http://192.168.1.20:4000`. Chỉ cần cấu hình tay trong các trường hợp ở [mục 7](#7-các-tình-huống-cần-cấu-hình-thêm).

## 5. Dùng thử luồng cơ bản

1. Đăng nhập bằng tài khoản demo.
2. Tab **Khóa học** → tạo khóa học mới.
3. Vào khóa học → tải tài liệu lên (PDF, DOCX, PPTX, TXT, MD; tối đa 25 MB). Trạng thái tự đổi sang
   "Đã trích xuất".
4. Bấm **Sinh bài học**, chọn độ khó, theo dõi tiến độ trực tiếp.
5. Mở một bài học, đọc nội dung, làm bài tập, nộp bài và xem lại kết quả.
6. Tab **Tiến trình** hiện lịch sử làm bài.

## 6. Tài khoản thử nghiệm

Dữ liệu seed của môi trường dev (giống nhau ở API mock và backend thật), không phải tài khoản thật:

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Người học | `demo@learn.ai` | `Demo@12345` |
| Quản trị *(có thêm tab Quản trị)* | `admin@learn.ai` | `Admin@12345` |

## 7. Các tình huống cần cấu hình thêm

<details>
<summary><b>Đặt địa chỉ API thủ công</b></summary>

Tạo file `.env` từ `.env.example` rồi điền:

```ini
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000
```

> [!WARNING]
> Biến `EXPO_PUBLIC_*` được nhúng thẳng vào bundle, nên **không bao giờ để bí mật** ở đây.

Khởi động lại Metro sau khi đổi.
</details>

<details>
<summary><b>Tải tài liệu lên từ điện thoại (chỉ backend thật)</b></summary>

API mock tự xử lý việc này, không cần cấu hình. Với backend thật, tệp được tải thẳng lên MinIO bằng
presigned URL. URL này được ký kèm tên máy, nên phải ký bằng địa chỉ mà điện thoại tới được. Trong
`../LEARN/apps/api/.env` (không phải `.env` ở gốc LEARN):

```ini
S3_PUBLIC_ENDPOINT=http://<IP LAN máy tính>:9000
```

rồi khởi động lại API. Nếu để `localhost`, điện thoại sẽ không tải lên được.
</details>

<details>
<summary><b>Mạng chặn kết nối LAN</b></summary>

```bash
npx expo start --tunnel
```

Khi đó điện thoại không còn cùng LAN với API, nên API cũng phải tới được qua mạng: đặt
`EXPO_PUBLIC_API_URL` bằng địa chỉ công khai của API.
</details>

## 8. Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| "Không kết nối được máy chủ" | API chưa chạy, hoặc khác mạng | Kiểm tra `npm run mock` (hoặc `npm run dev:api`); điện thoại cùng Wi‑Fi; tường lửa Windows cho phép cổng 4000 và 8081 |
| Quét QR nhưng không mở | Expo Go khác SDK | Cập nhật Expo Go lên bản hỗ trợ SDK 57 |
| Job AI đứng ở "Đang chờ" | Chưa chạy worker, hoặc Redis chưa lên | Chạy `npm run dev:worker`; `docker ps` phải thấy Redis |
| Tải tài liệu lỗi *(backend thật)* | `S3_PUBLIC_ENDPOINT` chưa đặt trong `apps/api/.env`, hoặc sai IP | Xem [mục 7](#7-các-tình-huống-cần-cấu-hình-thêm). Dùng API mock thì không gặp lỗi này |
| Sinh bài chỉ ra nội dung mẫu *(backend thật)* | `apps/worker/.env` đang `LLM_MODE=mock` | Đặt `LLM_MODE=live` và `LLM_API_KEY`, khởi động lại worker |
| `db:migrate` báo thiếu `DATABASE_URL` | Chưa có `packages/db/.env` | Copy `.env.example` (gốc LEARN) thành `packages/db/.env` |
| `docker compose` báo không kết nối được daemon | Docker Desktop chưa mở | Mở Docker Desktop, đợi nó khởi động xong |
| Cổng 4000 hoặc 8081 đã bị dùng | Tiến trình cũ còn chạy | Tắt tiến trình cũ, hoặc đổi cổng (`npx expo start --port 8082`) |
| Màn "Có phiên bản mới" ở Tổng quan | App cũ hơn `MIN_MOBILE_VERSION` của máy chủ | Cập nhật app, hoặc hạ `MIN_MOBILE_VERSION` ở máy chủ khi dev |
| Đăng nhập báo lỗi sau khi reset DB | Phiên cũ trong SecureStore không còn hợp lệ | Đăng nhập lại; app tự xoá phiên hỏng |

Vẫn lỗi: chạy `npm run doctor` (kiểm tra thư viện có khớp SDK 57 không) và đọc `requestId` hiển thị
trên màn lỗi để tra log của API.
