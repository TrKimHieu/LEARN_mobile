import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { usePalette } from '@/theme/theme';
import { font } from '@/theme/tokens';
import { Txt } from './ui/text';

/**
 * Bìa khóa học sinh từ chính `id` — port của `apps/web/src/components/shared/course-cover.tsx`:
 * cùng hàm băm, cùng bốn hoạ tiết, nên một khóa có cùng bìa trên web và mobile (khác sắc độ xám
 * theo bảng màu dịu của app). Toàn bộ là trang trí — tên khóa luôn có ở chữ bên cạnh.
 */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Motif = 'rings' | 'waves' | 'grid' | 'orbit';
const MOTIFS: Motif[] = ['rings', 'waves', 'grid', 'orbit'];

export function CourseCover({
  id,
  title,
  style,
  initialSize = 40,
  showInitial = true,
}: {
  id: string;
  title: string;
  style?: ViewStyle;
  initialSize?: number;
  showInitial?: boolean;
}) {
  const p = usePalette();
  const h = hash(id);
  const bg = p.cover[h % 4]!;
  const accent = p.coverAccent[h % 4]!;
  const motif = MOTIFS[(h >>> 5) % MOTIFS.length]!;
  const initial = title.trim().charAt(0).toUpperCase() || 'L';

  return (
    <View
      aria-hidden
      style={[{ backgroundColor: bg, overflow: 'hidden' }, style]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute' }}>
        <MotifShape motif={motif} seed={h} accent={accent} ink={p.coverInk} dot={p.fgSubtle} />
      </Svg>
      {showInitial && (
        <Txt
          style={{
            position: 'absolute',
            left: initialSize * 0.35,
            bottom: initialSize * 0.2,
            fontFamily: font.bold,
            fontSize: initialSize,
            lineHeight: initialSize * 1.1,
            color: p.fgMuted,
          }}
        >
          {initial}
        </Txt>
      )}
    </View>
  );
}

function MotifShape({
  motif,
  seed,
  accent,
  ink,
  dot,
}: {
  motif: Motif;
  seed: number;
  accent: string;
  ink: string;
  dot: string;
}) {
  if (motif === 'rings') {
    const cx = 140 + (seed % 30);
    return (
      <>
        <Circle cx={cx + 12} cy={52} r={26} fill={accent} />
        {[20, 38, 56, 74].map((r) => (
          <Circle key={r} cx={cx} cy={64} r={r} stroke={ink} strokeWidth={1} fill="none" />
        ))}
      </>
    );
  }
  if (motif === 'waves') {
    return (
      <>
        <Rect x={128 + (seed % 20)} y={22} width={44} height={44} rx={6} fill={accent} />
        {[0, 1, 2, 3].map((i) => (
          <Path
            key={i}
            d={`M-10 ${64 + i * 12} C 40 ${36 + i * 12 + (seed % 16)}, 120 ${96 + i * 8}, 210 ${56 + i * 12}`}
            stroke={ink}
            strokeWidth={1}
            fill="none"
          />
        ))}
      </>
    );
  }
  if (motif === 'grid') {
    return (
      <>
        <Rect x={120 + (seed % 3) * 20} y={40} width={40} height={40} fill={accent} />
        {Array.from({ length: 11 }, (_, i) => (
          <Line key={`v${i}`} x1={i * 20} y1={0} x2={i * 20} y2={120} stroke={ink} strokeWidth={0.75} />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <Line key={`h${i}`} x1={0} y1={i * 20} x2={200} y2={i * 20} stroke={ink} strokeWidth={0.75} />
        ))}
      </>
    );
  }
  return (
    <>
      <Circle cx={132} cy={58} r={16} fill={accent} />
      <Ellipse cx={130} cy={60} rx={78} ry={26} stroke={ink} strokeWidth={1} fill="none" transform="rotate(-16 130 60)" />
      <Ellipse cx={130} cy={60} rx={52} ry={16} stroke={ink} strokeWidth={1} fill="none" transform="rotate(-16 130 60)" />
      <Circle cx={60 + (seed % 30)} cy={80} r={3} fill={dot} />
    </>
  );
}
