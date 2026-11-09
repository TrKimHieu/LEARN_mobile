# Giao diện linh hoạt và xoay ngang — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App chạy đúng ở điện thoại dọc, điện thoại ngang, tablet dọc/ngang và cửa sổ chia đôi Android, không cắt chữ, không lệch tai thỏ, không mất trạng thái khi xoay.

**Architecture:** Một hàm thuần `layoutFor(width, height)` phân loại cửa sổ theo chiều rộng (compact / medium / expanded, mốc 600 và 840 dp) và cờ `shortHeight` (cao < 480). Hook `useLayout()` gọi hàm đó từ `useWindowDimensions()`. `Screen`, `Grid`, thanh tab và vài màn đọc `useLayout()`; không màn nào đọc `Dimensions` tĩnh.

**Tech Stack:** Expo SDK 58, React Native 0.88, expo-router 58 (Tabs có `tabBarPosition`, `tabBarVariant`), react-native-safe-area-context 5.11, Jest 30 + react-test-renderer 19.3.

**Spec:** Yêu cầu người dùng ngày 2026-11-09 ("giao diện linh hoạt theo kích thước màn hình, giao diện xoay ngang"), `../UI_PLATFORM_RULES.md` (cột Mobile), `docs/adr/002-website-native-design.md`.

## Global Constraints

- Vẫn là giao diện cột Mobile của `UI_PLATFORM_RULES.md` ở mọi kích thước. Tablet không lấy element của website (không thanh trên dạng chữ, không hover).
- Vùng chạm tối thiểu 44 dp; chữ nhỏ nhất 12 px.
- Không thêm chữ giải thích, không lời chào; không khối indigo lớn trên nền sáng.
- Màu chỉ lấy từ `src/theme/tokens.ts`; khoảng cách từ `space`.
- Mốc kích thước: compact `< 600`, medium `600–839`, expanded `>= 840` (dp, theo chiều rộng cửa sổ); `shortHeight` khi cao `< 480`.
- Không thêm dependency native mới (giữ chạy được trên Expo Go).
- Mỗi task kết thúc bằng `npm run typecheck`, `npm run lint` (0 lỗi) và `npm test` đều qua.

## Review Focus

1. Xoay máy khi đang gõ ở form đăng nhập/đăng ký: nội dung ô nhập và focus vẫn còn, bàn phím không che nút gửi. → Task 3, Step 1 (test `Screen` giữ `keyboardShouldPersistTaps` và chỉ đổi style, không remount con).
2. Xoay khi Modal mục lục bài học đang mở trên iOS: không bị khoá dọc, không treo. → Task 2 (test quét mọi `<Modal` có `supportedOrientations`).
3. Điện thoại ngang có tai thỏ bên trái/phải: nội dung và thanh hành động đáy không nằm dưới tai thỏ. → Task 3 (test padding = `insets.left/right + gutter`), Task 6 (ActionBar).
4. Tiêu đề khóa học tiếng Việt rất dài trong lưới 3 cột: không tràn ô, các ô cùng hàng cao bằng nhau. → Task 4 (test `numberOfLines` trên tiêu đề thẻ, hàng `alignItems: 'stretch'`).
5. Cửa sổ chia đôi Android hẹp (< 360 dp) hoặc chữ hệ thống 200 %: vẫn 1 cột, tab ở đáy, không cột phụ. → Task 1 (test `layoutFor(320, 640)`), checklist thiết bị ở Task 7.

---

### Task 1: Phân loại cửa sổ `layoutFor` và hook `useLayout`

**Files:**
- Create: `src/theme/layout.ts`
- Test: `src/theme/__tests__/layout.test.ts`

**Interfaces:**
- Produces:
  - `type WindowClass = 'compact' | 'medium' | 'expanded'`
  - `type Layout = { windowClass: WindowClass; landscape: boolean; shortHeight: boolean; columns: 1 | 2 | 3; statColumns: 2 | 4; gutter: number }`
  - `function layoutFor(width: number, height: number): Layout`
  - `function useLayout(): Layout` (dùng `useWindowDimensions()`, `useMemo` theo width/height)
  - `const contentWidth = { narrow: 480, reading: 720, wide: 1200 } as const`

- [ ] **Step 1: Viết test thất bại**

```ts
import { layoutFor } from '../layout';

it.each([
  [320, 640, 'compact', 1, 2, 16, false, false],   // chia đôi Android hẹp
  [390, 844, 'compact', 1, 2, 16, false, false],   // điện thoại dọc
  [844, 390, 'expanded', 3, 4, 32, true, true],    // điện thoại ngang
  [744, 1133, 'medium', 2, 4, 24, false, false],   // iPad mini dọc
  [1194, 834, 'expanded', 3, 4, 32, true, false],  // iPad ngang
])('layoutFor(%i, %i)', (w, h, windowClass, columns, statColumns, gutter, landscape, shortHeight) => {
  expect(layoutFor(w, h)).toEqual({ windowClass, columns, statColumns, gutter, landscape, shortHeight });
});

it('treats the 600 and 840 boundaries as the larger class', () => {
  expect(layoutFor(599, 900).windowClass).toBe('compact');
  expect(layoutFor(600, 900).windowClass).toBe('medium');
  expect(layoutFor(840, 900).windowClass).toBe('expanded');
});
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `npx jest src/theme/__tests__/layout.test.ts`
Expected: FAIL, "Cannot find module '../layout'"

- [ ] **Step 3: Viết `layoutFor`, `useLayout`, `contentWidth` trong `src/theme/layout.ts`**

Gutter: compact 16 (`space.lg`), medium 24 (`space.xl`), expanded 32 (`space.xxl`). `columns`: 1/2/3 theo class. `statColumns`: 2 khi compact, 4 khi còn lại. `landscape = width > height`, `shortHeight = height < 480`.

- [ ] **Step 4: Chạy test, xác nhận qua**

Run: `npx jest src/theme/__tests__/layout.test.ts`
Expected: PASS (6 test)

- [ ] **Step 5: Commit**

```bash
git add src/theme/layout.ts src/theme/__tests__/layout.test.ts
git commit -m "feat(layout): classify window size for responsive screens"
```

---

### Task 2: Mở khoá xoay màn hình

**Files:**
- Modify: `app.json` (`expo.orientation`: `"portrait"` → `"default"`)
- Modify: `src/app/course/[courseId]/lesson/[lessonId]/index.tsx:225` (`<Modal>` thêm `supportedOrientations`)
- Modify: mọi `<Modal` khác trong `src/` mà test tìm thấy
- Test: `src/theme/__tests__/orientation-config.test.ts`

**Interfaces:**
- Produces: hằng `ALL_ORIENTATIONS = ['portrait', 'landscape-left', 'landscape-right'] as const` trong `src/theme/layout.ts`; mọi Modal dùng `supportedOrientations={ALL_ORIENTATIONS}`.

- [ ] **Step 1: Viết test thất bại**

```ts
import fs from 'node:fs';
import path from 'node:path';

it('lets the app rotate', () => {
  const app = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../app.json'), 'utf8'));
  expect(app.expo.orientation).toBe('default');
});

it('every Modal supports landscape (iOS locks Modals to portrait otherwise)', () => {
  const files: string[] = [];
  const walk = (d: string) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) =>
    e.isDirectory() ? (e.name !== '__tests__' && walk(path.join(d, e.name))) : /\.tsx$/.test(e.name) && files.push(path.join(d, e.name)));
  walk(path.join(__dirname, '../..'));
  const offenders = files.filter((f) => {
    const src = fs.readFileSync(f, 'utf8');
    // Đếm thay vì regex thẻ: props kiểu `onRequestClose={() => …}` chứa '>' làm regex dừng sớm.
    return (src.match(/<Modal\b/g) ?? []).length !== (src.match(/supportedOrientations=/g) ?? []).length;
  });
  expect(offenders).toEqual([]);
});
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `npx jest src/theme/__tests__/orientation-config.test.ts`
Expected: FAIL — `orientation` là `"portrait"`, danh sách offenders có `lesson/[lessonId]/index.tsx`

- [ ] **Step 3: Sửa `app.json` và thêm `supportedOrientations={ALL_ORIENTATIONS}` cho từng Modal**

- [ ] **Step 4: Chạy test, xác nhận qua**

Run: `npx jest src/theme/__tests__/orientation-config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app.json src/theme src/app
git commit -m "feat(layout): allow rotation and landscape modals"
```

Ghi chú: đổi `orientation` là thay đổi native. Expo Go nhận ngay; APK preview phải build lại.

---

### Task 3: `Screen` theo lề an toàn ngang và độ rộng nội dung

**Files:**
- Modify: `src/components/ui/screen.tsx`
- Test: `src/components/ui/__tests__/screen.test.tsx`

**Interfaces:**
- Consumes: `useLayout()`, `contentWidth` (Task 1)
- Produces: prop mới `width?: keyof typeof contentWidth` của `Screen`, mặc định `'wide'`. Nội dung con nằm trong một `View` có `testID="screen-body"`, style `{ width: '100%', maxWidth: contentWidth[width], alignSelf: 'center', gap: space.xl }`. `contentContainerStyle` dùng `paddingLeft: insets.left + layout.gutter` và `paddingRight: insets.right + layout.gutter` (bỏ `paddingHorizontal: space.lg` cố định).

- [ ] **Step 1: Viết test thất bại**

Mock `react-native-safe-area-context` (`useSafeAreaInsets` → `{ top: 0, bottom: 0, left: 47, right: 0 }`), mock `@/theme/layout` bằng `let mockLayout = layoutFor(844, 390); jest.mock('@/theme/layout', () => ({ ...jest.requireActual('@/theme/layout'), useLayout: () => mockLayout }))`, mock `@/theme/theme` như `flip-card.test.tsx`.

```tsx
it('pads past the landscape notch and the gutter', () => {
  const tree = create(<Screen><Txt>A</Txt></Screen>);
  const scroll = tree.root.findByType(ScrollView);
  const style = StyleSheet.flatten(scroll.props.contentContainerStyle);
  expect(style.paddingLeft).toBe(47 + 32);
  expect(style.paddingRight).toBe(32);
  expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
});

it('caps reading width and centres it', () => {
  const tree = create(<Screen width="reading"><Txt>A</Txt></Screen>);
  const body = StyleSheet.flatten(tree.root.findByProps({ testID: 'screen-body' }).props.style);
  expect(body).toMatchObject({ maxWidth: 720, alignSelf: 'center', width: '100%' });
});

it('keeps the same child instance across a rotation', () => {
  mockLayout = layoutFor(390, 844);
  const tree = create(<Screen><Field label="Email" /></Screen>);
  const before = tree.root.findByType(Field).instance ?? tree.root.findByType(Field);
  mockLayout = layoutFor(844, 390);
  tree.update(<Screen><Field label="Email" /></Screen>);
  expect(tree.root.findByType(Field).instance ?? tree.root.findByType(Field)).toBe(before);
});
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `npx jest src/components/ui/__tests__/screen.test.tsx`
Expected: FAIL — `paddingLeft` là `undefined` (đang dùng `paddingHorizontal: 16`)

- [ ] **Step 3: Sửa `Screen` theo Interfaces ở trên**

Đặt `width="reading"` cho: `course/new.tsx`, `lesson/[lessonId]/index.tsx`, `lesson/[lessonId]/edit.tsx`, `practice.tsx`, `(tabs)/settings.tsx`. Đặt `width="narrow"` cho `features/auth/components/auth-shell.tsx` nếu nó dùng `Screen`; nếu nó dùng `ScrollView` riêng thì áp cùng padding và `maxWidth: contentWidth.narrow` tại đó.

- [ ] **Step 4: Chạy toàn bộ test**

Run: `npm test`
Expected: PASS, không test cũ nào hỏng

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/screen.tsx src/components/ui/__tests__/screen.test.tsx src/app src/features/auth
git commit -m "feat(layout): respect horizontal safe area and cap content width"
```

---

### Task 4: Component `Grid` và lưới khóa học / số liệu

**Files:**
- Create: `src/components/ui/grid.tsx` (export thêm trong `src/components/ui/index.ts`), `src/features/courses/components/course-card.tsx`
- Test: `src/features/courses/__tests__/course-card.test.tsx`
- Modify: `src/app/(tabs)/courses.tsx:58` (danh sách khóa), `src/features/learning/components/progress-stats.tsx:51`, `src/app/(tabs)/admin.tsx:137`
- Test: `src/components/ui/__tests__/grid.test.tsx`

**Interfaces:**
- Consumes: `useLayout()` (Task 1)
- Produces: `function Grid(props: { columns: number; gap?: number; children: React.ReactNode }): JSX.Element`. Chia con thành hàng `columns` phần tử; mỗi ô `{ flexBasis: 0, flexGrow: 1, minWidth: 0 }`; hàng `{ flexDirection: 'row', alignItems: 'stretch', gap }`; hàng cuối thiếu ô thì thêm ô trống `testID="grid-spacer"` với `accessibilityElementsHidden` và `importantForAccessibility="no-hide-descendants"` để mọi ô rộng bằng nhau. `gap` mặc định `space.md`.

- [ ] **Step 1: Viết test thất bại**

```tsx
it('splits children into equal rows and pads the last one', () => {
  const tree = create(<Grid columns={2}>{[1, 2, 3, 4, 5].map((n) => <Txt key={n}>{n}</Txt>)}</Grid>);
  expect(tree.root.findAllByProps({ testID: 'grid-row' })).toHaveLength(3);
  expect(tree.root.findAllByProps({ testID: 'grid-spacer' })).toHaveLength(1);
});

it('renders one column without spacers', () => {
  const tree = create(<Grid columns={1}>{[1, 2].map((n) => <Txt key={n}>{n}</Txt>)}</Grid>);
  expect(tree.root.findAllByProps({ testID: 'grid-spacer' })).toHaveLength(0);
});

it('stretches cells so a row has one height', () => {
  const tree = create(<Grid columns={3}><Txt>a</Txt></Grid>);
  const row = StyleSheet.flatten(tree.root.findByProps({ testID: 'grid-row' }).props.style);
  expect(row.alignItems).toBe('stretch');
});
```

Thêm test `src/features/courses/__tests__/course-card.test.tsx`: tiêu đề của `CourseCard` có `numberOfLines={2}`. Không đặt test trong `src/app/`, vì expo-router coi mọi file ở đó là route.

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `npx jest src/components/ui/__tests__/grid.test.tsx`
Expected: FAIL, "Cannot find module '../grid'"

- [ ] **Step 3: Viết `Grid`; dùng nó ở ba chỗ**

- `courses.tsx`: `<Grid columns={layout.columns}>`; chuyển thẻ khóa sang `src/features/courses/components/course-card.tsx` với `export function CourseCard(props: { course: CourseListItem }): JSX.Element` (dùng kiểu phần tử của `data.courses` hiện tại); tiêu đề `numberOfLines={2}`.
- `progress-stats.tsx`: `<Grid columns={layout.statColumns}>`, bỏ `flexBasis: '47%'`.
- `admin.tsx`: tile dùng `<Grid columns={layout.statColumns}>`, bỏ `flexBasis: '47%'`.

- [ ] **Step 4: Chạy test**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui src/app src/features/learning
git commit -m "feat(layout): responsive grids for courses, stats and admin tiles"
```

---

### Task 5: Thanh tab đổi thành rail bên trái khi cửa sổ rộng

**Files:**
- Create: `src/features/navigation/tab-bar-options.ts` (không đặt trong `src/app/`, vì expo-router coi mọi file ở đó là route)
- Modify: `src/app/(tabs)/_layout.tsx:27-40`
- Test: `src/features/navigation/__tests__/tab-bar-options.test.ts`

**Interfaces:**
- Consumes: `Layout` (Task 1), `Palette` (`src/theme/tokens.ts`)
- Produces: `function tabBarOptionsFor(layout: Layout, insets: { left: number; bottom: number }, p: Palette): { tabBarPosition: 'bottom' | 'left'; tabBarVariant: 'uikit' | 'material'; tabBarLabelPosition: 'below-icon' | 'beside-icon'; tabBarStyle: ViewStyle }`

- [ ] **Step 1: Viết test thất bại**

```ts
it('keeps the bottom dock on compact windows', () => {
  const o = tabBarOptionsFor(layoutFor(390, 844), { left: 0, bottom: 34 }, light);
  expect(o).toMatchObject({ tabBarPosition: 'bottom', tabBarVariant: 'uikit', tabBarLabelPosition: 'below-icon' });
  expect(o.tabBarStyle.height).toBe(68 + 34);
});

it('uses a left rail clear of the notch on wide windows', () => {
  const o = tabBarOptionsFor(layoutFor(844, 390), { left: 47, bottom: 21 }, light);
  expect(o).toMatchObject({ tabBarPosition: 'left', tabBarVariant: 'material', tabBarLabelPosition: 'below-icon' });
  expect(o.tabBarStyle.paddingLeft).toBe(47);
  expect(o.tabBarStyle.height).toBeUndefined();
});
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `npx jest src/features/navigation`
Expected: FAIL, "Cannot find module"

- [ ] **Step 3: Viết `tabBarOptionsFor`; `_layout.tsx` gọi `useLayout()` và trải kết quả vào `screenOptions`**

Rail: `tabBarPosition: 'left'` khi `windowClass !== 'compact'`; nền `p.panel`, viền phải `p.line`; giữ `tabBarHideOnKeyboard` chỉ cho dock đáy.

- [ ] **Step 4: Chạy test**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/navigation src/app/(tabs)/_layout.tsx
git commit -m "feat(layout): navigation rail on wide windows"
```

---

### Task 6: Bố cục riêng cho bài học, làm bài và màn đăng nhập

**Files:**
- Create: `src/features/navigation/screen-modes.ts`
- Modify: `src/app/course/[courseId]/lesson/[lessonId]/index.tsx` (mục lục), `src/features/exercises/components/action-bar.tsx` (lề ngang), `src/features/auth/components/auth-shell.tsx`
- Test: `src/features/navigation/__tests__/screen-modes.test.ts`

**Interfaces:**
- Consumes: `Layout` (Task 1)
- Produces:
  - `function tocModeFor(layout: Layout): 'modal' | 'side'`: `'side'` chỉ khi `windowClass === 'expanded' && !layout.shortHeight` (tablet ngang); điện thoại ngang vẫn `'modal'`.
  - `function authModeFor(layout: Layout): 'stack' | 'split'`: `'split'` khi `layout.landscape && layout.shortHeight`; mascot bên trái, form bên phải, mỗi bên `flex: 1`.

- [ ] **Step 1: Viết test thất bại**

```ts
it.each([
  [390, 844, 'modal'], [844, 390, 'modal'], [744, 1133, 'modal'], [1194, 834, 'side'],
])('tocModeFor(%i, %i) = %s', (w, h, mode) => expect(tocModeFor(layoutFor(w, h))).toBe(mode));

it.each([
  [390, 844, 'stack'], [844, 390, 'split'], [1194, 834, 'stack'],
])('authModeFor(%i, %i) = %s', (w, h, mode) => expect(authModeFor(layoutFor(w, h))).toBe(mode));
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `npx jest src/features/navigation/__tests__/screen-modes.test.ts`
Expected: FAIL, "Cannot find module"

- [ ] **Step 3: Viết hai hàm; áp vào màn**

- Bài học: `'side'` → nội dung bài (`flex: 1`, `maxWidth: contentWidth.reading`) và cột mục lục rộng 280 bên phải, ẩn nút mở Modal; `'modal'` giữ như hiện tại.
- `action-bar.tsx`: `paddingLeft/Right = insets.left/right + layout.gutter`; nội dung căn giữa với `maxWidth: contentWidth.reading`.
- `auth-shell.tsx`: `'split'` → hàng ngang; `'stack'` giữ như hiện tại.
- Làm bài giữ quy tắc mobile "bài tập trước, bấm để mở tài liệu" ở mọi kích thước.

- [ ] **Step 4: Chạy test**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features src/app
git commit -m "feat(layout): side contents on tablets and split auth in landscape"
```

---

### Task 7: Nghiệm thu trên thiết bị và ghi tài liệu

**Files:**
- Create: `docs/adr/003-responsive-layout.md` (mốc 600/840/480, rail, chiều rộng nội dung, lý do giữ cột Mobile trên tablet)
- Modify: `docs/mobile-roadmap-status.md` (thêm mục "Responsive và xoay ngang")

- [ ] **Step 1: Kiểm tra tự động**

Run: `npm run typecheck && npm run lint && npm test && npm run test:tooling`
Expected: typecheck không lỗi; lint `0 errors`; Jest và tooling đều PASS

- [ ] **Step 2: Kiểm tra trên Expo Go với `npx expo start --go`**, ghi kết quả từng dòng vào `docs/mobile-roadmap-status.md`:
  - Điện thoại dọc và ngang: tất cả tab, chi tiết khóa, bài học, làm bài, kết quả, đăng nhập.
  - Xoay khi đang gõ ở đăng nhập; xoay khi mục lục bài học mở; xoay giữa bài làm.
  - Tai thỏ ở cả hai hướng ngang (xoay trái và xoay phải).
  - Chữ hệ thống lớn nhất, ở cả dọc và ngang.
  - Tablet hoặc emulator tablet (Android Studio: Pixel Tablet; Xcode: iPad) dọc và ngang; chia đôi màn hình Android.
  - Sáng và tối.

- [ ] **Step 3: Commit**

```bash
git add docs
git commit -m "docs(layout): record responsive layout decision and device results"
```
