/**
 * Token màu của app mobile — ADR 001 (docs/adr/001-don-sac-diu.md).
 *
 * Vẫn đơn sắc như web (spec §14.2, ADR 015 của LEARN: chỉ xám trung tính, không hue), cùng TÊN vai
 * trò với `packages/config/tailwind/theme.css` để đối chiếu dễ. Khác web ở một điểm có chủ đích:
 * **không có cặp gần-trắng/gần-đen**. Web đặt chữ #111 trên nền #fff (18.9:1) và nút chính khối
 * đen đặc; ở đây chữ đậm nhất là xám than, nền là xám rất nhạt, nút chính xám đậm — tương phản
 * chữ vẫn đạt WCAG (đo trong ADR), chỉ bớt gắt.
 *
 * Tương phản đo trên panel / app:
 *   sáng: fg 13.6/12.5 · fgMuted 8.5/7.9 · fgSubtle 5.3/4.9 · nút chính 9.8
 *   tối:  fg 12.1/13.3 · fgMuted 8.2/9.0 · fgSubtle 5.5/6.0 · nút chính 9.5
 */
export type Palette = {
  scheme: 'light' | 'dark';
  app: string;
  panel: string;
  panel2: string;
  muted: string;
  line: string;
  lineStrong: string;
  lineInput: string;
  track: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  primary: string;
  primaryPressed: string;
  primaryFg: string;
  /** Nền cover khóa học — bốn mức xám nhạt khác nhau đủ để các bìa không giống hệt. */
  cover: readonly [string, string, string, string];
  coverAccent: readonly [string, string, string, string];
  coverInk: string;
  overlay: string;
};

export const light: Palette = {
  scheme: 'light',
  app: '#f1f1f1',
  panel: '#fafafa',
  panel2: '#f5f5f5',
  muted: '#e9e9e9',
  line: '#e0e0e0',
  lineStrong: '#cdcdcd',
  lineInput: '#878787',
  track: '#e1e1e1',
  fg: '#2b2b2b',
  fgMuted: '#4a4a4a',
  fgSubtle: '#696969',
  primary: '#3d3d3d',
  primaryPressed: '#555555',
  primaryFg: '#f3f3f3',
  cover: ['#e6e6e6', '#dedede', '#eaeaea', '#d9d9d9'],
  coverAccent: ['#c4c4c4', '#ababab', '#d0d0d0', '#9a9a9a'],
  coverInk: 'rgba(43,43,43,0.22)',
  overlay: 'rgba(28,28,28,0.35)',
};

export const dark: Palette = {
  scheme: 'dark',
  app: '#1c1c1c',
  panel: '#242424',
  panel2: '#282828',
  muted: '#2e2e2e',
  line: '#333333',
  lineStrong: '#424242',
  lineInput: '#7a7a7a',
  track: '#383838',
  fg: '#e3e3e3',
  fgMuted: '#bcbcbc',
  fgSubtle: '#999999',
  primary: '#cdcdcd',
  primaryPressed: '#b5b5b5',
  primaryFg: '#262626',
  cover: ['#2b2b2b', '#303030', '#282828', '#353535'],
  coverAccent: ['#474747', '#555555', '#3f3f3f', '#5e5e5e'],
  coverInk: 'rgba(227,227,227,0.2)',
  overlay: 'rgba(0,0,0,0.5)',
};

/** Tên font đăng ký ở `src/app/_layout.tsx` — Hanken Grotesk, giống web (ADR 014 của LEARN). */
export const font = {
  regular: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
  bold: 'HankenGrotesk_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { control: 8, card: 14, panel: 18, pill: 999 } as const;

/** Chữ nhỏ nhất 14px cho nội dung đọc — NFR-UX-07 của LEARN; 12–13px chỉ cho nhãn phụ. */
export const text = {
  display: { fontFamily: font.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  title: { fontFamily: font.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  heading: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
} as const;

export type TextVariant = keyof typeof text;
