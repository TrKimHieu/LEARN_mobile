/**
 * Sinh icon app từ logo Circle (cùng hình `LogoMark` của web/app), bảng màu dịu của ADR 001:
 * thân #3d3d3d, mặt #fafafa, nền #f1f1f1 — không cặp đen tuyền/trắng.
 *
 *   node scripts/gen-icons.mjs     # ghi đè assets/*.png
 *
 * Dùng Playwright (devDependency, cũng dùng cho e2e) để vẽ SVG ra PNG đúng kích thước.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const assets = fileURLToPath(new URL('../assets/', import.meta.url));
const BG = '#f1f1f1';
const BODY = '#3d3d3d';
const FACE = '#fafafa';

/** Mắt + miệng trong hộp 100×100 của logo. */
const face = (color) => `
  <ellipse cx="35.5" cy="43" rx="6.5" ry="9.5" fill="${color}"/>
  <ellipse cx="64.5" cy="43" rx="6.5" ry="9.5" fill="${color}"/>
  <path d="M36 63 Q50 72 64 63" fill="none" stroke="${color}" stroke-width="5.5" stroke-linecap="round"/>`;

/** Thu logo về `scale` × khung, đặt giữa. */
const centred = (scale, inner) =>
  `<g transform="translate(${50 - 50 * scale} ${50 - 50 * scale}) scale(${scale})">${inner}</g>`;

const logo = (scale) => centred(scale, `<circle cx="50" cy="50" r="50" fill="${BODY}"/>${face(FACE)}`);

/** Android 13 themed icon: hệ thống tô màu theo kênh alpha — thân đặc, mắt/miệng khoét trống. */
const monochrome = (scale) =>
  `<mask id="m"><rect width="100" height="100" fill="white"/>${centred(scale, face('black'))}</mask>` +
  `<g mask="url(#m)">${centred(scale, '<circle cx="50" cy="50" r="50" fill="black"/>')}</g>`;

const svg = (content, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100">${
    bg ? `<rect width="100" height="100" fill="${bg}"/>` : ''
  }${content}</svg>`;

// Adaptive icon Android: vùng an toàn là 66% giữa khung → logo 58%.
const ICONS = [
  { file: 'icon.png', size: 1024, content: logo(0.72), bg: BG },
  { file: 'android-icon-foreground.png', size: 1024, content: logo(0.58), bg: null },
  { file: 'android-icon-background.png', size: 1024, content: '', bg: BG },
  { file: 'android-icon-monochrome.png', size: 1024, content: monochrome(0.58), bg: null },
  { file: 'splash-icon.png', size: 1024, content: logo(0.5), bg: null },
  { file: 'favicon.png', size: 64, content: logo(0.94), bg: null },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const icon of ICONS) {
  await page.setViewportSize({ width: icon.size, height: icon.size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><div style="width:${icon.size}px;height:${icon.size}px">${svg(icon.content, icon.bg)}</div></body></html>`,
  );
  await page.locator('div').screenshot({ path: `${assets}${icon.file}`, omitBackground: true });
  console.log('✓', icon.file);
}
await browser.close();
