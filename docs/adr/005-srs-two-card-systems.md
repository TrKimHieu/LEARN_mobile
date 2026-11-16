# ADR 005 — Ôn tập ngắt quãng: hai hệ thẻ riêng, một thuật toán SM-2

Trạng thái: chấp nhận ngày 2026-11-16 (người dùng xác nhận). Đây là mục ADR (b) của P-3.

## Bối cảnh

Hai nguồn "thẻ" cùng tồn tại:

- **Thẻ câu hỏi (R5, mobile đã có):** mỗi câu hỏi (`Question`) đã nộp ít nhất một lần là một thẻ. Lịch lưu ở `CardSchedule` theo user + question. Mặt sau là đáp án của câu hỏi, nên không lộ trước khi nộp. Endpoint: `POST /reviews/:questionId`.
- **Thẻ tự tạo (web `features/flashcards`, mục W1/W2 của mobile):** người học tạo Bộ thẻ và Thẻ (mặt trước/sau), hoặc nhận Thẻ nháp từ AI rồi chấp nhận vào một bộ. Theo `SPEC_flashcards_review_pomodoro.md`, thực thể này tách khỏi ôn câu hỏi bài tập.

Tên gọi trùng ("Card", "Ôn hôm nay") dễ làm lẫn dữ liệu, lịch ôn và contracts.

## Quyết định

- **Hai hệ riêng, không gộp bảng, không chia sẻ lịch.** Thẻ câu hỏi dùng `CardSchedule` hiện có. Thẻ tự tạo có thực thể và lịch ôn riêng (Bộ thẻ, Thẻ, lịch ôn thẻ) theo spec web. Một câu hỏi không tự thành thẻ tự tạo và ngược lại.
- **Một thuật toán chung: SM-2.** Mức nhớ 4 bậc ánh xạ 1/3/4/5 (Quên, Khó, Tốt/Được, Dễ). Điểm dưới 3 đặt repetitions = 0, khoảng cách 1 ngày, lapses + 1. Hệ số dễ tối thiểu 1.3. Lần 1 → 1 ngày, lần 2 → 6 ngày, sau đó round(khoảng × EF). Dễ nhân thêm 1.3.
- **Server quyết định lịch.** Client chỉ gửi kết quả ôn kèm `Idempotency-Key` (= `eventId` trong outbox). Cùng key thì server trả lại kết quả lần đầu. Ôn cũ hơn lần ôn cuối được ghi lịch sử nhưng không đổi lịch.
- **Client giữ hàm thuần `sm2.ts` chỉ để dự đoán và kiểm thử** (T2-1): hiển thị "đến hạn" khi offline và test bằng bộ ví dụ cố định. Lịch server luôn thắng khi có mạng.
- **"Đến hạn" tính theo múi giờ của server**, không theo giờ máy, để đổi giờ máy không đẩy lịch đi xa (T2-5).
- **Giao diện tách bạch.** Thẻ câu hỏi vào "Ôn hôm nay" ở Tổng quan (`/review`). Thẻ tự tạo nằm ở tab/khu "Thẻ" riêng, có phiên ôn một bộ và "Ôn hôm nay" của riêng thẻ. Mỗi nơi hiện số đến hạn riêng, không cộng chung. Cách gọi trong giao diện phải phân biệt được (ví dụ "Ôn câu hỏi" so với "Ôn thẻ").
- **Offline.** Cả hai dùng chung outbox R2 (`queueOrSend`), cache React Query tách theo query key (`['reviews', 'due']` cho câu hỏi, khoá riêng cho thẻ tự tạo). Thẻ nháp không bao giờ vào cache ôn và không có lịch cho đến khi được chấp nhận.
- **Contracts.** Thẻ tự tạo cần schema mới (Card, CardReview, Bộ thẻ, loại AI job sinh thẻ). Chỉ làm sau khi backend phát hành và `sync:contracts` lên bản tương ứng (P-2).

## Hệ quả

- Người dùng có hai "ngăn" ôn. Đổi lại, không có rủi ro một câu hỏi bài tập bị sửa hoặc xoá làm mất thẻ người học tự soạn, và đáp án câu hỏi không lộ qua thẻ.
- Dữ liệu và lịch của hai hệ không chuyển đổi qua lại; muốn đưa câu hỏi sang thẻ tự tạo phải tạo thẻ mới.
- Phần tính lịch SM-2 trên server dùng chung một hàm, nên sửa quy tắc một lần cho cả hai.
- Cần thêm một huy hiệu "đến hạn" thứ hai và một lối vào thứ hai; chi phí thiết kế đã tính trong W1.
- Backend thẻ tự tạo chưa có trong repo backend hiện tại; mục W1–W2 bị chặn tới khi có.

## Không nằm trong ADR này

Mô hình XP và chống gian lận (ADR riêng, P-3c). Lưu bản sao tệp gốc (cập nhật ADR 004).
