import * as N from 'expo-notifications';
import { ensureNotificationPermission, scheduleAt } from '../notifications';

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
}));

const m = N as jest.Mocked<typeof N>;
beforeEach(() => jest.clearAllMocks());

it('replaces the previous schedule for the same id', async () => {
  const at = new Date(Date.now() + 60_000);
  await scheduleAt('x', at, 'T', 'B');
  expect(m.cancelScheduledNotificationAsync).toHaveBeenCalledWith('x');
  expect(m.scheduleNotificationAsync).toHaveBeenCalledWith({
    identifier: 'x', content: { title: 'T', body: 'B' }, trigger: { type: 'date', date: at },
  });
});

it('does not schedule a time in the past', async () => {
  await scheduleAt('x', new Date(Date.now() - 1), 'T', 'B');
  expect(m.scheduleNotificationAsync).not.toHaveBeenCalled();
});

it('does not ask again after the user said no', async () => {
  m.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);
  expect(await ensureNotificationPermission()).toBe(false);
  expect(m.requestPermissionsAsync).not.toHaveBeenCalled();
});

it('asks when allowed and returns the answer', async () => {
  m.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true } as never);
  m.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);
  expect(await ensureNotificationPermission()).toBe(true);
});
