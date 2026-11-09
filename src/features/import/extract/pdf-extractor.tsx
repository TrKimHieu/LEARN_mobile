import { File } from 'expo-file-system';
import React, { useCallback, useRef, useState } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { LIMITS, assertSize, withTimeout } from './limits';
import { OCR_MIN_CHARS, parseBridgeMessage } from './pdf-bridge';
import { buildPdfHtml } from './pdf-html';
import { PDFJS_LIB_SOURCE, PDFJS_WORKER_SOURCE } from './pdfjs-source.generated';
import { ImportError } from './types';

export type PdfPageRaw = { page: number; text: string; imageDataUrl?: string };
export type PdfResult = { pageCount: number; pages: PdfPageRaw[] };

const CHUNK_CHARS = 512 * 1024;

type Job = {
  html: string;
  chunks: string[];
  pages: PdfPageRaw[];
  pageCount: number;
  resolve: (r: PdfResult) => void;
  reject: (e: unknown) => void;
  settled: boolean;
};

export function usePdfExtractor(): {
  element: React.ReactElement | null;
  extract(uri: string): Promise<PdfResult>;
} {
  const [html, setHtml] = useState<string | null>(null);
  const jobRef = useRef<Job | null>(null);
  const webRef = useRef<React.ComponentRef<typeof WebView>>(null);

  const finish = useCallback((job: Job, err?: unknown) => {
    if (job.settled) return;
    job.settled = true;
    if (jobRef.current === job) jobRef.current = null;
    setHtml(null);
    if (err) job.reject(err);
    else job.resolve({ pageCount: job.pageCount, pages: job.pages });
  }, []);

  const extract = useCallback(
    async (uri: string): Promise<PdfResult> => {
      const file = new File(uri);
      let base64: string;
      try {
        assertSize(file.size ?? 0);
        base64 = await file.base64();
      } catch (e) {
        if (e instanceof ImportError) throw e;
        throw new ImportError('UNREADABLE');
      }
      const chunks: string[] = [];
      for (let i = 0; i < base64.length; i += CHUNK_CHARS) chunks.push(base64.slice(i, i + CHUNK_CHARS));

      let job!: Job;
      const done = new Promise<PdfResult>((resolve, reject) => {
        job = {
          html: buildPdfHtml({
            libSource: PDFJS_LIB_SOURCE,
            workerSource: PDFJS_WORKER_SOURCE,
            maxPages: LIMITS.maxPages,
            minChars: OCR_MIN_CHARS,
          }),
          chunks,
          pages: [],
          pageCount: 0,
          resolve,
          reject,
          settled: false,
        };
      });
      jobRef.current = job;
      setHtml(job.html);
      try {
        return await withTimeout(done);
      } catch (e) {
        finish(job, e);
        throw e;
      }
    },
    [finish],
  );

  const onLoadEnd = useCallback(() => {
    const job = jobRef.current;
    const web = webRef.current;
    if (!job || !web) return;
    for (const c of job.chunks) web.injectJavaScript(`window.__chunk(${JSON.stringify(c)});true;`);
    job.chunks = [];
    web.injectJavaScript('window.__run();true;');
  }, []);

  const onMessage = useCallback(
    (ev: WebViewMessageEvent) => {
      const job = jobRef.current;
      if (!job) return;
      const msg = parseBridgeMessage(ev.nativeEvent.data);
      if (!msg) return;
      switch (msg.type) {
        case 'meta':
          job.pageCount = msg.pageCount;
          if (msg.pageCount > LIMITS.maxPages) finish(job, new ImportError('TOO_MANY_PAGES'));
          break;
        case 'page':
          job.pages.push({ page: msg.page, text: msg.text, imageDataUrl: msg.imageDataUrl });
          break;
        case 'done':
          finish(job);
          break;
        case 'error':
          finish(
            job,
            msg.reason === 'PASSWORD'
              ? new ImportError('UNREADABLE', 'PDF có mật khẩu. Mở khoá rồi nhập lại.')
              : new ImportError('UNREADABLE', 'Tệp PDF hỏng hoặc không đọc được.'),
          );
          break;
      }
    },
    [finish],
  );

  const onFail = useCallback(() => {
    const job = jobRef.current;
    if (job) finish(job, new ImportError('UNREADABLE'));
  }, [finish]);

  const element = html ? (
    <WebView
      ref={webRef}
      source={{ html }}
      originWhitelist={['*']}
      javaScriptEnabled
      onLoadEnd={onLoadEnd}
      onMessage={onMessage}
      onError={onFail}
      onHttpError={onFail}
      onRenderProcessGone={onFail}
      onContentProcessDidTerminate={onFail}
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
    />
  ) : null;

  return { element, extract };
}
