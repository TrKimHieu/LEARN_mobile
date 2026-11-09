import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { usePalette } from '@/theme/theme';
import { font, radius, space } from '@/theme/tokens';
import { Icon } from './icon';
import { Txt } from './text';

/**
 * Ô nhập có nhãn, gợi ý và lỗi ngay dưới ô (NN/g — báo lỗi form đúng chỗ sai). Lỗi có icon + chữ
 * + viền đậm, không chỉ bằng màu.
 */
export const Field = forwardRef<
  TextInputInstance,
  TextInputProps & {
    label: string;
    hint?: string;
    error?: string;
    right?: React.ReactNode;
    multiline?: boolean;
    mono?: boolean;
  }
>(function Field({ label, hint, error, right, multiline, mono, style, ...rest }, ref) {
  const p = usePalette();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="smallStrong">{label}</Txt>
      <View
        style={[
          styles.box,
          {
            backgroundColor: p.panel,
            borderColor: error ? p.fg : focused ? p.fgMuted : p.lineInput,
            borderWidth: error || focused ? 1.5 : 1,
            minHeight: multiline ? 120 : 48,
          },
        ]}
      >
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={p.fgSubtle}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: p.fg,
              fontFamily: mono ? 'monospace' : font.regular,
              fontSize: mono ? 14 : 16,
              textAlignVertical: multiline ? 'top' : 'center',
              paddingVertical: multiline ? space.md : 0,
            },
            style,
          ]}
        />
        {right}
      </View>
      {error ? (
        <View style={styles.row}>
          <Icon name="alert" size={14} color={p.fg} />
          <Txt variant="caption" style={{ flex: 1 }}>
            {error}
          </Txt>
        </View>
      ) : hint ? (
        <Txt variant="caption" tone="subtle">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
});

/** Ô mật khẩu có nút hiện/ẩn. */
export const PasswordField = forwardRef<
  TextInputInstance,
  Omit<React.ComponentProps<typeof Field>, 'secureTextEntry' | 'right'>
>(function PasswordField(props, ref) {
  const p = usePalette();
  const [visible, setVisible] = useState(false);
  return (
    <Field
      ref={ref}
      {...props}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      right={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          hitSlop={8}
          style={styles.eye}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={20} color={p.fgSubtle} />
        </Pressable>
      }
    />
  );
});

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.control,
    paddingHorizontal: space.md,
  },
  input: { flex: 1, minHeight: 46 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eye: { paddingLeft: space.sm, height: 44, justifyContent: 'center' },
});
