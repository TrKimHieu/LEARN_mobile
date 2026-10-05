import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { usePalette } from '@/theme/theme';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import {
  BLINK,
  BODY_R,
  DEFAULT_GAZE,
  EXPRESSIONS,
  EXPR_CADENCE,
  GAZE,
  GAZE_TRAVEL,
  LOOK_AROUND,
  MOTION,
  MOUTHS,
  MOUTH_STROKE,
  POOLS,
  VIEW_BOX,
  mouthFrame,
  mouthPath,
  ringCentre,
  toPath,
  type CircleState,
  type Ring,
} from './circle-data';

/**
 * Mascot Circle — bản mobile, dựng trên CHÍNH dữ liệu của bản web (`circle-data.ts` sinh từ vendor
 * Blob Studio): 25 hình mắt, miệng treo theo mắt, bộ biểu cảm xoay vòng theo trạng thái, nhịp chớp
 * mắt và chuyển động thân (`MOTION`). Bỏ phần hiệu ứng (sao chổi, pháo giấy quanh mascot) — web
 * cũng tắt (`effects={false}`) vì chúng phá luật đơn sắc.
 *
 * Cùng giới hạn vị trí HANDBOOK §13.1 `[SPEC]`: empty state, tiến độ AI Job, lỗi, `celebrate` khi
 * qua bài. Union hẹp như web — state ngoài phạm vi hỏng typecheck. Màu: thân là màu nút chính,
 * mặt là màu panel (ADR 001 của app — không cặp đen tuyền/trắng).
 */
export type MascotState = Extract<
  CircleState,
  | 'sleeping'
  | 'idle'
  | 'bored'
  | 'working'
  | 'thinking'
  | 'progress'
  | 'uploading'
  | 'celebrate'
  | 'proud'
  | 'happy'
  | 'alerting'
  | 'sad'
  | 'confused'
>;

const MORPH_MS = 380;
const BLINK_MS = 320;
const GX = DEFAULT_GAZE.x * GAZE_TRAVEL.x;
const GY = DEFAULT_GAZE.y * GAZE_TRAVEL.y;

type Pose = { rings: Ring[]; mouth: number[]; gaze: [number, number] };

const poseOf = (i: number): Pose => ({ rings: EXPRESSIONS[i]!, mouth: MOUTHS[i]!, gaze: GAZE[i]! });

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mix(a: Pose, b: Pose, t: number): Pose {
  return {
    rings: a.rings.map((ring, r) => ring.map((p, k) => {
      const q = b.rings[r]?.[k] ?? p;
      return [lerp(p[0], q[0], t), lerp(p[1], q[1], t)] as [number, number];
    })),
    mouth: a.mouth.map((v, k) => lerp(v, b.mouth[k] ?? v, t)),
    gaze: [lerp(a.gaze[0], b.gaze[0], t), lerp(a.gaze[1], b.gaze[1], t)],
  };
}

/** Nhắm nhanh, mở chậm — như `blinkScale` của vendor. */
function blinkScale(t: number) {
  return Math.max(t < 0.42 ? 1 - t / 0.42 : (t - 0.42) / 0.58, 0.04);
}

const between = ([min, max]: [number, number]) => min + Math.random() * (max - min);

/** Bộ máy mặt: đổi biểu cảm theo nhịp của trạng thái, nội suy hình mắt/miệng, chớp mắt. */
function useFace(state: MascotState, still: boolean) {
  const pool = POOLS[state];
  const [frame, setFrame] = useState<{ pose: Pose; blink: number }>(() => ({ pose: poseOf(pool[0]!), blink: 1 }));
  const shown = useRef(frame.pose);
  const morph = useRef<{ from: Pose; to: Pose; start: number } | null>(null);
  const blinkStart = useRef<number | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const tick = () => {
      const now = Date.now();
      let pose = shown.current;
      const m = morph.current;
      if (m) {
        const t = Math.min(1, (now - m.start) / MORPH_MS);
        pose = mix(m.from, m.to, 1 - Math.pow(1 - t, 3));
        if (t >= 1) morph.current = null;
      }
      let blink = 1;
      if (blinkStart.current !== null) {
        const t = (now - blinkStart.current) / BLINK_MS;
        if (t >= 1) blinkStart.current = null;
        else blink = blinkScale(t);
      }
      shown.current = pose;
      if (alive) setFrame({ pose, blink });
      raf.current = morph.current || blinkStart.current !== null ? requestAnimationFrame(tick) : null;
    };
    const kick = () => {
      if (raf.current === null) raf.current = requestAnimationFrame(tick);
    };
    const goTo = (index: number) => {
      morph.current = { from: shown.current, to: poseOf(index), start: Date.now() };
      kick();
    };

    // Vào trạng thái mới: về mặt nghỉ của nó.
    let current = pool[0]!;
    if (still) {
      shown.current = poseOf(current);
      setFrame({ pose: shown.current, blink: 1 });
    } else {
      goTo(current);
    }

    if (!still && pool.length > 1) {
      const cycle = () => {
        timers.push(
          setTimeout(() => {
            const choices = pool.filter((i) => i !== current);
            current = choices[Math.floor(Math.random() * choices.length)] ?? current;
            goTo(current);
            cycle();
          }, between(EXPR_CADENCE[state])),
        );
      };
      cycle();
    }
    const blinkEvery = BLINK[state];
    if (!still && blinkEvery) {
      const blinkLoop = () => {
        timers.push(
          setTimeout(() => {
            blinkStart.current = Date.now();
            kick();
            blinkLoop();
          }, between(blinkEvery)),
        );
      };
      blinkLoop();
    }

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
    // `pool` suy ra từ `state`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, still]);

  return frame;
}

/** Chuyển động thân theo `MOTION[state]` — bob/sway/pulse/jitter/tilt/scale của vendor. */
function useBodyMotion(state: MascotState, still: boolean, size: number) {
  const t = useRef(new Animated.Value(0)).current;
  const jitter = useRef(new Animated.Value(0)).current;
  const m = MOTION[state];
  const unit = size / (BODY_R * 2 + 30); // đơn vị mặt → điểm ảnh

  const period = m.bob?.[1] ?? m.sway?.[1] ?? m.pulse?.[1] ?? 0;

  useEffect(() => {
    t.setValue(0);
    jitter.setValue(0);
    if (still) return;
    const anims: Animated.CompositeAnimation[] = [];
    if (period > 0) {
      const half = Math.abs(period) / 2;
      anims.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(t, { toValue: 1, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(t, { toValue: 0, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ),
      );
    }
    if (m.jitter) {
      const step = Math.max(40, m.jitter[1] / 2);
      anims.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(jitter, { toValue: 1, duration: step, useNativeDriver: true }),
            Animated.timing(jitter, { toValue: -1, duration: step * 2, useNativeDriver: true }),
            Animated.timing(jitter, { toValue: 0, duration: step, useNativeDriver: true }),
          ]),
        ),
      );
    }
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [state, still, period, m.jitter, t, jitter]);

  return useMemo(() => {
    const transform: ({ translateX: Animated.AnimatedInterpolation<number> } | { translateY: Animated.AnimatedInterpolation<number> } | { rotate: Animated.AnimatedInterpolation<string> | string } | { scale: Animated.AnimatedInterpolation<number> | number })[] = [];
    if (m.bob) transform.push({ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -m.bob[0] * unit] }) });
    if (m.jitter) transform.push({ translateX: jitter.interpolate({ inputRange: [-1, 1], outputRange: [-m.jitter[0] * unit, m.jitter[0] * unit] }) });
    if (m.sway) transform.push({ rotate: t.interpolate({ inputRange: [0, 1], outputRange: [`${-m.sway[0]}deg`, `${m.sway[0]}deg`] }) });
    if (m.tilt) transform.push({ rotate: `${m.tilt}deg` });
    if (m.pulse) transform.push({ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + m.pulse[0]] }) });
    if (m.scale) transform.push({ scale: m.scale });
    return transform;
  }, [m, t, jitter, unit]);
}

export function Mascot({ state, size = 96 }: { state: MascotState; size?: number }) {
  const p = usePalette();
  const still = useReducedMotion();
  const { pose, blink } = useFace(state, still);
  const transform = useBodyMotion(state, still, size);

  // Đặt mắt: hướng nhìn riêng của biểu cảm (một phần) + hướng nhìn mặc định; chớp = co theo Y.
  const ox = pose.gaze[0] * LOOK_AROUND;
  const oy = pose.gaze[1] * LOOK_AROUND;
  const rings = pose.rings.map((ring) => ring.map((q) => [q[0] + ox, q[1] + oy] as [number, number]));
  const eyes = rings.map((ring) => {
    const c = ringCentre(ring);
    return toPath(ring.map((q) => [q[0] + GX, c[1] + (q[1] - c[1]) * blink + GY] as [number, number]));
  });
  const frame = mouthFrame(rings, pose.mouth);
  const mouth = mouthPath({ x: frame.x + GX, y: frame.y + GY, angle: frame.angle }, pose.mouth);

  return (
    <Animated.View aria-hidden style={{ width: size, height: size, transform }}>
      <Svg width={size} height={size} viewBox={VIEW_BOX}>
        <Circle cx={BODY_R} cy={BODY_R} r={BODY_R} fill={p.primary} />
        {eyes.map((d, i) => (
          <Path key={i} d={d} fill={p.panel} />
        ))}
        <Path d={mouth} fill="none" stroke={p.panel} strokeWidth={MOUTH_STROKE} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

/** Dấu hiệu thương hiệu — cùng hình với `LogoMark` của web, tĩnh (ADR 007 của LEARN). */
export function LogoMark({ size = 28 }: { size?: number }) {
  const p = usePalette();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <Circle cx={50} cy={50} r={50} fill={p.primary} />
      <Ellipse cx={35.5} cy={43} rx={6.5} ry={9.5} fill={p.panel} />
      <Ellipse cx={64.5} cy={43} rx={6.5} ry={9.5} fill={p.panel} />
      <Path d="M36 63 Q50 72 64 63" fill="none" stroke={p.panel} strokeWidth={5.5} strokeLinecap="round" />
    </Svg>
  );
}
