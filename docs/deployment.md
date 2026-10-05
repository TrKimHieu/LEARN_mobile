# Phát hành

Cách đưa app tới người dùng không cùng mạng với máy phát triển, bằng **EAS** (Expo Application
Services): build đám mây và cập nhật không qua cửa hàng ứng dụng.

> [!CAUTION]
> Tài liệu này mô tả quy trình **dự kiến**. Cấu hình EAS (`projectId`, `updates.url`) **chưa được gắn**
> vào `app.json`; làm các bước ở [mục 2](#2-thiết-lập-một-lần) trước.

## 1. Cần có

- Máy chủ LEARN chạy **công khai** qua HTTPS (xem `docs/DEPLOY.md` trong repo LEARN_website), ví dụ
  `https://<tên-miền>`.
- Một tài khoản Expo miễn phí.
- Các bước đăng nhập tài khoản Expo **do người có tài khoản tự làm**.

## 2. Thiết lập một lần

```bash
npx eas-cli@latest login
npx eas-cli@latest init                  # gắn projectId vào app.json
npx eas-cli@latest update:configure      # thêm updates.url
npx eas-cli@latest env:create --environment preview \
  --name EXPO_PUBLIC_API_URL --value https://<TÊN-MIỀN> --visibility plaintext
```

Lặp lại `env:create` với `--environment production` cho môi trường production.

## 3. Cấu hình hiện có

`eas.json` định nghĩa ba profile build:

| Profile | Dùng để | Phân phối | Kênh cập nhật |
| --- | --- | --- | --- |
| `development` | Development build (có dev client) | Nội bộ | — |
| `preview` | Bản thử nghiệm | Nội bộ, **APK** cho Android | `preview` |
| `production` | Bản phát hành | Cửa hàng ứng dụng, tự tăng số build | `production` |

`app.json`: `runtimeVersion.policy = "appVersion"` — bản cập nhật chỉ áp dụng cho app có **cùng
`version`**.

## 4. Hai cách đưa bản thử cho người khác

| Cách | Lệnh | Ai mở được |
| --- | --- | --- |
| **Expo Go + QR** | `npx eas-cli@latest update --channel preview --environment preview --message "..."`, rồi lấy mã QR ở trang update trên expo.dev | Android: ai có Expo Go bản hỗ trợ SDK 57. iPhone: **chỉ** tài khoản Expo chủ project (giới hạn của Expo Go trên iOS) |
| **File APK** | `npx eas-cli@latest build -p android --profile preview` → nhận link tải APK | Mọi máy Android (cho phép cài từ nguồn ngoài) |

## 5. Cập nhật không cần cài lại

Sau khi người dùng đã cài APK, mỗi lần sửa giao diện hoặc logic JavaScript chỉ cần:

```bash
npx eas-cli@latest update --channel preview --environment preview --message "mô tả thay đổi"
```

App đã cài tự nhận bản mới ở lần mở sau.

> [!IMPORTANT]
> **Phải build APK mới** khi: đổi hoặc thêm thư viện có mã native, hoặc tăng `version` trong
`app.json` (vì `runtimeVersion` theo `appVersion`).

## 6. Khi API đổi mà app cũ chạy sai

Tăng `MIN_MOBILE_VERSION` ở **máy chủ LEARN**. App cũ hơn sẽ hiện thông báo "Có phiên bản mới" ở
Tổng quan (đọc từ `GET /api/v1/meta`).

## 7. Danh sách kiểm trước khi phát hành

- [] `npm run typecheck`, `npm run lint`, `npm test` đều sạch
- [] Đã chạy [checklist trên điện thoại thật](testing.md#4-checklist-trên-điện-thoại-thật)
- [] `EXPO_PUBLIC_API_URL` của môi trường trỏ đúng máy chủ công khai (HTTPS)
- [] `version` trong `app.json` đã tăng nếu có đổi thư viện native
- [] `MIN_MOBILE_VERSION` ở máy chủ không cao hơn bản sắp phát hành
