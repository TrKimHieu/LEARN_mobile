# ADR 006 — Dùng mascot động của Blob Studio, tắt typecheck cho file vendor

- **Ngày:** 2026-09-18
- **Trạng thái:** Đã chấp nhận
- **Liên quan:** HANDBOOK §13 (Mascot Circle), AGENTS.md (TypeScript `strict`, cấm `any`)

## Bối cảnh

`CircleMascot/` là bản export đầy đủ từ [Blob Studio](https://www.blobstudio.xyz):
`CircleAvatar.tsx` (component React tự động anim, 2377 dòng), 40 state, 25 biểu cảm,
sprite HTML và `manifest.json`. HANDBOOK §13.1 đã liệt kê đúng bộ file này.

Dù vậy, web app chỉ dùng **4 ảnh SVG tĩnh** trong `apps/web/public/mascot/`
(`sleeping`, `working`, `celebrate`, `alerting`). Toàn bộ phần động và 36 state còn
lại nằm không.

Lý do: `CircleAvatar.tsx` không thoả `noUncheckedIndexedAccess: true` trong
`tsconfig.base.json` — khoảng 34 lỗi `TS2532`/`TS18048`/`TS2339`, tất cả đều do truy
cập mảng theo chỉ số trong phần dựng hình (`path[i]`, `ring[j]`, `samples[k]`).

## Các phương án đã cân nhắc

| Phương án                                 | Vì sao loại / chọn                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Sửa tay 34 lỗi trong file vendor          | Loại. 2377 dòng mã dựng hình không phải của ta; mọi lần export lại từ Blob Studio sẽ xoá sạch công sửa.                        |
| Hạ `noUncheckedIndexedAccess` toàn repo   | Loại. Đánh đổi an toàn kiểu của **toàn bộ** codebase để lấy một file trang trí. Trái tinh thần AGENTS.md.                      |
| Loại file khỏi `include` của tsconfig     | Loại. `exclude` chỉ ảnh hưởng việc dò file gốc; file vẫn bị kéo vào chương trình qua câu lệnh `import`, nên không có tác dụng. |
| Chỉ dùng sprite/SVG tĩnh cho đủ 40 state  | Loại. Giải quyết được vấn đề kiểu và mở rộng được số state, nhưng mất hẳn phần động — đúng thứ khiến Blob Studio có giá trị.   |
| **`@ts-nocheck` phạm vi một file vendor** | **Chọn.** Ảnh hưởng gọn trong một file, sống sót qua lần export sau, giữ nguyên độ chặt của cả repo.                           |

## Quyết định

1. Bản chép dùng trong app đặt tại `apps/web/src/components/mascot/CircleAvatar.tsx`,
   mở đầu bằng header ghi rõ nguồn gốc, lệnh cấm sửa tay và `@ts-nocheck`.
   `CircleMascot/CircleAvatar.tsx` vẫn là bản gốc để đối chiếu.
2. File này được thêm vào `ignores` của `eslint.config.mjs` (cạnh `CircleMascot/**`
   vốn đã được bỏ qua), vì `@typescript-eslint/ban-ts-comment` trong bộ `recommended`
   chặn `@ts-nocheck`.
3. Bù lại phần kiểu đã mất: **mọi chỗ gọi đều đi qua wrapper**
   `apps/web/src/components/mascot.tsx`. Wrapper khai báo union `MascotState` **hẹp
   hơn** 40 state của thư viện — chỉ gồm các state ứng với vị trí mà §13.1 `[SPEC]`
   cho phép. Gõ sai tên state hoặc dùng state ngoài phạm vi sẽ hỏng typecheck.
4. Wrapper nạp component bằng `next/dynamic` với `ssr: false`: file nặng ~115 KB và
   mascot luôn `aria-hidden`, không đáng nằm trong bundle đầu tiên.

## Ràng buộc `[SPEC]` không thay đổi

Quyết định này chỉ đổi **cách vẽ** mascot, không mở rộng **nơi đặt** nó. §13.1 vẫn
giữ nguyên: hero, empty state, tiến độ AI Job, trạng thái lỗi (cộng `celebrate` khi
hoàn thành bài học theo §13.2). Ánh xạ state hiện tại:

| Vị trí (§13.1) | State dùng                                    |
| -------------- | --------------------------------------------- |
| Empty state    | `sleeping` · `idle` · `bored`                 |
| AI Job         | `thinking` (xếp hàng) · `working` (đang chạy) |
| Lỗi            | `alerting` · `sad` · `confused`               |
| Hoàn thành     | `celebrate` · `proud` · `happy`               |

Màn loading chung **vẫn dùng skeleton, không dùng mascot** — nằm ngoài danh sách
§13.1. Muốn đổi điều đó phải sửa spec trước.

## Hệ quả

- Được: mascot tự đổi biểu cảm, chớp mắt và chuyển động theo state; dùng được cả 40
  state thay vì 4; component tự tôn trọng `prefers-reduced-motion`.
- Mất: không có kiểm tra kiểu **bên trong** file vendor. Chấp nhận được vì bề mặt
  công khai của nó nhỏ (`CircleAvatarProps`) và đã được wrapper bọc kín.
- Bảo trì: đổi mascot = mở lại project trong Blob Studio → export `CircleAvatar.tsx`
  → chép đè vào cả hai vị trí → giữ nguyên header. Không sửa tay.
- 4 file trong `apps/web/public/mascot/` không còn được dùng; giữ lại làm ảnh dự
  phòng cho các bối cảnh không chạy React (ví dụ email, ảnh chia sẻ).
