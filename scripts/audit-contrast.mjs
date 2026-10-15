/**
 * Đo tương phản chữ trên NỀN THẬT — phần axe không làm được.
 *
 * axe (`audit-a11y.mjs`) gặp chữ nằm trên ảnh nền (sóng hạt `GrainWaves`, ADR 018) thì không tính
 * được màu nền: nó xếp phần tử vào "incomplete" (`bgOverlap`), KHÔNG báo vi phạm. Nên "axe 0 vi
 * phạm" ở màn có sóng chưa nói gì về tương phản. Đã bắt gặp thật (2026-10-14): axe sạch 21 màn,
 * script này tìm ra 9 chỗ dưới chuẩn (số bước 01/03 ở màn đăng nhập 2.7:1, tab con admin 3.3:1…).
 *
 * Cách đo, mỗi màn:
 *   1. Ghi hộp, màu, cỡ, độ đậm của từng đoạn chữ đang hiện.
 *   2. Ẩn mọi chữ (`color: transparent`) rồi chụp — ra đúng nền nằm sau từng chữ.
 *   3. Trong hộp của mỗi đoạn: tỉ lệ tương phản giữa màu chữ và TỪNG điểm ảnh nền, lấy phân vị 10%
 *      (một hạt nhiễu lẻ không quyết định, nhưng một vệt sáng chạy sau chữ thì có).
 *   4. So với WCAG 1.4.3: 4.5:1, chữ lớn (≥ 24px, hoặc ≥ 18.66px đậm) 3:1.
 * Phân tích điểm ảnh chạy ngay trong trang (canvas) — không cần thư viện ảnh.
 *
 * Cảnh nền là tất định theo màn (`wave-scenes.ts`), nên chạy hết các màn = kiểm hết trường hợp thật.
 *
 * Yêu cầu: như `audit-a11y.mjs` (web + api + hạ tầng docker, database đã seed).
 * Chạy:  node scripts/audit-contrast.mjs            # cả hai tông
 * Ra:    danh sách đoạn chữ dưới chuẩn; exit code 1 nếu có.
 */
import { chromium } from 'playwright';

const BASE = process.env.WEB_URL ?? 'http://localhost:3000';
const LEARNER = { email: 'demo@learn.ai', password: 'Demo@12345' };
const ADMIN = { email: 'admin@learn.ai', password: 'Admin@12345' };

const ANON_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/khong-ton-tai',
];
const LEARNER_ROUTES = ['/dashboard', '/courses', '/courses/new', '/progress', '/settings'];
const ADMIN_ROUTES = [
  '/admin',
  '/admin/users',
  '/admin/courses',
  '/admin/ai-jobs',
  '/admin/subscriptions',
  '/admin/metrics',
];

/** Phân vị lấy làm "nền tệ nhất" của một đoạn chữ — xem docblock. */
const PERCENTILE = 0.1;

/** Như `audit-a11y.mjs#open`: màn bài học không bao giờ "networkidle"; dev server có thể tự restart. */
async function open(page, route) {
  for (let i = 0; ; i += 1) {
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 90000 });
      break;
    } catch (err) {
      if (i > 20 || !/CONNECTION_REFUSED|ERR_EMPTY|ECONNRESET/.test(err.message)) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function hrefs(page, re) {
  const all = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href') ?? ''));
  return [...new Set(all.filter((h) => re.test(h)))];
}

async function login(page, { email, password }) {
  await open(page, '/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 30000 });
}

/** Bước 1: các đoạn chữ đang hiện trong khung nhìn. */
function collectText() {
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.textContent.trim()) continue;
    const el = t.parentElement;
    if (!el || el.closest('[aria-hidden="true"], .sr-only, script, style')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden') continue;
    const range = document.createRange();
    range.selectNodeContents(t);
    for (const r of range.getClientRects()) {
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) continue;
      if (r.right < 0 || r.left > innerWidth) continue;
      out.push({
        x: r.left,
        y: r.top,
        w: r.width,
        h: r.height,
        color: cs.color,
        size: parseFloat(cs.fontSize),
        weight: Number(cs.fontWeight),
        text: t.textContent.trim().slice(0, 40),
      });
    }
  }
  return out;
}

/** Bước 3 (chạy trong trang): tương phản phân vị của từng hộp trên ảnh nền đã chụp. */
async function measure({ png, boxes, percentile }) {
  const img = new Image();
  img.src = `data:image/png;base64,${png}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return boxes.map((b) => {
    const m = b.color.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return { ...b, ratio: null };
    const [fr, fg, fb] = [m[1], m[2], m[3]].map(Number);
    const a = m[4] === undefined ? 1 : Number(m[4]);
    const x0 = Math.max(0, Math.floor(b.x));
    const y0 = Math.max(0, Math.floor(b.y));
    const w = Math.min(canvas.width, Math.ceil(b.x + b.w)) - x0;
    const h = Math.min(canvas.height, Math.ceil(b.y + b.h)) - y0;
    if (w < 2 || h < 2 || a === 0) return { ...b, ratio: null };
    const px = ctx.getImageData(x0, y0, w, h).data;
    const ratios = [];
    for (let i = 0; i < px.length; i += 4) {
      // Chữ bán trong suốt trộn với nền thật trước khi so.
      const lf = lum(
        fr * a + px[i] * (1 - a),
        fg * a + px[i + 1] * (1 - a),
        fb * a + px[i + 2] * (1 - a),
      );
      const lb = lum(px[i], px[i + 1], px[i + 2]);
      ratios.push((Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05));
    }
    ratios.sort((p, q) => p - q);
    return { ...b, ratio: ratios[Math.floor(ratios.length * percentile)] };
  });
}

async function check(page, label, fails) {
  const boxes = await page.evaluate(collectText);
  const hide = await page.addStyleTag({
    content:
      '*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;' +
      'text-shadow:none!important;caret-color:transparent!important}' +
      '::placeholder{color:transparent!important}',
  });
  await page.waitForTimeout(150);
  const png = (await page.screenshot()).toString('base64');
  await hide.evaluate((n) => n.remove());
  const measured = await page.evaluate(measure, { png, boxes, percentile: PERCENTILE });
  let bad = 0;
  for (const b of measured) {
    if (b.ratio === null) continue;
    const large = b.size >= 24 || (b.size >= 18.66 && b.weight >= 700);
    const need = large ? 3 : 4.5;
    if (b.ratio < need) {
      bad += 1;
      fails.push({ label, ...b, need });
    }
  }
  console.log(`  ${bad ? '✗' : '✓'} ${label} — ${measured.length} đoạn chữ, ${bad} dưới chuẩn`);
}

async function main() {
  const browser = await chromium.launch();
  const fails = [];
  for (const colorScheme of ['light', 'dark']) {
    console.log(`\n── Tông ${colorScheme === 'light' ? 'sáng' : 'tối'} ──`);
    // DPR 1: hộp chữ và điểm ảnh cùng hệ toạ độ. `reduce`: sóng đứng ở trạng thái nghỉ, kết quả ổn định.
    const ctx = () =>
      browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        colorScheme,
        reducedMotion: 'reduce',
      });

    const anon = await (await ctx()).newPage();
    for (const r of ANON_ROUTES) {
      await open(anon, r);
      await check(anon, `${colorScheme} ${r}`, fails);
    }

    const lp = await (await ctx()).newPage();
    await login(lp, LEARNER);
    for (const r of LEARNER_ROUTES) {
      await open(lp, r);
      await check(lp, `${colorScheme} ${r}`, fails);
    }
    await open(lp, '/courses');
    for (const course of await hrefs(lp, /^\/courses\/(?!new$)[^/]+$/)) {
      await open(lp, course);
      const lesson = (await hrefs(lp, /^\/courses\/[^/]+\/lessons\/[^/]+$/))[0];
      if (!lesson) continue;
      await check(lp, `${colorScheme} /courses/[id]`, fails);
      await open(lp, lesson);
      await check(lp, `${colorScheme} /lessons/[id]`, fails);
      await open(lp, `${lesson}/practice`);
      await check(lp, `${colorScheme} /lessons/[id]/practice`, fails);
      break;
    }

    const ap = await (await ctx()).newPage();
    await login(ap, ADMIN);
    for (const r of ADMIN_ROUTES) {
      await open(ap, r);
      await check(ap, `${colorScheme} ${r}`, fails);
    }
    await open(ap, '/admin/ai-jobs');
    const job = (await hrefs(ap, /^\/admin\/ai-jobs\/[^/]+$/))[0];
    if (job) {
      await open(ap, job);
      await check(ap, `${colorScheme} /admin/ai-jobs/[id]`, fails);
    }
  }
  await browser.close();

  console.log('\n──────────── Tổng hợp ────────────');
  if (fails.length === 0) {
    console.log('Mọi đoạn chữ đạt WCAG 1.4.3 trên nền thật.');
    return;
  }
  for (const f of fails.sort((a, b) => a.ratio - b.ratio)) {
    console.log(
      `  ${f.ratio.toFixed(2)} < ${f.need}  ${f.label}  "${f.text}"  ${f.size}px ${f.color}` +
        `  @ ${Math.round(f.x)},${Math.round(f.y)}`,
    );
  }
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
