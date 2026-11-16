import { CARD_LIMITS, counter, sideError } from '../card-limits';

it('requires both sides and enforces the per-side limits', () => {
  expect(sideError(' ', 'b')).toBe('Mặt trước và mặt sau không được để trống.');
  expect(sideError('a'.repeat(CARD_LIMITS.front + 1), 'b')).toBe('Mặt trước tối đa 200 ký tự.');
  expect(sideError('a', 'b'.repeat(CARD_LIMITS.back + 1))).toBe('Mặt sau tối đa 300 ký tự.');
  expect(sideError('a'.repeat(CARD_LIMITS.front), 'b'.repeat(CARD_LIMITS.back))).toBeNull();
});

it('formats the counter', () => expect(counter('abc', 200)).toBe('3/200 ký tự'));
