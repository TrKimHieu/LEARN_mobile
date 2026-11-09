import { ImportError } from '../types';
import { LIMITS, assertSize, kindOf, normalizeText, withTimeout } from '../limits';

describe('kindOf', () => {
  it('nhận dạng theo đuôi tệp', () => {
    expect(kindOf('a.txt', null)).toBe('text');
    expect(kindOf('A.MD', null)).toBe('text');
    expect(kindOf('x.pdf', null)).toBe('pdf');
    expect(kindOf('p.JPG', null)).toBe('image');
    expect(kindOf('p.jpeg', null)).toBe('image');
    expect(kindOf('p.png', null)).toBe('image');
    expect(kindOf('p.heic', null)).toBe('image');
  });
  it('nhận dạng theo mime khi đuôi lạ', () => {
    expect(kindOf('noext', 'text/plain')).toBe('text');
    expect(kindOf('noext', 'image/webp')).toBe('image');
    expect(kindOf('noext', 'application/pdf')).toBe('pdf');
  });
  it('trả null khi không hỗ trợ', () => {
    expect(kindOf('a.docx', null)).toBeNull();
    expect(kindOf('a.zip', 'application/zip')).toBeNull();
  });
});

describe('assertSize', () => {
  it('cho phép đúng giới hạn', () => {
    expect(() => assertSize(LIMITS.maxBytes)).not.toThrow();
  });
  it('chặn vượt giới hạn', () => {
    try {
      assertSize(LIMITS.maxBytes + 1);
      throw new Error('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ImportError);
      expect((e as ImportError).code).toBe('TOO_LARGE');
    }
  });
});

describe('withTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it('trả kết quả khi kịp', async () => {
    await expect(withTimeout(Promise.resolve(5), 1000)).resolves.toBe(5);
  });
  it('báo TIMEOUT khi quá hạn', async () => {
    const p = withTimeout(new Promise<number>(() => {}), 1000);
    const assertion = expect(p).rejects.toMatchObject({ code: 'TIMEOUT' });
    jest.advanceTimersByTime(1001);
    await assertion;
  });
  it('giữ nguyên lỗi gốc', async () => {
    await expect(withTimeout(Promise.reject(new Error('x')), 1000)).rejects.toThrow('x');
  });
});

describe('normalizeText', () => {
  it('đổi CRLF và CR về LF, bỏ NUL', () => {
    expect(normalizeText('a\r\nb\rc\u0000d')).toBe('a\nb\ncd');
  });
  it('gộp quá 2 dòng trống và cắt khoảng trắng cuối dòng', () => {
    expect(normalizeText('a  \n\n\n\n\nb \t\n')).toBe('a\n\nb');
  });
});
