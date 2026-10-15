# ADR 016 — Refresh token cho client native (app mobile) đi qua body, cất trong kho khoá hệ điều hành

- **Ngày:** 2026-09-30
- **Trạng thái:** Đã chấp nhận
- **Đổi `[QĐ]`:** HANDBOOK §10.1 (refresh token trong cookie `httpOnly`) và §7.1 dòng "Xác thực" —
  bổ sung một nhánh cho client native; hành vi của web **không đổi**.

## Bối cảnh

Chủ sản phẩm yêu cầu làm app mobile (repo riêng `LEARN_mobile`, Expo). HANDBOOK §10.1 giữ refresh
token trong cookie `httpOnly; Secure; SameSite=Lax` để script trên trang (XSS) không đọc được.
Trên app native:

- Không có trình duyệt, không có DOM, không có XSS kiểu web — lý do chính của cookie không áp dụng.
- Cookie của `fetch` trong React Native phụ thuộc cookie jar của OkHttp/NSURLSession: lưu lâu dài
  không ổn định giữa các lần mở app, và `Secure` chặn cookie khi dev qua HTTP trong mạng LAN.
- Mỗi nền tảng có kho bí mật riêng dành cho đúng việc này: Keychain (iOS), Keystore (Android),
  dùng qua `expo-secure-store`.

## Quyết định

1. Client gửi header `x-learn-client: native` (hằng `CLIENT_HEADER`/`NATIVE_CLIENT` trong
   `@learn/contracts`) ở mọi lời gọi auth.
2. Ở chế độ native, `register`/`login`/`refresh` trả `refreshToken` **trong body** và **không** set
   cookie; `refresh`/`logout` nhận refresh token **chỉ từ body** (`nativeRefreshSchema`, Zod
   `strict`), **không bao giờ đọc cookie**.
3. Web giữ nguyên: cookie `httpOnly`, không có refresh token trong body.
4. App lưu refresh token bằng `expo-secure-store`; access token vẫn chỉ nằm trong bộ nhớ.
5. Xoay vòng token và phát hiện tái sử dụng (thu hồi cả family) dùng chung một code path với web.

## Vì sao không mở lỗ cho web

Kẻ tấn công có XSS trên web có thể tự đặt header `x-learn-client: native`. Nhưng ở chế độ đó server
bỏ qua cookie, nên hắn phải có sẵn refresh token dạng chữ — thứ mà cookie `httpOnly` vẫn giấu. Đổi
cookie thành token đọc được là không thể. `login` native cần mật khẩu, nên cũng không lợi gì hơn.

## Hệ quả

- `auth.controller.ts` có `isNativeClient` / `refreshTokenOf` / `sendSession`; test tích hợp
  `native-auth.integration.test.ts` chặn đúng các nhánh: body có token, không set cookie, native
  bỏ qua cookie, body sai hình dạng → 401, xoay vòng + thu hồi family, đăng xuất thu hồi token.
- Kèm theo (không phải quyết định mới): biến `S3_PUBLIC_ENDPOINT` — ký presigned URL bằng host mà
  điện thoại tới được (chữ ký SigV4 gồm host, không đổi host sau khi ký được). CORS dev thêm
  `http://localhost:8081` cho bản web của app mobile.
