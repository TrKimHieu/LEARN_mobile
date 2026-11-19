import { memoryKv } from '../db/stores';
import { markTodayDone, readToday, setTodayListener, TODAY_KEY, todayKey, writeToday } from '../today-store';

const now = new Date(2026, 10, 19, 9);

it('formats the local day', () => expect(todayKey(now)).toBe('2026-11-19'));

it("marks a task done in today's plan once and notifies the home screen", async () => {
  const kv = memoryKv();
  const listener = jest.fn();
  setTodayListener(listener);
  await writeToday(kv, TODAY_KEY, JSON.stringify({ day: '2026-11-19', tasks: [], done: [] }));
  await markTodayDone(kv, 'lesson:L', now);
  await markTodayDone(kv, 'lesson:L', now);
  expect(JSON.parse((await readToday(kv, TODAY_KEY))!).done).toEqual(['lesson:L']);
  expect(listener).toHaveBeenCalledTimes(1);
  setTodayListener(null);
});

it("ignores another day's plan and broken data", async () => {
  const kv = memoryKv();
  await writeToday(kv, TODAY_KEY, JSON.stringify({ day: '2026-11-18', tasks: [], done: [] }));
  await markTodayDone(kv, 'review', now);
  expect(JSON.parse((await readToday(kv, TODAY_KEY))!).done).toEqual([]);
  await writeToday(kv, TODAY_KEY, 'not json');
  await expect(markTodayDone(kv, 'review', now)).resolves.toBeUndefined();
});

it('falls back to memory without an account DB (Testing mode)', async () => {
  await writeToday(null, 'k', 'v');
  expect(await readToday(null, 'k')).toBe('v');
});
