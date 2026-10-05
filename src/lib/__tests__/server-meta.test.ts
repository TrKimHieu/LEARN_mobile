jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.2.0' } } }));

import { APP_VERSION, compareVersions } from '../server-meta';

describe('compareVersions', () => {
  it('so từng phần số, không so chuỗi', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.9.0', '1.0.0')).toBeLessThan(0);
    expect(compareVersions('2', '1.9.9')).toBeGreaterThan(0);
  });

  it('đọc phiên bản app từ app.json', () => {
    expect(APP_VERSION).toBe('1.2.0');
  });
});
