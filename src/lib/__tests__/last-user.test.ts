import * as SecureStore from 'expo-secure-store';
import { readLastUser, writeLastUser } from '../last-user';
jest.mock('../config', () => ({ config: { environment: 'preview', apiUrl: 'https://staging.example.com' } }));
const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));

const user = {
  id: 'u1', email: 'a@b.c', displayName: 'A', role: 'LEARNER' as const, locale: 'vi' as const,
  emailVerifiedAt: null, createdAt: '2026-11-09T00:00:00.000Z',
};

it('remembers the last signed-in user under an environment/origin key', async () => {
  await writeLastUser(user);
  const key = jest.mocked(SecureStore.setItemAsync).mock.calls[0]![0];
  expect(key).toMatch(/^learn\.lastUser\.preview\.[a-f0-9]+$/);
  expect(await readLastUser()).toEqual(user);
  await writeLastUser(null);
  expect(await readLastUser()).toBeNull();
});

it('ignores a corrupt or incomplete record', async () => {
  const key = jest.mocked(SecureStore.setItemAsync).mock.calls[0]![0];
  mockStore.set(key, '{not json');
  expect(await readLastUser()).toBeNull();
  mockStore.set(key, JSON.stringify({ email: 'x' }));
  expect(await readLastUser()).toBeNull();
});
