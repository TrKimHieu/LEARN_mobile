import { memoryKv } from '@/lib/db/stores';
import { addMinutes, lastDays, parseLog, recordFocus, STUDY_LOG_KEY } from '../study-log';

it('adds minutes to the day, course and lesson', () => {
  let log = addMinutes({}, '2026-11-16', 25, { courseId: 'c', lessonId: 'l' });
  log = addMinutes(log, '2026-11-16', 25, { courseId: 'c' });
  expect(log['2026-11-16']).toEqual({ total: 50, byCourse: { c: 50 }, byLesson: { l: 25 } });
});

it('keeps only the last 90 days', () => {
  let log = {};
  for (let i = 1; i <= 95; i++) log = addMinutes(log, `2026-01-${String(i).padStart(3, '0')}`, 1);
  expect(Object.keys(log)).toHaveLength(90);
  expect(Object.keys(log)[0]).toBe('2026-01-006');
});

it('lists 7 days oldest first with zeros', () => {
  const log = addMinutes({}, '2026-11-14', 30);
  const days = lastDays(log, new Date(2026, 10, 16));
  expect(days.map((d) => d.date)).toEqual([
    '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16',
  ]);
  expect(days.map((d) => d.minutes)).toEqual([0, 0, 0, 0, 30, 0, 0]);
});

it('ignores broken stored data', () => {
  expect(parseLog('not json')).toEqual({});
  expect(parseLog('[1]')).toEqual({});
});

it('records into the account kv', async () => {
  const kv = memoryKv();
  await recordFocus(kv, 25, { lessonId: 'l' }, new Date(2026, 10, 16, 9));
  expect(parseLog(await kv.get(STUDY_LOG_KEY))['2026-11-16']?.total).toBe(25);
});
