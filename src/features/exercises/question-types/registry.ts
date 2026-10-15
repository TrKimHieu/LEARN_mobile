import type { QuestionType } from '../answers';
import { multipleChoice } from './multiple-choice';
import { fillBlank, shortAnswer } from './text-answer';
import { trueFalse } from './true-false';
import type { QuestionTypeModule } from './types';

/**
 * Dạng câu hỏi → component. Thêm dạng mới: tạo một file trong thư mục này rồi đăng ký ở đây.
 * `Record` buộc mọi giá trị của `questionTypeSchema` đều có mục — contract thêm dạng mới mà quên
 * đăng ký thì `npm run typecheck` báo lỗi.
 */
export const questionTypes: Record<QuestionType, QuestionTypeModule> = {
  MULTIPLE_CHOICE: multipleChoice,
  TRUE_FALSE: trueFalse,
  SHORT_ANSWER: shortAnswer,
  FILL_BLANK: fillBlank,
};
