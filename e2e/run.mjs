/**
 * E2E trên BẢN WEB của app (`npm run web`, cổng 8081) với API + worker thật của LEARN.
 *
 *   npm run e2e                    # mọi luồng
 *   npm run e2e -- learner admin   # chọn luồng: learner | create | admin
 *
 * Cần: Docker (Postgres/Redis/MinIO) + `npm run dev:api` + worker `LLM_MODE=mock` bên LEARN (luồng
 * `create` sinh bài bằng AI), và `npm run web` ở repo này. Tài khoản demo/admin là dữ liệu seed dev
 * của LEARN. Ảnh chụp + báo cáo axe ghi vào `e2e/out/` (không commit).
 *
 * Không thay kiểm thử trên điện thoại thật — xem checklist trong README.
 */
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8081';
const OUT = new URL('./out/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DEMO = { email: 'demo@learn.ai', password: 'Demo@12345' };
const ADMIN = { email: 'admin@learn.ai', password: 'Admin@12345' };
mkdirSync(OUT, { recursive: true });

const failures = [];
const axeViolations = [];

async function newPage(browser, scheme) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: scheme,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text().slice(0, 200)}`));
  return { page, errors, close: () => ctx.close() };
}

async function shot(page, name, { axe = true } = {}) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}${name}.png` });
  if (axe) {
    // Chỉ các lỗi thật sự chặn người dùng (serious/critical) — cùng ngưỡng audit của web.
    const result = await new AxeBuilder({ page }).analyze();
    const bad = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    for (const v of bad) axeViolations.push(`${name}: ${v.id} (${v.nodes.length})`);
  }
  console.log('  ✓', name);
}

async function login(page, who) {
  await page.goto(BASE);
  await page.getByPlaceholder('ban@vidu.com').fill(who.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(who.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
}

const tab = async (page, name) => {
  await page.getByText(name, { exact: true }).last().click();
  await page.waitForTimeout(1200);
};

/** Người học: đi qua mọi màn chính, sáng + tối. */
async function learner(browser) {
  for (const scheme of ['light', 'dark']) {
    console.log(`learner (${scheme})`);
    const { page, errors, close } = await newPage(browser, scheme);
    await page.goto(BASE);
    await page.getByPlaceholder('ban@vidu.com').waitFor();
    await shot(page, `${scheme}-01-login`);
    await login(page, DEMO);
    await page.getByText('HỌC TIẾP').waitFor({ timeout: 15000 });
    await shot(page, `${scheme}-02-overview`);
    await tab(page, 'Khóa học');
    await shot(page, `${scheme}-03-courses`);
    await page.getByRole('button', { name: /^Lập trình TypeScript/ }).first().click();
    await page.getByRole('heading', { name: 'Lộ trình bài học' }).waitFor({ timeout: 15000 });
    await shot(page, `${scheme}-04-course`);
    await page.getByRole('button', { name: /^Bài 1:/ }).first().click();
    await page.getByRole('button', { name: 'Làm bài tập' }).waitFor({ timeout: 15000 });
    await shot(page, `${scheme}-05-lesson`);
    await page.getByRole('button', { name: 'Làm bài tập' }).click();
    await page.getByText(/câu, cần/).first().waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: 'Nộp bài' }).click();
    await shot(page, `${scheme}-06-practice-missing`);
    for (const group of await page.getByRole('radiogroup').all()) await group.getByRole('radio').first().click();
    for (const box of await page.getByPlaceholder('Nhập câu trả lời…').all()) await box.fill('thử');
    await page.getByRole('button', { name: 'Nộp bài' }).click();
    await page.getByText('Xem lại từng câu').first().waitFor({ timeout: 15000 });
    await shot(page, `${scheme}-07-result`);
    for (let i = 0; i < 3; i++) {
      await page.goBack();
      await page.waitForTimeout(700);
    }
    await tab(page, 'Tiến trình');
    await shot(page, `${scheme}-08-progress`);
    await tab(page, 'Cài đặt');
    await shot(page, `${scheme}-09-settings`);
    if (await page.getByText('Quản trị', { exact: true }).count()) failures.push('learner thấy tab Quản trị');
    failures.push(...errors.map((e) => `learner/${scheme} ${e}`));
    await close();
  }
}

/** Tạo mới đầu-cuối: đăng ký → tạo khóa → tải tài liệu → trích xuất → sinh bài → đăng xuất. */
async function create(browser) {
  console.log('create');
  const { page, errors, close } = await newPage(browser, 'light');
  const email = `e2e-mobile-${Date.now()}@learn.ai`;
  await page.goto(BASE);
  await page.getByText('Đăng ký miễn phí').click();
  await page.getByPlaceholder('Nguyễn Văn A').fill('Người thử Mobile');
  await page.getByPlaceholder('ban@vidu.com').fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('MobileTest@123');
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await page.getByText('Chưa có khóa học nào').waitFor({ timeout: 15000 });
  await shot(page, 'create-01-empty');
  await page.getByRole('button', { name: 'Tạo khóa học đầu tiên' }).click();
  await page.getByText('Tên khóa học', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Tạo khóa học', exact: true }).click();
  await shot(page, 'create-02-form-error');
  await page.getByPlaceholder('Ví dụ: Nhập môn giao thức HTTP').fill('Git cơ bản (e2e)');
  await page.getByRole('button', { name: 'Tạo khóa học', exact: true }).click();
  await page.getByRole('heading', { name: 'Lộ trình bài học' }).waitFor({ timeout: 15000 });
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Chọn tệp để tải lên' }).click();
  await (await chooser).setFiles(new URL('./fixtures/git-co-ban.md', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  await page.getByText('Đã trích xuất').waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Sinh bài học', exact: true }).click();
  await page.getByText(/AI Job ·|Đang kết nối/).first().waitFor({ timeout: 15000 });
  await shot(page, 'create-03-ai-job', { axe: false });
  await page.getByRole('button', { name: /^Bài 1:/ }).first().waitFor({ timeout: 120000 });
  await shot(page, 'create-04-lessons');
  await page.goBack();
  await page.waitForTimeout(1200);
  await tab(page, 'Cài đặt');
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.getByText('Chào mừng trở lại').waitFor({ timeout: 10000 });
  console.log(`  ✓ logout (tài khoản thử: ${email} — dọn bằng "npm run db:cleanup:e2e" bên LEARN)`);
  failures.push(...errors.map((e) => `create ${e}`));
  await close();
}

/** Quản trị rút gọn: chỉ ADMIN thấy tab; xem số liệu và danh sách AI Job. */
async function admin(browser) {
  console.log('admin');
  const { page, errors, close } = await newPage(browser, 'light');
  await login(page, ADMIN);
  await page.getByText('Tổng quan', { exact: true }).first().waitFor({ timeout: 15000 });
  await tab(page, 'Quản trị');
  await page.getByText('Chi phí LLM 7 ngày').waitFor({ timeout: 15000 });
  await shot(page, 'admin-01-metrics');
  await page.getByRole('button', { name: 'AI Job' }).click();
  await page.getByRole('radiogroup', { name: 'Lọc theo trạng thái' }).waitFor({ timeout: 15000 });
  await page.getByRole('radio', { name: 'Tất cả' }).click();
  await page.waitForTimeout(1500);
  await shot(page, 'admin-02-ai-jobs');
  const first = page.getByRole('button', { name: /Sinh bài học|Trích xuất|Sinh lại/ }).first();
  if (await first.count()) {
    await first.click();
    await page.getByText('Lịch sử thao tác admin').waitFor({ timeout: 15000 });
    await shot(page, 'admin-03-ai-job');
  }
  failures.push(...errors.map((e) => `admin ${e}`));
  await close();
}

const FLOWS = { learner, create, admin };
const chosen = process.argv.slice(2).filter((a) => a in FLOWS);
const browser = await chromium.launch();
try {
  for (const name of chosen.length ? chosen : Object.keys(FLOWS)) await FLOWS[name](browser);
} catch (err) {
  failures.push(String(err?.message ?? err).split('\n')[0]);
} finally {
  await browser.close();
}

if (axeViolations.length) console.log('\naxe (serious/critical):\n  ' + axeViolations.join('\n  '));
if (failures.length) console.log('\nLỗi:\n  ' + failures.join('\n  '));
console.log(`\nẢnh: ${OUT}`);
process.exit(failures.length || axeViolations.length ? 1 : 0);
