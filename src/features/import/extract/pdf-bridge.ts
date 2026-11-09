import type { ExtractedPage } from './types';

export const OCR_MIN_CHARS = 20;

export type BridgeMessage =
  | { type: 'meta'; pageCount: number }
  | { type: 'page'; page: number; text: string; imageDataUrl?: string }
  | { type: 'done' }
  | { type: 'error'; reason: 'PASSWORD' | 'INVALID' | 'OTHER' };

export function parseBridgeMessage(raw: string): BridgeMessage | null {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const m = v as Record<string, unknown>;
  switch (m.type) {
    case 'meta':
      return typeof m.pageCount === 'number' && Number.isInteger(m.pageCount) && m.pageCount >= 0
        ? { type: 'meta', pageCount: m.pageCount }
        : null;
    case 'page': {
      if (typeof m.page !== 'number' || typeof m.text !== 'string') return null;
      if (m.imageDataUrl === undefined) return { type: 'page', page: m.page, text: m.text };
      if (typeof m.imageDataUrl !== 'string') return null;
      return { type: 'page', page: m.page, text: m.text, imageDataUrl: m.imageDataUrl };
    }
    case 'done':
      return { type: 'done' };
    case 'error':
      return {
        type: 'error',
        reason: m.reason === 'PASSWORD' || m.reason === 'INVALID' ? m.reason : 'OTHER',
      };
    default:
      return null;
  }
}

export function planPdfPages(pages: { page: number; text: string }[]): {
  textPages: ExtractedPage[];
  needsOcr: number[];
} {
  const textPages: ExtractedPage[] = [];
  const needsOcr: number[] = [];
  for (const p of pages) {
    if (p.text.replace(/\s/g, '').length < OCR_MIN_CHARS) needsOcr.push(p.page);
    else textPages.push({ page: p.page, text: p.text });
  }
  return { textPages, needsOcr };
}
