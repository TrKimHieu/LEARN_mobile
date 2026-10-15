import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { resetPasswordSchema } from '@/contracts';
import { Mascot } from '@/components/mascot';
import { Button, InlineError, PasswordField, Txt } from '@/components/ui';
import { useResetPassword } from '@/features/auth/auth-api';
import { AuthLink, AuthShell } from '@/features/auth/components/auth-shell';
import { errorText } from '@/lib/api-client';
import { space } from '@/theme/tokens';

/**
 * Đặt mật khẩu mới — FR-AUTH-07 bước 2, port của `apps/web/src/features/auth/reset-password-view.tsx`.
 *
 * Mở qua `learn://reset-password?token=…` — trang đặt lại mật khẩu của web đưa link này khi được mở
 * trên điện thoại. Trong Expo Go scheme `learn://` không chạy, người dùng đặt lại trên trang web.
 */
export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldError, setFieldError] = useState<{ password?: string; confirm?: string }>({});
  const [done, setDone] = useState(false);
  const confirmRef = useRef<TextInput>(null);
  const reset = useResetPassword();
  const { error, isPending: submitting } = reset;

  const valid = resetPasswordSchema.shape.token.safeParse(token ?? '').success;

  async function onSubmit() {
    reset.reset();
    const errors: { password?: string; confirm?: string } = {};
    if (password.length < 8) errors.password = 'Mật khẩu cần ít nhất 8 ký tự.';
    else if (password.length > 72) errors.password = 'Mật khẩu tối đa 72 ký tự.';
    if (!errors.password && confirm !== password) errors.confirm = 'Hai mật khẩu chưa khớp.';
    setFieldError(errors);
    if (errors.password || errors.confirm) return;

    const parsed = resetPasswordSchema.safeParse({ token, newPassword: password });
    if (!parsed.success) return;
    try {
      await reset.mutateAsync(parsed.data);
      setDone(true);
    } catch {
      // Lỗi hiển thị qua `reset.error`.
    }
  }

  if (done) {
    return (
      <AuthShell
        title="Đã đặt mật khẩu mới"
        description="Mọi phiên đăng nhập cũ đã được đăng xuất để bảo vệ tài khoản. Đăng nhập lại bằng mật khẩu mới."
      >
        <Button label="Đăng nhập" iconRight="arrow-right" size="lg" fullWidth onPress={() => router.replace('/login')} />
      </AuthShell>
    );
  }

  if (!valid) {
    return (
      <AuthShell
        title="Đường dẫn không đầy đủ"
        description="Đường dẫn đặt lại mật khẩu bị thiếu mã. Hãy mở đúng đường dẫn trong thư, hoặc xin một thư mới."
      >
        <View style={{ gap: space.lg, alignItems: 'flex-start' }}>
          <Mascot state="confused" size={72} />
          <Button label="Xin đường dẫn mới" variant="secondary" onPress={() => router.replace('/forgot-password')} />
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Đặt mật khẩu mới"
      description="Chọn mật khẩu từ 8 ký tự. Sau khi đổi, mọi thiết bị đang đăng nhập sẽ bị đăng xuất."
    >
      <View style={{ gap: space.lg }}>
        <PasswordField
          label="Mật khẩu mới"
          value={password}
          onChangeText={setPassword}
          error={fieldError.password}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <PasswordField
          ref={confirmRef}
          label="Nhập lại mật khẩu mới"
          value={confirm}
          onChangeText={setConfirm}
          error={fieldError.confirm}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void onSubmit()}
        />
        {Boolean(error) && (
          <InlineError>
            {errorText(error, 'Không đặt lại được mật khẩu, vui lòng thử lại.')}{' '}
            <Txt variant="smallStrong" onPress={() => router.replace('/forgot-password')} style={{ textDecorationLine: 'underline' }}>
              Xin đường dẫn mới
            </Txt>
          </InlineError>
        )}
        <Button
          label={submitting ? 'Đang lưu…' : 'Đặt mật khẩu mới'}
          size="lg"
          fullWidth
          loading={submitting}
          onPress={() => void onSubmit()}
        />
        <AuthLink lead="Nhớ ra mật khẩu rồi?" label="Đăng nhập" onPress={() => router.replace('/login')} />
      </View>
    </AuthShell>
  );
}
