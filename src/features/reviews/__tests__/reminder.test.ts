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

describe('study reminder (T4-4)', () => {
  const { studyReminderText, syncStudyReminder } = jest.requireActual('../reminder') as typeof import('../reminder');
  const storage = jest.requireMock('@react-native-async-storage/async-storage') as { getItem: jest.Mock };
  const notify = jest.requireMock('@/lib/notifications') as { scheduleAt: jest.Mock; cancelScheduled: jest.Mock };
  const morning = new Date(2026, 10, 19, 8);
  const evening = new Date(2026, 10, 19, 20);
  beforeEach(() => jest.clearAllMocks());

  it('lists the unfinished tasks for a reminder later today', () => {
    expect(studyReminderText(['5 thẻ đến hạn', 'Bài: A'], morning, new Date(2026, 10, 19, 19))).toEqual({
      title: 'Còn 2 việc hôm nay',
      body: '5 thẻ đến hạn · Bài: A',
    });
  });

  it("uses a generic text for tomorrow's reminder and none when everything is done", () => {
    expect(studyReminderText(['Bài: A'], evening, new Date(2026, 10, 20, 19))).toEqual({
      title: 'Đến giờ học',
      body: 'Mở LEARN để xem việc hôm nay.',
    });
    expect(studyReminderText([], morning, new Date(2026, 10, 19, 19))).toBeNull();
  });

  it('schedules at 19:00 when on and tasks remain, cancels otherwise', async () => {
    storage.getItem.mockResolvedValue('1');
    await syncStudyReminder(['Bài: A'], morning);
    expect(notify.scheduleAt).toHaveBeenCalledWith('learn.review.due', new Date(2026, 10, 19, 19), 'Còn 1 việc hôm nay', 'Bài: A');
    await syncStudyReminder([], morning);
    expect(notify.cancelScheduled).toHaveBeenCalledWith('learn.review.due');
    storage.getItem.mockResolvedValue('0');
    notify.scheduleAt.mockClear();
    await syncStudyReminder(['Bài: A'], morning);
    expect(notify.scheduleAt).not.toHaveBeenCalled();
  });
});
