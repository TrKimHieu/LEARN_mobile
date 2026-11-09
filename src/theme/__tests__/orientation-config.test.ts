import fs from 'node:fs';
import path from 'node:path';

it('lets the app rotate', () => {
  const app = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../app.json'), 'utf8'));
  expect(app.expo.orientation).toBe('default');
});

it('every Modal supports landscape (iOS locks Modals to portrait otherwise)', () => {
  const files: string[] = [];
  const walk = (d: string) =>
    fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      if (e.isDirectory()) {
        if (e.name !== '__tests__') walk(path.join(d, e.name));
      } else if (/\.tsx$/.test(e.name)) files.push(path.join(d, e.name));
    });
  walk(path.join(__dirname, '../..'));
  const offenders = files.filter((f) => {
    const src = fs.readFileSync(f, 'utf8');
    // Đếm thay vì regex thẻ: props kiểu `onRequestClose={() => …}` chứa '>' làm regex dừng sớm.
    return (src.match(/<Modal\b/g) ?? []).length !== (src.match(/supportedOrientations=/g) ?? []).length;
  });
  expect(offenders).toEqual([]);
});
