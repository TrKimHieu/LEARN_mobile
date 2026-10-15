import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoMark } from '@/components/mascot';
import { Txt } from '@/components/ui';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';

/** Khung chung của các màn đăng nhập/đăng ký/quên mật khẩu. */
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.app }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl },
        ]}
      >
        <View style={styles.brand}>
          <LogoMark size={32} />
          <Txt variant="heading" style={{ letterSpacing: 1.5 }}>
            LEARN
          </Txt>
        </View>
        <View style={{ gap: space.xs }}>
          <Txt variant="title" accessibilityRole="header">
            {title}
          </Txt>
          <Txt variant="small" tone="subtle">
            {description}
          </Txt>
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthLink({ lead, label, onPress }: { lead: string; label: string; onPress: () => void }) {
  return (
    <Txt variant="small" tone="subtle" style={{ textAlign: 'center' }}>
      {lead}{' '}
      <Txt
        variant="smallStrong"
        accessibilityRole="link"
        onPress={onPress}
        style={{ textDecorationLine: 'underline' }}
      >
        {label}
      </Txt>
    </Txt>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, gap: space.xl, flexGrow: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
