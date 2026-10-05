import { partialFailuresOf } from '../ai-api';

// Cùng các ca với `apps/web/src/features/ai/ai-job-partial.test.ts` — hai bản phải trả lời như nhau.
describe('partialFailuresOf', () => {
  it('không phải PARTIAL_FAILURES → rỗng', () => {
    expect(partialFailuresOf(null)).toEqual([]);
    expect(partialFailuresOf({ code: 'AI_GENERATION_FAILED', detail: {} })).toEqual([]);
  });

  it('đọc đúng node + lỗi, bỏ phần tử sai hình dạng', () => {
    const detail = {
      partialFailures: [
        { node: 'Bài 2', errors: ['thiếu câu hỏi', 42] },
        { node: 7, errors: [] },
        'rác',
        { node: 'Bài 5' },
      ],
    };
    expect(partialFailuresOf({ code: 'PARTIAL_FAILURES', detail })).toEqual([
      { node: 'Bài 2', errors: ['thiếu câu hỏi'] },
      { node: 'Bài 5', errors: [] },
    ]);
  });

  it('detail hỏng không làm vỡ màn hình', () => {
    expect(partialFailuresOf({ code: 'PARTIAL_FAILURES', detail: null })).toEqual([]);
    expect(partialFailuresOf({ code: 'PARTIAL_FAILURES', detail: { partialFailures: 'x' } })).toEqual([]);
  });
});
