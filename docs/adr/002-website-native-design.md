# ADR 002 — Website hiện tại là chuẩn thiết kế native

Trạng thái: chấp nhận theo kế hoạch người dùng ngày 2026-11-09; thay thế ADR 001 đơn sắc ở repo mobile gốc (bản standalone trước đây không chứa ADR đó). Website hiện dùng nền kem, nút xanh, typography Inter/Plus Jakarta và bo góc 14/20/24 px. Native giữ tên vai trò màu, nội dung, trạng thái loading/empty/error/retry và bốn tab người học, điều chỉnh cuộn, bàn phím, vùng an toàn và nút Back cho điện thoại. Không nhập source từ repo web lúc build.

Token màu và bo góc đã chuyển. Từ 2026-11-09 font là Inter (giao diện, bài đọc) và Plus Jakarta Sans (display, title, heading) qua `@expo-google-fonts`, nạp trong `src/theme/fonts.ts`; Hanken Grotesk đã gỡ. Không trỏ native tới WOFF của web. Dấu tiếng Việt và chữ lớn vẫn cần kiểm trên thiết bị thật.

Nguồn thiết kế đối chiếu: snapshot website `src/theme.css` tại workspace ngày 2026-11-09. Tương phản chữ thường/nút được kiểm tự động trên cả hai tông; kiểm trợ năng và tương tác trên thiết bị vẫn là gate riêng.
