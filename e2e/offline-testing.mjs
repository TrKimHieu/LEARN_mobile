import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

// Run Metro first. API traffic is intercepted, so no backend process is needed.
const base = process.env.E2E_BASE ?? 'http://localhost:8081';
const browser = await chromium.launch({
  headless: true,
  ...(process.env.E2E_BROWSER_CHANNEL ? { channel: process.env.E2E_BROWSER_CHANNEL }
    : !existsSync(chromium.executablePath()) && process.platform === 'win32' ? { channel: 'msedge' } : {}),
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
let apiRequests = 0;
page.on('pageerror', (error) => errors.push(error.message));
await page.route('**/api/v1/**', (route) => { apiRequests++; return route.abort('failed'); });
mkdirSync('e2e/out', { recursive: true });
try {
  await page.goto(base);
  await page.getByText('Sản phẩm đang không kết nối được với server', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await page.getByText('Vẫn chưa kết nối được với server. Bạn có thể chọn Testing để dùng thử.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Testing', exact: true }).click();
  await page.getByText('Sản phẩm đang không kết nối được với server', { exact: true }).waitFor({ state: 'hidden' });
  await page.getByText('Lập trình TypeScript', { exact: true }).last().waitFor();
  const requestsBeforeTesting = apiRequests;
  await page.screenshot({ path: 'e2e/out/offline-testing-overview.png', fullPage: true });

  await page.getByText('Lập trình TypeScript', { exact: true }).last().click();
  await page.getByText('Khái niệm cốt lõi về TypeScript', { exact: true }).last().waitFor();
  await page.goBack();
  await page.getByRole('button', { name: 'Ôn ngay', exact: true }).click();
  await page.getByTestId('review-card').waitFor();
  await page.getByRole('button', { name: 'Lật thẻ xem đáp án', exact: true }).click();
  await page.getByRole('button', { name: 'Được', exact: true }).click();
  await page.getByText(/^2\/\d+$/).waitFor();
  await page.screenshot({ path: 'e2e/out/offline-testing-review.png', fullPage: true });
  await page.goBack();

  await page.getByRole('tab', { name: 'Khóa học', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo khóa học', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tên khóa học', exact: true }).fill('Emulator demo');
  await page.getByRole('button', { name: 'Tạo khóa học', exact: true }).click();
  await page.getByRole('heading', { name: 'Emulator demo', exact: true }).last().waitFor();
  assert.equal(apiRequests, requestsBeforeTesting, 'Testing must not call the backend');

  await page.getByRole('button', { name: 'Thoát Testing', exact: true }).click();
  await page.getByText('Sản phẩm đang không kết nối được với server', { exact: true }).waitFor();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: 'Testing', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'e2e/out/offline-testing-landscape.png', fullPage: true });
  assert.deepEqual(errors, [], 'No uncaught application errors');
  console.log('PASS: outage, retry, Testing, courses, reviews, course creation, no backend requests, exit, landscape');
} finally {
  await browser.close();
}
