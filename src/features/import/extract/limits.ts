import { ImportError } from './types';

export const LIMITS = { maxBytes: 26214400, maxPages: 100, timeoutMs: 30000 } as const;

export function kindOf(name: string, mime: string | null): 'text' | 'pdf' | 'image' | null {
  const ext = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (ext === 'txt' || ext === 'md') return 'text';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'heic') return 'image';
  const m = (mime ?? '').toLowerCase();
  if (m === 'application/pdf') return 'pdf';
  if (m.startsWith('text/')) return 'text';
  if (m.startsWith('image/')) return 'image';
  return null;
}

export function assertSize(bytes: number): void {
  if (bytes > LIMITS.maxBytes) throw new ImportError('TOO_LARGE');
}

export function withTimeout<T>(p: Promise<T>, ms: number = LIMITS.timeoutMs): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ImportError('TIMEOUT')), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export function normalizeText(s: string): string {
  return s
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
