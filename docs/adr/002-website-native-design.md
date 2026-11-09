# ADR 002 — Website hiện tại là chuẩn thiết kế native

Trạng thái: chấp nhận theo kế hoạch người dùng ngày 2026-11-09; thay thế ADR 001 đơn sắc ở repo mobile gốc (bản standalone trước đây không chứa ADR đó). Website hiện dùng nền kem, nút xanh, typography Inter/Plus Jakarta và bo góc 14/20/24 px. Native giữ tên vai trò màu, nội dung, trạng thái loading/empty/error/retry và bốn tab người học, điều chỉnh cuộn, bàn phím, vùng an toàn và nút Back cho điện thoại. Không nhập source từ repo web lúc build.

Token màu và bo góc đã chuyển; Hanken Grotesk hiện vẫn là font đóng gói tạm thời. Cài Inter/Plus Jakarta bị npm registry từ chối EACCES; chưa tuyên bố typography/visual parity hoàn tất. Sau khi tải được dependency phải đổi font family, kiểm tiếng Việt, chữ lớn và thiết bị thật; không trỏ native tới WOFF của web.

Nguồn thiết kế đối chiếu: snapshot website `src/theme.css` tại workspace ngày 2026-11-09. Tương phản chữ thường/nút được kiểm tự động trên cả hai tông; kiểm trợ năng và tương tác trên thiết bị vẫn là gate riêng.
