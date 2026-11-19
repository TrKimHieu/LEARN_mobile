# Mobile: theo kịp web "lấy việc học làm trung tâm"

Ngày: 2026-11-18 · Trạng thái: đã duyệt 2026-11-19 · GĐ0–GĐ4 xong (PR #16–#20)

Nguồn:
- Spec web `docs/superpowers/specs/2026-11-17-learning-first-ui-design.md` (workspace).
- Spec popup nhắc học `docs/superpowers/specs/2026-11-18-study-reminder-popup-design.md`.
- Web PR #5–#10, backend PR #14–#16 (đều đã merge).

Spec web ghi app mobile nằm ngoài phạm vi. Kế hoạch này mang cùng hành vi sang mobile, nhưng giao diện làm riêng cho điện thoại (`UI_PLATFORM_RULES.md`, memory "tách giao diện web và mobile").

## Khác biệt hiện tại

| Phần | Web (contracts 1.8.0) | Mobile (contracts 1.5.0) |
|---|---|---|
| Màn chính | **Học**: mascot theo tâm trạng, chuỗi ngày, vòng mục tiêu ngày, 2–4 "Việc hôm nay" | Tổng quan: 4 ô số liệu, danh sách khóa, hoạt động gần đây |
| Điều hướng | Học · Khóa học · Thẻ · ＋ Tạo · Tôi; bỏ Tiến trình | Tổng quan · Khóa học · Thẻ · Tiến trình · Cài đặt (· Quản trị); mobile giữ Tiến trình |
| Luyện tập | Từng câu, chấm ngay qua API, câu sai quay lại cuối hàng, chuỗi đúng; còn chế độ "kiểu kiểm tra" | Làm hết rồi nộp |
| Bài học | Chia bước theo `##`, câu hỏi nhanh sau mỗi 2 bước, nhớ bước đang đọc | Một trang đọc dài |
| Chi tiết khóa học | Bài học trước, mục "Tài liệu (n)" gập lại | Lộ trình, rồi tài liệu và khung nhập |
| Góp ý | Popup 1 câu, tối đa 1 lần/ngày, chỉ sau khi hoàn tất | Chưa có |
| Nhắc khi mở | Popup "việc hôm nay" khi mở web (lần đầu trong ngày hoặc sau ≥ 4 giờ) | Có thông báo cục bộ 19:00 (chỉ ôn câu hỏi) |
| Contracts | `checkAnswer`, `feedback`, `lastStudyDay` | Chưa có |

## Nguyên tắc

- Logic thuần chép từ web, kèm test của web (như các lần W1/W2): `today-plan.ts`, `mood.ts`, `lesson-steps.ts`, `quick-queue.ts`, `feedback-policy.ts`, `nudge.ts`. Màn hình viết mới bằng component mobile.
- Mỗi giai đoạn một nhánh, một PR. Không đẩy thêm vào nhánh của PR đã gửi duyệt.
- Không đổi backend: mọi API cần đã có ở backend #14–#16.
- Dữ liệu lưu theo tài khoản (kv trong DB SQLite của tài khoản), không dùng AsyncStorage chung, để đổi tài khoản không lẫn.
- Offline: chấm từng câu cần mạng. Mất mạng thì luyện tập tự chuyển sang chế độ "kiểu kiểm tra", và bài nộp vào hàng chờ như hiện nay.
- Mascot: mỗi màn một mascot, dùng `Mascot` sẵn có. Tôn trọng "Giảm chuyển động".

## Giai đoạn

### GĐ0: contracts 1.8.0 (nhỏ)
- Lấy `learn-api-contracts-1.8.0.tgz` từ vendor web, kiểm SHA-256 với `vendor/checksums.json` của web, đổi pin, cập nhật lockfile.
- Gate: `sync:contracts`, typecheck, toàn bộ test.

### GĐ1: điều hướng và màn Học (lớn nhất)
- Tab: **Học** · **Khóa học** · **＋** (nút giữa, mở bảng chọn: Khóa học từ tài liệu, Bộ thẻ mới, Sinh thẻ bằng AI) · **Thẻ** (huy hiệu số đến hạn) · **Tiến trình**.
- Giữ tab **Tiến trình** trên mobile (người dùng chốt 2026-11-18, khác web): biểu đồ 7 ngày, thời gian học, theo khóa học, lịch sử làm bài.
- **Cài đặt** rời khỏi thanh tab: nút ảnh đại diện ở góc màn Học mở màn Cài đặt (hồ sơ, giao diện, nhắc ôn, gói, Quản lý dung lượng). Lối vào **Quản trị** cho ADMIN nằm trong Cài đặt, bỏ tab Quản trị riêng. Thanh tab còn đúng 5 ô.
- **Màn Học**:
  - Mascot theo `moodFor` (dùng `activeStreak`, `lastStudyDay`).
  - Chuỗi ngày 🔥 N và vòng mục tiêu ngày `X/Y` (`ProgressRing` sẵn có).
  - "Việc hôm nay" 2–4 việc theo `buildTasks`/`reconcile`, chốt theo ngày, việc xong giữ dấu ✓.
  - Một dòng nhỏ: Pomodoro, Khóa học đang học (n).
  - Chưa có khóa nào: chỉ mascot và nút tạo khóa học đầu tiên.
- Ôn câu hỏi (R5) và ôn thẻ (W1) đều tính là việc "Ôn thẻ" khi có thẻ đến hạn; giữ hai lối vào riêng như ADR 005.
- Gate: test logic chép từ web; test màn Học với dữ liệu trống, có việc, xong hết.

### GĐ2: luyện tập từng câu, chấm ngay
- Mặc định mỗi màn một câu → **Kiểm tra** → đúng/sai, đáp án, lời giải. Câu sai quay lại cuối hàng (`quick-queue.ts`). Thanh tiến độ, chuỗi đúng, mascot phản ứng.
- Điểm theo lần trả lời đầu tiên; xong thì nộp qua endpoint nộp bài hiện có (giữ `Idempotency-Key`, hàng chờ offline).
- Màn kết quả: điểm, chuỗi đúng dài nhất, thời gian, mascot `celebrate` nếu đạt.
- Nút "Làm kiểu kiểm tra" mở giao diện hiện tại. Mất mạng thì tự dùng chế độ này.
- Gate: test hàng câu, test chấm qua API (mock), test chuyển chế độ khi offline.

### GĐ3: bài học chia bước, câu hỏi nhanh
- `splitSteps` theo `##`; mỗi bước một màn, vuốt ngang hoặc nút "Tiếp"/"Quay lại", thanh tiến độ. Nhớ bước đang đọc theo bài.
- Sau mỗi 2 bước một câu hỏi nhanh (chỉ trắc nghiệm, đúng/sai), chấm qua API, không ghi điểm.
- Bước cuối: "Luyện tập ngay". Tới bước cuối tính là đã đọc xong.
- Mục lục bài học hiện tại chuyển thành danh sách bước.
- Gate: test chia bước, test chèn câu hỏi, test nhớ bước.

### GĐ4: chi tiết khóa học
- Danh sách bài học lên đầu, kèm nút "Học tiếp".
- "Tài liệu (n)" gập lại; khóa chưa có tài liệu thì mở sẵn. Sinh bài học bằng AI và xóa khóa học đặt sau danh sách bài.

### GĐ5: bỏ
- Người dùng chốt 2026-11-19: không làm popup góp ý và popup nhắc khi mở app trên mobile. Nhắc học vẫn dùng thông báo cục bộ 19:00 hiện có.

## Ước lượng và thứ tự

| GĐ | Cỡ | Phụ thuộc |
|---|---|---|
| 0 | nhỏ | — |
| 1 | lớn | 0 |
| 2 | vừa | 0 |
| 3 | vừa | 2 (dùng chung câu hỏi và API chấm) |
| 4 | nhỏ | — |
| 5 | bỏ | — |

Tổng khoảng 3 phiên làm việc. Chạy được trên web xem thử và gate tự động; vẫn cần thử trên thiết bị ở đợt nghiệm thu.

## Cần người dùng chốt

1. ~~Tab Tôi hay giữ tab Tiến trình?~~ Đã chốt: giữ tab Tiến trình; Cài đặt mở từ màn Học.
2. ~~Có làm GĐ5?~~ Đã chốt: bỏ GĐ5.
