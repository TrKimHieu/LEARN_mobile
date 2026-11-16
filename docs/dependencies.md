# Thêm dependency

Quy trình P-5 (2026-11-16). Mục tiêu: lockfile không xung đột giữa các nhánh, phiên bản native khớp Expo SDK, và không mất `node_modules` khi mạng chập chờn.

## Quy tắc

- Gói Expo hoặc có mã native: `npx expo install <gói>` để lấy đúng phiên bản theo SDK. Không gõ tay phiên bản.
- Gói JS thuần không thuộc Expo: `npm install <gói>@<phiên bản cụ thể>`.
- Thêm theo **đợt**: mỗi đợt một nhánh, một commit chỉ gồm `package.json` + `package-lock.json` (và `app.json` nếu plugin cần). Code dùng gói đi ở commit sau.
- Không có hai nhánh cùng sửa lockfile một lúc. Nhánh tính năng rebase lên `main` sau khi đợt dependency đã merge, không tự thêm gói.
- Không thay gói đã chọn bằng gói khác chỉ để qua gate (ví dụ không thay SQLite bằng AsyncStorage).
- Không thêm gói cho việc vài dòng code làm được.
- Gói native mới làm đổi fingerprint: cần build development/preview mới; OTA không mang được thay đổi này. Ghi rõ trong mô tả PR.

## Các bước một đợt

1. `git checkout -b chore/deps-<tên-đợt>` từ `main` mới nhất.
2. `npx expo install <gói…>` (hoặc `npm install` cho JS thuần).
3. `npx expo install --check` và `npm run doctor`: không còn cảnh báo lệch phiên bản.
4. `npm run sync:contracts`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:tooling`, `npm run export`.
5. Commit `package.json` + `package-lock.json`, mở PR, merge trước khi bắt đầu code dùng gói.

## Mạng chập chờn

`npm ci` xoá `node_modules` trước khi tải; nếu lỗi mạng giữa chừng thì thư mục trống (đã xảy ra 2026-11-16 với ECONNRESET). Khi mạng không ổn định:

    npm ci --ignore-scripts --prefer-offline --fetch-retries=8 --fetch-timeout=600000 --maxsockets=2

Chạy lại nhiều lần nếu cần; mỗi lần cache npm giữ thêm gói đã tải. Đổi lockfile mà không cài: `npm install --package-lock-only --ignore-scripts`. Sau khi cài, kiểm phiên bản thật trong `node_modules` trước khi tin kết quả test.

## Đợt đã lên kế hoạch

Đã có sẵn, không cần thêm: `expo-crypto` (SHA-256, T1-2/T1-8), `expo-document-picker`, `expo-file-system`, `expo-sqlite`, `expo-network`.

| Đợt | Gói | Loại | Dùng cho |
| --- | --- | --- | --- |
| D1 thông báo | `expo-notifications` ~58.1.9 (cài 2026-11-16) | native, cần build mới | W3, T3-3, T4-4, T4-5 |
| D2 Office | một thư viện giải nén ZIP JS thuần (chọn khi làm T1-4, ưu tiên gói nhỏ không cần native) | JS | T1-4 DOCX/PPTX |
| D3 native R7 | `expo-speech`, `expo-auth-session` (Google Drive), gói nhận nội dung chia sẻ | native | R7, kết nối Drive |

Thứ tự theo roadmap: D1 trước W3/T3, D2 trước T1-4, D3 khi tới R7. Mỗi đợt ghi lại phiên bản đã cài vào bảng này.
