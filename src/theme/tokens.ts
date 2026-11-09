/**
 * Native roles sampled from the current website — ADR 002 supersedes old monochrome ADR 001.
 * Body/secondary/button contrast is checked in tokens.test.ts. No sibling source import.
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
  /** Four course-cover surfaces using website semantic colors. */
  cover: readonly [string, string, string, string];
  coverAccent: readonly [string, string, string, string];
  coverInk: string;
  overlay: string;
};

export const light: Palette = {
  scheme: 'light',
  app: '#faf8f5',
  panel: '#ffffff',
  panel2: '#fbfaf7',
  muted: '#f3efe8',
  line: '#ece8e1',
  lineStrong: '#cdc6b8',
  lineInput: '#8a8678',
  track: '#efebe4',
  fg: '#1e202a',
  fgMuted: '#3c3f4c',
  fgSubtle: '#5a5d6b',
  primary: '#2f66e8',
  primaryPressed: '#2858cc',
  primaryFg: '#ffffff',
  cover: ['#e7eefd', '#fff4d6', '#e6f4ec', '#fde8ed'],
  coverAccent: ['#c5c9d6', '#ddae3c', '#5cb88a', '#ef476f'],
  coverInk: 'rgba(43,43,43,0.22)',
  overlay: 'rgba(28,28,28,0.35)',
};

export const dark: Palette = {
  scheme: 'dark',
  app: '#16171f',
  panel: '#1f212c',
  panel2: '#262936',
  muted: '#2a2d3a',
  line: '#333644',
  lineStrong: '#565b6e',
  lineInput: '#858a9c',
  track: '#333644',
  fg: '#f1f1ee',
  fgMuted: '#cfd1da',
  fgSubtle: '#a7abba',
  primary: '#2f66e8',
  primaryPressed: '#2858cc',
  primaryFg: '#ffffff',
  cover: ['#1c2a4d', '#3a3220', '#16332a', '#3a1d2a'],
  coverAccent: ['#3a5aa8', '#8a7430', '#2f7a55', '#ef476f'],
  coverInk: 'rgba(227,227,227,0.2)',
  overlay: 'rgba(0,0,0,0.5)',
};

/** Inter cho giao diện và bài đọc, Plus Jakarta Sans cho tiêu đề — cùng website (ADR 002). Nạp trong `fonts.ts`. */
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  displaySemibold: 'PlusJakartaSans_600SemiBold',
  displayBold: 'PlusJakartaSans_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { control: 14, card: 20, panel: 24, pill: 9999 } as const;

/** Chữ nhỏ nhất 14px cho nội dung đọc — NFR-UX-07 của LEARN; 12–13px chỉ cho nhãn phụ. */
export const text = {
  display: { fontFamily: font.displayBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  title: { fontFamily: font.displayBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  heading: { fontFamily: font.displaySemibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
} as const;

export type TextVariant = keyof typeof text;
