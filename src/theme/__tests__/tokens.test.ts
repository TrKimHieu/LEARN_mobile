import { dark, light, radius } from '../tokens';

function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map((v) => parseInt(v, 16) / 255)
    .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}
it('uses current website base and primary roles', () => {
  expect(light.app).toBe('#faf8f5');
  expect(dark.app).toBe('#16171f');
  expect(light.primary).toBe('#2f66e8');
  expect(dark.primary).toBe('#2f66e8');
  expect(radius).toMatchObject({ control: 14, card: 20, panel: 24 });
});
it.each([light, dark])('keeps readable body, secondary and button text in $scheme', (p) => {
  for (const foreground of [p.fg, p.fgMuted, p.fgSubtle]) {
    for (const bg of [p.app, p.panel]) expect(contrast(foreground, bg)).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrast(p.primaryFg, p.primary)).toBeGreaterThanOrEqual(4.5);
});
