import { useCallback, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import type { ImportTextDocumentInput } from '@/contracts';
import { errorText } from '@/lib/api-client';
import { useImportText } from './import-api';
import { assertSize, kindOf } from './extract/limits';
import { dataUrlToCacheFile, extractImage, isOcrAvailable, recognizeImage } from './extract/ocr';
import { planPdfPages } from './extract/pdf-bridge';
import { usePdfExtractor } from './extract/pdf-extractor';
import { extractPlain } from './extract/plain';
import type { Extracted, ExtractedPage } from './extract/types';

export type ImportState =
  | { phase: 'idle' }
  | { phase: 'picking' }
  | { phase: 'extracting'; label: string }
  | { phase: 'review' }
  | { phase: 'sending' }
  | { phase: 'done' }
  | { phase: 'error'; message: string };

export const PICKER_TYPES = ['application/pdf', 'image/*', 'text/plain', 'text/markdown'];

const MIME = { text: 'text/plain', pdf: 'application/pdf', image: 'image/jpeg' } as const;

interface Source {
  mime: string;
  size: number;
}

function messageOf(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Không đọc được tệp này.';
}

/** Luồng nhập: chọn tệp, trích chữ tại máy, xem/sửa, gửi văn bản. */
export function useImport(courseId: string) {
  const importText = useImportText(courseId);
  const pdf = usePdfExtractor();
  const [state, setState] = useState<ImportState>({ phase: 'idle' });
  const [source, setSource] = useState<Source | null>(null);
  const [method, setMethod] = useState<Extracted['method']>('TEXT');
  const [filename, setFilename] = useState('');
  const [pages, setPages] = useState<ExtractedPage[]>([]);
  const [skippedPages, setSkippedPages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setState({ phase: 'idle' });
    setSource(null);
    setPages([]);
    setSkippedPages(0);
    setError(null);
  }, []);

  const { extract } = pdf;
  const extractPdf = useCallback(
    async (uri: string): Promise<Extracted> => {
      const raw = await extract(uri);
      const { textPages, needsOcr } = planPdfPages(raw.pages.map((p) => ({ page: p.page, text: p.text })));
      const ocrOk = needsOcr.length > 0 && isOcrAvailable();
      const merged = [...textPages];
      if (ocrOk) {
        for (const n of needsOcr) {
          const url = raw.pages.find((p) => p.page === n)?.imageDataUrl;
          if (!url) continue;
          setState({ phase: 'extracting', label: `Nhận dạng trang ${n}/${raw.pageCount}` });
          const text = await recognizeImage(await dataUrlToCacheFile(url));
          merged.push({ page: n, text });
        }
      }
      setSkippedPages(ocrOk ? 0 : needsOcr.length);
      merged.sort((a, b) => (a.page ?? 0) - (b.page ?? 0));
      return { method: ocrOk ? 'OCR' : 'PDF_TEXT', pages: merged, pageCount: raw.pageCount };
    },
    [extract],
  );

  const start = useCallback(async () => {
    setError(null);
    setSkippedPages(0);
    setState({ phase: 'picking' });
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: PICKER_TYPES, copyToCacheDirectory: true });
      const asset = res.canceled ? null : res.assets?.[0];
      if (!asset) {
        setState({ phase: 'idle' });
        return;
      }
      const kind = kindOf(asset.name, asset.mimeType ?? null);
      if (!kind) throw new Error('Chỉ nhập được PDF, ảnh hoặc tệp văn bản.');
      assertSize(asset.size ?? 0);
      setState({ phase: 'extracting', label: 'Đang đọc tệp' });
      const out =
        kind === 'text'
          ? await extractPlain(asset.uri)
          : kind === 'image'
            ? await extractImage(asset.uri)
            : await extractPdf(asset.uri);
      if (!out.pages.some((p) => p.text.trim())) throw new Error('Không tìm thấy chữ trong tệp này.');
      setSource({ mime: asset.mimeType ?? MIME[kind], size: asset.size ?? 0 });
      setFilename(asset.name);
      setMethod(out.method);
      setPages(out.pages);
      setState({ phase: 'review' });
    } catch (e) {
      setState({ phase: 'error', message: messageOf(e) });
    }
  }, [extractPdf]);

  const setPageText = useCallback((i: number, text: string) => {
    setPages((cur) => cur.map((p, j) => (j === i ? { ...p, text } : p)));
  }, []);

  const canSend = state.phase === 'review' && filename.trim().length > 0 && pages.some((p) => p.text.trim());

  const send = useCallback(async () => {
    if (!canSend || !source) return;
    const input: ImportTextDocumentInput = {
      filename: filename.trim(),
      sourceMimeType: source.mime,
      sourceSizeBytes: Math.max(1, source.size),
      method,
      pages,
    };
    setError(null);
    setState({ phase: 'sending' });
    try {
      await importText.mutateAsync(input);
      setState({ phase: 'done' });
    } catch (e) {
      setError(errorText(e, 'Không gửi được. Thử lại.'));
      setState({ phase: 'review' });
    }
  }, [canSend, source, filename, method, pages, importText]);

  const chars = pages.reduce((n, p) => n + p.text.length, 0);

  return {
    state, filename, setFilename, pages, setPageText, skippedPages, chars, canSend, error,
    element: pdf.element, start, send, cancel: reset,
  };
}
