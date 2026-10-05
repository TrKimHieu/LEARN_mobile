import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { registerSchema } from '@/contracts';
import { Button, Field, InlineError, PasswordField } from '@/components/ui';
import { AuthLink, AuthShell } from '@/features/auth/auth-shell';
import { useAuth } from '@/features/auth/auth-context';
import { errorText } from '@/lib/api-client';
import { authMessage, fieldErrorsFrom } from '@/lib/form-errors';
import { space } from '@/theme/tokens';

const FIELDS = ['displayName', 'email', 'password'] as const;
type FieldName = (typeof FIELDS)[number];

export default function RegisterScreen() {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<Partial<Record<FieldName, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const refs = {
    displayName: useRef<TextInput>(null),
    email: useRef<TextInput>(null),
    password: useRef<TextInput>(null),
  };

  async function onSubmit() {
    setError(null);
    const parsed = registerSchema.safeParse({
      displayName: displayName.trim(),
      email: email.trim(),
      password,
      locale: 'vi',
    });
    if (!parsed.success) {
      const errors = fieldErrorsFrom(parsed.error, FIELDS, authMessage);
      setFieldError(errors);
      const first = FIELDS.find((f) => errors[f]);
      if (first) refs[first].current?.focus();
      return;
    }
    setFieldError({});
    setSubmitting(true);
    try {
      await register(parsed.data);
    } catch (err) {
      setError(errorText(err, 'Không tạo được tài khoản, vui lòng thử lại.'));
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Tạo tài khoản"
      description="Miễn phí. Tải tài liệu của bạn lên, AI dựng lộ trình bài học và bài tập từ đó."
    >
      <View style={{ gap: space.lg }}>
        <Field
          ref={refs.displayName}
          label="Tên hiển thị"
          value={displayName}
          onChangeText={setDisplayName}
          error={fieldError.displayName}
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => refs.email.current?.focus()}
        />
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
          hint="Ít nhất 8 ký tự."
          value={password}
          onChangeText={setPassword}
          error={fieldError.password}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void onSubmit()}
        />
        {error && <InlineError>{error}</InlineError>}
        <Button
          label={submitting ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
          size="lg"
          fullWidth
          loading={submitting}
          onPress={() => void onSubmit()}
        />
        <AuthLink lead="Đã có tài khoản?" label="Đăng nhập" onPress={() => router.replace('/login')} />
      </View>
    </AuthShell>
  );
}
