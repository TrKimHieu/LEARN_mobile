export const LESSON_PROMPT_VERSION = 'lesson@1';

export interface LessonContext {
  language: 'vi' | 'en';
  courseTitle: string;
  nodeTitle: string;
  nodeDescription: string;
  chunks: Array<{ id: string; content: string }>;
  previousError?: string;
}

export function lessonPrompt(ctx: LessonContext): string {
  const lines = [
    `Bạn là nhà giáo khoa học chuyên soạn bài học tương tác cho LEARN.`,
    `Khóa học: "${ctx.courseTitle}".`,
    `Bài học cần soạn: "${ctx.nodeTitle}" — ${ctx.nodeDescription}`,
    ``,
    `LUẬT BẮT BUỘC:`,
    `- CHỈ dùng toàn văn các chunk được cung cấp bên dưới. KHÔNG thêm kiến thức ngoài tài liệu.`,
    `- Ngôn ngữ: ${ctx.language === 'vi' ? 'tiếng Việt' : 'tiếng Anh'}.`,
    `- contentMd là Markdown hợp lệ, tối thiểu 200 ký tự.`,
    `- sourceChunkIds phải là id thật của các chunk đã dùng (đừng bịa).`,
    `- Bài tập: 1–5 exercise, mỗi exercise 1–10 câu hỏi.`,
    `- MULTIPLE_CHOICE phải đúng 4 options, đúng một đáp án đúng, không có "Tất cả đáp án trên".`,
    `- giải thích (explanation) không được lặp nguyên văn prompt.`,
  ];
  if (ctx.previousError) {
    lines.push(``, `LẦN TRƯỚC LỖI — SỬA LẠI:`, ctx.previousError);
  }
  lines.push(
    ``,
    `TOÀN VĂN CHUNK:`,
    ...ctx.chunks.map((c) => `---- chunk ${c.id} ----\n${c.content}`),
  );
  lines.push(
    ``,
    `Trả về JSON khớp schema: { title, summary, contentMd, estimatedMinutes, sourceChunkIds, exercises: [{ title, instruction, difficulty, questions: [...] }] }`,
  );
  return lines.join('\n');
}
