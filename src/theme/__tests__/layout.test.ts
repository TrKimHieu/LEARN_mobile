import { layoutFor } from '../layout';

it.each([
  [320, 640, 'compact', 1, 2, 16, false, false], // chia đôi Android hẹp
  [390, 844, 'compact', 1, 2, 16, false, false], // điện thoại dọc
  [844, 390, 'expanded', 3, 4, 32, true, true], // điện thoại ngang
  [744, 1133, 'medium', 2, 4, 24, false, false], // iPad mini dọc
  [1194, 834, 'expanded', 3, 4, 32, true, false], // iPad ngang
])('layoutFor(%i, %i)', (w, h, windowClass, columns, statColumns, gutter, landscape, shortHeight) => {
  expect(layoutFor(w, h)).toEqual({ windowClass, columns, statColumns, gutter, landscape, shortHeight });
});

it('treats the 600 and 840 boundaries as the larger class', () => {
  expect(layoutFor(599, 900).windowClass).toBe('compact');
  expect(layoutFor(600, 900).windowClass).toBe('medium');
  expect(layoutFor(840, 900).windowClass).toBe('expanded');
});
