import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { loginSchema } from '@/contracts';
import { Button, Field, InlineError, PasswordField, Txt } from '@/components/ui';
import { AuthLink, AuthShell } from '@/features/auth/auth-shell';
import { useAuth } from '@/features/auth/auth-context';
import { errorText } from '@/lib/api-client';
import { authMessage, fieldErrorsFrom } from '@/lib/form-errors';
import { space } from '@/theme/tokens';

const FIELDS = ['email', 'password'] as const;
type FieldName = (typeof FIELDS)[number];

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<Partial<Record<FieldName, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const refs = { email: useRef<TextInput>(null), password: useRef<TextInput>(null) };

  async function onSubmit() {
    setError(null);
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      const errors = fieldErrorsFrom(parsed.error, FIELDS, authMessage);
      setFieldError(errors);
      // Đưa con trỏ về ô sai đầu tiên theo thứ tự trên form.
      const first = FIELDS.find((f) => errors[f]);
      if (first) refs[first].current?.focus();
      return;
    }
    setFieldError({});
    setSubmitting(true);
    try {
      // Stack.Protected tự chuyển vào app khi trạng thái thành `authed`.
      await login(parsed.data);
    } catch (err) {
      setError(errorText(err, 'Không kết nối được máy chủ, vui lòng thử lại.'));
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Chào mừng trở lại" description="Đăng nhập để tiếp tục các khóa học và bài tập của bạn.">
      <View style={{ gap: space.lg }}>
        <Field
          ref={refs.email}
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={fieldError.email}
          placeholder="ban@vidu.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => refs.password.current?.focus()}
        />
        <PasswordField
          ref={refs.password}
          label="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          error={fieldError.password}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void onSubmit()}
        />
        <Txt
          variant="smallStrong"
          accessibilityRole="link"
          onPress={() => router.push('/forgot-password')}
          style={{ textDecorationLine: 'underline', alignSelf: 'flex-end' }}
        >
          Quên mật khẩu?
        </Txt>
        {error && <InlineError>{error}</InlineError>}
        <Button
          label={submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          iconRight={submitting ? undefined : 'arrow-right'}
          size="lg"
          fullWidth
          loading={submitting}
          onPress={() => void onSubmit()}
        />
        <AuthLink lead="Chưa có tài khoản?" label="Đăng ký miễn phí" onPress={() => router.replace('/register')} />
      </View>
    </AuthShell>
  );
}
