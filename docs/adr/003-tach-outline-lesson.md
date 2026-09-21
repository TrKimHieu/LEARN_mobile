# ADR-003: Tách outline và nội dung thành hai lần gọi LLM

Trạng thái: Đã chấp nhận · 2026-09-14

## Bối cảnh

Sinh bài học từ tài liệu cần cả việc "lập kế hoạch" (chia tài liệu thành các bài học nào) và
"viết nội dung" (mỗi bài học nói gì, câu hỏi luyện tập ra sao). Gộp cả hai vào một lệnh gọi LLM có
vẻ tiết kiệm chi phí và đơn giản hơn về code.

## Quyết định

Chia làm hai giai đoạn, không gộp: Giai đoạn A gọi LLM một lần để lập outline — đầu vào chỉ gồm
heading path và 200 ký tự đầu mỗi chunk (không gửi toàn văn), đầu ra là danh sách node kèm
`chunkIds` liên quan. Giai đoạn B, với mỗi node, gọi LLM riêng gửi toàn văn các chunk của node đó
để sinh Lesson + Exercise, chạy song song tối đa 3 lệnh gọi mỗi job (`apps/worker/src/processors/lesson-generate.processor.ts`).

## Hệ quả

**Tốt:** model không phải vừa lập kế hoạch vừa viết nội dung trong cùng một lượt suy luận — quan
sát thực tế trong lúc build là kết quả ổn định hơn rõ rệt so với thử gộp chung ban đầu. Tách giai
đoạn cũng mở đường cho tính năng để người dùng duyệt outline trước khi tốn tiền sinh toàn bộ nội
dung (roadmap, chưa làm ở MVP).

**Xấu:** tốn thêm ít nhất 1 lệnh gọi LLM mỗi job so với gộp chung; job có nhiều node outline sẽ có
nhiều lệnh gọi hơn, tăng thời gian chờ tổng thể dù chạy song song có giới hạn.

**Sẽ xem lại khi:** đo được rằng gộp chung với một model đủ mạnh (ví dụ dùng structured output có
reasoning dài) cho chất lượng tương đương với chi phí thấp hơn hẳn — hiện chưa có số liệu so sánh
trực tiếp giữa hai cách vì MVP chỉ build theo hướng tách.
