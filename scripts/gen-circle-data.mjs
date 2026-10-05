/**
 * Sinh `src/components/mascot/circle-data.ts` từ vendor mascot của web (chỉ phần DỮ LIỆU thuần).
 *
 *   npm run mascot:data     # cần repo LEARN nằm cạnh (hoặc đặt LEARN_MASCOT_SRC)
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC =
  process.env.LEARN_MASCOT_SRC ??
  join(root, '..', 'LEARN', 'apps', 'web', 'src', 'components', 'shared', 'mascot', 'CircleAvatar.tsx');
const OUT = join(root, 'src', 'components', 'mascot', 'circle-data.ts');
if (!existsSync(SRC)) {
  console.error(`[mascot] Không thấy ${SRC}`);
  process.exit(1);
}
const src = readFileSync(SRC, 'utf8');

function block(startMarker, endMarker) {
  const a = src.indexOf(startMarker);
  if (a < 0) throw new Error('missing ' + startMarker);
  const b = src.indexOf(endMarker, a);
  if (b < 0) throw new Error('missing end for ' + startMarker);
  return src.slice(a, b + endMarker.length);
}

const encoded = block('const ENCODED: string[] = [', '\n];');
const mouths = block('export const MOUTHS: number[][] = [', '\n];');
const pools = block('export const POOLS: Record<CircleState, number[]> = {', '\n};');
const cadence = block('const EXPR_CADENCE: Record<CircleState, [number, number]> = {', '\n};');
const motion = block('export const MOTION: Record<CircleState, BodyMotion> = {', '\n};');
const stateType = block('export type CircleState =', ';');
const bodyMotion = block('export interface BodyMotion {', '\n}');

const out = `// SINH TỰ ĐỘNG từ LEARN/apps/web/src/components/shared/mascot/CircleAvatar.tsx (bản export
// Blob Studio, ADR 006 của LEARN) — chỉ phần DỮ LIỆU thuần: 25 biểu cảm mắt, miệng, bộ biểu cảm
// và chuyển động theo trạng thái. Bộ vẽ của vendor thao tác DOM theo từng khung hình nên không chạy
// trên React Native; bộ vẽ cho mobile ở \`mascot.tsx\`. Không sửa tay — sinh lại khi vendor đổi.
/* eslint-disable */

${stateType}

/** Hộp toạ độ của mặt — mọi số liệu dưới đây tính trong hộp này. */
export const FACE_BOX = 228.541;
export const VIEW_BOX = \`-15 -15 \${FACE_BOX + 30} \${FACE_BOX + 30}\`;
/** Thân hình tròn: \`SHAPE.body\` (tròn bán kính 100) nhân \`scale(1.142705)\`. */
export const BODY_R = 114.2705;
export const FACE_CENTRE: [number, number] = [120, 122.5];
export const GAZE_TRAVEL = { x: 13.2, y: 8.4 };
export const DEFAULT_GAZE = { x: 0.3454543604995266, y: 0.34318265047940333 };
export const MOUTH_STROKE = 7.5;
/** Phần hướng nhìn riêng của mỗi biểu cảm được áp lại (\`lookAround\` mặc định của vendor). */
export const LOOK_AROUND = 0.35;

export type Ring = [number, number][];

/** 25 expressions × 2 eyes × 48 points, as "x,y x,y…|x,y x,y…". */
${encoded}

const RAW: Ring[][] = ENCODED.map((line) =>
  line.split('|').map(
    (ring) =>
      ring.split(' ').map((pair) => {
        const [x, y] = pair.split(',');
        return [Number(x), Number(y)];
      }) as Ring,
  ),
);

export const ringCentre = (ring: Ring): [number, number] => {
  let x = 0;
  let y = 0;
  for (const p of ring) {
    x += p[0];
    y += p[1];
  }
  return [x / ring.length, y / ring.length];
};

/** Hướng nhìn riêng của từng biểu cảm (so với tâm mặt). */
export const GAZE: [number, number][] = RAW.map((ex) => {
  const a = ringCentre(ex[0]!);
  const b = ringCentre(ex[1]!);
  return [(a[0] + b[0]) / 2 - FACE_CENTRE[0], (a[1] + b[1]) / 2 - FACE_CENTRE[1]];
});

/** Biểu cảm đã bỏ hướng nhìn — mọi biểu cảm nhìn thẳng. */
export const EXPRESSIONS: Ring[][] = RAW.map((ex, i) =>
  ex.map((ring) => ring.map((p) => [p[0] - GAZE[i]![0], p[1] - GAZE[i]![1]] as [number, number])),
);

${mouths}

/** Biểu cảm mỗi trạng thái xoay vòng; phần tử đầu là mặt nghỉ. */
${pools}

/** Mỗi biểu cảm giữ bao lâu trước khi đổi, ms [min, max]. */
${cadence}

${bodyMotion}

${motion}

export const toPath = (ring: Ring) =>
  'M' + ring.map((p) => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('L') + 'Z';

/** Miệng treo dưới hai mắt, nghiêng theo hai mắt — y như vendor. */
export function mouthFrame(rings: Ring[], spec: number[]) {
  const c0 = ringCentre(rings[0]!);
  const c1 = ringCentre(rings[1]!);
  const theta = Math.atan2(c1[1] - c0[1], c1[0] - c0[0]);
  let halfHeight = 0;
  for (const ring of rings) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of ring) {
      if (p[1] < lo) lo = p[1];
      if (p[1] > hi) hi = p[1];
    }
    halfHeight = Math.max(halfHeight, (hi - lo) / 2);
  }
  const drop = halfHeight + spec[2]!;
  return {
    x: (c0[0] + c1[0]) / 2 - Math.sin(theta) * drop,
    y: (c0[1] + c1[1]) / 2 + Math.cos(theta) * drop,
    angle: theta + (spec[3]! * Math.PI) / 180,
  };
}

export function mouthPath(frame: { x: number; y: number; angle: number }, spec: number[]) {
  const ca = Math.cos(frame.angle);
  const sa = Math.sin(frame.angle);
  const at = (lx: number, ly: number) => [frame.x + lx * ca - ly * sa, frame.y + lx * sa + ly * ca];
  const a = at(-spec[0]!, 0);
  const c = at(0, spec[1]!);
  const b = at(spec[0]!, 0);
  return \`M\${a[0]!.toFixed(2)} \${a[1]!.toFixed(2)} Q\${c[0]!.toFixed(2)} \${c[1]!.toFixed(2)} \${b[0]!.toFixed(2)} \${b[1]!.toFixed(2)}\`;
}
`;

const final = out.replace('const EXPR_CADENCE', 'export const EXPR_CADENCE').replace('const BLINK', 'export const BLINK');
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, final);
console.log('wrote', OUT, out.length, 'chars');
