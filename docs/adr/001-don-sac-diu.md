# ADR 001 — Đơn sắc dịu: không cặp gần-trắng/gần-đen

- **Ngày:** 2026-09-30
- **Trạng thái:** Đã chấp nhận
- **Liên quan:** spec §14.2 và ADR 015 của repo LEARN (đơn sắc trắng → đen).

## Bối cảnh

App mobile làm lại toàn bộ tính năng người học của web. Chủ sản phẩm yêu cầu giữ giao diện như web
nhưng **tránh tương phản trắng–đen hoàn toàn**. Web đặt chữ `#111` trên nền `#fff` (18.9:1) và nút
chính là khối đen đặc; trên màn hình điện thoại sáng, cặp này gắt, nhất là ở chế độ tối (chữ gần
trắng trên nền gần đen).

## Quyết định

1. Vẫn đơn sắc — chỉ xám trung tính (R = G = B), không hue — đúng spec §14.2 `[SPEC]`. Không đổi
   spec: spec quy định *không có hue*, không quy định mã màu cụ thể.
2. Không dùng cặp gần-trắng/gần-đen ở bất cứ đâu:
   - Sáng: nền `#f1f1f1`, bề mặt `#fafafa`, chữ `#2b2b2b`, nút chính `#3d3d3d` chữ `#f3f3f3`.
   - Tối: nền `#1c1c1c`, bề mặt `#242424`, chữ `#e3e3e3`, nút chính `#cdcdcd` chữ `#262626`.
   - Không khối đặc màu chữ làm nền thẻ (web có thẻ "Học tiếp" nền đen) — thẻ nào cũng là bề mặt
     panel, nhấn mạnh bằng viền và cỡ chữ.
   - Mascot/logo: thân màu nút chính, mặt màu panel (web: đen tuyền/trắng).
3. Tương phản vẫn đạt WCAG (đo bằng công thức WCAG 2.x, ghi trong `src/theme/tokens.ts`):
   chữ phụ nhạt nhất ≥ 4.8:1, chữ chính 12–13.6:1, nút chính ~9.5:1, viền ô nhập ≥ 3:1 trên nền
   bề mặt.
4. Trạng thái giữ luật của ADR 015 web: luôn có icon + chữ; đúng/được chọn = viền liền đậm; sai =
   viền đứt; không dựa vào màu.

## Hệ quả

- Token cùng TÊN vai trò với `theme.css` của web (`app`, `panel`, `fg`, `fgMuted`, `line`…) để đối
  chiếu, chỉ khác giá trị.
- Nếu sau này web muốn dịu theo, chỉ cần chép giá trị — không phải đổi cấu trúc.
