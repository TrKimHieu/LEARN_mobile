import { layoutFor } from '@/theme/layout';
import { authModeFor, tocModeFor } from '../screen-modes';

it.each([
  [390, 844, 'modal'],
  [844, 390, 'modal'],
  [744, 1133, 'modal'],
  [1194, 834, 'side'],
])('tocModeFor(%i, %i) = %s', (w, h, mode) => expect(tocModeFor(layoutFor(w, h))).toBe(mode));

it.each([
  [390, 844, 'stack'],
  [844, 390, 'split'],
  [1194, 834, 'stack'],
])('authModeFor(%i, %i) = %s', (w, h, mode) => expect(authModeFor(layoutFor(w, h))).toBe(mode));
