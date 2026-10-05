import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { forgotPasswordSchema } from '@/contracts';
import { Mascot } from '@/components/mascot';
import { Button, Field, InlineError, Txt } from '@/components/ui';
import { AuthLink, AuthShell } from '@/features/auth/auth-shell';
import { apiFetch, errorText } from '@/lib/api-client';
import { space } from '@/theme/tokens';

/**
 * Quên mật khẩu — FR-AUTH-07 bước 1. Máy chủ trả cùng một câu cho mọi email (không lộ email nào
 * đã đăng ký). Đường dẫn trong thư mở trang đặt lại mật khẩu của bản web.
 */
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit() {
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!parsed.success) {
      setFieldError('Email không hợp lệ.');
      return;
    }
    setFieldError(null);
    setSubmitting(true);
    try {
      await apiFetch('/api/v1/auth/forgot-password', { method: 'POST', body: parsed.data });
      setSubmitted(true);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthShell
        title="Kiểm tra hộp thư"
        description={`Nếu ${email.trim()} có tài khoản LEARN, một thư chứa đường dẫn đặt lại mật khẩu vừa được gửi tới đó. Đường dẫn dùng được một lần và hết hạn sau 30 phút.`}
      >
        <View style={{ gap: space.lg, alignItems: 'flex-start' }}>
          <Mascot state="idle" size={72} />
          <Txt variant="small" tone="subtle">
            Không thấy thư? Xem thư mục Spam, hoặc{' '}
            <Txt
              variant="smallStrong"
              accessibilityRole="link"
              onPress={() => setSubmitted(false)}
              style={{ textDecorationLine: 'underline' }}
            >
              gửi lại
            </Txt>
            .
          </Txt>
          <Button label="Quay lại đăng nhập" icon="arrow-left" variant="secondary" onPress={() => router.replace('/login')} />
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Quên mật khẩu"
      description="Nhập email bạn đã dùng để đăng ký, chúng tôi sẽ gửi đường dẫn đặt lại mật khẩu."
    >
      <View style={{ gap: space.lg }}>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={fieldError ?? undefined}
          placeholder="ban@vidu.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={() => void onSubmit()}
        />
        {Boolean(error) && (
          <InlineError>{errorText(error, 'Không gửi được yêu cầu, vui lòng thử lại.')}</InlineError>
        )}
        <Button
          label={submitting ? 'Đang gửi…' : 'Gửi đường dẫn đặt lại'}
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
