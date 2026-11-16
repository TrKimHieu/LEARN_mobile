# ADR 006 — XP, chuỗi ngày, mục tiêu ngày và chống gian lận

Trạng thái: chấp nhận ngày 2026-11-16 (người dùng xác nhận). Đây là mục ADR (c) của P-3. Các con số là giá trị khởi điểm để duyệt, chưa lấy từ backend.

## Bối cảnh

Roadmap R6/R8 và nhóm T4/T5 thêm XP, chuỗi ngày, mục tiêu ngày, bạn bè và bảng xếp hạng tuần. Bảng xếp hạng làm XP có giá trị cạnh tranh, nên client không được tin cậy: thiết bị có thể đổi giờ, phát lại yêu cầu hoặc gửi sự kiện giả. Backend hiện chưa có DailyGoal, XpEvent, Friendship, LeagueEntry.

## Quyết định

**Server là nguồn duy nhất của XP, chuỗi ngày và ngày học.** Client chỉ hiển thị (T4-2). Client không gửi "cộng X điểm"; client chỉ gửi hành động học có thật (nộp bài, hoàn thành bài, chấm thẻ, kết thúc phiên), và server tự tính XP.

**Ngày học (T4-1).** Một ngày được tính là "đã học" khi trong ngày đó có ít nhất một trong: hoàn thành bài học, nộp bài tập, hoàn tất một phiên ôn (SRS). Ranh giới ngày theo múi giờ của người dùng đã lưu ở server (không theo giờ máy). Chuỗi ngày đếm các ngày học liên tiếp; ngày bị bỏ thì chuỗi về 0, không "đông" bằng thiết bị.

**Sổ XP.** Mỗi lần cộng là một `XpEvent` bất biến: user, loại nguồn, mã tham chiếu (submission, review, lesson), số XP, thời điểm server, khoá chống trùng. Tổng XP và XP tuần là tổng hợp từ sổ, không sửa trực tiếp.

**Chống gian lận.**
- Chỉ nguồn do server xác nhận mới sinh XP: nộp bài đã chấm ở server, bài học hoàn thành theo server, thẻ chấm qua endpoint review.
- Mỗi nguồn chỉ cộng một lần: khoá duy nhất theo (user, loại, mã tham chiếu); gửi lại cùng `Idempotency-Key` trả lại kết quả cũ, không cộng thêm.
- Làm lại cùng một bài tập hoặc ôn lại cùng một thẻ trong ngày không cộng XP đầy đủ lần nữa: lần đầu trong ngày tính đủ, các lần sau giảm hoặc bằng 0.
- Trần XP tối đa mỗi ngày mỗi người (giá trị khởi điểm 500 XP, server cấu hình được). Vượt trần vẫn lưu tiến độ học, chỉ không cộng XP.
- Thời điểm sự kiện do server gán. Giờ client chỉ dùng để sắp xếp trong outbox; sự kiện cũ hơn lần cuối hoặc lệch giờ quá ngưỡng bị kẹp hoặc bỏ XP.
- Sự kiện đến từ outbox offline được chấp nhận khi có mạng, nhưng tính vào ngày theo thời điểm server nhận hợp lệ, không theo giờ máy.
- Phiên Pomodoro và thời gian học cục bộ (T3-5) không sinh XP.
- Tài khoản demo / chế độ Testing không bao giờ gửi sự kiện và không vào bảng xếp hạng.

**Mục tiêu ngày (T4-3, T4-4).** Người dùng chọn mục tiêu theo số bài/thẻ hoặc số XP; server lưu `DailyGoal` và tính "đạt hôm nay". Nhắc học là thông báo cục bộ theo giờ người dùng đặt, chỉ bắn khi dữ liệu mới nhất cho thấy hôm nay chưa đạt; không có push từ server ở giai đoạn này. Cảnh báo chuỗi sắp đứt (T4-5) cùng cơ chế, là tuỳ chọn.

**Bạn bè và xếp hạng (T5).**
- Kết bạn bằng mã mời hoặc email; có chấp nhận, từ chối, huỷ. Giới hạn tần suất lời mời ở server, kèm cờ bật/tắt tính năng.
- Bảng xếp hạng tuần chỉ gồm nhóm bạn bè, xếp theo XP tuần từ sổ XP. Không có bảng công khai toàn hệ thống.
- Hiển thị tên: mặc định chỉ bạn bè thấy; người dùng có thể đổi chế độ.
- Người không phải bạn bè không thấy email, lịch sử học, tên khoá học hay nội dung. Bạn bè chỉ thấy tên hiển thị và XP tuần, không thấy gì khác.
- Truy cập hồ sơ người khác không phải bạn bè trả 404, không trả 403, để không lộ tài khoản tồn tại.

**Client.** Hiển thị XP/chuỗi từ API; cache SQLite chỉ để xem lại, ghi rõ "cập nhật lúc …" khi offline. Không tính XP cục bộ để hiển thị lạc quan.

## Hệ quả

- Cần backend mới (XpEvent, DailyGoal, Friendship, LeagueEntry) và contracts tương ứng (P-2); mobile chỉ làm UI sau khi có. Không dùng mock để coi là đã triển khai.
- XP hiển thị có thể chậm sau khi offline; chấp nhận để đổi lấy khả năng chống gian lận.
- Trần XP và hệ số giảm cho lần làm lại cần chỉnh theo dữ liệu thật; ghi cấu hình ở server, không đóng cứng trong app.
- Cần test: gửi trùng, đổi giờ máy, vượt trần, truy cập hồ sơ người lạ, lời mời dồn dập.
- Việc dùng ngôn ngữ so sánh ("xếp hạng") có thể gây áp lực; có công tắc ẩn mình khỏi bảng xếp hạng như một phần của chế độ hiển thị tên.

## Không nằm trong ADR này

Hai hệ thẻ và thuật toán SM-2 (ADR 005). Lưu bản sao tệp gốc (ADR 004).
