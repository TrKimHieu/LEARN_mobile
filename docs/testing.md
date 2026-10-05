# Kiểm thử

Ba tầng kiểm thử, từ nhanh đến chậm.

> [!WARNING]
> Tầng nào cũng **không thay** được kiểm thử trên điện thoại thật ([mục 4](#4-checklist-trên-điện-thoại-thật)).

| Tầng | Lệnh | Cần backend? | Kiểm tra gì |
| --- | --- | --- | --- |
| Kiểu và lint | `npm run typecheck` · `npm run lint` | Không | Kiểu TypeScript, contracts còn khớp LEARN, quy tắc code |
| Unit test | `npm test` | Không | Logic thuần: phiên đăng nhập, định dạng, kiểm tra phiên bản, AI Job một phần; và **API mock** có khớp contracts không |
| E2E bản web | `npm run e2e` | **Có** (API mock hoặc backend thật) | Luồng người dùng thật + kiểm tra trợ năng bằng axe |

## 1. Unit test

```bash
npm test
```

- Jest với preset `jest-expo`.
- Chỉ chạy các file khớp `src/**/__tests__/**/*.test.ts(x)`.
- Alias `@/` đã được ánh xạ tới `src/`.

Các bộ test hiện có:

| File | Phủ |
| --- | --- |
| `src/lib/__tests__/api-client.test.ts` | Gắn token, tự làm mới phiên khi 401, xử lý lỗi |
| `src/lib/__tests__/format.test.ts` | Hàm định dạng (ngày, thời gian tương đối, dung lượng tệp, nhãn từ mã) |
| `src/lib/__tests__/server-meta.test.ts` | So sánh phiên bản app với máy chủ |
| `src/features/ai/__tests__/partial-failures.test.ts` | AI Job thành công kèm lỗi một phần |
| `mock-api/__tests__/mock-api.test.ts` | Chạy API mock thật và kiểm mọi response bằng Zod schema trong `src/contracts/` (xem [mock-api/README.md](../mock-api/README.md)) |

Viết test cho **logic**, không cho giao diện thuần. Đặt file trong thư mục `__tests__` cạnh code
được kiểm.

## 2. E2E trên bản web

Playwright chạy app ở dạng web trong khung hình điện thoại (390 × 844), cả chế độ sáng và tối, và
chạy **axe** để bắt lỗi trợ năng mức nghiêm trọng.

**Chuẩn bị (hai thứ phải đang chạy):**

1. Một API: **`npm run mock`** (đơn giản nhất), hoặc backend LEARN thật (Docker + `npm run dev:api` +
   worker `LLM_MODE=mock`, đã seed). Xem [getting-started.md](getting-started.md).
2. Bản web của app: `npm run web` (cổng 8081).

```bash
npm run e2e                     # mọi luồng
npm run e2e -- learner admin    # chọn luồng: learner | create | admin
```

| Luồng | Việc làm |
| --- | --- |
| `learner` | Đăng nhập bằng tài khoản demo; duyệt tổng quan, khóa học, bài học, bài tập, kết quả, tiến trình, cài đặt |
| `create` | Đăng ký tài khoản mới; tạo khóa học; tải `e2e/fixtures/git-co-ban.md`; sinh bài bằng AI |
| `admin` | Đăng nhập admin; xem số liệu và AI Job |

- Địa chỉ app đổi bằng biến `E2E_BASE_URL` (mặc định `http://localhost:8081`).
- Ảnh chụp và báo cáo axe ghi vào `e2e/out/` (không commit).
- Luồng `create` tạo tài khoản `e2e-mobile-…`. Trên API mock, dữ liệu mất khi tắt mock (hoặc `POST /__mock/reset`); trên backend thật, dọn bằng `npm run db:cleanup:e2e` **ở repo LEARN**.
- Lần đầu cần cài trình duyệt cho Playwright: `npx playwright install chromium`.

## 3. Ảnh chụp trong tài liệu

`docs/screenshots/` chứa ảnh dùng trong README, lấy từ `e2e/out/`. Muốn làm mới, chạy e2e rồi chép
các ảnh cần dùng sang.

## 4. Checklist trên điện thoại thật

> [!IMPORTANT]
> **Bắt buộc trước khi coi một bản là xong.** Làm trên Android qua Expo Go **và** APK, iPhone qua Expo
Go (tài khoản chủ project).

- [] Bàn phím không che ô nhập (đăng nhập, tạo khóa học, sửa bài, câu tự luận)
- [] Safe area: tai thỏ / thanh home không che header, thanh tab, thanh "Nộp bài"
- [] Nút Back Android: chi tiết → danh sách → tab trước; không thoát app ngoài ý muốn
- [] Chọn tệp và tải lên (PDF, DOCX, MD) → trạng thái tự đổi sang "Đã trích xuất"
- [] Chế độ tối của hệ thống, và chọn tay Sáng/Tối trong Cài đặt
- [] TalkBack / VoiceOver đọc được nút chính, lựa chọn đáp án, thanh tiến độ
- [] Mở lại app sau khi tắt hẳn: vẫn đăng nhập (SecureStore); mất mạng lúc mở: hiện màn "Không kết nối"
- [] Web và app cùng tài khoản: làm bài trên điện thoại → web thấy lịch sử mới

> [!CAUTION]
> **Trạng thái hiện tại:** các mục trên **chưa được chạy đạt** trên điện thoại thật. Xem README, mục "Trạng thái".
