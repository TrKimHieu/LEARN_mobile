import { FRESH_SM2 as fresh, predictDueAt, sm2 } from '../sm2';

// Bảng ví dụ cố định, cùng giá trị với test SM-2 của backend.
describe('sm2', () => {
  it('first GOOD -> 1 day, repetitions 1, EF unchanged', () => {
    expect(sm2(fresh, 'GOOD')).toEqual({ easeFactor: 2.5, intervalDays: 1, repetitions: 1, lapses: 0 });
  });

  it('second GOOD -> 6 days; third GOOD -> 15 days', () => {
    const two = sm2(sm2(fresh, 'GOOD'), 'GOOD');
    expect(two.intervalDays).toBe(6);
    expect(sm2(two, 'GOOD').intervalDays).toBe(15);
  });

  it('AGAIN resets, 1 day, lapses + 1, EF drops by 0.54', () => {
    const out = sm2({ easeFactor: 2.5, intervalDays: 15, repetitions: 3, lapses: 1 }, 'AGAIN');
    expect(out).toEqual({ easeFactor: 1.96, intervalDays: 1, repetitions: 0, lapses: 2 });
  });

  it('EF per grade', () => {
    expect(sm2(fresh, 'HARD').easeFactor).toBeCloseTo(2.36, 4);
    expect(sm2(fresh, 'GOOD').easeFactor).toBeCloseTo(2.5, 4);
    expect(sm2(fresh, 'EASY').easeFactor).toBeCloseTo(2.6, 4);
  });

  it('HARD is a pass', () => {
    expect(sm2(fresh, 'HARD')).toMatchObject({ repetitions: 1, intervalDays: 1, lapses: 0 });
  });

  it('EF never below 1.3', () => {
    let s = fresh;
    for (let i = 0; i < 10; i++) s = sm2(s, 'AGAIN');
    expect(s.easeFactor).toBe(1.3);
  });

  it('EASY longer than GOOD, at least 1 day', () => {
    const base = sm2(sm2(fresh, 'GOOD'), 'GOOD');
    expect(sm2(base, 'EASY').intervalDays).toBeGreaterThan(sm2(base, 'GOOD').intervalDays);
    expect(sm2(fresh, 'EASY').intervalDays).toBeGreaterThanOrEqual(1);
  });

  it('does not mutate input', () => {
    const input = { ...fresh };
    sm2(input, 'GOOD');
    expect(input).toEqual(fresh);
  });

  it('predictDueAt adds whole days', () => {
    expect(predictDueAt(new Date('2026-11-16T10:00:00Z'), 6).toISOString()).toBe('2026-11-22T10:00:00.000Z');
  });
});
