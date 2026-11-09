# ADR 003 — Giao diện linh hoạt và xoay ngang

Trạng thái: chấp nhận ngày 2026-11-09.

## Bối cảnh

App trước đây khoá chiều dọc (`orientation: "portrait"`) và dùng lề cố định 16 dp, nên chưa chạy đúng trên tablet, khi xoay ngang hay khi chia đôi màn hình Android.

## Quyết định

- Mở xoay (`orientation: "default"`). Mọi `Modal` khai báo `supportedOrientations`, vì iOS mặc định khoá Modal ở chiều dọc.
- Phân loại cửa sổ theo chiều rộng: compact `< 600`, medium `600–839`, expanded `>= 840` dp. `shortHeight` khi cao `< 480` (điện thoại ngang). Hàm thuần `layoutFor` trong `src/theme/layout.ts`; màn đọc qua `useLayout()`, không đọc `Dimensions` tĩnh.
- Lề ngang `gutter` 16 / 24 / 32 cộng thêm `insets.left/right` để tránh tai thỏ. Nội dung giới hạn 480 (form đăng nhập), 720 (đọc và sửa bài, làm bài, cài đặt), 1200 (lưới) và căn giữa.
- Lưới khóa học 1 / 2 / 3 cột, thẻ số liệu 2 / 4 cột. Các ô cùng hàng cao bằng nhau; hàng cuối thiếu ô được đệm ô ẩn để giữ độ rộng đều.
- Compact dùng dock đáy. Medium và expanded dùng rail bên trái, gồm cả điện thoại ngang, để không mất chiều cao.
- Mục lục bài học thành cột bên phải chỉ khi expanded và không `shortHeight` (tablet ngang); còn lại vẫn dùng Modal. Đăng nhập chia đôi khi điện thoại ngang.

## Hệ quả

- Tablet vẫn dùng cột Mobile của `UI_PLATFORM_RULES.md`; không lấy element của website như thanh trên dạng chữ hay hover.
- Đổi `orientation` là thay đổi native: Expo Go nhận ngay, còn APK phải build lại.
- Bố cục thật (chữ lớn, tai thỏ, bàn phím khi ngang) chỉ nghiệm thu được trên thiết bị. Kết quả ghi trong `docs/mobile-roadmap-status.md`.
