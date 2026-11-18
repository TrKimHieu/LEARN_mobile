import { Tabs } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Txt, type IconName } from '@/components/ui';
import { useDueCardCount } from '@/features/flashcards/flashcards-api';
import { CreateSheet } from '@/features/navigation/create-sheet';
import { tabBarOptionsFor } from '@/features/navigation/tab-bar-options';
import { useLayout } from '@/theme/layout';
import { usePalette } from '@/theme/theme';

/**
 * Đích cấp cao theo spec web "lấy việc học làm trung tâm" (4.1), có chỉnh cho mobile: Học · Khóa học ·
 * ＋ Tạo · Thẻ · Tiến trình. Mobile giữ tab Tiến trình (người dùng chốt 2026-11-19); Cài đặt và Quản trị
 * mở từ nút tài khoản ở màn Học.
 */
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Học', icon: 'home' },
  { name: 'courses', title: 'Khóa học', icon: 'layers' },
  { name: 'create', title: 'Tạo', icon: 'plus' },
  { name: 'decks', title: 'Thẻ', icon: 'list' },
  { name: 'progress', title: 'Tiến trình', icon: 'trend' },
];

export default function TabsLayout() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const dueCards = useDueCardCount().data ?? 0;
  const [creating, setCreating] = useState(false);
  return (
    <>
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
            // Số thẻ tự tạo đến hạn (W1); câu hỏi bài tập đến hạn nằm trong "Việc hôm nay" ở màn Học.
            ...(t.name === 'decks' && dueCards > 0
              ? { tabBarBadge: dueCards > 99 ? '99+' : dueCards, tabBarBadgeStyle: { backgroundColor: p.primary, color: p.primaryFg } }
              : {}),
            // Nhãn mặc định bị ép cao ~11px, cắt chân chữ tiếng Việt ("g", "q") của Hanken Grotesk.
            tabBarLabel: ({ color }) => (
              <Txt variant="caption" style={{ color: String(color), flexShrink: 0 }}>
                {t.title}
              </Txt>
            ),
            tabBarIcon: ({ color, focused }) =>
              t.name === 'create' ? (
                <View style={[styles.create, { backgroundColor: p.primary }]}>
                  <Icon name="plus" size={22} color={p.primaryFg} />
                </View>
              ) : (
                <Icon name={t.icon} size={24} color={String(color)} weight={focused ? 'fill' : 'regular'} />
              ),
            ...(t.name === 'create' ? { tabBarAccessibilityLabel: 'Tạo khóa học hoặc bộ thẻ' } : {}),
          }}
          // "Tạo" không phải một màn: chạm vào mở bảng chọn, không chuyển tab.
          listeners={t.name === 'create' ? { tabPress: (e) => { e.preventDefault(); setCreating(true); } } : undefined}
        />
      ))}
    </Tabs>
    <CreateSheet open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  create: { width: 40, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
