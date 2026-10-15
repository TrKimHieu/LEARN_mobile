import type { Answer, AnswerState, Question } from '../answers';

export interface QuestionInputProps {
  /** Số thứ tự hiển thị, bắt đầu từ 1. */
  index: number;
  question: Question;
  value: Answer | undefined;
  onChange: (a: Answer) => void;
}

export interface QuestionReviewProps {
  question: Question;
  given: AnswerState[string] | undefined;
  /** `correctAnswer` thô từ `SubmissionResult` — chỉ có sau khi nộp. */
  correct: unknown;
  isCorrect: boolean;
}

export interface QuestionTypeModule {
  /** Phần trả lời trong thẻ câu hỏi. */
  Input: React.ComponentType<QuestionInputProps>;
  /** Phần xem lại sau khi nộp. Bỏ trống → hiển thị "Bạn trả lời / Đáp án đúng" dạng chữ. */
  Review?: React.ComponentType<QuestionReviewProps>;
}
