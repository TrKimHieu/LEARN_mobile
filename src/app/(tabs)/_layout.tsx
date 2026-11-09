import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Txt, type IconName } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { tabBarOptionsFor } from '@/features/navigation/tab-bar-options';
import { useLayout } from '@/theme/layout';
import { usePalette } from '@/theme/theme';

/**
 * Đích cấp cao — cùng thứ tự và nhãn với `navItemsFor()` của web: 4 tab cho mọi người, thêm
 * "Quản trị" (bản rút gọn) chỉ với ADMIN.
 */
const TABS: { name: string; title: string; icon: IconName; adminOnly?: boolean }[] = [
  { name: 'index', title: 'Tổng quan', icon: 'home' },
  { name: 'courses', title: 'Khóa học', icon: 'layers' },
  { name: 'progress', title: 'Tiến trình', icon: 'trend' },
  { name: 'settings', title: 'Cài đặt', icon: 'settings' },
  { name: 'admin', title: 'Quản trị', icon: 'shield', adminOnly: true },
];

export default function TabsLayout() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const isAdmin = useAuth().user?.role === 'ADMIN';
  return (
    <Tabs
      // Back trên Android quay về tab vừa xem, không nhảy thẳng về tab đầu (bài giảng §4.3.2).
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.primary,
        tabBarInactiveTintColor: p.fgSubtle,
        ...tabBarOptionsFor(layout, insets, p),
        sceneStyle: { backgroundColor: p.app },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            // `href: null` ẩn hẳn tab (không nút, không deep link từ tab bar) với người không phải ADMIN.
            ...(t.adminOnly && !isAdmin ? { href: null } : {}),
            // Nhãn mặc định bị ép cao ~11px, cắt chân chữ tiếng Việt ("g", "q") của Hanken Grotesk.
            tabBarLabel: ({ color }) => (
              <Txt variant="caption" style={{ color: String(color), flexShrink: 0 }}>
                {t.title}
              </Txt>
            ),
            tabBarIcon: ({ color, focused }) => (
              <Icon name={t.icon} size={24} color={String(color)} weight={focused ? 'fill' : 'regular'} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
