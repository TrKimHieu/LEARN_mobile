// Đóng gói pdf.js (legacy build) thành chuỗi để WebView chạy hoàn toàn offline.
// Chạy: node scripts/gen-pdfjs.mjs   (sau mỗi lần đổi phiên bản pdfjs-dist)
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const pkgPath = require.resolve('pdfjs-dist/package.json', { paths: [root] });
const base = join(dirname(pkgPath), 'legacy', 'build');
const version = JSON.parse(readFileSync(pkgPath, 'utf8')).version;

const lib = readFileSync(join(base, 'pdf.min.mjs'), 'utf8');
const worker = readFileSync(join(base, 'pdf.worker.min.mjs'), 'utf8');

const out = `
// Tệp sinh tự động bởi scripts/gen-pdfjs.mjs (pdfjs-dist ${version}). Không sửa tay.
export const PDFJS_VERSION = ${JSON.stringify(version)};
export const PDFJS_LIB_SOURCE: string = ${JSON.stringify(lib)};
export const PDFJS_WORKER_SOURCE: string = ${JSON.stringify(worker)};
`;
writeFileSync(join(root, 'src/features/import/extract/pdfjs-source.generated.ts'), out);
console.log(`pdfjs-source.generated.ts: pdfjs-dist ${version}, lib ${lib.length} + worker ${worker.length} ký tự`);
