import { resolveApiOrigin, resolveEnvironment } from '../config-policy';

describe('explicit API origin', () => {
  it.each(['preview', 'production'] as const)('%s requires an HTTPS origin', (environment) => {
    for (const value of [undefined, '', 'http://api.example.com', 'https://api.example.com/api/v1',
      'https://user:pass@api.example.com', 'https://api.example.com?key=a', 'https://api.example.com#key',
      'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://127.0.0.2',
      'https://localhost.', 'https://[::ffff:127.0.0.1]', 'https://[::]']) {
      expect(() => resolveApiOrigin(value, environment)).toThrow();
    }
    expect(resolveApiOrigin('https://api.example.com/', environment)).toBe('https://api.example.com');
  });
  it('development uses an explicit origin, never Metro host inference', () => {
    expect(() => resolveApiOrigin(undefined, 'development')).toThrow();
    expect(resolveApiOrigin('http://192.168.1.2:4400/', 'development')).toBe('http://192.168.1.2:4400');
    expect(() => resolveApiOrigin('file:///tmp/api', 'development')).toThrow();
  });
  it('rejects unknown environments instead of relaxing release validation', () => {
    expect(() => resolveEnvironment('preveiw')).toThrow();
    expect(resolveEnvironment('production')).toBe('production');
  });
});
