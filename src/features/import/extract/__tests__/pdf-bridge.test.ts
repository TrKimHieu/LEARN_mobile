import { OCR_MIN_CHARS, parseBridgeMessage, planPdfPages } from '../pdf-bridge';

describe('parseBridgeMessage', () => {
  it('đọc các thông điệp hợp lệ', () => {
    expect(parseBridgeMessage('{"type":"meta","pageCount":3}')).toEqual({ type: 'meta', pageCount: 3 });
    expect(parseBridgeMessage('{"type":"page","page":1,"text":"abc"}')).toEqual({
      type: 'page',
      page: 1,
      text: 'abc',
    });
    expect(
      parseBridgeMessage('{"type":"page","page":2,"text":"","imageDataUrl":"data:image/png;base64,AA"}'),
    ).toEqual({ type: 'page', page: 2, text: '', imageDataUrl: 'data:image/png;base64,AA' });
    expect(parseBridgeMessage('{"type":"done"}')).toEqual({ type: 'done' });
    expect(parseBridgeMessage('{"type":"error","reason":"PASSWORD"}')).toEqual({
      type: 'error',
      reason: 'PASSWORD',
    });
  });
  it('lý do lạ thành OTHER', () => {
    expect(parseBridgeMessage('{"type":"error","reason":"weird"}')).toEqual({ type: 'error', reason: 'OTHER' });
  });
  it('bỏ qua rác', () => {
    expect(parseBridgeMessage('not json')).toBeNull();
    expect(parseBridgeMessage('null')).toBeNull();
    expect(parseBridgeMessage('{"type":"zzz"}')).toBeNull();
    expect(parseBridgeMessage('{"type":"meta","pageCount":"3"}')).toBeNull();
    expect(parseBridgeMessage('{"type":"meta","pageCount":-1}')).toBeNull();
    expect(parseBridgeMessage('{"type":"page","page":1}')).toBeNull();
    expect(parseBridgeMessage('{"type":"page","page":1,"text":"x","imageDataUrl":5}')).toBeNull();
  });
});

describe('planPdfPages', () => {
  it('ngưỡng 20 ký tự chữ', () => {
    expect(OCR_MIN_CHARS).toBe(20);
    const long = 'a'.repeat(20);
    const short = 'a'.repeat(19);
    const plan = planPdfPages([
      { page: 1, text: long },
      { page: 2, text: short },
    ]);
    expect(plan.textPages).toEqual([{ page: 1, text: long }]);
    expect(plan.needsOcr).toEqual([2]);
  });
  it('khoảng trắng không được tính', () => {
    const plan = planPdfPages([{ page: 1, text: `${' \n\t'.repeat(30)}abc` }]);
    expect(plan.textPages).toEqual([]);
    expect(plan.needsOcr).toEqual([1]);
  });
  it('trang trống xen kẽ đi OCR, giữ thứ tự', () => {
    const t = 'Nội dung trang có chữ đủ dài';
    const plan = planPdfPages([
      { page: 1, text: t },
      { page: 2, text: '' },
      { page: 3, text: t },
      { page: 4, text: '  ' },
    ]);
    expect(plan.textPages.map((p) => p.page)).toEqual([1, 3]);
    expect(plan.needsOcr).toEqual([2, 4]);
  });
  it('PDF quét: mọi trang cần OCR', () => {
    const plan = planPdfPages([
      { page: 1, text: '' },
      { page: 2, text: '' },
    ]);
    expect(plan.textPages).toEqual([]);
    expect(plan.needsOcr).toEqual([1, 2]);
  });
});
