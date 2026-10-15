# ADR 017 — Một server, một origin cho web + API + tệp; sslip.io khi chưa có domain

- **Ngày:** 2026-09-30
- **Trạng thái:** Đã chấp nhận
- **Liên quan:** ADR 016 (refresh token client native), `docs/DEPLOY.md`, `docs/PARITY.md`.

## Bối cảnh

Web (Next.js) và app mobile (Expo, repo `LEARN_mobile`) dùng chung một API. Chủ sản phẩm muốn cả
hai chạy song song trên **một** máy chủ (AWS EC2), người ở mọi nơi mở được — nhưng chưa có tên
miền. Khi dev, web gọi API ở `localhost:4000` (khác origin, cần CORS + cookie cross-origin), tài
liệu PUT thẳng lên MinIO `localhost:9000`, và app trên điện thoại phải biết IP LAN.

## Quyết định

1. **Một origin**: Caddy đứng trước, định tuyến theo đường dẫn trên cùng một hostname:
   `/api/*` → API, `/learn-documents/*` → MinIO, còn lại → web. Web build với
   `NEXT_PUBLIC_API_URL=""` (đường dẫn tương đối) → một image dùng cho mọi domain; app mobile đặt
   `EXPO_PUBLIC_API_URL=https://<domain>`; `S3_PUBLIC_ENDPOINT=https://<domain>` nên presigned URL
   dùng được từ cả trình duyệt lẫn điện thoại. Caddy giữ nguyên Host khi chuyển tiếp → chữ ký SigV4
   (có host) khớp ở MinIO.
2. **Chưa có domain → `<IP-gạch-ngang>.sslip.io`**: DNS công cộng trả về đúng IP nằm trong tên, Caddy
   xin chứng chỉ Let's Encrypt thật. Đổi sang domain riêng chỉ sửa `DOMAIN`, `APP_URL`,
   `S3_PUBLIC_ENDPOINT` trong `.env.prod` (web không cần build lại).
3. **Chỉ Caddy mở cổng** (80/443); Postgres/Redis/MinIO/API/web/worker ở network nội bộ.
4. `TRUST_PROXY=1` cho API: sau proxy, không bật thì mọi request mang IP của Caddy và rate limit
   theo IP (đăng nhập 5 lần/phút) thành giới hạn chung cho **mọi** người dùng.
5. Seed production: mật khẩu admin bắt buộc từ `SEED_ADMIN_PASSWORD`, không tạo tài khoản demo.

## Hệ quả

- Cùng origin → không cần CORS ở production; cookie refresh `Secure; SameSite=Lax` của web chạy
  thẳng. App native không dùng cookie (ADR 016).
- Một máy nhỏ chạy mọi thứ: hợp demo/đồ án; tách dịch vụ (RDS, S3 thật, nhiều API) sau này không
  đổi code — chỉ đổi biến môi trường.
- Rủi ro sslip.io: phụ thuộc dịch vụ DNS công cộng và hạn mức Let's Encrypt chung; nên chuyển sang
  domain riêng khi dùng lâu dài.
