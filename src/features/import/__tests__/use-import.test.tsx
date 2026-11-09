import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useImport } from '../use-import';

const mockSend = jest.fn();
const mockPick = jest.fn();
const mockPdfExtract = jest.fn();
const mockPlain = jest.fn();
const mockImage = jest.fn();
const mockOcrAvailable = jest.fn();
const mockRecognize = jest.fn();

jest.mock('../import-api', () => ({
  useImportText: () => ({ mutateAsync: (...a: unknown[]) => mockSend(...a) }),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: (...a: unknown[]) => mockPick(...a) }));
jest.mock('../extract/types', () => ({
  ImportError: class ImportError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}), { virtual: true });
jest.mock('../extract/limits', () => ({
  LIMITS: { maxBytes: 26214400, maxPages: 100, timeoutMs: 30000 },
  kindOf: (name: string) => (name.endsWith('.pdf') ? 'pdf' : name.endsWith('.png') ? 'image' : name.endsWith('.txt') ? 'text' : null),
  assertSize: (n: number) => {
    if (n > 26214400) {
      const { ImportError } = jest.requireMock('../extract/types');
      throw new ImportError('TOO_LARGE', 'Tệp quá lớn');
    }
  },
}), { virtual: true });
jest.mock('../extract/plain', () => ({ extractPlain: (...a: unknown[]) => mockPlain(...a) }), { virtual: true });
jest.mock('../extract/ocr', () => ({
  extractImage: (...a: unknown[]) => mockImage(...a),
  isOcrAvailable: () => mockOcrAvailable(),
  recognizeImage: (...a: unknown[]) => mockRecognize(...a),
  dataUrlToCacheFile: async (u: string) => `file:///cache/${u}`,
}), { virtual: true });
jest.mock('../extract/pdf-bridge', () => ({
  planPdfPages: (pages: { page: number; text: string }[]) => ({
    textPages: pages.filter((p) => p.text.length >= 20).map((p) => ({ page: p.page, text: p.text })),
    needsOcr: pages.filter((p) => p.text.length < 20).map((p) => p.page),
  }),
}), { virtual: true });
jest.mock('../extract/pdf-extractor', () => ({
  usePdfExtractor: () => ({ element: null, extract: (...a: unknown[]) => mockPdfExtract(...a) }),
}), { virtual: true });

let api: ReturnType<typeof useImport>;
let tree: ReactTestRenderer;
function Probe() {
  const value = useImport('c1');
  useEffect(() => {
    api = value;
  });
  return null;
}
beforeEach(() => {
  jest.clearAllMocks();
  mockOcrAvailable.mockReturnValue(true);
  mockSend.mockResolvedValue([]);
  act(() => { tree = create(<Probe />); });
});
afterEach(() => act(() => tree.unmount()));

const pick = (name: string, size = 100) =>
  mockPick.mockResolvedValue({ canceled: false, assets: [{ name, uri: `file:///${name}`, size, mimeType: null }] });
const LONG = 'a'.repeat(30);

it('text: idle -> review -> sending -> done with edited text', async () => {
  pick('a.txt');
  mockPlain.mockResolvedValue({ method: 'TEXT', pageCount: null, pages: [{ page: null, text: 'cũ' }] });
  expect(api.state.phase).toBe('idle');
  await act(async () => { await api.start(); });
  expect(api.state.phase).toBe('review');
  act(() => api.setPageText(0, 'mới'));
  act(() => api.setFilename('b.txt'));
  await act(async () => { await api.send(); });
  expect(mockSend).toHaveBeenCalledWith({
    filename: 'b.txt', sourceMimeType: 'text/plain', sourceSizeBytes: 100, method: 'TEXT', pages: [{ page: null, text: 'mới' }],
  });
  expect(api.state.phase).toBe('done');
});

it('cancel picker stays idle', async () => {
  mockPick.mockResolvedValue({ canceled: true, assets: null });
  await act(async () => { await api.start(); });
  expect(api.state.phase).toBe('idle');
});

it('pdf: TOO_MANY_PAGES stops at error and sends nothing', async () => {
  pick('a.pdf');
  const { ImportError } = jest.requireMock('../extract/types');
  mockPdfExtract.mockRejectedValue(new ImportError('TOO_MANY_PAGES', 'Tối đa 100 trang'));
  await act(async () => { await api.start(); });
  expect(api.state).toMatchObject({ phase: 'error', message: 'Tối đa 100 trang' });
  expect(mockSend).not.toHaveBeenCalled();
});

it('oversize file errors before extraction', async () => {
  pick('a.txt', 30_000_000);
  await act(async () => { await api.start(); });
  expect(api.state.phase).toBe('error');
  expect(mockPlain).not.toHaveBeenCalled();
});

it('pdf: OCRs blank pages and merges in order', async () => {
  pick('a.pdf');
  mockPdfExtract.mockResolvedValue({
    pageCount: 2,
    pages: [{ page: 1, text: '', imageDataUrl: 'img1' }, { page: 2, text: LONG }],
  });
  mockRecognize.mockResolvedValue('chữ quét');
  await act(async () => { await api.start(); });
  expect(api.state.phase).toBe('review');
  expect(api.pages).toEqual([{ page: 1, text: 'chữ quét' }, { page: 2, text: LONG }]);
  await act(async () => { await api.send(); });
  expect(mockSend.mock.calls[0]![0]).toMatchObject({ method: 'OCR', sourceMimeType: 'application/pdf' });
});

it('pdf without OCR module keeps text pages and reports skipped', async () => {
  pick('a.pdf');
  mockOcrAvailable.mockReturnValue(false);
  mockPdfExtract.mockResolvedValue({
    pageCount: 2,
    pages: [{ page: 1, text: '', imageDataUrl: 'img1' }, { page: 2, text: LONG }],
  });
  await act(async () => { await api.start(); });
  expect(api.state.phase).toBe('review');
  expect(api.skippedPages).toBe(1);
  expect(mockRecognize).not.toHaveBeenCalled();
  expect(api.pages).toEqual([{ page: 2, text: LONG }]);
});

it('does not send when all pages are blank', async () => {
  pick('a.txt');
  mockPlain.mockResolvedValue({ method: 'TEXT', pageCount: null, pages: [{ page: null, text: 'x' }] });
  await act(async () => { await api.start(); });
  act(() => api.setPageText(0, '   '));
  expect(api.canSend).toBe(false);
  await act(async () => { await api.send(); });
  expect(mockSend).not.toHaveBeenCalled();
});

it('send failure returns to review with error, cancel resets', async () => {
  pick('a.txt');
  mockPlain.mockResolvedValue({ method: 'TEXT', pageCount: null, pages: [{ page: null, text: 'x' }] });
  mockSend.mockRejectedValue(new Error('409'));
  await act(async () => { await api.start(); });
  await act(async () => { await api.send(); });
  expect(api.state.phase).toBe('review');
  expect(api.error).toBe('409');
  act(() => api.cancel());
  expect(api.state.phase).toBe('idle');
});
