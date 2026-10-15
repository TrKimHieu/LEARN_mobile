import { StyleSheet, View } from 'react-native';
import { Badge, Button, Card, Divider, Txt } from '@/components/ui';
import { confirmAction } from '@/lib/dialog';
import { humanizeCode } from '@/lib/format';
import { usePalette } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { useAuth } from '../auth-context';

/** Nhãn tiếng Việt cho enum của API — không đổ mã máy ra màn hình (NN/g H2). */
const ROLE_LABEL: Record<string, string> = { LEARNER: 'Người học', ADMIN: 'Quản trị viên' };

/** Hồ sơ người dùng đang đăng nhập + đăng xuất. */
export function ProfileCard() {
  const { user, logout, logoutAll } = useAuth();

  // Đăng xuất mọi thiết bị: xác nhận hai nhịp — cùng mẫu với "Xoá bài học".
  async function confirmLogoutAll() {
    const ok = await confirmAction({
      title: 'Đăng xuất mọi thiết bị?',
      message: 'Mọi trình duyệt và điện thoại đang đăng nhập sẽ phải đăng nhập lại.',
      confirmLabel: 'Đăng xuất hết',
      cancelLabel: 'Không',
    });
    if (ok) await logoutAll();
  }

  return (
    <Card style={{ gap: space.lg }}>
      <View style={styles.profile}>
        <Avatar name={user?.displayName} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="heading" numberOfLines={1}>
            {user?.displayName}
          </Txt>
          <Txt variant="small" tone="subtle" numberOfLines={1}>
            {user?.email}
          </Txt>
          {user?.role && (
            <View style={{ marginTop: 4 }}>
              <Badge label={ROLE_LABEL[user.role] ?? humanizeCode(user.role)} icon={user.role === 'ADMIN' ? 'shield' : 'user'} />
            </View>
          )}
        </View>
      </View>
      <Divider />
      <View style={{ gap: space.sm }}>
        <Button label="Đăng xuất" icon="logout" variant="secondary" fullWidth onPress={() => void logout()} />
        <Button label="Đăng xuất mọi thiết bị" variant="ghost" fullWidth onPress={() => void confirmLogoutAll()} />
      </View>
    </Card>
  );
}

function Avatar({ name }: { name?: string }) {
  const p = usePalette();
  const initial = (name?.trim().split(/\s+/).pop() ?? '?').charAt(0).toUpperCase();
  return (
    <View style={[styles.avatar, { backgroundColor: p.primary }]}>
      <Txt variant="title" tone="inverse">
        {initial}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
