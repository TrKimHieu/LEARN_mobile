'use strict';
/**
 * Nội dung mẫu: bài học (Markdown) và bài tập. Dùng cho dữ liệu seed và cho "AI giả" khi người dùng
 * bấm sinh bài học. Không gọi mạng, không có LLM thật.
 */
const { randomUUID } = require('node:crypto');

const DIFFICULTY_PASS = { EASY: 5, MEDIUM: 6, HARD: 7 };

/** Bài tập 4 câu (đủ 4 loại câu hỏi), tổng 10 điểm. `q` mô tả đáp án đúng để chấm. */
function buildExercise({ title, difficulty = 'MEDIUM', orderIndex = 0, topic, keyword }) {
  const optionIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const correctIndex = 1;
  return {
    id: randomUUID(),
    title,
    instruction: 'Chọn hoặc nhập đáp án cho từng câu rồi nộp bài. Điểm đạt được tính trên 10.',
    difficulty,
    passScore: DIFFICULTY_PASS[difficulty] ?? 6,
    orderIndex,
    questions: [
      {
        id: randomUUID(),
        orderIndex: 0,
        type: 'MULTIPLE_CHOICE',
        prompt: `Phát biểu nào mô tả đúng nhất về ${topic}?`,
        points: 3,
        options: ['A', 'B', 'C', 'D'].map((label, i) => ({
          id: optionIds[i],
          orderIndex: i,
          label,
          content:
            i === correctIndex
              ? `${topic} giúp tổ chức công việc rõ ràng và dễ kiểm soát.`
              : [
                  `${topic} chỉ dùng được trên một thiết bị duy nhất.`,
                  '',
                  `${topic} không cần học trước khi sử dụng.`,
                  `${topic} luôn đòi hỏi trả phí.`,
                ][i],
        })),
        key: { optionId: optionIds[correctIndex] },
        explanation: `Ý chính của bài: ${topic} giúp công việc có tổ chức và kiểm soát được.`,
      },
      {
        id: randomUUID(),
        orderIndex: 1,
        type: 'TRUE_FALSE',
        prompt: `Đúng hay sai: nên thực hành ${topic} thường xuyên để nhớ lâu hơn.`,
        points: 2,
        options: [],
        key: { value: true },
        explanation: 'Thực hành lặp lại giúp ghi nhớ lâu hơn là chỉ đọc một lần.',
      },
      {
        id: randomUUID(),
        orderIndex: 2,
        type: 'SHORT_ANSWER',
        prompt: `Nêu một lợi ích của ${topic} (một câu ngắn).`,
        points: 3,
        options: [],
        key: { acceptable: [keyword, 'tiết kiệm thời gian', 'dễ kiểm soát'] },
        explanation: `Đáp án chấp nhận có chứa các cụm như "${keyword}".`,
      },
      {
        id: randomUUID(),
        orderIndex: 3,
        type: 'FILL_BLANK',
        prompt: `Điền vào chỗ trống: bài học này nói về ____ (một từ khóa chính).`,
        points: 2,
        options: [],
        key: { acceptable: [keyword.toLowerCase()] },
        explanation: `Từ khóa chính là "${keyword}".`,
      },
    ],
  };
}

function buildLessonMarkdown({ topic, heading, points }) {
  return [
    `## ${heading}`,
    '',
    `Bài này giới thiệu **${topic}** theo từng bước dễ theo dõi. Nội dung do **API mock** sinh ra để thử giao diện, không phải kết quả của AI thật.`,
    '',
    '### Ý chính',
    '',
    ...points.map((p) => `- ${p}`),
    '',
    '### Ví dụ',
    '',
    '```bash',
    `echo "Học ${topic}"`,
    '```',
    '',
    '> **Ghi nhớ:** học ít nhưng đều mỗi ngày hiệu quả hơn học dồn.',
    '',
    '### Bảng tóm tắt',
    '',
    '| Bước | Việc làm |',
    '| --- | --- |',
    '| 1 | Đọc nội dung bài |',
    '| 2 | Làm bài tập |',
    '| 3 | Xem lại câu sai |',
    '',
  ].join('\n');
}

/** Bốn bài học cho một chủ đề. `chunkIds` để nối bài với đoạn tài liệu nguồn. */
function buildLessons(topic, difficulty, chunkIds) {
  const heads = [
    ['Giới thiệu', 'Bức tranh tổng quan và vì sao cần học.'],
    ['Khái niệm cốt lõi', 'Những thuật ngữ nền tảng cần nắm.'],
    ['Thực hành từng bước', 'Làm theo ví dụ để quen tay.'],
    ['Lỗi thường gặp', 'Các lỗi hay mắc và cách tránh.'],
  ];
  return heads.map(([head, summary], i) => {
    const title = `${head} về ${topic}`;
    return {
      id: randomUUID(),
      title,
      summary,
      contentMd: buildLessonMarkdown({
        topic,
        heading: title,
        points: [
          `Hiểu ${topic} dùng để làm gì.`,
          'Biết thuật ngữ chính và cách áp dụng.',
          'Tự kiểm tra bằng bài tập cuối bài.',
        ],
      }),
      estimatedMinutes: 5 + i * 2,
      orderIndex: i,
      status: 'PUBLISHED',
      confidence: i === 3 ? 'LOW' : 'HIGH',
      editedByUserAt: null,
      chunkIds: chunkIds.slice(0, 2),
      exercises: [
        buildExercise({
          title: `Bài tập: ${head}`,
          difficulty,
          orderIndex: 0,
          topic,
          keyword: topic.split(/\s+/)[0] || topic,
        }),
      ],
    };
  });
}

/** Văn bản mẫu của một tài liệu đã trích xuất — nguồn cho mục "Tài liệu gốc" trong bài. */
function buildChunks(documentId, filename, count) {
  return Array.from({ length: count }, (_, i) => ({
    id: randomUUID(),
    documentId,
    filename,
    pageFrom: i + 1,
    pageTo: i + 1,
    headingPath: `Chương ${Math.floor(i / 2) + 1} > Mục ${i + 1}`,
    excerpt: `Đoạn ${i + 1} của "${filename}" (nội dung giả do API mock tạo). Đây là văn bản mà AI thật sẽ dùng làm nguồn khi sinh bài học.`,
    truncated: i % 3 === 2,
  }));
}

module.exports = { buildExercise, buildLessons, buildChunks, DIFFICULTY_PASS };
