const mockRecognize = jest.fn();
const mockWrite = jest.fn().mockResolvedValue(undefined);
const mockDelete = jest.fn();

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache/' },
  File: jest.fn().mockImplementation((_dir: string, name: string) => ({
    uri: `file:///cache/${name}`,
    write: mockWrite,
    delete: mockDelete,
    exists: true,
  })),
}));

function load(moduleThere: boolean) {
  jest.resetModules();
  jest.doMock('@react-native-ml-kit/text-recognition', () => ({
    __esModule: true,
    default: { recognize: mockRecognize },
  }));
  jest.doMock('react-native', () => ({
    NativeModules: moduleThere ? { TextRecognition: {} } : {},
  }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../ocr') as typeof import('../ocr');
}

beforeEach(() => jest.clearAllMocks());

describe('ocr có module', () => {
  it('isOcrAvailable true', () => {
    expect(load(true).isOcrAvailable()).toBe(true);
  });
  it('recognizeImage ghép khối theo thứ tự, mỗi khối một đoạn', async () => {
    const ocr = load(true);
    mockRecognize.mockResolvedValue({
      text: 'ignored',
      blocks: [{ text: 'Khối một\ndòng hai' }, { text: ' ' }, { text: 'Khối hai' }],
    });
    await expect(ocr.recognizeImage('file:///a.png')).resolves.toBe('Khối một\ndòng hai\n\nKhối hai');
    expect(mockRecognize).toHaveBeenCalledWith('file:///a.png');
  });
  it('lỗi ML Kit thành UNREADABLE', async () => {
    const ocr = load(true);
    mockRecognize.mockRejectedValue(new Error('boom'));
    await expect(ocr.recognizeImage('file:///a.png')).rejects.toMatchObject({ code: 'UNREADABLE' });
  });
  it('extractImage trả method OCR, pageCount 1', async () => {
    const ocr = load(true);
    mockRecognize.mockResolvedValue({ text: '', blocks: [{ text: 'Xin chào' }] });
    await expect(ocr.extractImage('file:///a.png')).resolves.toEqual({
      method: 'OCR',
      pages: [{ page: 1, text: 'Xin chào' }],
      pageCount: 1,
    });
  });
  it('extractImage không có chữ thì EMPTY', async () => {
    const ocr = load(true);
    mockRecognize.mockResolvedValue({ text: '', blocks: [] });
    await expect(ocr.extractImage('file:///a.png')).rejects.toMatchObject({ code: 'EMPTY' });
  });
  it('dataUrlToCacheFile ghi base64 PNG vào cache', async () => {
    const ocr = load(true);
    const uri = await ocr.dataUrlToCacheFile('data:image/png;base64,QUJD');
    expect(uri).toMatch(/^file:\/\/\/cache\/.+\.png$/);
    expect(mockWrite).toHaveBeenCalledWith('QUJD', { encoding: 'base64' });
  });
  it('dataUrlToCacheFile từ chối data URL hỏng', async () => {
    const ocr = load(true);
    await expect(ocr.dataUrlToCacheFile('nonsense')).rejects.toMatchObject({ code: 'UNREADABLE' });
  });
  it('removeCacheFile xoá tệp tạm', () => {
    const ocr = load(true);
    ocr.removeCacheFile('file:///cache/x.png');
    expect(mockDelete).toHaveBeenCalled();
  });
});

describe('ocr thiếu module (Expo Go)', () => {
  it('isOcrAvailable false', () => {
    expect(load(false).isOcrAvailable()).toBe(false);
  });
  it('recognizeImage và extractImage báo OCR_UNAVAILABLE, không crash', async () => {
    const ocr = load(false);
    await expect(ocr.recognizeImage('file:///a.png')).rejects.toMatchObject({ code: 'OCR_UNAVAILABLE' });
    await expect(ocr.extractImage('file:///a.png')).rejects.toMatchObject({ code: 'OCR_UNAVAILABLE' });
  });
});
