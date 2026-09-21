import { extractPdfText, isLikelyScanned } from './pdf';

export class UnsupportedFileError extends Error {
  constructor(mimeType: string) {
    super(`Định dạng tài liệu không được hỗ trợ: ${mimeType}`);
    this.name = 'UnsupportedFileError';
  }
}

export class ScannedPdfNotSupportedError extends Error {
  constructor() {
    super('Tài liệu là PDF scan (không có lớp text) — OCR chưa được hỗ trợ ở phiên bản này.');
    this.name = 'ScannedPdfNotSupportedError';
  }
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractResult {
  pages: ExtractedPage[];
  pageCount: number | null;
}

const MAGIC_PDF = Buffer.from('%PDF-');

/** Kiểm tra magic bytes khớp mimeType đã khai — HANDBOOK §10.3, checklist 20.3. */
function verifyMagicBytes(bytes: Buffer, mimeType: string): void {
  if (mimeType === 'application/pdf') {
    if (!bytes.subarray(0, 5).equals(MAGIC_PDF)) {
      throw new UnsupportedFileError(
        'application/pdf (magic bytes không khớp — file có thể bị hỏng)',
      );
    }
    return;
  }
  // text/plain, text/markdown: từ chối nếu có byte NUL (dấu hiệu file nhị phân đội lốt text).
  if (bytes.subarray(0, 2000).includes(0)) {
    throw new UnsupportedFileError(`${mimeType} (nội dung có vẻ là nhị phân, không phải text)`);
  }
}

/** Dọn text thô trước khi cắt chunk — HANDBOOK §8.2 (rút gọn: gộp dòng trống, nối gạch nối). */
export function normalizeText(text: string): string {
  return text
    .replace(/(\w)-\n(\w)/g, '$1$2') // nối từ bị gạch nối cuối dòng
    .replace(/\n{3,}/g, '\n\n') // gộp nhiều dòng trống
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/** Trích text theo loại file — HANDBOOK §8.2. PPTX/DOCX/OCR: chưa hỗ trợ ở phiên bản này. */
export async function extractText(bytes: Buffer, mimeType: string): Promise<ExtractResult> {
  verifyMagicBytes(bytes, mimeType);

  if (mimeType === 'application/pdf') {
    const result = await extractPdfText(bytes);
    if (isLikelyScanned(result)) throw new ScannedPdfNotSupportedError();
    return {
      pages: result.pages.map((p) => ({ pageNumber: p.pageNumber, text: normalizeText(p.text) })),
      pageCount: result.pageCount,
    };
  }

  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return {
      pages: [{ pageNumber: 1, text: normalizeText(bytes.toString('utf-8')) }],
      pageCount: null,
    };
  }

  throw new UnsupportedFileError(mimeType);
}
