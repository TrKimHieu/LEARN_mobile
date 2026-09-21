import type * as PdfJsModule from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * pdfjs-dist v4 chỉ phân phối bản ESM (.mjs) — TypeScript compile ra CommonJS sẽ hạ `import()`
 * thành `require()`, không load được. Ép dùng dynamic import thật qua `new Function` để né downlevel.
 */
const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<typeof PdfJsModule>;

const STANDARD_FONT_DATA_URL = `${require.resolve('pdfjs-dist/package.json').replace(/package\.json$/, '')}standard_fonts/`;

export interface PdfPage {
  pageNumber: number;
  text: string;
}

export interface PdfExtractResult {
  pages: PdfPage[];
  pageCount: number;
}

/** Trích text theo từng trang, giữ layer text — HANDBOOK §8.2. */
export async function extractPdfText(bytes: Buffer): Promise<PdfExtractResult> {
  const pdfjs = await dynamicImport('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    isEvalSupported: false,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  }).promise;

  const pages: PdfPage[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pages.push({ pageNumber: i, text });
  }
  await doc.destroy();
  return { pages, pageCount: doc.numPages };
}

/** Nhận diện PDF scan (không có text layer) — HANDBOOK §8.2: tổng ký tự / số trang < 100. */
export function isLikelyScanned(result: PdfExtractResult): boolean {
  const totalChars = result.pages.reduce((sum, p) => sum + p.text.length, 0);
  return result.pageCount > 0 && totalChars / result.pageCount < 100;
}
