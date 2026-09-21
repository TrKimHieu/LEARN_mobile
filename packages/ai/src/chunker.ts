export interface ChunkMeta {
  pageFrom?: number;
  pageTo?: number;
  headingPath?: string;
}

export interface DocumentChunk extends ChunkMeta {
  index: number;
  content: string;
  tokenCount: number;
}

/** Ước lượng token bằng heuristic 4 ký tự ≈ 1 token (Tiếng Việt/Anh). */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.trim().length / 4);
}

export interface ChunkerOptions {
  targetTokens: number;
  overlapTokens: number;
  minTokens: number;
}

export const DEFAULT_CHUNKER_OPTIONS: ChunkerOptions = {
  targetTokens: 1200,
  overlapTokens: 150,
  minTokens: 100,
};

function splitIntoUnits(text: string): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const units: string[] = [];
  for (const p of paragraphs) {
    if (estimateTokens(p) <= 200) {
      units.push(p);
      continue;
    }
    // Đoạn quá dài: cắt theo câu
    for (const sentence of p.split(/(?<=[.!?…])\s+/)) {
      const s = sentence.trim();
      if (s) units.push(s);
    }
  }
  return units;
}

function lastNTokens(text: string, n: number): string {
  const tokens = Math.min(estimateTokens(text), n);
  const chars = tokens * 4;
  return text.length > chars ? text.slice(-chars) : text;
}

/**
 * Cắt tài liệu thành chunk — HANDBOOK §8.2: mục tiêu 1200 token, chồng lấn 150,
 * ranh giới ưu tiên heading > đoạn văn > câu. Chunk < 100 token gộp vào chunk trước.
 */
export function chunkDocument(
  text: string,
  meta: ChunkMeta,
  options: ChunkerOptions = DEFAULT_CHUNKER_OPTIONS,
): DocumentChunk[] {
  if (!text.trim()) return [];

  const units = splitIntoUnits(text);
  const chunks: DocumentChunk[] = [];
  let buffer: string[] = [];
  let bufferTokens = 0;

  const flush = (): void => {
    if (buffer.length === 0) return;
    const content = buffer.join('\n');
    const previous = chunks.at(-1);
    if (previous && estimateTokens(content) < options.minTokens) {
      previous.content = `${previous.content}\n${content}`;
      previous.tokenCount = estimateTokens(previous.content);
      buffer = [];
      bufferTokens = 0;
      return;
    }
    chunks.push({
      index: chunks.length,
      content,
      tokenCount: estimateTokens(content),
      ...meta,
    });
    buffer = [];
    bufferTokens = 0;
  };

  for (const unit of units) {
    const need = options.targetTokens - bufferTokens;
    if (bufferTokens > 0 && estimateTokens(unit) > need) {
      flush();
      buffer.push(lastNTokens(chunks.at(-1)?.content ?? '', options.overlapTokens));
      bufferTokens = estimateTokens(buffer[0] ?? '');
    }
    buffer.push(unit);
    bufferTokens += estimateTokens(unit);
  }
  flush();
  return chunks;
}
