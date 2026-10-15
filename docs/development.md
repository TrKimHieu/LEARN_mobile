# Hướng dẫn phát triển

> [!NOTE]
> Quy ước và quy trình làm việc hằng ngày. Cần chạy được app trước: xem [getting-started.md](getting-started.md).

## 1. Lệnh thường dùng

| Lệnh | Việc làm |
| --- | --- |
| `npm run mock` | Chạy API mock (cổng 4000) |
| `npm start` | Chạy Metro cho Expo Go (cổng 8081) |
| `npm run web` | Chạy bản web để xem nhanh |
| `npm run typecheck` | So contracts với LEARN, rồi `tsc --noEmit` |
| `npm run lint` | ESLint theo cấu hình Expo |
| `npm test` | Unit test (Jest, `jest-expo`) |
| `npm run e2e` | Playwright trên bản web, kèm axe — xem [testing.md](testing.md) |
| `npm run sync:contracts` | Chép lại `@learn/contracts` khi LEARN đổi schema |
| `npm run icons` | Sinh lại icon app từ logo Circle |
| `npm run mascot:data` | Sinh lại dữ liệu 25 biểu cảm của mascot từ bản web |
| `npm run doctor` | `expo-doctor`: kiểm tra thư viện có khớp SDK |
| `npx expo install <gói>` | **Luôn dùng lệnh này để thêm thư viện** |

> [!IMPORTANT]
> **Trước khi commit**, chạy ba lệnh và phải sạch lỗi:

> ```bash
> npm run typecheck && npm run lint && npm test
> ```
>
> `npm run lint` hiện còn cảnh báo (không có lỗi); xem [mục 6](#6-lint-cảnh-báo-đã-biết).

## 2. Quy ước code

- **TypeScript strict**, không dùng `any`. Chỉ mục mảng/đối tượng có thể `undefined`
  (`noUncheckedIndexedAccess`).
- Import bằng alias `@/` (ví dụ `@/lib/api-client`), không dùng đường dẫn tương đối dài.
- **Route trong `src/app/`**, code khác ở ngoài. Mỗi file trong `src/app/` là một màn.
- **Điều hướng** dùng `routes` trong `src/lib/routes.ts`; params chỉ mang ID.
- **Gọi API** qua hook trong `src/features/<nghiệp vụ>/*-api.ts`, không gọi `fetch` trong màn.
- **Màu và khoảng cách** lấy từ `src/theme/tokens.ts`; không viết mã màu cứng.
- **Nội dung hiển thị** bằng tiếng Việt, câu chữ ngắn, nói rõ cách xử lý khi có lỗi.
- **Đơn sắc dịu**: không thêm màu sắc; trạng thái luôn kèm icon + chữ ([ADR 001](adr/001-don-sac-diu.md)).
- Chữ nội dung tối thiểu 14 px (`caption` 12 px chỉ dùng cho nhãn phụ); vùng chạm tối thiểu 44 × 44 (nút nhỏ dùng `hitSlop`); nút và lựa chọn có `accessibilityRole`/nhãn đúng.

## 3. Thêm một màn mới

1. Tạo file trong `src/app/...` (đặt tên theo đường dẫn mong muốn; `[id]` cho tham số động).
2. Nếu cần đường dẫn mới, thêm vào `src/lib/routes.ts`.
3. Nếu màn cần quyền ADMIN, đặt trong nhóm route chỉ ADMIN (xem `src/app/admin/`).
4. Gọi dữ liệu bằng hook ở `src/features/...`; nếu chưa có thì thêm (mục 4).
5. Xử lý đủ **5 trạng thái**: tải, trống, lỗi, một phần, thành công
   (`src/components/ui/states.tsx`).
6. Kiểm tra cả chế độ sáng và tối, và cỡ chữ hệ thống lớn.
7. Cập nhật mục "Có gì" trong [README](../README.md) nếu màn là một tính năng người dùng thấy.

## 4. Thêm một lời gọi API

1. Kiểm tra schema đã có trong `src/contracts/` chưa. Chưa có thì **sửa bên LEARN**
   (`packages/contracts`), rồi chạy `npm run sync:contracts`. Không sửa tay `src/contracts/`.
2. Thêm hook trong `src/features/<nghiệp vụ>/<nghiệp vụ>-api.ts`:

```ts
export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ['courses', courseId],
    queryFn: () => apiFetch<CourseDetail>(`/api/v1/courses/${courseId}`),
  });
}
```

3. **Thêm route tương ứng vào API mock** (`mock-api/app.js`) và một ca trong
   `mock-api/__tests__/mock-api.test.ts`, để người khác chạy được tính năng mà không cần backend thật.
4. **Query key** theo mẫu cấp bậc (`['courses', id, 'lessons']`) và khớp với bản web, để
   `invalidateQueries` xoá đúng phần.
5. Mutation thì `invalidateQueries` các key bị ảnh hưởng trong `onSuccess`.
6. Xử lý lỗi theo `error.code`, không theo chữ. Hạn mức: `isQuotaExceededError(err)`.

## 4b. Thêm một dạng câu hỏi

1. Dạng mới phải có trong `questionTypeSchema` của contracts trước (sửa bên LEARN, rồi
   `npm run sync:contracts`). Lúc này `npm run typecheck` sẽ báo registry thiếu mục.
2. Tạo `src/features/exercises/question-types/<dang-moi>.tsx`, export một `QuestionTypeModule`:
   - `Input`: phần trả lời trong thẻ câu hỏi, gọi `onChange` với `Answer` đúng dạng.
   - `Review` (không bắt buộc): phần xem lại sau khi nộp. Bỏ trống thì dùng dạng chữ
     "Bạn trả lời / Đáp án đúng" — khi đó bổ sung nhánh tương ứng trong `answers.ts`.
3. Đăng ký trong `question-types/registry.ts`.
4. Thêm câu hỏi dạng mới vào dữ liệu mẫu của mock (`mock-api/content.js`) để chạy thử được.
5. Thêm ca test trong `src/features/exercises/__tests__/answers.test.ts` nếu có logic mô tả đáp án.

## 5. Đồng bộ contracts

Khi LEARN đổi schema:

```bash
npm run sync:contracts     # chép từ ../LEARN/packages/contracts/src
npm run typecheck          # bắt chỗ code app không còn khớp
```

Nguồn mặc định `../LEARN/packages/contracts/src`; đổi bằng biến `LEARN_CONTRACTS_DIR`. API mock tự lấy
dấu vân tay contracts từ `src/contracts/version.ts`; `npm test` sẽ đỏ nếu response của mock không còn
khớp schema mới — khi đó sửa `mock-api/` cho khớp. Nếu máy
không có repo LEARN, `npm run typecheck` dùng bản đã chép và vẫn chạy.

## 6. Lint: cảnh báo đã biết

`eslint.config.js` hạ ba rule của React Compiler xuống **cảnh báo**: `react-hooks/refs`,
`react-hooks/purity`, `react-hooks/set-state-in-effect`. Chúng bắt các mẫu animation đang chạy đúng
(`useRef(new Animated.Value()).current`, `Date.now()` khi render) ở `login`, `register`, `celebrate`,
`mascot`, `surface`, `practice`, các màn bài học. Hãy dọn dần khi làm lại giao diện, rồi nâng chúng
trở lại mức lỗi.

## 7. Thêm thư viện

```bash
npx expo install <gói>
```

Lệnh này chọn bản tương thích với SDK. Sau đó:

- Thư viện **có mã native** không nằm trong Expo Go cần một **development build**:
  `npx expo run:android` / `run:ios` (cục bộ) hoặc `eas build --profile development`.
- Chạy `npm run doctor` để chắc các phiên bản còn khớp.
- Không tạo hay sửa tay thư mục `ios/` và `android/`: chúng được sinh tự động (Continuous Native
  Generation). Cấu hình native đặt trong `app.json` và config plugin.

## 8. Tài liệu Expo

Expo đổi API mỗi phiên bản SDK, đừng viết từ trí nhớ. Dùng tài liệu đúng phiên bản của dự án
(SDK 57): <https://docs.expo.dev/versions/v57.0.0/>, và chỉ mục
<https://docs.expo.dev/llms.txt>.

## 9. Quy ước commit

Viết thông điệp ngắn, nói *đổi gì và vì sao*, ví dụ `feat(learning): thêm lọc bài học theo trạng thái`.
Tiền tố gợi ý: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`. Không commit `.env`, tệp chứng
chỉ (`*.jks`, `*.p8`, `*.p12`, `*.pem`), hay thư mục `e2e/out/`.
