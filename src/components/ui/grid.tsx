import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '@/theme/tokens';

/** Lưới đều cột: chia con thành hàng `columns` ô, ô cuối thiếu thì đệm ô trống để mọi ô rộng bằng nhau. */
export function Grid({ columns, gap = space.md, children }: { columns: number; gap?: number; children: ReactNode }) {
  const items = Children.toArray(children);
  const cols = Math.max(1, Math.floor(columns));
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return (
    <View style={{ gap }}>
      {rows.map((row, r) => (
        <View key={r} testID="grid-row" style={[styles.row, { gap }]}>
          {row.map((item, c) => (
            <View key={c} style={styles.cell}>
              {item}
            </View>
          ))}
          {Array.from({ length: cols - row.length }, (_, k) => (
            <View
              key={`s${k}`}
              testID="grid-spacer"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.cell}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  cell: { flexBasis: 0, flexGrow: 1, minWidth: 0 },
});
