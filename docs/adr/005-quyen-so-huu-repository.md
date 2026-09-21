# ADR-005: Áp quyền sở hữu ở tầng repository, không ở tầng controller

Trạng thái: Đã chấp nhận · 2026-09-14

## Bối cảnh

Course, Document, Lesson, AIJob đều thuộc về một `userId` cụ thể. Nếu việc kiểm tra "user này có
được xem/sửa resource này không" nằm ở tầng controller (một `if` trước khi gọi service), rất dễ
quên kiểm tra ở một route mới thêm sau này — đây là lớp lỗi IDOR (Insecure Direct Object Reference)
phổ biến nhất trong các API CRUD.

## Quyết định

Điều kiện sở hữu nằm ngay trong câu truy vấn Prisma ở tầng service, không phải một `if` riêng sau
khi đã lấy dữ liệu. Ví dụ `courses.service.ts` luôn query
`prisma.course.findFirst({ where: { id, ownerId: userId, deletedAt: null } })` — nếu không khớp
`ownerId`, kết quả là `not found` (404) giống hệt trường hợp resource không tồn tại, không lộ thông
tin resource đó có tồn tại hay không cho user khác. Route admin là ngoại lệ duy nhất, được đánh dấu
rõ bằng `@Admin()` decorator + `RolesGuard`, không dùng chung code path với route của user thường.

## Hệ quả

**Tốt:** không có cách nào gọi thẳng service mà quên lọc quyền sở hữu — điều kiện nằm trong chính
câu query, không phải bước kiểm tra tách rời có thể bị bỏ sót. Test thật trong quá trình build xác
nhận: gọi `GET /admin/users` bằng token LEARNER trả về `403` từ `RolesGuard`, không phải từ logic
thủ công ở controller.

**Xấu:** mỗi service method cần tự lặp lại điều kiện `ownerId` trong where-clause — nếu một
developer mới viết method mới mà quên thêm điều kiện này, TypeScript không tự phát hiện được (đây
là lỗi logic, không phải lỗi kiểu).

**Sẽ xem lại khi:** thêm tính năng chia sẻ Course cho nhiều người dùng (`CourseMember`, hiện đã có
model trong schema nhưng chưa dùng) — khi đó điều kiện sở hữu đơn giản `ownerId = userId` không còn
đủ, cần join qua bảng `CourseMember` và kiểm tra `role`.
