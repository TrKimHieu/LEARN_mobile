/**
 * Chép `@learn/contracts` (Zod schema dùng chung của API/web) từ repo LEARN sang `src/contracts/`.
 *
 * Vì sao chép thay vì dependency `file:../LEARN/...`: app mobile là repo riêng, có thể build ở
 * nơi không có repo LEARN nằm cạnh. Chép có kiểm soát giữ app tự đứng được, còn `--check` bắt
 * lệch phiên bản (chạy trong `npm run typecheck`).
 *
 *   node scripts/sync-contracts.mjs            # chép lại
 *   node scripts/sync-contracts.mjs --check    # chỉ so, lệch thì exit 1
 *
 * Nguồn mặc định `../LEARN/packages/contracts/src`, đổi bằng biến `LEARN_CONTRACTS_DIR`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(
  process.env.LEARN_CONTRACTS_DIR ?? join(root, '..', 'LEARN', 'packages', 'contracts', 'src'),
);
const target = join(root, 'src', 'contracts');
const check = process.argv.includes('--check');

const HEADER =
  '// SINH TỰ ĐỘNG từ LEARN/packages/contracts/src — KHÔNG sửa tay.\n' +
  '// Chạy `npm run sync:contracts` sau khi contracts bên LEARN đổi.\n\n';

if (!existsSync(source)) {
  // Không có repo LEARN cạnh bên (máy chỉ clone app mobile): dùng bản đã chép, không coi là lỗi.
  console.warn(`[contracts] Không thấy ${source} — giữ nguyên src/contracts.`);
  process.exit(0);
}

const files = readdirSync(source).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
const drift = [];

for (const file of files) {
  const next = HEADER + readFileSync(join(source, file), 'utf8');
  const dest = join(target, file);
  const current = existsSync(dest) ? readFileSync(dest, 'utf8') : null;
  if (current === next) continue;
  drift.push(file);
  if (!check) {
    mkdirSync(target, { recursive: true });
    writeFileSync(dest, next);
  }
}

// File đã bị xoá ở nguồn.
if (existsSync(target)) {
  for (const file of readdirSync(target)) {
    if (files.includes(file)) continue;
    drift.push(`${file} (thừa)`);
    if (!check) rmSync(join(target, file));
  }
}

if (check && drift.length > 0) {
  console.error(`[contracts] Lệch với LEARN: ${drift.join(', ')}. Chạy \`npm run sync:contracts\`.`);
  process.exit(1);
}
console.log(
  drift.length === 0
    ? '[contracts] Đã khớp.'
    : `[contracts] Đã chép ${drift.length} file: ${drift.join(', ')}`,
);
