# Chạy backend LEARN cho app mobile (branch `worker`)

Branch `worker` của repo **LEARN_mobile** chứa nguyên mã nguồn backend LEARN (API + AI worker), để
thành viên team chỉ cần quyền vào một repo LEARN_mobile là tự dựng được toàn bộ trên máy mình.

## 1. Lấy mã

```bash
git clone https://github.com/TrKimHieu/LEARN_mobile.git
cd LEARN_mobile
git worktree add ../LEARN worker
```

`git worktree` mở branch `worker` thành thư mục `../LEARN` **cạnh** LEARN_mobile — đúng chỗ script
`npm run sync:contracts` của app mobile tìm backend. Hai thư mục dùng chung một repo git.

## 2. Cấu hình (mỗi người tự tạo, không commit)

Trong `../LEARN`:

| Copy | Thành | Sửa gì |
| --- | --- | --- |
| `.env.example` (gốc) | `packages/db/.env` | Không cần sửa — Prisma (`db:migrate`, `db:seed`) lấy `DATABASE_URL` ở đây |
| `apps/api/.env.example` | `apps/api/.env` | `S3_PUBLIC_ENDPOINT` = IP Wi‑Fi máy bạn, cổng 9000 |
| `apps/worker/.env.example` | `apps/worker/.env` | Giữ `LLM_MODE=mock`, hoặc `live` + `LLM_API_KEY` **của bạn** |

> [!IMPORTANT]
> API, worker và Prisma chỉ đọc `.env` trong thư mục của chính chúng (`apps/api/`, `apps/worker/`,
> `packages/db/`), **không** đọc `.env` ở gốc repo. Thiếu `packages/db/.env` thì `npm run db:migrate`
> báo lỗi thiếu `DATABASE_URL`.

## 3. Chạy

Mở Docker Desktop trước. Trong `../LEARN`:

```bash
npm install
docker compose -f infra/docker-compose.yml up -d
npm run db:migrate
npm run db:seed
```

Docker chỉ chạy hạ tầng: Postgres, Redis (hàng đợi job AI), MinIO (kho tài liệu). Phần còn lại chạy
bằng Node, mỗi lệnh một terminal, để chạy liên tục:

```bash
npm run dev:api       # terminal 1 — API cổng 4000
npm run dev:worker    # terminal 2 — AI worker
```

Trong `LEARN_mobile` (branch `main`):

```bash
npm install
npm start             # terminal 3 — Metro cổng 8081, in mã QR
```

Quét QR bằng Expo Go (SDK 57), điện thoại cùng Wi‑Fi với máy tính. Đăng nhập `demo@learn.ai` /
`Demo@12345` (hoặc `admin@learn.ai` / `Admin@12345`).

## 4. Sự cố thường gặp

| Triệu chứng | Cách xử lý |
| --- | --- |
| Điện thoại "Không kết nối được máy chủ" | Mở `http://<IP máy>:4000/api/v1/health` trên điện thoại; không được thì cho Node.js qua tường lửa (mạng Private) hoặc mở cổng 4000, 8081, 9000 |
| Tải tài liệu lỗi | `S3_PUBLIC_ENDPOINT` trong `apps/api/.env` chưa đặt hoặc sai IP |
| Job AI đứng ở "Đang chờ" | Chưa chạy `npm run dev:worker`, hoặc Redis chưa lên (`docker ps`) |
| Sinh bài chỉ ra nội dung mẫu | `apps/worker/.env` đang `LLM_MODE=mock` |
| `EADDRINUSE` cổng 8081 | Metro cũ còn chạy — tắt nó, hoặc `npx expo start --port 8082` |

## Cập nhật branch này

Branch được nhập từ repo LEARN_website. Khi backend đổi, người giữ repo LEARN_website đồng bộ lại
rồi push branch `worker`; mọi người `git pull` trong `../LEARN`.
