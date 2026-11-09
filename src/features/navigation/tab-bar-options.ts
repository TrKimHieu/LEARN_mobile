import type { ViewStyle } from 'react-native';
import type { Layout } from '@/theme/layout';
import type { Palette } from '@/theme/tokens';

export type TabBarOptions = {
  tabBarPosition: 'bottom' | 'left';
  tabBarVariant: 'uikit' | 'material';
  tabBarLabelPosition: 'below-icon' | 'beside-icon';
  tabBarHideOnKeyboard: boolean;
  tabBarStyle: ViewStyle;
};

/**
 * Compact: thanh dock đáy. Medium/expanded (gồm điện thoại xoay ngang): rail bên trái,
 * chừa tai thỏ bằng `insets.left`, không đặt chiều cao cố định.
 */
export function tabBarOptionsFor(
  layout: Layout,
  insets: { left: number; bottom: number },
  p: Palette,
): TabBarOptions {
  if (layout.windowClass === 'compact') {
    return {
      tabBarPosition: 'bottom',
      tabBarVariant: 'uikit',
      tabBarLabelPosition: 'below-icon',
      tabBarHideOnKeyboard: true,
      // Cao đủ cho icon + nhãn (Hanken có dòng cao hơn font hệ thống) + vùng home indicator.
      tabBarStyle: {
        backgroundColor: p.panel,
        borderTopColor: p.line,
        height: 68 + insets.bottom,
        paddingTop: 6,
        paddingBottom: insets.bottom + 6,
      },
    };
  }
  return {
    tabBarPosition: 'left',
    tabBarVariant: 'material',
    tabBarLabelPosition: 'below-icon',
    tabBarHideOnKeyboard: false,
    tabBarStyle: {
      backgroundColor: p.panel,
      borderRightColor: p.line,
      borderRightWidth: 1,
      paddingLeft: insets.left,
    },
  };
}
