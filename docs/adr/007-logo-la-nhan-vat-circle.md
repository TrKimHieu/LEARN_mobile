# ADR 007 — Logo ứng dụng là nhân vật Circle, dựng bằng SVG tĩnh

- **Ngày:** 2026-09-19
- **Trạng thái:** Đã chấp nhận
- **Liên quan:** HANDBOOK §13 (Mascot Circle), spec §14.2 (bảng màu), [ADR 006](006-mascot-dong-blob-studio.md)

## Bối cảnh

Chủ sản phẩm chốt: **toàn bộ logo ứng dụng là nhân vật Circle.**

Trước quyết định này, logo là chữ "L" đặt trong ô vuông bo góc, và được viết lại bốn lần bằng bốn
đoạn markup riêng biệt:

| Chỗ                              | Markup cũ                                     |
| -------------------------------- | --------------------------------------------- |
| `components/brand.tsx` (sidebar) | `bg-navy-700` + chữ `text-sky-500`            |
| `app/(auth)/layout.tsx`          | như trên, `size-14`                           |
| `components/portfolio/nav.tsx`   | đảo ngược: `bg-sky-500` + chữ `text-navy-900` |
| `app/icon.svg` (favicon)         | `<rect>` + `<text>`                           |

Không có nguồn chung nào, nên sửa logo là phải sửa bốn chỗ và rất dễ sót.

## Quyết định

Một component duy nhất `apps/web/src/components/logo-mark.tsx` phục vụ cả bốn chỗ, vẽ nhân vật
Circle bằng **SVG tĩnh viết tay** (`<circle>` + hai `<ellipse>` mắt + một cung miệng), hai tông
`light`/`dark`.

## Vì sao là SVG tĩnh, không phải component mascot động

`components/mascot.tsx` bọc bản vendor ~115 KB, `ssr: false`, tự chớp mắt và nhún người. Ba lý do
loại nó khỏi vai trò logo:

1. **Favicon không có JavaScript.** `app/icon.svg` là một file tĩnh; không React nào chạy trong đó.
   Muốn logo giống nhau ở mọi nơi thì nó buộc phải biểu diễn được bằng SVG thuần.
2. **Logo phải có ở lần vẽ đầu tiên.** `ssr: false` nghĩa là góc trên bên trái trống cho tới khi
   hydrate xong rồi mới "nhảy" vào — với thứ xuất hiện trên mọi màn, đó là nhảy layout thấy rõ.
3. **Logo phải đứng yên.** Một nhân vật chớp mắt trong sidebar ở _mọi_ màn liên tục kéo mắt khỏi
   nội dung. Đây đúng là điều HANDBOOK §13.1 muốn tránh khi giới hạn chỗ đặt mascot.

Hình trong logo vì thế là bản rút gọn, đối xứng của nhân vật: vẫn hình tròn, vẫn cặp mắt bầu dục và
nụ cười ấy, nhưng bỏ hướng nhìn lệch của một frame cụ thể và đủ dày nét để đọc được ở 16px. Đây là
cách logo linh vật vẫn làm — logo là bản tĩnh, cách điệu của nhân vật, không phải một khung hình
trích từ animation.

## Quan hệ với HANDBOOK §13.1 `[SPEC]`

§13.1 giới hạn **mascot** ở bốn vị trí: hero, empty state, tiến độ AI Job, trạng thái lỗi.

Quyết định này **không mở rộng bốn vị trí đó**. `<Mascot>` (bản động) vẫn chỉ xuất hiện đúng ở đó.
Cái được thêm vào sidebar, màn đăng nhập, nav trang landing và favicon là `<LogoMark>` — một dấu
hiệu thương hiệu tĩnh, cùng nhân vật nhưng khác vai trò và khác cả component.

⚠️ **Cần chủ sản phẩm xác nhận.** Ranh giới "logo ≠ mascot" là cách đọc hợp lý của §13.1, nhưng §13.1
viết ra khi logo còn là chữ "L" nên nó không hề nói gì về trường hợp này. Nếu ý của §13.1 là _hình
ảnh nhân vật_ không được xuất hiện ngoài bốn vị trí kia, thì đây là thay đổi `[SPEC]` và phải sửa
spec trước theo AGENTS.md. Chưa sửa dòng `[SPEC]` nào trong phiên này.

## Hai tông

Nghệ thuật gốc gần như đen nên trên nền navy nó biến mất — cùng lý do khiến hero phải lót đĩa sáng
phía sau mascot (xem ADR 006).

| Tông    | Thân                          | Mặt      | Dùng ở                              |
| ------- | ----------------------------- | -------- | ----------------------------------- |
| `light` | sky-400 → navy-700 → navy-900 | trắng    | sidebar, header mobile              |
| `dark`  | sky-300 → sky-500 → sky-700   | navy-900 | màn đăng nhập, nav landing, favicon |

Gradient chạy từ trên-phải xuống dưới-trái, cùng hướng với gradient của mascot động, nên logo và
mascot trông như được chiếu sáng từ một nguồn.

Favicon dùng tông `dark` (cầu sky sáng) vì thanh tab trình duyệt có thể sáng hoặc tối tuỳ theme hệ
điều hành; khối cầu navy sẽ chìm trên tab tối.

## Hệ quả

- Sửa logo từ nay chỉ đụng một file — trừ `app/icon.svg`, vốn là SVG tĩnh nên **phải đồng bộ tay**.
  Ghi chú nhắc việc này nằm ngay đầu file đó.
- Bảng mẫu `/dev/ui` có mục "Logo" hiện cả hai tông ở 5 cỡ (16–64px) để bắt lỗi mất nét ở cỡ nhỏ.
- Chữ "L" không còn là dấu hiệu thương hiệu. Các chỗ khác còn dùng ô vuông navy + chữ sky
  (`portfolio/core-features.tsx`, `portfolio/problem.tsx`) là **số thứ tự trong danh sách**, không
  phải logo — giữ nguyên.
