import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { contentWidth, useLayout } from "@/theme/layout";
import { usePalette } from "@/theme/theme";
import { space } from "@/theme/tokens";

/** Thanh hành động ghim đáy màn bài tập. Màn đặt `bottomSpace` đủ để nội dung không bị che. */
export function ActionBar({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: p.panel,
          borderColor: p.line,
          paddingBottom: insets.bottom + space.sm,
          paddingLeft: insets.left + layout.gutter,
          paddingRight: insets.right + layout.gutter,
        },
      ]}
    >
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    width: "100%",
    maxWidth: contentWidth.reading,
  },
});
