import { correctOptionId, describeCorrect, describeGiven, nextUnpassedExercise, type Question } from '../answers';

function question(over: Partial<Question>): Question {
  return {
    id: 'q1',
    type: 'MULTIPLE_CHOICE',
    prompt: 'Câu hỏi',
    options: [
      { id: 'a', label: 'A', content: 'Hà Nội' },
      { id: 'b', label: 'B', content: 'Huế' },
    ],
    ...over,
  } as Question;
}

describe('describeCorrect', () => {
  it('trắc nghiệm → nhãn + nội dung lựa chọn đúng', () => {
    expect(describeCorrect(question({}), { optionId: 'b' })).toBe('B. Huế');
  });

  it('đúng/sai → chữ', () => {
    const q = question({ type: 'TRUE_FALSE', options: [] });
    expect(describeCorrect(q, { value: true })).toBe('Đúng');
    expect(describeCorrect(q, { value: false })).toBe('Sai');
  });

  it('tự luận → nối các đáp án chấp nhận, bỏ phần tử không phải chuỗi', () => {
    const q = question({ type: 'FILL_BLANK', options: [] });
    expect(describeCorrect(q, { acceptable: ['mèo', 3, 'miu'] })).toBe('mèo · miu');
    expect(describeCorrect(q, { acceptable: [] })).toBeNull();
  });

  it('dữ liệu sai hình dạng → null', () => {
    expect(describeCorrect(question({}), null)).toBeNull();
    expect(describeCorrect(question({}), 'b')).toBeNull();
    expect(describeCorrect(question({}), { optionId: 'z' })).toBeNull();
  });
});

describe('correctOptionId', () => {
  it('chỉ trả chuỗi', () => {
    expect(correctOptionId({ optionId: 'a' })).toBe('a');
    expect(correctOptionId({ optionId: 1 })).toBeNull();
    expect(correctOptionId(undefined)).toBeNull();
  });
});

describe('describeGiven', () => {
  it('mô tả câu trả lời theo từng dạng', () => {
    expect(describeGiven(question({}), { type: 'MULTIPLE_CHOICE', questionId: 'q1', optionId: 'a' })).toBe('A. Hà Nội');
    expect(describeGiven(question({}), { type: 'TRUE_FALSE', questionId: 'q1', value: false })).toBe('Sai');
    expect(describeGiven(question({}), { type: 'SHORT_ANSWER', questionId: 'q1', text: 'xin chào' })).toBe('xin chào');
    expect(describeGiven(question({}), undefined)).toBeNull();
  });
});

describe('nextUnpassedExercise', () => {
  const ex = (id: string, passed: boolean) => ({ id, passed }) as never;

  it('ưu tiên bài chưa đạt phía sau, rồi quay vòng về đầu', () => {
    const exercises = [ex('e1', false), ex('e2', false), ex('e3', true)];
    expect(nextUnpassedExercise({ id: 'e2', exercises })?.id).toBe('e1');
    expect(nextUnpassedExercise({ id: 'e1', exercises })?.id).toBe('e2');
  });

  it('không tính bài hiện tại dù danh sách chưa kịp làm mới', () => {
    expect(nextUnpassedExercise({ id: 'e1', exercises: [ex('e1', false)] })).toBeUndefined();
  });
});
