import { File } from 'expo-file-system';
import { strFromU8, unzipSync } from 'fflate';
import { LIMITS, normalizeText } from './limits';
import { ImportError, type Extracted, type ExtractedPage } from './types';

/**
 * DOCX/PPTX trích tại máy (T1-4, ADR 004 sửa đổi): giải nén ZIP bằng fflate (JS thuần), đọc chữ trong XML.
 * Không dùng cloud. Bảng, hình, ghi chú diễn giả không lấy; chỉ lấy chữ thân bài.
 */
export type OfficeKind = 'docx' | 'pptx';

/** Tổng dung lượng giải nén tối đa, chặn ZIP bomb. */
const MAX_UNZIPPED = 100 * 1024 * 1024;
/** DOCX không có trang thật: cắt văn bản thành khối để vừa giới hạn mỗi trang của server. */
const DOCX_CHUNK = 20_000;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] !== '#') return ENTITIES[e.toLowerCase()] ?? '';
    const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
}

/** Đoạn văn: `<w:p>` (Word) hoặc `<a:p>` (PowerPoint); chữ trong `<w:t>`/`<a:t>`; tab và xuống dòng giữ nguyên. */
export function paragraphsOf(xml: string, ns: 'w' | 'a'): string[] {
  const out: string[] = [];
  const para = new RegExp(`<${ns}:p[ >][\\s\\S]*?</${ns}:p>`, 'g');
  const run = new RegExp(`<${ns}:t(?: [^>]*)?>([\\s\\S]*?)</${ns}:t>|<${ns}:tab/>|<${ns}:br/>`, 'g');
  for (const [p] of xml.matchAll(para)) {
    let line = '';
    for (const m of p.matchAll(run)) {
      line += m[1] !== undefined ? decodeXml(m[1]) : m[0].includes('tab') ? '\t' : '\n';
    }
    out.push(line);
  }
  return out;
}

function chunk(text: string, size: number): string[] {
  const parts: string[] = [];
  let cur = '';
  for (const para of text.split('\n')) {
    if (cur && cur.length + para.length + 1 > size) {
      parts.push(cur);
      cur = '';
    }
    // Một đoạn dài hơn cả khối thì cắt cứng.
    let p = para;
    while (p.length > size) {
      parts.push(p.slice(0, size));
      p = p.slice(size);
    }
    cur = cur ? `${cur}\n${p}` : p;
  }
  if (cur) parts.push(cur);
  return parts;
}

function unzip(bytes: Uint8Array, want: (name: string) => boolean): Record<string, Uint8Array> {
  let total = 0;
  try {
    return unzipSync(bytes, {
      filter: (f) => {
        if (!want(f.name)) return false;
        total += f.originalSize;
        if (total > MAX_UNZIPPED) throw new ImportError('TOO_LARGE');
        return true;
      },
    });
  } catch (e) {
    if (e instanceof ImportError) throw e;
    throw new ImportError('UNREADABLE');
  }
}

export function extractOfficeBytes(bytes: Uint8Array, kind: OfficeKind): Extracted {
  if (kind === 'docx') {
    const files = unzip(bytes, (n) => n === 'word/document.xml');
    const xml = files['word/document.xml'];
    if (!xml) throw new ImportError('UNREADABLE');
    const text = normalizeText(paragraphsOf(strFromU8(xml), 'w').join('\n'));
    if (!text) throw new ImportError('EMPTY');
    const parts = chunk(text, DOCX_CHUNK);
    if (parts.length > LIMITS.maxPages) throw new ImportError('TOO_MANY_PAGES');
    return { method: 'TEXT', pages: parts.map((t) => ({ page: null, text: t })), pageCount: null };
  }

  const slideName = /^ppt\/slides\/slide(\d+)\.xml$/;
  const files = unzip(bytes, (n) => slideName.test(n));
  const slides = Object.keys(files)
    .map((n) => ({ n: Number(slideName.exec(n)![1]), name: n }))
    .sort((a, b) => a.n - b.n);
  if (slides.length === 0) throw new ImportError('UNREADABLE');
  if (slides.length > LIMITS.maxPages) throw new ImportError('TOO_MANY_PAGES');
  // Số trang = thứ tự slide trong tệp (shortcut: không đọc presentation.xml nên slide ẩn/đổi thứ tự vẫn theo số tệp).
  const pages: ExtractedPage[] = slides
    .map((s, i) => ({ page: i + 1, text: normalizeText(paragraphsOf(strFromU8(files[s.name]!), 'a').join('\n')) }))
    .filter((p) => p.text);
  if (pages.length === 0) throw new ImportError('EMPTY');
  return { method: 'TEXT', pages, pageCount: slides.length };
}

/**
 * shortcut: giải nén chạy đồng bộ trên luồng JS nên không ngắt được ở mốc 30 giây như PDF; tệp đã bị chặn
 * ở 25 MiB nén / 100 MiB giải nén. Đo trên thiết bị thật; chậm quá thì chuyển sang `unzip` bất đồng bộ.
 */
export async function extractOffice(uri: string, kind: OfficeKind): Promise<Extracted> {
  let bytes: Uint8Array;
  try {
    bytes = await new File(uri).bytes();
  } catch {
    throw new ImportError('UNREADABLE');
  }
  return extractOfficeBytes(bytes, kind);
}
