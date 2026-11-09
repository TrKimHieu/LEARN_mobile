export type PdfHtmlOptions = {
  libSource: string;
  workerSource: string;
  maxPages: number;
  minChars: number;
};

// JSON an toàn khi nhúng vào <script>: không để lọt "</script" hay "<!--".
function embed(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * HTML chạy trong WebView ẩn. pdf.js và worker được nạp từ Blob URL tạo từ chuỗi
 * đóng gói sẵn, nên không có yêu cầu mạng nào. PDF đến theo từng đoạn base64 qua
 * window.__chunk(), sau đó window.__run() bắt đầu trích.
 */
export function buildPdfHtml(o: PdfHtmlOptions): string {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module">
const LIB = ${embed(o.libSource)};
const WORKER = ${embed(o.workerSource)};
const MAX_PAGES = ${o.maxPages};
const MIN_CHARS = ${o.minChars};
const OCR_SCALE = 2;
const MAX_PIXELS = 16000000;
const parts = [];
function post(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
function blobUrl(src) { return URL.createObjectURL(new Blob([src], { type: 'text/javascript' })); }
let pdfjs;
async function load() {
  if (pdfjs) return pdfjs;
  pdfjs = await import(blobUrl(LIB));
  pdfjs.GlobalWorkerOptions.workerSrc = blobUrl(WORKER);
  return pdfjs;
}
function toBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function reasonOf(e) {
  const n = e && e.name;
  if (n === 'PasswordException') return 'PASSWORD';
  if (n === 'InvalidPDFException' || n === 'MissingPDFException' || n === 'FormatError') return 'INVALID';
  return 'OTHER';
}
async function run() {
  let doc;
  try {
    const lib = await load();
    const data = toBytes(parts.join(''));
    parts.length = 0;
    doc = await lib.getDocument({ data, isEvalSupported: false, useSystemFonts: false }).promise;
  } catch (e) {
    post({ type: 'error', reason: reasonOf(e) });
    return;
  }
  try {
    post({ type: 'meta', pageCount: doc.numPages });
    if (doc.numPages > MAX_PAGES) return;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      let text = '';
      for (const it of content.items) {
        if (typeof it.str !== 'string') continue;
        text += it.str + (it.hasEOL ? '\\n' : '');
      }
      const msg = { type: 'page', page: n, text };
      if (text.replace(/\\s/g, '').length < MIN_CHARS) {
        let viewport = page.getViewport({ scale: OCR_SCALE });
        const px = viewport.width * viewport.height;
        if (px > MAX_PIXELS) viewport = page.getViewport({ scale: OCR_SCALE * Math.sqrt(MAX_PIXELS / px) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        msg.imageDataUrl = canvas.toDataURL('image/png');
        canvas.width = 0;
        canvas.height = 0;
      }
      page.cleanup();
      post(msg);
    }
    post({ type: 'done' });
  } catch (e) {
    post({ type: 'error', reason: reasonOf(e) });
  } finally {
    try { doc.destroy(); } catch (e) {}
  }
}
window.__chunk = (s) => { parts.push(s); };
window.__run = () => { run(); };
window.addEventListener('error', () => post({ type: 'error', reason: 'OTHER' }));
</script></body></html>`;
}
