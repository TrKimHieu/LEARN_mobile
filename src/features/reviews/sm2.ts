import type { ReviewGrade } from '@/contracts';

/**
 * Bản sao SM-2 của server (ADR 005), chỉ để dự đoán lịch khi offline và để test.
 * Server luôn quyết định lịch; khi có mạng, kết quả server thay giá trị dự đoán này.
 * Giữ đúng từng dòng với `core/srs/sm2.ts` của backend; đổi bên đó thì đổi bên này và bảng test.
 */
export interface Sm2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
}

const QUALITY: Record<ReviewGrade, number> = { AGAIN: 1, HARD: 3, GOOD: 4, EASY: 5 };
const MIN_EASE = 1.3;
const EASY_BONUS = 1.3;

export const FRESH_SM2: Sm2State = { easeFactor: 2.5, intervalDays: 0, repetitions: 0, lapses: 0 };

export function sm2(state: Sm2State, grade: ReviewGrade): Sm2State {
  const q = QUALITY[grade];
  const miss = 5 - q;
  const easeFactor = round4(Math.max(MIN_EASE, state.easeFactor + (0.1 - miss * (0.08 + miss * 0.02))));

  if (q < 3) return { easeFactor, intervalDays: 1, repetitions: 0, lapses: state.lapses + 1 };

  const repetitions = state.repetitions + 1;
  let intervalDays =
    repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(Math.max(1, state.intervalDays) * state.easeFactor);
  if (grade === 'EASY') intervalDays = Math.max(1, Math.round(intervalDays * EASY_BONUS));

  return { easeFactor, intervalDays, repetitions, lapses: state.lapses };
}

/** Ngày đến hạn dự đoán: mốc chấm (giờ server nếu có) + số ngày. */
export function predictDueAt(reviewedAt: Date, intervalDays: number): Date {
  return new Date(reviewedAt.getTime() + intervalDays * 86_400_000);
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
