import { buildPdfHtml } from '../pdf-html';

describe('buildPdfHtml', () => {
  it('nhúng nguồn, giới hạn, và không để lọt thẻ đóng script', () => {
    const html = buildPdfHtml({
      libSource: 'export const a = "</script><!--";',
      workerSource: 'w',
      maxPages: 100,
      minChars: 20,
    });
    expect(html).toContain('const MAX_PAGES = 100;');
    expect(html).toContain('const MIN_CHARS = 20;');
    expect(html).not.toContain('</script><!--');
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).not.toMatch(/https?:\/\//);
  });
});
