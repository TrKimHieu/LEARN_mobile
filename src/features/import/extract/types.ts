export type ExtractedPage = { page: number | null; text: string };

export type Extracted = {
  method: 'TEXT' | 'PDF_TEXT' | 'OCR';
  pages: ExtractedPage[];
  pageCount: number | null;
};

export type ImportErrorCode =
  | 'TOO_LARGE'
  | 'TOO_MANY_PAGES'
  | 'TIMEOUT'
  | 'EMPTY'
  | 'UNSUPPORTED'
  | 'UNREADABLE'
  | 'OCR_UNAVAILABLE';

const DEFAULT_MESSAGES: Record<ImportErrorCode, string> = {
  TOO_LARGE: 'Tệp quá lớn. Chọn tệp nhỏ hơn 25 MB.',
  TOO_MANY_PAGES: 'Tài liệu quá 100 trang. Hãy tách nhỏ rồi nhập lại.',
  TIMEOUT: 'Đọc tệp quá 30 giây. Thử tệp ngắn hơn.',
  EMPTY: 'Không tìm thấy chữ trong tệp.',
  UNSUPPORTED: 'Chưa hỗ trợ loại tệp này. Chọn PDF, ảnh hoặc tệp văn bản.',
  UNREADABLE: 'Không đọc được tệp. Kiểm tra lại tệp rồi thử lại.',
  OCR_UNAVAILABLE: 'Nhận dạng chữ trong ảnh cần bản cài đặt đầy đủ của app, không chạy trong Expo Go.',
};

export class ImportError extends Error {
  code: ImportErrorCode;

  constructor(code: ImportErrorCode, message?: string) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = 'ImportError';
    this.code = code;
    Object.setPrototypeOf(this, ImportError.prototype);
  }
}
