import { forwardRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { Txt } from './text';

/**
 * Khung cuộn của một màn: lề 16, kéo xuống để tải lại, chừa chỗ cho thanh hành động dính đáy.
 * `topInset`: màn trong Tabs không có header native nên tự chừa tai thỏ.
 */
export const Screen = forwardRef<
  ScrollView,
  ScrollViewProps & {
    children: React.ReactNode;
    onRefresh?: () => Promise<unknown>;
    topInset?: boolean;
    bottomSpace?: number;
  }
>(function Screen({ children, onRefresh, topInset = false, bottomSpace = space.xxl, contentContainerStyle, ...rest }, ref) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  return (
    <ScrollView
      ref={ref}
      {...rest}
      style={{ flex: 1, backgroundColor: p.app }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        { paddingTop: (topInset ? insets.top : 0) + space.lg, paddingBottom: bottomSpace },
        contentContainerStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            tintColor={p.fgSubtle}
            colors={[p.fgMuted]}
            progressBackgroundColor={p.panel}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await onRefresh();
              } finally {
                setRefreshing(false);
              }
            }}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
});

/** Đầu màn cấp cao (tab): tiêu đề lớn + một câu có thông tin + hành động. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Txt variant="display" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </Txt>
        {action}
      </View>
      {description ? (
        typeof description === 'string' ? (
          <Txt variant="small" tone="subtle">
            {description}
          </Txt>
        ) : (
          description
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, gap: space.xl },
  header: { gap: space.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
