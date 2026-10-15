# ADR 018 — Lam học thuật: nền sóng lam hạt nhiễu, chữ navy, tiêu đề serif

- **Ngày:** 2026-10-12
- **Trạng thái:** Đã chấp nhận
- **Đổi `[SPEC]`:** spec §14 "Suggested Visual Language", HANDBOOK §14.2 và §13.4 — sửa spec
  **trước** khi sửa code, đúng quy trình AGENTS.md.
- **Thay thế:** ADR 015 (đơn sắc trắng → đen). Thay một phần ADR 014: bỏ luật "không serif" và
  "không gradient/blur" cho **lớp nền trang trí**; các luật chống dấu hiệu AI khác của ADR 014 giữ.

## Bối cảnh

Chủ sản phẩm gửi một ảnh tham chiếu (slide seminar "Giới thiệu công cụ Quant-UX", UIT) và yêu cầu
"redesign lại website với phong cách đồ hoạ này". Đây là yêu cầu trực tiếp đổi nhận diện, cùng loại
với ADR 015, nên spec được sửa theo.

## Phân tích ảnh tham chiếu (nguồn sự thật thị giác)

| Thành phần  | Quan sát                                                                                   | Chuyển thành                                  |
| ----------- | ------------------------------------------------------------------------------------------ | --------------------------------------------- |
| Nền         | Gần trắng, lạnh. 2–3 dải sóng lớn chéo, lam nhạt (periwinkle) đậm dần về coban ở góc dưới  | `<GrainWaves>` SVG tĩnh, `--wave-*` theo tông |
| Kết cấu     | Hạt nhiễu rõ trên mảng lam, gần như không thấy trên mảng trắng                             | `feTurbulence` phủ `mix-blend-mode: overlay`  |
| Chữ tiêu đề | Serif tương phản cao, đậm, navy rất sâu (~`#0E1745`); dòng dẫn cùng họ nhưng nghiêng, mảnh | Playfair Display: 600–700 đứng · 400 nghiêng  |
| Nhãn nhỏ    | Sans viết hoa giãn chữ rộng, lam coban, có một gạch ngang mảnh đứng trước                  | `<Eyebrow>` — chỉ ở tiêu đề trang/hero        |
| Hoạ tiết    | Sao bốn cánh lam (lớn, nhỏ), quỹ đạo elip nét mảnh có "hành tinh" chấm, lưới chấm góc phải | `<Sparkle>`, `<Orbit>`, `<DotField>`          |
| Phân cấp    | Ít chữ, rất nhiều khoảng trắng, một tâm điểm (tiêu đề lớn ở góc dưới trái)                 | Màn đăng nhập: tiêu đề ở đáy trái cột phải    |
| Logo        | Logo, gạch dọc mảnh, hai dòng chữ đơn vị                                                   | Thanh đầu: logo · gạch dọc · tên              |

## Quyết định

1. **Bảng màu** — thang `lam-50…950` (navy → periwinkle), cộng ba sắc phản hồi trầm
   `ok` (xanh lá), `bad` (đỏ), `warn` (hổ phách). `--color-*: initial` **giữ**: lớp hue mặc định
   của Tailwind vẫn không tồn tại, chỉ những màu khai báo trong `theme.css` mới build ra.
   Token ngữ nghĩa giữ tên (`fg`, `accent`, `pastel-*`…), đổi giá trị. Tương phản đo lại và ghi
   trong `theme.css`: chữ ≥ 5.38:1 trên mọi nền, viền ô nhập ≥ 3.11:1, cả hai tông.
2. **Chữ** — Playfair Display (Fontsource, có subset tiếng Việt, tự host như ADR 014) cho `h1`
   trang, tiêu đề hero, tiêu đề bài đọc (`.lesson-content h1/h2`). Giao diện, số liệu, thân bài
   vẫn Hanken Grotesk; code vẫn JetBrains Mono. Serif chỉ dùng ở cỡ ≥ 24px — ở cỡ nhỏ nét mảnh
   của Playfair vỡ trên màn hình mật độ thấp.
3. **Sóng hạt nhiễu là lớp nền, không phải bề mặt thẻ.** Mức `hero` ở màn đăng nhập/đăng ký/404,
   mức `ambient` (mờ dần trước 520px) ở đầu mọi trang trong app. Thẻ, form, bảng vẫn nền `panel`
   đặc để chữ luôn đọc trên nền phẳng — không glassmorphism.
4. **Hoạ tiết** (sao, quỹ đạo, lưới chấm) chỉ ở nền hero/ambient và quanh mascot của empty state.
   Không đặt trong thẻ dữ liệu, không trong bảng quản trị.
5. **Mascot + logo** — thân navy mặt trắng ở tông sáng; thân lam nhạt `lam-200` mặt navy ở tông
   tối. Logo vẫn đổi theo tông bằng CSS (`fill-fg` / `fill-app`), favicon thân navy.
6. **Trạng thái** — giữ toàn bộ tín hiệu phi màu của ADR 015 (icon + chữ, viền đứt cho lựa chọn
   sai, nhãn lỗi đảo màu); màu xanh lá/đỏ/hổ phách là lớp tín hiệu **thứ hai**, không phải duy nhất.

## Hệ quả

- `packages/ui` (bản sao màu cho TS) đổi theo `theme.css`.
- Ảnh portfolio trong `docs/screenshots/` cần chụp lại sau khi duyệt bằng mắt.
- App mobile `LEARN_mobile` vẫn "soft monochrome" — **chưa** đồng bộ; ghi vào `docs/PARITY.md`.
- Chi phí vẽ: `GrainWaves` là SVG tĩnh (blur + turbulence vẽ một lần, không animation), nằm
  `position: absolute` sau nội dung, `pointer-events: none`, `aria-hidden`.

## Bổ sung 2026-10-12 — chuyển động nhẹ bằng CSS

Theo yêu cầu "thêm chuyển động nhẹ cho trang web bằng CSS": sóng trôi chậm (hai lớp lệch nhịp), sao
lấp lánh so le, chấm quỹ đạo chảy + vòng toả, chữ hero và thẻ form nhích lên một lần khi mở trang,
mũi tên trong nút nhích khi hover. Chỉ CSS (không `motion`, không Remotion — Remotion xuất video,
không làm chuyển động cho giao diện chạy thật). Tắt hẳn khi bật giảm chuyển động. Sóng và hạt chuyển
từ `<svg>` nội tuyến sang ảnh `data:` vì đo được bản nội tuyến tụt ~10 fps khi vẽ bằng CPU (chi tiết
UI-GUIDE §4 "Chuyển động nền").

## Bổ sung 2026-10-13 — nền hạt chủ đạo, vệt sáng, parallax

Chủ sản phẩm hỏi nền còn nâng cấp được không. Ba điểm yếu đọc từ ảnh chụp: tông sáng thành mảng "bột"
mờ vì một lần blur 46–60px xoá dáng sóng; không có chiều sâu; hạt nhiễu gần như không thấy ở tông sáng.
Đã chọn:

1. **Hạt là chất liệu chính, blur là lớp đệm** (chủ sản phẩm chỉnh giữa phiên: "kiểu noise hơn là blur").
   Mỗi dải vẽ hai lần: quầng mờ nhạt (opacity 0.35) + bản _dissolve_ — SVG filter blur → nhiễu fractal
   → ngưỡng alpha, nên mép sóng vỡ thành hạt, gần thân dày, ra xa thưa. Thêm một nếp tối dưới đỉnh dải lớn.
2. **Lớp vệt sáng** mảnh chạy dọc đỉnh sóng, mờ dần hai đầu; điểm sáng nhất đặt ở khoảng trống giữa form
   và tiêu đề, không sau chữ.
3. **Parallax theo chuột** — **chỉ ở hero**; trong app nền đứng yên để không xao nhãng. Dải sóng dời
   **ngược** chuột (6/12px — chiều sâu, nền không trôi về phía form đang bấm); vệt sáng dời **cùng** chuột
   (14px — con trỏ là nguồn sáng, ánh phản chiếu trượt về phía nó).
   JS chỉ ghi biến CSS, dời bằng `transform`; tắt khi không có chuột thật hoặc giảm chuyển động.
4. **Hạt** kéo giãn tương phản bằng `feComponentTransfer` thay vì tăng opacity (tăng opacity làm trắng
   ngả xám).

Bác bỏ **shader WebGL** (gradient chuyển động kiểu Stripe): đẹp nhất về chuyển động, nhưng máy không GPU
vẽ shader bằng CPU — đúng nhóm máy đã đo tụt còn ~10 fps ở bản `<svg>` nội tuyến. Hạt dissolve nướng
sẵn trong ảnh nên chỉ tốn lúc rasterize (đổi tông ~38ms, CPU, DPR 2). Đo lại sau thay đổi: CPU 31 fps
nghỉ / 25 khi rê chuột, GPU 61 / 60. Màu vẫn đồng bộ tay (`WAVE_PALETTE` ở `grain-waves.tsx`);
sinh ảnh từ token lúc build là việc tách riêng, chưa làm.

## Bổ sung 2026-10-13 (2) — nền toàn site, mỗi màn một cảnh

Chủ sản phẩm: "mang style đó lên cả website, không được trùng hình dạng nền giữa các màn hình".

1. **Cảnh sinh từ tham số** (`components/shared/wave-scenes.ts`): độ cao/nghiêng/biên độ/tần số/pha
   của từng dải, vị trí mảng coban, lật gương. Mỗi màn (21: 4 auth, 8 học viên, 7 admin, 404, lỗi)
   có một chỉ số cố định; tham số lấy từ dãy Weyl nên không hai chỉ số nào cho cùng hình. Chốt bằng
   test: mọi `page.tsx` phải có cảnh, khoảng cách tham số nhỏ nhất giữa hai cảnh > 0.45 (đo: 0.65).
   Bác bỏ vẽ tay 21 cảnh (không giữ được khi thêm màn) và ngẫu nhiên theo phiên (cùng một màn đổi
   hình mỗi lần mở — mất cảm giác "chỗ quen").
2. **Trong app nền phủ cả khung nhìn nhưng chừa cột nội dung** (mặt nạ ngang + dải trên). Đo tương
   phản: `fg-subtle`/`accent` trên coban < 4.5:1 ngay cả khi giảm sóng còn 50%; nền `fixed` thì chữ
   cuộn qua mọi vùng — nên chữ phải luôn đứng trên màu `app`. Trên điện thoại lề ≈ 0, chỉ còn dải trên.
3. **Nền app đứng yên.** Đo CPU khi cuộn: trôi 13 fps, đứng yên 59 fps. Trôi + parallax chỉ còn ở hero.
4. **Đổi màn: hoà cảnh 650ms** (cảnh cũ mờ đi, cảnh mới hiện), tắt khi giảm chuyển động.
5. Biến thể `ambient` (dải 520px đầu trang) bị thay bằng `app`.

Kiểm (2026-10-14): axe 21 màn 0 vi phạm — **nhưng axe bỏ qua chữ trên ảnh nền** (`bgOverlap`).
Đo bằng điểm ảnh nền thật (`scripts/audit-contrast.mjs`, mới) tìm ra 9 chỗ dưới chuẩn, đã sửa:
dải trên của `app` rút về sau header (tab con admin, breadcrumb 3.3–3.9:1); số bước và nhãn hero
đổi `accent` → `fg` (2.7:1); vệt sáng tông tối dịu lại `#93a8ee`, quầng 0.25 (nhãn hero tối 3.6:1
khi vệt sáng chạy sau chữ). Sau sửa: 0 đoạn chữ dưới chuẩn trên 20 màn × 2 tông.
