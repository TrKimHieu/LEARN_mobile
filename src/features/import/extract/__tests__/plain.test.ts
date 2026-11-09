import { extractPlain } from '../plain';

const mockText = jest.fn();
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({ text: mockText })),
}));

describe('extractPlain', () => {
  it('trả một trang page null với chữ đã chuẩn hoá', async () => {
    mockText.mockResolvedValue('Xin chào\r\n\r\n\r\n\r\nThế giới  ');
    await expect(extractPlain('file:///a.txt')).resolves.toEqual({
      method: 'TEXT',
      pages: [{ page: null, text: 'Xin chào\n\nThế giới' }],
      pageCount: null,
    });
  });
  it('rỗng thì báo EMPTY', async () => {
    mockText.mockResolvedValue('  \n \r\n');
    await expect(extractPlain('file:///a.txt')).rejects.toMatchObject({ code: 'EMPTY' });
  });
  it('lỗi đọc thì báo UNREADABLE', async () => {
    mockText.mockRejectedValue(new Error('io'));
    await expect(extractPlain('file:///a.txt')).rejects.toMatchObject({ code: 'UNREADABLE' });
  });
});
