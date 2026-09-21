# ADR-004: Webhook là nguồn sự thật về thanh toán, chế độ demo cho MVP

Trạng thái: Đã chấp nhận · 2026-09-14

## Bối cảnh

Frontend là nơi dễ giả mạo nhất trong toàn hệ thống — một request `POST` sửa tay có thể tuyên bố
bất kỳ giá hay trạng thái thanh toán nào. Đồng thời, MVP portfolio cần minh hoạ được luồng nâng cấp
gói mà không bắt buộc phải tích hợp cổng thanh toán thật ngay từ đầu.

## Quyết định

Hai phần tách bạch. (1) Nguyên tắc: `Subscription` **không bao giờ** được cập nhật từ dữ liệu do
frontend gửi lên — chỉ được cập nhật qua webhook đã xác minh chữ ký (`subscription.controller.ts`).
Checkout chỉ nhận `planCode`; giá luôn lấy từ `Plan.priceCents` trong DB. (2) Vì Stripe live chưa
được cấu hình ở MVP, hệ thống chạy `BILLING_MODE=demo`: nâng cấp gói kích hoạt `Subscription` ngay
lập tức trong service, không giả vờ đã gọi cổng thanh toán thật — `webhookHandler` throw lỗi rõ
ràng thay vì fake response `200 OK`.

## Hệ quả

**Tốt:** không có đường nào để một request giả mạo tự nâng cấp gói hay đổi giá — kể cả ở chế độ
demo, giá luôn đọc từ DB. Người xem portfolio thấy rõ ràng đây là demo (băng cảnh báo vàng ở
`/settings`), không bị nhầm là sản phẩm thu tiền thật.

**Xấu:** chưa test được đường đi thật của webhook (xác minh chữ ký, chống trùng theo `eventId`,
idempotency khi Stripe gửi lại event) — toàn bộ phần này chỉ tồn tại dưới dạng lỗi rõ ràng, chưa có
code chạy qua được.

**Sẽ xem lại khi:** kết nối Stripe test key thật — khi đó cần viết lại `webhookHandler` để verify
chữ ký, ghi `PaymentEvent` trước khi xử lý, và test tranh chấp khi webhook gửi trùng.
