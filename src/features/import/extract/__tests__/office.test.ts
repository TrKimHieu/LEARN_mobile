import { strToU8, zipSync } from 'fflate';
import { decodeXml, extractOfficeBytes, paragraphsOf } from '../office';

jest.mock('expo-file-system', () => ({ File: jest.fn() }));

const docx = (body: string) =>
  zipSync({
    '[Content_Types].xml': strToU8('<Types/>'),
    'word/document.xml': strToU8(`<w:document><w:body>${body}</w:body></w:document>`),
  });
const p = (...runs: string[]) => `<w:p><w:r>${runs.map((r) => `<w:t xml:space="preserve">${r}</w:t>`).join('')}</w:r></w:p>`;
const slide = (...paras: string[]) =>
  strToU8(`<p:sld><p:txBody>${paras.map((t) => `<a:p><a:r><a:t>${t}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sld>`);

it('decodes XML entities including Vietnamese code points', () => {
  expect(decodeXml('A &amp; B &lt;c&gt; &#7871; &#x1EBF;')).toBe('A & B <c> ế ế');
});

it('joins runs within a paragraph and keeps tabs/breaks', () => {
  expect(paragraphsOf('<w:p><w:r><w:t>Xin </w:t><w:tab/><w:t>chào</w:t><w:br/><w:t>bạn</w:t></w:r></w:p>', 'w')).toEqual([
    'Xin \tchào\nbạn',
  ]);
});

it('extracts DOCX paragraphs as TEXT', () => {
  const out = extractOfficeBytes(docx(p('Chương 1') + p('Nội dung ', 'tiếng Việt')), 'docx');
  expect(out).toEqual({ method: 'TEXT', pages: [{ page: null, text: 'Chương 1\nNội dung tiếng Việt' }], pageCount: null });
});

it('splits long DOCX into chunks under the per-page limit', () => {
  const para = 'x'.repeat(15_000);
  const out = extractOfficeBytes(docx(p(para) + p(para) + p(para)), 'docx');
  expect(out.pages).toHaveLength(3);
  expect(out.pages.every((pg) => pg.text.length <= 20_000)).toBe(true);
});

it('extracts PPTX slides in numeric order and skips empty slides', () => {
  const zip = zipSync({
    'ppt/slides/slide10.xml': slide('Mười'),
    'ppt/slides/slide2.xml': slide('Hai', 'Dòng 2'),
    'ppt/slides/slide1.xml': slide('Một'),
    'ppt/slides/slide3.xml': strToU8('<p:sld/>'),
  });
  const out = extractOfficeBytes(zip, 'pptx');
  expect(out.pageCount).toBe(4);
  expect(out.pages).toEqual([
    { page: 1, text: 'Một' },
    { page: 2, text: 'Hai\nDòng 2' },
    { page: 4, text: 'Mười' },
  ]);
});

it('rejects broken, empty and oversized decks', () => {
  expect(() => extractOfficeBytes(strToU8('not a zip'), 'docx')).toThrow(expect.objectContaining({ code: 'UNREADABLE' }));
  expect(() => extractOfficeBytes(docx('<w:p/>'), 'docx')).toThrow(expect.objectContaining({ code: 'EMPTY' }));
  const many: Record<string, Uint8Array> = {};
  for (let i = 1; i <= 101; i++) many[`ppt/slides/slide${i}.xml`] = slide(`S${i}`);
  expect(() => extractOfficeBytes(zipSync(many), 'pptx')).toThrow(expect.objectContaining({ code: 'TOO_MANY_PAGES' }));
});
