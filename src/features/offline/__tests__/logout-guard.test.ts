import { mayLogout } from '../logout-guard';

const deps = (counts: number[], confirmed = false) => {
  const queue = [...counts];
  return {
    flush: jest.fn(async () => {}),
    countPending: jest.fn(async () => queue.shift() ?? 0),
    confirm: jest.fn(async () => confirmed),
  };
};

it('logs out straight away when nothing is pending', async () => {
  const d = deps([0]);
  expect(await mayLogout(d)).toBe(true);
  expect(d.flush).not.toHaveBeenCalled();
  expect(d.confirm).not.toHaveBeenCalled();
});

it('sends pending work first and skips the question when it all went through', async () => {
  const d = deps([2, 0]);
  expect(await mayLogout(d)).toBe(true);
  expect(d.flush).toHaveBeenCalledTimes(1);
  expect(d.confirm).not.toHaveBeenCalled();
});

it('asks before dropping work that could not be sent', async () => {
  const d = deps([2, 1], false);
  expect(await mayLogout(d)).toBe(false);
  expect(d.confirm).toHaveBeenCalledWith(1);
  expect(await mayLogout(deps([1, 1], true))).toBe(true);
});
