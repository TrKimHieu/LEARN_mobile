import type { OutlineNodeOutputT } from '../schemas/output';

export const OUTLINE_PROMPT_VERSION = 'outline@1';

export interface OutlineContext {
  language: 'vi' | 'en';
  chunks: Array<{ id: string; headingPath: string; preview: string }>;
  previousError?: string;
}

export function outlinePrompt(ctx: OutlineContext): string {
  const lines = [
    `Bạn là kiến trúc sư nội dung cho nền tảng học tập LEARN.`,
    `Nhiệm vụ: lập outline (dàn bài) khóa học từ tài liệu người dùng cung cấp.`,
    ``,
    `LUẬT BẮT BUỘC:`,
    `- CHỈ dùng thông tin trong tài liệu được cung cấp. KHÔNG thêm kiến thức ngoài.`,
    `- Ngôn ngữ đầu ra: ${ctx.language === 'vi' ? 'tiếng Việt' : 'tiếng Anh'}.`,
    `- Mỗi node phải khai chunkIds là các id thật có trong danh sách bên dưới.`,
    `- Tối đa 20 node. Mỗi node là một bài học độc lập.`,
  ];
  if (ctx.previousError) {
    lines.push(``, `LẦN TRƯỚC LỖI — SỬA LẠI:`, ctx.previousError);
  }
  lines.push(
    ``,
    `DANH SÁCH CHUNK (heading path + 200 ký tự đầu):`,
    ...ctx.chunks.map(
      (c) => `- id=${c.id} | heading=${c.headingPath ?? '(không có)'} | preview=${c.preview}`,
    ),
    ``,
    `Trả về JSON khớp schema: { courseTitle, language, nodes: [{ title, description, chunkIds }] }`,
  );
  return lines.join('\n');
}

export type { OutlineNodeOutputT };
