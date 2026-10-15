# PARITY.md — Đối chiếu tính năng web ↔ app mobile

> App mobile là repo riêng `LEARN_mobile` (Expo SDK 57), dùng chung API và `@learn/contracts`
> (chép bằng `npm run sync:contracts`). File này là nguồn sự thật cho câu hỏi "mobile đã có tính
> năng X của web chưa". **Bắt buộc cập nhật** khi thêm/đổi một màn người dùng hoặc một contract
> (AGENTS.md). Nhãn trạng thái đúng 4 nhãn của AGENTS.md.

Cập nhật: 2026-09-30. Toàn bộ app mobile nằm ngoài MVP web (REQUIREMENTS §3.3) và **chưa kiểm
chứng trên điện thoại thật**, nên các màn đã làm xong vẫn mang nhãn `Đang phát triển`; chuyển sang
`Có trong MVP` khi đã chạy đạt checklist thiết bị thật (README mobile).

## Người học

| Tính năng (web)                                            | Route web                  | Màn mobile                                                                               | Trạng thái mobile |
| ---------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------- | ----------------- |
| Đăng nhập                                                  | `/login`                   | `(auth)/login`                                                                           | Đang phát triển   |
| Đăng ký                                                    | `/register`                | `(auth)/register`                                                                        | Đang phát triển   |
| Quên mật khẩu (gửi thư)                                    | `/forgot-password`         | `(auth)/forgot-password`                                                                 | Đang phát triển   |
| Đặt lại mật khẩu                                           | `/reset-password#token=`   | `(auth)/reset-password?token=` (mở từ trang web bằng `learn://`; Expo Go dùng trang web) | Đang phát triển   |
| Tổng quan (học tiếp, số liệu, khóa, hoạt động)             | `/dashboard`               | `(tabs)/index`                                                                           | Đang phát triển   |
| Danh sách khóa học                                         | `/courses`                 | `(tabs)/courses`                                                                         | Đang phát triển   |
| Tạo khóa học                                               | `/courses/new`             | `course/new` (modal)                                                                     | Đang phát triển   |
| Chi tiết khóa: lộ trình, sắp xếp bài                       | `/courses/:id`             | `course/[courseId]`                                                                      | Đang phát triển   |
| Sinh bài học bằng AI + theo dõi tiến độ + huỷ              | `/courses/:id`             | `course/[courseId]`                                                                      | Đang phát triển   |
| Tải tài liệu lên                                           | `/courses/:id` (kéo-thả)   | `course/[courseId]` (trình chọn tệp)                                                     | Đang phát triển   |
| Đọc bài (Markdown, mục lục, nguồn, bài trước/sau)          | `/courses/:id/lessons/:id` | `course/[courseId]/lesson/[lessonId]`                                                    | Đang phát triển   |
| Sửa / xoá bài học                                          | cùng trang đọc bài         | `…/edit` (modal) + nút xoá                                                               | Đang phát triển   |
| Làm bài tập, kết quả, xem lại, làm lại, đi tiếp            | `…/practice`               | `…/practice`                                                                             | Đang phát triển   |
| Pháo giấy khi qua bài                                      | `lib/celebrate.ts`         | `components/celebrate.tsx` + rung                                                        | Đang phát triển   |
| Tiến trình + lịch sử phân trang                            | `/progress`                | `(tabs)/progress`                                                                        | Đang phát triển   |
| Cài đặt: hồ sơ, giao diện, gói, hạn mức, đăng xuất mọi nơi | `/settings`                | `(tabs)/settings`                                                                        | Đang phát triển   |
| Mascot Circle (25 biểu cảm, chớp mắt, chuyển động)         | `components/shared/mascot` | `components/mascot` (cùng dữ liệu, bộ vẽ riêng)                                          | Đang phát triển   |

## Quản trị (chỉ ADMIN)

| Tính năng (web)                              | Route web              | Màn mobile              | Trạng thái mobile |
| -------------------------------------------- | ---------------------- | ----------------------- | ----------------- |
| Số liệu tổng + chi phí LLM theo ngày         | `/admin/metrics`       | `(tabs)/admin`          | Đang phát triển   |
| AI Job: danh sách, lọc trạng thái            | `/admin/ai-jobs`       | `admin/ai-jobs`         | Đang phát triển   |
| AI Job: chi tiết, chạy lại, nhật ký thao tác | `/admin/ai-jobs/:id`   | `admin/ai-jobs/[jobId]` | Đang phát triển   |
| Bảng người dùng                              | `/admin/users`         | — (chỉ web, bảng rộng)  | Mở rộng tương lai |
| Bảng khóa học                                | `/admin/courses`       | — (chỉ web)             | Mở rộng tương lai |
| Bảng gói đăng ký                             | `/admin/subscriptions` | — (chỉ web)             | Mở rộng tương lai |

## Khác biệt có chủ đích

- **Màu**: mobile đơn sắc dịu, không cặp gần-trắng/gần-đen (`LEARN_mobile/docs/adr/001`). Web đã đổi sang lam học thuật + tiêu đề serif (ADR 018, 2026-10-12) — **mobile chưa đồng bộ**, cần quyết định riêng cho `LEARN_mobile`. Bổ sung 2026-10-13: web có nền sóng hạt cho mọi màn, mỗi màn một cảnh (`wave-scenes.ts`) — chỉ ở web, không phải contract.
- **Phiên đăng nhập**: mobile giữ refresh token trong Keychain/Keystore, không cookie (ADR 016).
- **Tài liệu**: cả hai tự làm mới trạng thái trích xuất khi còn tài liệu `UPLOADED`/`EXTRACTING` (web 2 giây — `features/courses/document-polling.ts`, mobile 3 giây), dừng khi xong.

## Cơ chế giữ đồng bộ

1. `@learn/contracts` có dấu vân tay `CONTRACTS_HASH` (`npm run contracts:hash`; test
   `version.test.ts` đỏ nếu quên). Mobile chép kèm hash; `GET /api/v1/meta` trả hash của máy chủ.
2. `MIN_MOBILE_VERSION` (env API) — app cũ hơn hiện thông báo "Có phiên bản mới".
3. Bên mobile: `npm run typecheck` báo lệch contracts khi repo LEARN nằm cạnh.
