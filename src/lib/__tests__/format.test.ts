import { absoluteTime, dateLabel, formatSize, humanizeCode, relativeTime } from '../format';

describe('relativeTime', () => {
  const now = new Date('2026-09-30T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it('mốc gần nói theo khoảng thời gian', () => {
    expect(relativeTime(ago(20_000), now)).toBe('vừa xong');
    expect(relativeTime(ago(5 * 60_000), now)).toBe('5 phút trước');
    expect(relativeTime(ago(3 * 3_600_000), now)).toBe('3 giờ trước');
    expect(relativeTime(ago(26 * 3_600_000), now)).toBe('hôm qua');
    expect(relativeTime(ago(3 * 86_400_000), now)).toBe('3 ngày trước');
  });

  it('quá 7 ngày thì hiện ngày, lệch âm nhỏ (đồng hồ chạy trước) vẫn là "vừa xong"', () => {
    expect(relativeTime(ago(10 * 86_400_000), now)).toBe(dateLabel(ago(10 * 86_400_000)));
    expect(relativeTime(ago(-4_000), now)).toBe('vừa xong');
  });

  it('chuỗi ngày hỏng trả rỗng, không in "Invalid Date"', () => {
    expect(relativeTime('không phải ngày', now)).toBe('');
    expect(absoluteTime('x')).toBe('');
    expect(dateLabel('x')).toBe('');
  });
});

describe('formatSize / humanizeCode', () => {
  it('KB dưới 1 MB, tối thiểu 1 KB', () => {
    expect(formatSize(10)).toBe('1 KB');
    expect(formatSize(200 * 1024)).toBe('200 KB');
    expect(formatSize(3.5 * 1024 * 1024)).toBe('3.5 MB');
  });

  it('mã enum lạ vẫn đọc được', () => {
    expect(humanizeCode('PAST_DUE')).toBe('Past due');
    expect(humanizeCode('')).toBe('');
  });
});
