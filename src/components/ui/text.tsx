import { Text, type TextProps } from 'react-native';
import { usePalette } from '@/theme/theme';
import { text, type TextVariant } from '@/theme/tokens';

type Tone = 'fg' | 'muted' | 'subtle' | 'inverse';

/** Chữ của app — mọi `Text` đi qua đây để font, cỡ và màu luôn lấy từ token. */
export function Txt({
  variant = 'body',
  tone = 'fg',
  style,
  ...rest
}: TextProps & { variant?: TextVariant; tone?: Tone }) {
  const p = usePalette();
  const color =
    tone === 'muted'
      ? p.fgMuted
      : tone === 'subtle'
        ? p.fgSubtle
        : tone === 'inverse'
          ? p.primaryFg
          : p.fg;
  return <Text {...rest} style={[text[variant], { color }, style]} />;
}
