# UX-UI-PRINCIPLES.md — Tổng hợp nguyên tắc thiết kế UX/UI chuyên nghiệp

> Tài liệu **kiến thức nền**, không phải tài liệu vận hành. Nó trả lời "vì sao làm thế",
> còn `docs/UI-GUIDE.md` trả lời "trong repo này bấm cái gì, sửa file nào".
> Thứ tự đọc: `AGENTS.md` → `docs/UI-GUIDE.md` (thao tác) → file này (lý lẽ), khi cần quyết định
> một thứ chưa có tiền lệ.
>
> Quy ước: mục nào đã **thành ràng buộc trong LEARN** có nhãn `→ LEARN` trỏ tới chỗ nó sống trong
> repo. Mục không có nhãn là nguyên tắc chung — áp dụng bằng phán đoán, không phải luật.

---

## Mục lục

| #   | Phần                    | Trả lời câu hỏi                               |
| --- | ----------------------- | --------------------------------------------- |
| 1   | Nền móng nhận thức      | Não người xử lý giao diện thế nào             |
| 2   | Heuristic kinh điển     | Danh sách kiểm đã được kiểm chứng 30 năm      |
| 3   | Bố cục và khoảng trắng  | Sắp xếp pixel ra sao                          |
| 4   | Chữ                     | Cỡ, dòng, độ dài, thứ bậc                     |
| 5   | Màu                     | Chọn và dùng màu có kỷ luật                   |
| 6   | Design system           | Biến quyết định thành hệ thống tái dùng       |
| 7   | Trạng thái và tương tác | Mọi thứ có thể xảy ra trên một màn            |
| 8   | Form                    | Phần dễ hỏng nhất của mọi sản phẩm            |
| 9   | Chuyển động             | Khi nào animation là thông tin                |
| 10  | Khả năng tiếp cận       | WCAG 2.2 AA, cụ thể và kiểm được              |
| 11  | Đáp ứng đa thiết bị     | Một thiết kế, nhiều màn hình                  |
| 12  | Kiến trúc thông tin     | Người dùng biết mình đang ở đâu               |
| 13  | Ngôn từ                 | Chữ trên nút cũng là thiết kế                 |
| 14  | Hiệu năng               | Ngưỡng thời gian con người cảm được           |
| 15  | Hiển thị dữ liệu        | Bảng và biểu đồ nhiều dữ liệu mà vẫn đọc được |
| 16  | Đạo đức                 | Ranh giới thuyết phục / thao túng             |
| 17  | Quy trình               | Từ vấn đề tới bản giao cho dev                |
| 18  | Đo lường                | Chứng minh thiết kế có tác dụng               |
| 19  | Checklist gộp           | Dùng ngay trước khi đóng một màn              |

---

## 1. Nền móng: con người đọc giao diện ra sao

Tầng sâu nhất. Mọi luật ở các phần sau đều truy ngược về được một điều ở đây.

### 1.1 Định luật và hiệu ứng có tên

| Tên                          | Nội dung                                                     | Hệ quả khi thiết kế                                                                    |
| ---------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| **Hick's Law**               | Thời gian quyết định tăng theo log của số lựa chọn           | Cắt bớt lựa chọn, nhóm lại, ẩn cái hiếm dùng sau "Xem thêm"                            |
| **Fitts's Law**              | Thời gian trỏ tới đích ∝ khoảng cách / kích thước đích       | Nút chính to và gần tay; đích nhỏ là lỗi thiết kế, không phải lỗi người dùng           |
| **Miller / chunking**        | Bộ nhớ làm việc giữ được ~4±1 khối                           | Chia số điện thoại, mã OTP, danh sách dài thành khối                                   |
| **Jakob's Law**              | Người dùng dành phần lớn thời gian ở sản phẩm **khác**       | Theo quy ước chung; sáng tạo ở nội dung, không ở vị trí nút đóng                       |
| **Tesler's Law**             | Mỗi hệ thống có lượng phức tạp không xoá được, chỉ chuyển đi | Chuyển phức tạp về phía hệ thống (đoán, điền sẵn), đừng đẩy sang người dùng            |
| **Doherty threshold**        | Dưới ~400ms thì người dùng giữ được dòng suy nghĩ            | Phản hồi tức thì kể cả khi việc thật chưa xong (skeleton, optimistic UI)               |
| **Aesthetic–usability**      | Cái đẹp được cảm nhận là dễ dùng hơn và được tha thứ lỗi hơn | Trau chuốt thị giác là việc thật — nhưng nó **che** lỗi khi đi test, đừng tin cảm tính |
| **Von Restorff (isolation)** | Cái khác biệt được nhớ                                       | Chỉ **một** thứ nổi bật mỗi màn; nhiều nút nổi bật = không nút nào nổi bật             |
| **Serial position**          | Nhớ đầu và cuối danh sách rõ nhất                            | Đặt mục quan trọng ở đầu hoặc cuối menu                                                |
| **Zeigarnik**                | Việc dở dang bám trí nhớ dai hơn việc đã xong                | Thanh tiến độ, "còn 2 bước" kéo người ta quay lại                                      |
| **Goal-gradient**            | Càng gần đích càng tăng tốc                                  | Luôn cho thấy tiến độ; khởi động sẵn vài phần trăm đầu                                 |
| **Peak–end rule**            | Ký ức ≈ đỉnh cảm xúc + đoạn kết, không phải trung bình       | Đầu tư vào khoảnh khắc đỉnh và đoạn kết, đừng dàn đều                                  |
| **Postel's Law**             | Nhận vào khoan dung, xuất ra nghiêm ngặt                     | Chấp nhận "0912 345 678" lẫn "0912345678"; đừng bắt người dùng làm parser              |
| **Occam's razor**            | Bỏ được thì bỏ                                               | Mỗi phần tử phải tự biện minh; mặc định là **không thêm**                              |

`→ LEARN`: Peak–end và Zeigarnik là lý do `celebrate` chỉ nổ đúng lúc hoàn thành bài
(HANDBOOK §13.2) và dải chỉ số ở `AppShell` chỉ hiện số có thật — `UI-GUIDE` §1.

### 1.2 Gestalt — não gom nhóm trước khi kịp đọc

- **Gần nhau (proximity)** — đặt gần nhau ⇒ được hiểu là liên quan. Công cụ mạnh nhất và rẻ nhất:
  khoảng cách nói lên quan hệ **trước cả** đường kẻ hay khung viền.
- **Giống nhau (similarity)** — cùng hình/màu/cỡ ⇒ cùng loại. Hệ quả ngược: khác chức năng thì
  **phải** khác hình.
- **Bao đóng (closure)** — mắt tự lấp khoảng trống; không cần vẽ đủ bốn cạnh của một thẻ.
- **Liên tục (continuity)** — mắt đi theo đường thẳng; đây là nền tảng của việc căn lề.
- **Nền–hình (figure/ground)** — luôn phải rõ đâu là lớp trên: modal cần lớp phủ, thẻ cần bóng.
- **Vùng chung (common region)** — một khung bao mạnh hơn cả proximity, dùng khi buộc phải đặt các
  nhóm sát nhau.

**Luật rút ra:** muốn nhóm hai thứ, **giảm khoảng cách trước, thêm đường kẻ sau**. Giao diện đầy
đường kẻ thường là giao diện sai khoảng cách.

### 1.3 Mô hình của Norman

- **Affordance**: vật thể cho phép hành động gì.
- **Signifier**: dấu hiệu cho biết affordance ở đâu (gạch chân của link, con trỏ tay).
- **Mapping**: điều khiển và kết quả phải khớp tự nhiên (nút "lên" nằm ở trên).
- **Feedback**: mọi hành động phải có phản hồi **dưới 100ms**, dù chỉ là đổi màu.
- **Constraint**: chặn sai lầm bằng hình dạng (không cho nhập chữ vào ô số).
- **Conceptual model**: mô hình người dùng tự dựng trong đầu. Giao diện tốt là giao diện mà mô
  hình ấy **đoán đúng**.

Hai khoảng cách phải lấp:

- **Gulf of execution** — "tôi muốn làm X, phải bấm gì?" → lấp bằng signifier và nhãn rõ.
- **Gulf of evaluation** — "tôi vừa bấm, chuyện gì xảy ra?" → lấp bằng phản hồi và trạng thái.

### 1.4 Ba loại lỗi con người

| Loại        | Bản chất             | Thiết kế chống lại bằng                                  |
| ----------- | -------------------- | -------------------------------------------------------- |
| **Slip**    | Định đúng, làm trượt | Vùng bấm đủ lớn, tách nút nguy hiểm, **Undo**            |
| **Lapse**   | Quên mất bước        | Hiện tiến độ, lưu nháp, nhắc lại ngữ cảnh                |
| **Mistake** | Hiểu sai mô hình     | Nhãn rõ, xem trước kết quả, onboarding, mặc định an toàn |

**Ưu tiên Undo hơn Confirm.** Hộp thoại "Bạn có chắc không?" bị bấm Yes theo quán tính từ lần thứ
ba trở đi. Chỉ confirm khi hành động thật sự không hoàn tác được — và khi đó bắt gõ tên đối tượng
thay vì bấm một nút.

---

## 2. Heuristic và nguyên lý kinh điển

### 2.1 Mười heuristic của Nielsen — bản kiểm được

| #   | Heuristic                    | Câu hỏi kiểm cụ thể                                                        |
| --- | ---------------------------- | -------------------------------------------------------------------------- |
| 1   | Hiện trạng thái hệ thống     | Nhìn màn này có biết đang ở đâu, việc gì đang chạy, còn bao lâu không?     |
| 2   | Khớp với thế giới thật       | Có chữ nào là từ vựng lập trình viên (`ACTIVE`, `null`, `HTTP 422`) không? |
| 3   | Quyền kiểm soát và lối thoát | Có đường thoát / hoàn tác / quay lại ở mọi bước không?                     |
| 4   | Nhất quán và theo chuẩn      | Cùng một khái niệm có bị gọi bằng hai tên ở hai màn không?                 |
| 5   | Chặn lỗi từ gốc              | Có thể làm cho lỗi này **không xảy ra được** thay vì đi báo lỗi không?     |
| 6   | Nhận ra thay vì nhớ lại      | Người dùng có phải nhớ thứ ở màn trước không?                              |
| 7   | Linh hoạt và hiệu quả        | Người thạo có đường tắt không, mà không cản người mới?                     |
| 8   | Tối giản                     | Bỏ phần tử này đi thì mất gì?                                              |
| 9   | Nhận ra và khắc phục lỗi     | Thông báo lỗi có nói **sai gì** và **làm gì tiếp** không?                  |
| 10  | Trợ giúp và tài liệu         | Trợ giúp có nằm đúng chỗ đang cần, hay bắt mở trang khác?                  |

### 2.2 Tám quy tắc vàng của Shneiderman (phần không trùng)

Nhất quán · đường tắt cho người dùng thường xuyên · phản hồi có thông tin · **đối thoại có đoạn
kết rõ ràng** (xong việc phải có màn "xong") · chặn lỗi · cho phép đảo ngược · người dùng là
người điều khiển · giảm tải bộ nhớ ngắn hạn.

### 2.3 Bảy câu hỏi soát nhanh một màn bất kỳ

1. Màn này cho **ai**, ở **bước nào** của hành trình?
2. **Một** hành động chính là gì, và nó có nổi bật nhất không?
3. Thứ quan trọng nhất có nằm trên nếp gấp không?
4. Dữ liệu **rỗng / lỗi / chậm / một phần** thì màn trông thế nào?
5. Đi bằng **bàn phím** có tới được mọi thứ không? Focus có nhìn thấy không?
6. Ở **390px** có vỡ không?
7. Người dùng lần đầu có hiểu không, và người dùng lần thứ 50 có thấy phiền không?

`→ LEARN`: bảng "Luật UX đã áp dụng" ở `UI-GUIDE` §10 là phần heuristic **đã** thành ràng buộc code
— đừng vô tình đảo ngược.

---

## 3. Bố cục và khoảng trắng

### 3.1 Thứ bậc thị giác

Mắt xếp hạng theo thứ tự mạnh dần: **vị trí → kích thước → độ đậm → tương phản màu → hình dạng lạ**.
Muốn nâng một phần tử thì dùng công cụ mạnh nhất còn rảnh, đừng dùng cả năm cùng lúc.

- Mỗi màn có **một** phần tử hạng nhất. Hai thứ cùng hạng nhất nghĩa là không có hạng nhất.
- Kiểu quét mắt: **F-pattern** cho nội dung dày chữ, **Z-pattern** cho trang thưa như landing.
- Kiểm bằng cách nheo mắt hoặc làm mờ ảnh chụp màn: còn đọc ra thứ tự ưu tiên là đạt.

### 3.2 Lưới và căn lề

- Chọn **một** lưới (thường 12 cột) rồi bám theo.
- Một **trục căn lề trái** xuyên suốt mạnh hơn mọi hiệu ứng trang trí. Căn giữa chỉ dùng cho khối
  ngắn (tiêu đề hero, empty state), không dùng cho đoạn văn.
- Số đo thật của layout hiện tại quan trọng hơn lý thuyết — đo rồi thì ghi lại, đừng đoán lại.

`→ LEARN`: số đo đã đo sẵn ở `UI-GUIDE` §8 — sidebar 256px · cột giữa ~736px · rail 320px. Lưới
thẻ chỉ trải 3–4 cột từ `2xl` chính vì cột giữa hẹp.

### 3.3 Thang khoảng cách

- Dùng **một thang** 4/8px: 4, 8, 12, 16, 24, 32, 48, 64. Không có `margin: 13px`.
- **Khoảng cách trong nhóm luôn nhỏ hơn khoảng cách giữa các nhóm.** Đây là luật hay bị vi phạm
  nhất và là nguyên nhân số một của cảm giác "trông lộn xộn".
- Padding trong thẻ nhỏ hơn khoảng cách giữa các thẻ.
- Khoảng trắng không phải chỗ chưa dùng tới; nó là thứ tạo ra nhóm.

### 3.4 Chỉnh quang học

Toán đúng không có nghĩa là mắt thấy đúng:

- Hình tròn và tam giác phải **tràn** khỏi khung một chút mới trông bằng hình vuông.
- Icon play/mũi tên trong nút tròn cần lệch phải ~1px để trông ở giữa.
- Bo góc lồng nhau: `bán kính ngoài = bán kính trong + padding`.
- Chữ rất to cần giảm `letter-spacing`; chữ rất nhỏ hoặc chữ hoa cần tăng.

### 3.5 Độ nổi (elevation)

Bóng đổ là **thông tin về lớp**, không phải trang trí. Ba bậc là đủ:

| Bậc | Dùng cho                   | Ý nghĩa                   |
| --- | -------------------------- | ------------------------- |
| 0   | Nền, khối phẳng            | Cùng mặt phẳng nội dung   |
| 1   | Thẻ, khối gom nhóm         | Tách khỏi nền             |
| 2   | Dropdown, popover, thẻ kéo | Nổi tạm thời, sẽ biến mất |
| 3   | Modal, drawer              | Chiếm quyền, cần lớp phủ  |

Toàn app dùng chung **một hướng nguồn sáng** (thường từ trên xuống, không lệch ngang).

`→ LEARN`: chỉ có `--shadow-card` và `--shadow-raised`. Cần bậc mới thì thêm token, đừng viết
`shadow-[...]` tại chỗ gọi.

---

## 4. Chữ (typography)

### 4.1 Số đo an toàn

| Thuộc tính     | Giá trị nên dùng                                 | Vì sao                                        |
| -------------- | ------------------------------------------------ | --------------------------------------------- |
| Cỡ chữ thân    | 16px trở lên (web)                               | Dưới 16px, iOS tự zoom khi focus vào input    |
| Chú thích      | ≥ 12px, và không dùng cho thông tin bắt buộc đọc | Người trên 40 tuổi đọc rất chậm               |
| Độ dài dòng    | 45–75 ký tự (`max-w-prose`, ~65ch)               | Dài hơn thì mắt lạc dòng khi xuống dòng       |
| `line-height`  | 1.5–1.6 cho đoạn văn; 1.1–1.25 cho tiêu đề lớn   | Chữ càng to càng cần line-height nhỏ          |
| Số bậc cỡ chữ  | 5–7 bậc cho cả app                               | Nhiều hơn thì không ai phân biệt được         |
| Số font-family | 1–2                                              | Bậc đậm nhạt giải quyết được phần lớn nhu cầu |
| Số bậc đậm     | 2–3 (400/600/700)                                | Trộn nhiều weight làm hệ thống trôi           |

Thang cỡ chữ nên theo tỉ lệ (1.2 hoặc 1.25): 12 · 14 · 16 · 20 · 24 · 30 · 36 · 48.

### 4.2 Luật dùng chữ

- **Thứ bậc bằng cỡ + đậm + màu**, không bằng cách viết HOA TOÀN BỘ. Chữ hoa toàn bộ mất hình dáng
  từ nên đọc chậm hơn ~10%; chỉ dùng cho nhãn rất ngắn.
- **Không căn đều hai bên (justify)** trên web: không có ngắt từ tử tế nên sinh "sông" trắng.
- Không in nghiêng cả đoạn dài; nghiêng dùng để nhấn một cụm.
- Số trong bảng dùng `font-variant-numeric: tabular-nums` để các cột số thẳng hàng.
- Chữ trên ảnh phải có lớp phủ hoặc khối nền — không bao giờ tin vào độ sáng của ảnh.
- Tiếng Việt: kiểm dấu ở cỡ nhỏ và ở `line-height` chặt — dấu mũ dễ bị cắt hoặc chạm dòng trên.
- Ngắt dòng của tiêu đề nên chủ động (`text-balance` / `&nbsp;`) để tránh một từ rơi xuống dòng cuối.

---

## 5. Màu

### 5.1 Cấu trúc một bảng màu

1. **Màu nền tảng** (neutral): 8–10 bậc xám/navy. Đây là màu chiếm 90% diện tích.
2. **Màu thương hiệu**: 1 màu chính, 5–7 bậc. Bậc nào dùng cho nền, bậc nào cho chữ phải ghi rõ.
3. **Màu ngữ nghĩa**: success / warning / danger / info, mỗi màu 2–3 bậc (nền nhạt, viền, chữ đậm).
4. Tỉ lệ diện tích **60 / 30 / 10** — nền / màu phụ / màu nhấn. Màu nhấn dùng càng ít càng mạnh.

### 5.2 Luật dùng màu

- **Màu không bao giờ là tín hiệu duy nhất.** Mọi trạng thái đúng/sai/cảnh báo phải kèm icon hoặc
  nhãn chữ. (WCAG 1.4.1, và ~8% nam giới mù màu đỏ–lục.)
- **Chữ phải đạt tương phản ≥ 4.5:1** (≥ 3:1 nếu ≥ 24px hoặc ≥ 19px in đậm). Kiểm bằng máy, không
  bằng mắt.
- **Thành phần giao diện và đồ hoạ mang nghĩa** (viền input, icon truyền tin, ranh giới biểu đồ)
  cần ≥ 3:1 với nền kề (WCAG 1.4.11).
- Không dùng màu thương hiệu cho trạng thái lỗi, và ngược lại.
- Dark mode **không phải là đảo màu**: giảm độ bão hoà, dùng nền `#121212`-ish thay vì đen tuyền,
  nâng bề mặt bằng độ sáng thay vì bóng đổ.
- Một bậc màu chỉ nên có **một** vai trò. "Bậc này dùng cho chữ, bậc kia cho nền" phải viết ra giấy,
  nếu không nửa năm sau sẽ có hai người dùng hai kiểu.

`→ LEARN`: bảng bậc-nào-cho-chữ nằm ở cuối `UI-GUIDE` §10 và **đã được đo**: `sky-700` là bậc sky
duy nhất dùng cho chữ; `ink-300` không bao giờ là chữ trên nền sáng; `ink-500` trượt AA trên nền có
pha màu (dùng `ink-700`); không có biến thể chữ trắng trên `sky-500`. Bảng màu là
`[SPEC]` §14.2 — navy/xám/sky `#5EC8F5`, **không có tím**.

> **Đã sửa số đo ngày 2026-09-19.** `UI-GUIDE` §2/§10, `theme.css` và `docs/progress/STATE.md`
> từng ghi chữ trắng trên `sky-500` đạt 2.67:1 và chữ `navy-900` trên `sky-500` đạt 6.7:1. Tính lại
> bằng công thức WCAG 2.x trên đúng hai hex đó ra **1.90:1** và **9.86:1**; cả bốn chỗ đã được sửa.
> Kết luận không đổi — trắng vẫn trượt, navy vẫn đạt, chỉ là cách biệt lớn hơn con số cũ mô tả.
> Các cặp còn lại kiểm lại đều khớp: `sky-700`/trắng 5.61 · `ink-300`/trắng 2.56 ·
> `warning-700`/`warning-50` 5.88 · trắng/`success-700` 5.33.

---

## 6. Design system: token và component

### 6.1 Ba tầng token

| Tầng          | Ví dụ                              | Ai được dùng trực tiếp            |
| ------------- | ---------------------------------- | --------------------------------- |
| **Primitive** | `sky-500`, `space-4`, `text-lg`    | Chỉ tầng semantic                 |
| **Semantic**  | `color-danger-text`, `radius-card` | Component và call site            |
| **Component** | `button-primary-bg`                | Chỉ component đó, khi thật sự cần |

Giá trị viết thẳng (`#3A7`, `13px`) trong component là **nợ kỹ thuật**: nó không đổi được theo
theme, không kiểm được bằng máy, và không ai tìm ra khi cần sửa.

### 6.2 Atomic design (cách chia component)

**Atom** (Button, Input, Icon) → **Molecule** (ô tìm kiếm = input + nút) → **Organism** (header,
bảng có bộ lọc) → **Template** (bố cục) → **Page** (dữ liệu thật). Giá trị thực dụng của mô hình
này là buộc phải hỏi: "cái tôi sắp viết có phải đã tồn tại ở tầng dưới không?"

### 6.3 Luật thiết kế API của component

- **Một component, một trách nhiệm.** Prop thứ bảy kiểu `variant` là dấu hiệu nên tách.
- **Prop mô tả ý định, không mô tả hình dạng**: `variant="danger"` chứ không `color="red"`.
- **`className` truyền từ ngoài phải ghi đè được** mặc định — nếu không, người dùng component sẽ
  đi đường vòng bằng `!important` hoặc bọc thêm một `div`.
- Component phải xử lý sẵn: trạng thái loading, disabled, focus-visible, và nội dung dài bất thường.
- **Trang mẫu (workbench)** hiện mọi primitive ở mọi trạng thái là hạ tầng bắt buộc, không phải đồ
  chơi: không có nó thì không ai soát được hồi quy thị giác.

`→ LEARN`: nguồn token duy nhất là `packages/config/tailwind/theme.css`; trang mẫu là `/dev/ui`;
`cn()` = `clsx` + `tailwind-merge` nên `className` ngoài **ghi đè được**. Token mới phải kèm một ô
trên `/dev/ui`, nếu không nó thành token mồ côi. Xem `UI-GUIDE` §2, §6.

### 6.4 Nhất quán quan trọng hơn hoàn hảo

Hai cách làm đúng vừa phải nhưng giống nhau tốt hơn một cách hoàn hảo cộng một cách lệch. Khi thêm
thư viện component bên ngoài (shadcn/Radix), **phải quy ước lại màu và bán kính theo token của
mình trước khi dùng**, nếu không app sẽ có hai ngôn ngữ thị giác. `→ LEARN`: `UI-GUIDE` §3.

---

## 7. Trạng thái và tương tác

### 7.1 Năm trạng thái của mọi màn có dữ liệu

| Trạng thái  | Phải có gì                                                                |
| ----------- | ------------------------------------------------------------------------- |
| **Loading** | Skeleton đúng hình dáng nội dung thật (không phải spinner giữa màn trống) |
| **Empty**   | Giải thích vì sao trống + **một** hành động để thoát khỏi trạng thái đó   |
| **Error**   | Chuyện gì xảy ra + làm gì tiếp + nút thử lại; không đổ mã lỗi thô ra      |
| **Partial** | Hiện phần có, đánh dấu rõ phần thiếu, đừng chặn cả màn vì một widget hỏng |
| **Success** | Trạng thái đầy đủ, dữ liệu thật                                           |

Bổ sung hai trạng thái hay quên: **quá nhiều dữ liệu** (1.000 dòng, tên dài 200 ký tự) và **không
có quyền** (khác với rỗng: phải nói rõ là do quyền).

`→ LEARN`: đủ 5 trạng thái là ràng buộc trong `AGENTS.md`, có mặt trong checklist `UI-GUIDE` §9.

### 7.2 Trạng thái của một phần tử tương tác

Mỗi control phải định nghĩa trước: `default` · `hover` · `focus-visible` · `active` · `disabled` ·
`loading` · `error` · `selected/checked` · `read-only`.

- **`focus-visible` không bao giờ được xoá.** `outline: none` mà không thay bằng gì là lỗi a11y
  nghiêm trọng. Vòng focus cần ≥ 3:1 với nền và dày ≥ 2px.
- **Disabled là lựa chọn kém.** Nút xám không nói được _vì sao_ nó xám. Ưu tiên: để bấm được, rồi
  chỉ thẳng vào chỗ còn thiếu. Nếu buộc phải disable, kèm lời giải thích cạnh nút.
- Trạng thái `hover` không tồn tại trên thiết bị cảm ứng — không giấu thông tin sau hover.
- `loading` phải khoá thao tác lặp (chống double-submit) nhưng **không** làm nhảy bố cục: đặt
  spinner trong nút, giữ nguyên chiều rộng.

`→ LEARN`: quyết định "không disable nút Nộp bài" đã được ghi ở `UI-GUIDE` §11 kèm lý do.

### 7.3 Phản hồi và thông báo

- **Toast** cho việc đã xong, không quan trọng, tự biến mất (≥ 5s, có nút đóng, không bao giờ dùng
  cho lỗi cần hành động).
- **Inline** cho lỗi thuộc về một trường cụ thể — đặt cạnh trường đó.
- **Banner** cho trạng thái kéo dài của cả màn (mất kết nối, gói hết hạn).
- **Modal** chỉ khi thật sự phải chặn dòng công việc. Modal cần: bẫy focus, Esc để đóng,
  `aria-modal`, trả focus về nút đã mở nó, và **không** đóng khi bấm nhầm ra ngoài nếu có dữ liệu chưa lưu.

### 7.4 Hành động phá huỷ

- Không đặt cạnh hành động lành tính, và khác màu.
- Ưu tiên **Undo trong 5–10 giây** hơn là hỏi trước.
- Nếu thật sự không hoàn tác được: bắt gõ tên đối tượng, nói rõ **hệ quả** ("xoá 43 bài học"),
  và nút xác nhận ghi động từ thật ("Xoá khoá học") chứ không phải "OK".

---

## 8. Form và nhập liệu

Nơi sản phẩm mất người dùng nhiều nhất. Các luật dưới đây gần như không có ngoại lệ.

### 8.1 Cấu trúc

- **Một cột.** Form nhiều cột làm mắt đi zigzag và tăng lỗi; ngoại lệ: các cặp thật sự đi liền
  (thành phố / mã bưu điện).
- **Nhãn nằm trên ô**, luôn hiện. Placeholder **không thay được nhãn**: nó biến mất đúng lúc người
  dùng cần nó nhất, và tương phản thấp.
- Hỏi **ít nhất có thể**. Mỗi trường phải trả lời được "nếu thiếu cái này thì hỏng chuyện gì?".
- Đánh dấu **trường tuỳ chọn**, đừng gắn sao đỏ vào 12 trường bắt buộc.
- Nhóm trường theo chủ đề, tối đa 5–7 trường một nhóm.
- Form dài chia bước, có **thanh tiến độ** và **lưu nháp**.

### 8.2 Chi tiết kỹ thuật hay bị bỏ

- Đúng `type`/`inputmode` (`email`, `tel`, `numeric`) để bàn phím di động đổi đúng.
- `autocomplete` chuẩn (`email`, `current-password`, `one-time-code`, `street-address`) — tiết kiệm
  nhiều thời gian hơn mọi tinh chỉnh giao diện khác.
- Kích thước ô gợi ý độ dài dữ liệu (ô mã bưu điện không dài bằng ô địa chỉ).
- Chấp nhận mọi định dạng người ta gõ ra rồi **tự chuẩn hoá** (Postel's Law): khoảng trắng thừa,
  dấu gạch trong số thẻ, chữ hoa trong email.
- Không chặn dán vào ô mật khẩu hay ô OTP.
- Ô mật khẩu luôn có **nút hiện/ẩn**; hiện yêu cầu mật khẩu **trước khi** gõ, không phải sau khi báo lỗi.
- Nút submit ghi **động từ của việc** ("Tạo tài khoản"), không ghi "Gửi".

### 8.3 Xác thực và báo lỗi

- Thời điểm: **khi rời ô (blur)** cho lỗi định dạng; khi submit cho lỗi liên trường. Đừng báo đỏ
  khi người ta mới gõ ký tự thứ hai.
- Báo **thành công** với các trường khó (tên đăng nhập còn trống) cũng có ích.
- Lỗi phải: nằm cạnh trường · nói sai gì · nói cách sửa · giữ nguyên dữ liệu đã nhập.
- Submit lỗi ⇒ **cuộn tới lỗi đầu tiên + đưa focus vào đó**; form dài thì thêm bản tóm tắt lỗi
  ở đầu, mỗi dòng là link tới trường.
- Kỹ thuật a11y: `aria-describedby` trỏ tới thông báo lỗi, `aria-invalid="true"`, vùng lỗi tổng là
  `role="alert"` hoặc `aria-live="polite"`.
- Văn phong: không đổ lỗi cho người dùng, không dùng "bạn đã nhập sai". Mô tả điều kiện đúng.

`→ LEARN`: cuộn + focus + đánh dấu, và nút hiện/ẩn mật khẩu đã là ràng buộc — `UI-GUIDE` §10.

---

## 9. Chuyển động

Ba câu hỏi trước khi thêm bất kỳ animation nào: nó **nói gì** với người dùng? nó có làm chậm thao
tác không? nó có chạy 50 lần một ngày không?

### 9.1 Vai trò hợp lệ của chuyển động

1. **Giải thích quan hệ không gian** (thẻ mở ra thành trang chi tiết).
2. **Hướng chú ý** tới thứ vừa thay đổi.
3. **Che thời gian chờ** (skeleton, tiến trình).
4. **Xác nhận hành động** (nút lún xuống, dấu tích vẽ ra).
5. **Thưởng** — hiếm, chỉ ở khoảnh khắc đỉnh.

### 9.2 Số đo

| Loại                        | Thời lượng | Easing                                 |
| --------------------------- | ---------- | -------------------------------------- |
| Phản hồi vi mô (hover, bấm) | 80–150ms   | `ease-out`                             |
| Vào/ra của phần tử nhỏ      | 150–250ms  | `ease-out` khi vào, `ease-in` khi ra   |
| Chuyển màn / panel lớn      | 250–400ms  | `ease-in-out`                          |
| Trên 400ms                  | —          | Gần như luôn là sai, trừ khi kể chuyện |

- Vật **vào** màn nhanh và chậm dần (`ease-out`); vật **rời** màn thì ngược lại và ngắn hơn.
- `linear` chỉ dành cho vòng quay tải và thanh tiến độ.
- Danh sách so le (stagger) phải giảm bước khi danh sách dài — tổng thời gian dưới ~600ms.
- Không animate `width/height/top/left` (gây layout); dùng `transform` và `opacity`.

### 9.3 `prefers-reduced-motion` là bắt buộc

Không phải tuỳ chọn thẩm mỹ: chuyển động lớn gây chóng mặt và buồn nôn thật sự với người rối loạn
tiền đình (WCAG 2.3.3). Khi bật giảm chuyển động: bỏ dịch chuyển/phóng to, giữ lại mờ dần. Hiệu ứng
không đi qua thư viện motion (canvas, WebGL, confetti) **phải tự hỏi `matchMedia`**.

`→ LEARN`: `MotionProvider` đặt `reducedMotion="user"`, `globals.css` có khối `@media` rút animation
CSS thuần về ~0ms, `lib/celebrate.ts` tự kiểm tra. Bẫy đã dính: `motion` chiếm quyền `transform`
của chính phần tử nó điều khiển — đặt offset tĩnh lên `<div>` bên trong. `UI-GUIDE` §4.

---

## 10. Khả năng tiếp cận (accessibility)

Không phải "tính năng thêm cho một nhóm nhỏ": phần lớn luật a11y cải thiện trải nghiệm cho mọi
người (ngoài nắng, một tay, tai nghe hỏng, đang vội).

### 10.1 POUR

- **Perceivable** — nhận biết được: tương phản, chữ thay ảnh, phụ đề, không chỉ dựa vào màu/hình dạng/âm thanh.
- **Operable** — thao tác được: bàn phím, đủ thời gian, không gây co giật, đích bấm đủ lớn.
- **Understandable** — hiểu được: ngôn ngữ rõ, hành vi đoán được, giúp sửa lỗi.
- **Robust** — bền: HTML ngữ nghĩa để công nghệ hỗ trợ đọc được.

### 10.2 Bảng kiểm WCAG 2.2 AA thường gặp

| Tiêu chí                     | Yêu cầu cụ thể                                                        |
| ---------------------------- | --------------------------------------------------------------------- |
| 1.1.1 Non-text Content       | Ảnh có nghĩa cần `alt`; ảnh trang trí để `alt=""`                     |
| 1.3.1 Info and Relationships | Dùng thẻ đúng: `<h1..h6>` theo thứ tự, `<ul>`, `<table>` có `<th>`    |
| 1.4.1 Use of Color           | Link trong đoạn văn phải gạch chân, không chỉ khác màu                |
| 1.4.3 Contrast (Minimum)     | Chữ ≥ 4.5:1; chữ lớn ≥ 3:1                                            |
| 1.4.4 Resize Text            | Zoom 200% không mất nội dung                                          |
| 1.4.10 Reflow                | 320px chiều rộng không sinh cuộn ngang                                |
| 1.4.11 Non-text Contrast     | Viền input, icon mang nghĩa, vòng focus ≥ 3:1                         |
| 1.4.12 Text Spacing          | Người dùng nới giãn dòng/chữ mà layout không vỡ                       |
| 2.1.1 / 2.1.2 Keyboard       | Mọi chức năng đi được bằng bàn phím, và **ra được** (không bẫy focus) |
| 2.4.3 Focus Order            | Thứ tự Tab khớp thứ tự đọc                                            |
| 2.4.7 Focus Visible          | Luôn thấy đang ở đâu                                                  |
| 2.4.11 Focus Not Obscured    | Thanh dính không che phần tử vừa focus (`scroll-mt-*`)                |
| 2.5.7 Dragging Movements     | Mọi thao tác kéo–thả phải có cách làm thay thế bằng bấm               |
| 2.5.8 Target Size (Minimum)  | Vùng bấm ≥ 24×24px (thực tế nên 44×44 trên di động)                   |
| 3.2.2 On Input               | Đổi giá trị một ô không tự submit hay tự chuyển trang                 |
| 3.3.1 / 3.3.3 Error          | Lỗi được mô tả bằng chữ và có gợi ý sửa                               |
| 3.3.7 Redundant Entry        | Không bắt nhập lại thông tin đã nhập ở bước trước                     |
| 4.1.2 Name, Role, Value      | Control tự viết phải có `role`, tên truy cập được, và trạng thái      |

### 10.3 Luật ARIA thực dụng

1. **Không dùng ARIA nếu HTML gốc làm được.** `<button>` luôn tốt hơn `<div role="button">`.
2. Không đổi ngữ nghĩa gốc của thẻ.
3. Mọi control ARIA tương tác phải dùng được bằng bàn phím.
4. Không đặt `aria-hidden="true"` lên phần tử focus được.
5. Mọi control phải có tên truy cập được (nội dung, `aria-label`, hoặc `<label>`).
6. Icon là trang trí ⇒ `aria-hidden` + `focusable="false"`; ý nghĩa nằm ở nhãn chữ bên cạnh.
7. Nội dung cập nhật động cần `aria-live` (`polite` cho thông tin, `assertive` chỉ cho khẩn cấp).
8. Có link "Bỏ qua tới nội dung chính" ở đầu tab order.

### 10.4 Kiểm thế nào

- **Lint tĩnh** (`eslint-plugin-jsx-a11y`) bắt lỗi cấu trúc JSX — nhưng **không** tính được tương
  phản màu vì màu chỉ có sau khi trình duyệt render.
- **Quét tự động trên màn thật** (axe-core) bắt được ~30–40% vấn đề.
- **Thủ công**: đi hết một luồng chỉ bằng bàn phím; bật trình đọc màn hình đọc thử một màn; zoom 200%.

`→ LEARN`: `node scripts/audit-a11y.mjs` quét 18 màn bằng axe-core theo bộ luật WCAG 2.2 AA và trả
exit code 1 nếu có vi phạm serious/critical. Chạy nó khi thay đổi chạm tới màu, form hoặc heading.

---

## 11. Đáp ứng và đa thiết bị

- **Mobile-first**: viết cho màn hẹp trước rồi mở rộng. Ngược lại thì luôn thành việc "cắt bớt".
- **Breakpoint đi theo nội dung**, không theo tên thiết bị: khi nào bố cục bắt đầu xấu thì đổi ở đó.
- Kích thước kiểm bắt buộc: **320px** (nhỏ nhất WCAG yêu cầu), **390px** (điện thoại phổ biến),
  768px, 1280px, 1440px.
- **Vùng ngón cái**: hành động chính trên di động nằm ở nửa dưới màn hình; nút nguy hiểm tránh xa.
- Đích chạm ≥ 44×44px với khoảng cách ≥ 8px giữa các đích.
- Tôn trọng `safe-area-inset-*` (tai thỏ, thanh home) và bàn phím ảo che mất nút submit.
- Không giấu nội dung quan trọng sau hover hoặc sau thao tác kéo trên di động.
- Điều hướng đổi hình thái theo cỡ màn (sidebar → tab đáy) nhưng **không đổi thứ tự ưu tiên**.
- Bảng rộng trên di động: đổi thành thẻ, hoặc cho cuộn ngang **có cột đầu dính** và có dấu hiệu
  còn nội dung bên phải.

`→ LEARN`: dưới `md`, điều hướng xuống thanh tab đáy; rail phải ẩn dưới `lg` (`UI-GUIDE` §8).
Kiểm nhanh bằng `node scripts/capture-ui.mjs --width 390 dev/ui`.

---

## 12. Kiến trúc thông tin và điều hướng

- **Người dùng phải luôn trả lời được ba câu**: tôi đang ở đâu, tôi có thể đi đâu, làm sao quay lại.
- Điều hướng chính **tối đa 7 mục**; sâu tối đa 3 tầng. Sâu hơn thì cần tìm kiếm.
- **Nhãn theo ngôn ngữ người dùng**, không theo tên bảng trong cơ sở dữ liệu. Nhãn tự giải thích
  thắng nhãn ngắn gọn thông minh.
- Mục đang chọn phải rõ, và rõ bằng **hơn một tín hiệu** (màu + đậm + thanh chỉ thị).
- Breadcrumb cho cấu trúc sâu; nó là bổ sung, không thay được nút quay lại.
- URL là một phần của IA: đọc được, chia sẻ được, và **trạng thái quan trọng phải nằm trong URL**
  (bộ lọc, tab, trang) để F5 không mất.
- Tìm kiếm: hiện lại từ khoá đã gõ, có gợi ý khi không ra kết quả, không bao giờ trả về màn trắng.
- Mỗi màn phải có **đường đi tiếp** — ngõ cụt là lỗi thiết kế.
- Xác thực IA bằng **card sorting** (người dùng tự nhóm) và **tree testing** (tìm được mục không).

`→ LEARN`: banner bài học ghi "Bài 1/3", và mọi màn có nút đi tiếp/quay lại — `UI-GUIDE` §10.

---

## 13. Ngôn từ (UX writing)

Chữ là phần giao diện được đọc nhiều nhất và thường được thiết kế ít nhất.

### 13.1 Luật chung

- **Ngắn, cụ thể, chủ động.** "Lưu thay đổi" chứ không "Thao tác lưu sẽ được thực hiện".
- Nút ghi **kết quả của hành động**, không ghi "OK"/"Gửi"/"Có". Người dùng bấm nút, không đọc câu hỏi.
- **Sentence case** ("Tạo khoá học mới") dễ đọc hơn Title Case và nhất quán hơn.
- Một khái niệm — một từ. Đã gọi "khoá học" thì đừng chỗ khác gọi "chương trình".
- Không đổ **enum thô của API** ra màn hình (`ACTIVE`, `PENDING`, `/month`) — luôn dịch sang tiếng
  người. `→ LEARN`: ràng buộc ở `UI-GUIDE` §10 và trong checklist.
- Thời gian gần dùng **tương đối** ("3 phút trước"), mốc chính xác để trong `title`.
- Số lớn, tiền tệ, ngày tháng theo locale người dùng, không theo locale máy chủ.

### 13.2 Công thức thông báo lỗi

**[Chuyện gì xảy ra] + [vì sao, nếu biết] + [làm gì tiếp].** Không có mã lỗi thô, không có "Oops!",
không đổ lỗi cho người dùng, không đùa trong lúc người ta mất dữ liệu.

> ✗ "Error 422: validation failed"
> ✓ "Không lưu được bài học vì tiêu đề đang trống. Nhập tiêu đề rồi lưu lại."

### 13.3 Empty state

Ba phần: **vì sao trống** · **vì sao nó đáng quan tâm** · **một hành động**. Empty state lần đầu
(chưa có gì) khác empty state do bộ lọc (có dữ liệu nhưng lọc hết) — lỗi hay gặp là dùng chung một
câu cho cả hai; trường hợp sau phải có nút xoá bộ lọc.

### 13.4 Onboarding

- Dạy khi cần dùng, không đổ hết ở lần mở đầu tiên. Tour 6 bước gần như luôn bị bấm bỏ qua.
- Cho làm trước, đăng ký sau, nếu có thể.
- **Trạng thái rỗng chính là onboarding tốt nhất**: dữ liệu mẫu, một việc nhỏ làm được ngay.
- Luôn có đường bỏ qua, và không bao giờ lặp lại tour đã bỏ qua.

---

## 14. Hiệu năng là trải nghiệm

### 14.1 Ba ngưỡng thời gian (Miller / Nielsen)

| Ngưỡng     | Cảm giác người dùng         | Việc phải làm                             |
| ---------- | --------------------------- | ----------------------------------------- |
| **< 0.1s** | Tức thì, như vật lý         | Phản hồi hover/bấm phải nằm ở đây         |
| **< 1s**   | Liền mạch, nhưng có độ trễ  | Không cần chỉ báo, nhưng đừng để nhảy màn |
| **< 10s**  | Giới hạn của sự chú ý       | Bắt buộc có chỉ báo tiến trình            |
| **> 10s**  | Người dùng chuyển việc khác | Cho chạy nền + báo khi xong               |

### 14.2 Chỉ số web cốt lõi

- **LCP < 2.5s** — nội dung chính hiện ra.
- **INP < 200ms** — phản hồi tương tác.
- **CLS < 0.1** — bố cục không nhảy. Nguyên nhân số một: ảnh/quảng cáo/font không đặt sẵn kích thước.

### 14.3 Hiệu năng cảm nhận

- **Skeleton** đúng hình dáng tốt hơn spinner: nó cho biết cái gì sắp tới.
- **Optimistic UI** cho hành động gần như chắc chắn thành công (thích, đánh dấu xong) — kèm cách
  hoàn nguyên khi lỗi.
- **Tải trước** thứ người dùng sắp cần (trang kế, ảnh dưới nếp gấp).
- Đặt sẵn khung cho nội dung sẽ tới để không nhảy layout.
- Không thay skeleton bằng nội dung trong < 200ms — nhấp nháy khó chịu hơn là chờ.

---

## 15. Hiển thị dữ liệu

### 15.1 Bảng

- Cột số **căn phải**, chữ căn trái, tiêu đề cột cùng hướng với dữ liệu.
- Giữ tiêu đề cột dính khi cuộn; giữ cột định danh dính khi cuộn ngang.
- Sắp xếp phải nói rõ đang sắp theo cột nào, chiều nào.
- Bộ lọc đang bật phải hiện thành chip xoá được, đừng giấu trong panel đóng.
- Số dòng: phân trang khi người dùng cần biết vị trí và tổng số; cuộn vô hạn cho luồng khám phá —
  **không bao giờ dùng cuộn vô hạn khi dưới bảng có footer** cần bấm.
- Hành động trên dòng phải nhìn thấy được, không chỉ hiện khi hover (hỏng trên cảm ứng).

### 15.2 Biểu đồ

- Chọn dạng theo **câu hỏi**: so sánh → cột; xu hướng theo thời gian → đường; thành phần → cột
  chồng (không phải bánh nhiều hơn 5 phần); phân bố → histogram; tương quan → scatter.
- **Trục giá trị của biểu đồ cột phải bắt đầu từ 0.** Biểu đồ đường thì không bắt buộc.
- Gán nhãn trực tiếp lên đường thay vì bắt tra chú giải.
- Bỏ mực thừa: lưới mờ, không đổ bóng, không 3D.
- Sắp xếp hạng mục theo giá trị, trừ khi có thứ tự tự nhiên (thời gian, thang điểm).
- Màu của biểu đồ vẫn phải qua kiểm tương phản và **không là tín hiệu duy nhất** (thêm nhãn, hình dạng).
- Luôn có trạng thái "không đủ dữ liệu" thay vì vẽ một biểu đồ trống gây hiểu nhầm.

---

## 16. Đạo đức thiết kế và dark pattern

Ranh giới: **thuyết phục** giúp người dùng đạt mục tiêu **của họ**; **thao túng** khiến họ đạt mục
tiêu của công ty trái ý họ. Những mẫu dưới đây đều bị coi là dark pattern và phần lớn đã hoặc đang
bị pháp luật (GDPR, DSA, FTC) siết:

| Dark pattern            | Biểu hiện                                                  |
| ----------------------- | ---------------------------------------------------------- |
| Confirmshaming          | Nút từ chối ghi "Không, tôi không muốn học giỏi hơn"       |
| Roach motel             | Đăng ký 2 cú bấm, huỷ phải gọi điện                        |
| Sneak into basket       | Tự thêm dịch vụ kèm vào giỏ                                |
| Bait and switch         | Nút làm một việc khác với nhãn                             |
| Misdirection            | Làm nút "Đồng ý tất cả" to và sáng, "Từ chối" thành chữ mờ |
| Forced continuity       | Dùng thử hết hạn thì tự trừ tiền, không báo trước          |
| Fake urgency / scarcity | Đồng hồ đếm ngược giả, "còn 2 suất" bịa                    |
| Privacy zuckering       | Mặc định bật chia sẻ dữ liệu, chôn nút tắt                 |
| Nagging                 | Hỏi lại xin quyền sau mỗi lần từ chối                      |

Nguyên tắc dương bản:

- **Mặc định phải là lựa chọn an toàn và tiết kiệm nhất cho người dùng.** Mặc định là quyết định
  thiết kế có sức nặng nhất trong cả sản phẩm.
- Huỷ phải dễ ngang đăng ký.
- Xin quyền **đúng lúc cần** và nói rõ để làm gì, không xin hàng loạt ở màn mở đầu.
- Chỉ hỏi dữ liệu thật sự cần; nói rõ dùng vào việc gì.
- Trạng thái phải trung thực: không có thanh tiến độ giả, không có "đang phân tích..." khi không
  có gì đang chạy.
- Nếu phải giải thích một màn bằng câu "nhưng như thế sẽ giảm chuyển đổi" — đó chính là lúc cần
  xem lại.

`→ LEARN`: `AGENTS.md` cấm bịa gamification (gem, tim, rương thưởng, nhiệm vụ). Đây không chỉ là
yêu cầu sản phẩm mà còn là ranh giới đạo đức: những cơ chế đó tạo áp lực giả trên người học.

---

## 17. Quy trình thiết kế

### 17.1 Double Diamond

**Khám phá** (mở rộng: nghiên cứu, quan sát) → **Định nghĩa** (thu hẹp: chốt đúng một vấn đề) →
**Phát triển** (mở rộng: nhiều phương án, phác thảo) → **Bàn giao** (thu hẹp: chọn, kiểm, giao).
Lỗi phổ biến nhất là nhảy thẳng vào "Phát triển" với vấn đề chưa được định nghĩa.

### 17.2 Phát biểu vấn đề tốt

Dạng **Jobs To Be Done**: "Khi [tình huống], tôi muốn [động lực], để [kết quả mong đợi]."
Nó buộc phải nói về tình huống thật chứ không về tính năng.

### 17.3 Phương pháp nghiên cứu, chọn theo câu hỏi

| Câu hỏi                              | Phương pháp                                           |
| ------------------------------------ | ----------------------------------------------------- |
| Người dùng **làm** gì?               | Phân tích hành vi, quan sát ngữ cảnh                  |
| **Vì sao** họ làm thế?               | Phỏng vấn sâu                                         |
| Thiết kế này có **dùng được** không? | Usability test (5 người bắt ~85% vấn đề nghiêm trọng) |
| Phương án nào **tốt hơn**?           | A/B test (cần đủ lưu lượng)                           |
| Bao nhiêu người gặp vấn đề này?      | Khảo sát, phân tích định lượng                        |
| Sắp xếp nội dung thế nào?            | Card sorting, tree testing                            |

Luật phỏng vấn: hỏi về **quá khứ cụ thể** ("lần gần nhất bạn..."), không hỏi về tương lai giả định
("bạn có dùng không nếu..."). Người ta đoán sai về chính mình.

### 17.4 Độ trung thực của bản mẫu

Phác tay → wireframe → mockup → prototype tương tác. **Độ trung thực càng cao, phản hồi càng đi vào
chi tiết thị giác và càng ít về luồng.** Muốn kiểm luồng thì đừng đưa bản đã tô màu đẹp.

### 17.5 Bàn giao cho dev

Một bản giao đủ gồm: token dùng · số đo khoảng cách · **mọi trạng thái** của component · quy tắc
đáp ứng ở từng breakpoint · trường hợp biên (chữ dài, số 0, dữ liệu rỗng, lỗi mạng) · chi tiết
chuyển động · ghi chú a11y (thứ tự tab, nhãn, vai trò) · nội dung chữ chính xác.

Quy tắc chung: **thiết kế chưa định nghĩa trạng thái lỗi là thiết kế chưa xong**.

---

## 18. Đo lường

### 18.1 Khung HEART (Google)

| Chiều            | Đo cái gì              | Ví dụ chỉ số                        |
| ---------------- | ---------------------- | ----------------------------------- |
| **Happiness**    | Cảm nhận               | SUS, CSAT, NPS                      |
| **Engagement**   | Mức độ dùng            | Số bài học/tuần, thời lượng phiên   |
| **Adoption**     | Người mới bắt đầu dùng | % tài khoản mới hoàn thành bài đầu  |
| **Retention**    | Quay lại               | Giữ chân ngày 7 / ngày 30           |
| **Task success** | Làm xong việc          | Tỉ lệ hoàn thành, thời gian, số lỗi |

Với mỗi chiều, viết **Goal → Signal → Metric** rồi mới chọn con số. Chọn chỉ số trước khi có mục
tiêu là cách chắc chắn nhất để tối ưu nhầm thứ.

### 18.2 Chỉ số dùng được trong usability test

Tỉ lệ hoàn thành · thời gian hoàn thành · số lỗi và số lần cần trợ giúp · **SUS** (thang 10 câu,
điểm ≥ 68 là trung bình, ≥ 80 là tốt) · SEQ (một câu sau mỗi tác vụ: "việc vừa rồi dễ hay khó?").

### 18.3 Cảnh báo

- Chỉ số tăng không chứng minh trải nghiệm tốt hơn: thời lượng phiên tăng có thể vì người dùng bị
  lạc. Luôn ghép một chỉ số "tốc độ" với một chỉ số "chất lượng".
- A/B test cần đủ mẫu và đủ thời gian; dừng sớm khi thấy số đẹp là tự lừa mình.
- Số định lượng nói **cái gì đang xảy ra**, định tính nói **vì sao**. Thiếu vế nào cũng ra quyết
  định sai.

---

## 19. Checklist gộp

Dùng trước khi đóng một thay đổi giao diện bất kỳ.

**Nội dung và luồng**

- [ ] Một hành động chính rõ ràng, nổi bật nhất màn
- [ ] Mọi chữ là tiếng người, không có enum/mã lỗi thô
- [ ] Có đường đi tiếp và đường quay lại; không ngõ cụt
- [ ] Nhãn nút là động từ của việc sẽ xảy ra

**Trạng thái**

- [ ] Đủ Loading / Empty / Error / Partial / Success
- [ ] Empty state phân biệt "chưa có gì" và "bộ lọc lọc hết"
- [ ] Hành động phá huỷ có Undo, hoặc xác nhận có nêu hệ quả
- [ ] Không có disabled câm (nếu disable thì nói rõ vì sao)

**Thị giác**

- [ ] Khoảng cách theo thang 4/8; trong nhóm < giữa nhóm
- [ ] Chỉ dùng token, không có giá trị màu/cỡ viết thẳng
- [ ] Không có bậc màu dùng sai vai trò (chữ / nền)
- [ ] Đoạn văn trong khoảng 45–75 ký tự một dòng

**Tương tác và chuyển động**

- [ ] Mọi control có đủ hover / focus-visible / active / disabled / loading
- [ ] Chuyển động 150–400ms, có mục đích, và tôn trọng `prefers-reduced-motion`
- [ ] Không double-submit được

**Accessibility**

- [ ] Chữ ≥ 4.5:1; thành phần giao diện ≥ 3:1
- [ ] Trạng thái không chỉ dựa vào màu (có icon hoặc nhãn)
- [ ] Đi hết màn bằng bàn phím; focus luôn nhìn thấy và không bị thanh dính che
- [ ] Đích bấm ≥ 24×24 (di động: 44×44)
- [ ] Heading đúng thứ bậc; form có nhãn thật; lỗi có `aria-describedby`
- [ ] Quét axe-core sạch (khi chạm màu / form / heading)

**Đáp ứng và hiệu năng**

- [ ] 320px và 390px không vỡ, không cuộn ngang
- [ ] Không nhảy bố cục khi dữ liệu về
- [ ] Phản hồi tương tác dưới ~200ms, việc dài hơn 1s có chỉ báo

**Đạo đức**

- [ ] Mặc định là lựa chọn an toàn cho người dùng
- [ ] Không có urgency giả, không confirmshaming, huỷ dễ như đăng ký

---

## Nguồn

- Jakob Nielsen — _10 Usability Heuristics for User Interface Design_; các bài NN/g về form, lỗi,
  mật khẩu, thời gian tương đối.
- Don Norman — _The Design of Everyday Things_ (affordance, signifier, mapping, gulfs, phân loại lỗi).
- Ben Shneiderman — _Designing the User Interface_ (8 quy tắc vàng).
- W3C — _WCAG 2.2_ (AA) và _ARIA Authoring Practices Guide_.
- Google — _Material Design_ (elevation, motion), _HEART framework_, _Web Vitals_.
- Steve Krug — _Don't Make Me Think_. Luke Wroblewski — _Web Form Design_.
- Edward Tufte — _The Visual Display of Quantitative Information_.
- Harry Brignull — _Deceptive Patterns_.
- Laws of UX (Jon Yablonski) — tập hợp các định luật ở §1.1.

Trong repo: `docs/UI-GUIDE.md` (thao tác), `docs/HANDBOOK.md` §13 (mascot, celebrate),
`AGENTS.md` (ràng buộc bắt buộc), `docs/adr/` (các quyết định đã chốt),
`packages/config/tailwind/theme.css` (token), `scripts/audit-a11y.mjs` (kiểm a11y).
