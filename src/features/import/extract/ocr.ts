import { File, Paths } from 'expo-file-system';
import { NativeModules } from 'react-native';

import { ImportError, type Extracted } from './types';

type Recognizer = {
  recognize(uri: string): Promise<{ blocks: { text: string }[] }>;
};

// Expo Go không có module native; gói JS tự ném lỗi khi gọi, nên kiểm trước.
function loadRecognizer(): Recognizer | null {
  if (!NativeModules?.TextRecognition) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-ml-kit/text-recognition');
    return (mod.default ?? mod) as Recognizer;
  } catch {
    return null;
  }
}

export function isOcrAvailable(): boolean {
  return loadRecognizer() !== null;
}

export async function recognizeImage(uri: string): Promise<string> {
  const rec = loadRecognizer();
  if (!rec) throw new ImportError('OCR_UNAVAILABLE');
  try {
    const result = await rec.recognize(uri);
    return result.blocks
      .map((b) => b.text.trim())
      .filter((t) => t.length > 0)
      .join('\n\n');
  } catch {
    throw new ImportError('UNREADABLE', 'Không nhận dạng được chữ trong ảnh. Thử ảnh rõ hơn.');
  }
}

let seq = 0;

export async function dataUrlToCacheFile(dataUrl: string): Promise<string> {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m || !m[1]) throw new ImportError('UNREADABLE');
  seq += 1;
  const file = new File(Paths.cache, `import-ocr-${Date.now()}-${seq}.png`);
  try {
    await file.write(m[1], { encoding: 'base64' });
  } catch {
    throw new ImportError('UNREADABLE');
  }
  return file.uri;
}

export function removeCacheFile(uri: string): void {
  try {
    new File(uri).delete();
  } catch {
    // tệp tạm, bỏ qua
  }
}

export async function extractImage(uri: string): Promise<Extracted> {
  const text = await recognizeImage(uri);
  if (text.length === 0) throw new ImportError('EMPTY');
  return { method: 'OCR', pages: [{ page: 1, text }], pageCount: 1 };
}
