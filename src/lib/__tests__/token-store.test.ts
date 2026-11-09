import * as SecureStore from 'expo-secure-store';
import { readRefreshToken, writeRefreshToken } from '../token-store';
jest.mock('../config', () => ({ config: { environment: 'preview', apiUrl: 'https://staging.example.com' } }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

it('stores and reads native refresh tokens under an environment/origin key', async () => {
  await writeRefreshToken('private-refresh-token');
  await readRefreshToken();
  const key = jest.mocked(SecureStore.setItemAsync).mock.calls[0]![0];
  expect(key).toMatch(/^learn\.refreshToken\.preview\.[a-f0-9]+$/);
  expect(SecureStore.getItemAsync).toHaveBeenCalledWith(key);
  await writeRefreshToken(null);
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(key);
});
