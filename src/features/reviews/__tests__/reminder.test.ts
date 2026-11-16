import { nextReminderAt } from '../reminder';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('@/lib/notifications', () => ({
  cancelScheduled: jest.fn(), ensureNotificationPermission: jest.fn(), scheduleAt: jest.fn(),
}));

describe('nextReminderAt', () => {
  it('is today at 19:00 when still ahead', () => {
    const at = nextReminderAt(new Date(2026, 10, 16, 8, 30));
    expect([at.getDate(), at.getHours(), at.getMinutes()]).toEqual([16, 19, 0]);
  });
  it('rolls to tomorrow once 19:00 has passed', () => {
    const at = nextReminderAt(new Date(2026, 10, 16, 19, 0));
    expect([at.getDate(), at.getHours()]).toEqual([17, 19]);
  });
});
