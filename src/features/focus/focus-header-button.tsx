import { router, Stack } from 'expo-router';
import { IconButton } from '@/components/ui';
import { routes } from '@/lib/routes';

/** T3-5: mở Pomodoro từ phiên ôn (câu hỏi R5 hoặc thẻ tự tạo); không gắn khóa/bài vì phiên trộn nhiều khóa. */
export function FocusHeaderButton() {
  return (
    <Stack.Screen
      options={{
        headerRight: () => <IconButton icon="clock" label="Mở Pomodoro" onPress={() => router.push(routes.focus())} />,
      }}
    />
  );
}
