import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LogoMark } from "@/components/mascot";
import { Txt } from "@/components/ui";
import { authModeFor } from "@/features/navigation/screen-modes";
import { contentWidth, useLayout } from "@/theme/layout";
import { usePalette } from "@/theme/theme";
import { space } from "@/theme/tokens";

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
  const layout = useLayout();
  const split = authModeFor(layout) === "split";
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.app }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (split ? space.lg : space.xxl),
            paddingBottom: insets.bottom + space.xl,
            paddingLeft: insets.left + layout.gutter,
            paddingRight: insets.right + layout.gutter,
          },
        ]}
      >
        <View style={[styles.column, split && styles.split]}>
          <View style={[styles.pane, split && styles.paneSplit]}>
            <View style={styles.brand}>
              <LogoMark size={32} />
              <Txt variant="heading" style={{ letterSpacing: 1.5 }}>
                LEARN
              </Txt>
            </View>
            {split && <TitleBlock title={title} description={description} />}
          </View>
          <View style={[styles.pane, split && styles.paneSplit]}>
            {!split && <TitleBlock title={title} description={description} />}
            {children}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TitleBlock({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={{ gap: space.xs }}>
      <Txt variant="title" accessibilityRole="header">
        {title}
      </Txt>
      <Txt variant="small" tone="subtle">
        {description}
      </Txt>
    </View>
  );
}

export function AuthLink({
  lead,
  label,
  onPress,
}: {
  lead: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Txt variant="small" tone="subtle" style={{ textAlign: "center" }}>
      {lead}{" "}
      <Txt
        variant="smallStrong"
        accessibilityRole="link"
        onPress={onPress}
        style={{ textDecorationLine: "underline" }}
      >
        {label}
      </Txt>
    </Txt>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: "center" },
  column: { width: "100%", maxWidth: contentWidth.narrow, gap: space.xl },
  split: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: contentWidth.narrow * 2,
    gap: space.xxl,
  },
  pane: { gap: space.xl },
  paneSplit: { flex: 1 },
  brand: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
