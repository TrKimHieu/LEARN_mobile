import { File } from 'expo-file-system';

import { normalizeText } from './limits';
import { ImportError, type Extracted } from './types';

export async function extractPlain(uri: string): Promise<Extracted> {
  let raw: string;
  try {
    raw = await new File(uri).text();
  } catch {
    throw new ImportError('UNREADABLE');
  }
  const text = normalizeText(raw);
  if (text.length === 0) throw new ImportError('EMPTY');
  return { method: 'TEXT', pages: [{ page: null, text }], pageCount: null };
}
