import { FONT_SOURCES } from '../fonts';
import { font, text } from '../tokens';

it('loads every font family the tokens reference', () => {
  expect(Object.keys(FONT_SOURCES).sort()).toEqual([...new Set(Object.values(font))].sort());
});

it('uses Plus Jakarta Sans for headings and Inter for reading text (website ADR 014/018)', () => {
  for (const v of ['display', 'title', 'heading'] as const) expect(text[v].fontFamily).toMatch(/^PlusJakartaSans_/);
  for (const v of ['body', 'bodyStrong', 'small', 'smallStrong', 'caption'] as const)
    expect(text[v].fontFamily).toMatch(/^Inter_/);
});
