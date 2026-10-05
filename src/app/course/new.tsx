import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { createCourseSchema } from '@/contracts';
import { Button, Field, Icon, InlineError, QuotaNotice, Screen, Segmented, Txt, type IconName } from '@/components/ui';
import { useCreateCourse } from '@/features/courses/courses-api';
import { errorText, isQuotaExceededError } from '@/lib/api-client';
import { fieldErrorsFrom } from '@/lib/form-errors';
import { routes } from '@/lib/routes';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';

const FIELDS = ['title', 'description', 'language'] as const;
type FieldName = (typeof FIELDS)[number];

/** Ba bước thật của luồng — người dùng biết form này chỉ là bước 1 (như web). */
const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'edit', title: 'Đặt tên khóa học', body: 'Bạn đang ở bước này.' },
  { icon: 'upload', title: 'Tải tài liệu lên', body: 'PDF, Word, PowerPoint hoặc văn bản, ở trang khóa học.' },
  { icon: 'sparkles', title: 'Sinh bài học bằng AI', body: 'Chạy nền, xem tiến độ trực tiếp.' },
];

const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'Tiếng Anh' },
] as const;

/** Tạo khóa học — modal: tác vụ ngắn, cần tập trung (bài giảng §4.3.1). */
export default function NewCourseScreen() {
  const p = usePalette();
  const create = useCreateCourse();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  async function onSubmit() {
    // Cùng schema với API — message tiếng Việt đã nằm trong contracts.
    const parsed = createCourseSchema.safeParse({ title: title.trim(), description: description.trim() || null, language });
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error, FIELDS));
      return;
    }
    setErrors({});
    try {
      const course = await create.mutateAsync(parsed.data);
      // Thay modal bằng trang khóa học: Back từ đó về danh sách, không quay lại form đã nộp.
      router.dismiss();
      router.push(routes.course(course.id));
    } catch {
      // Lỗi hiện bên dưới qua `create.error`.
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Txt variant="small" tone="subtle">
          Đặt tên cho khóa học, sau đó tải tài liệu lên để AI sinh bài học.
        </Txt>

        <View style={{ gap: space.lg }}>
          <Field
            label="Tên khóa học"
            value={title}
            onChangeText={setTitle}
            error={errors.title}
            placeholder="Ví dụ: Nhập môn giao thức HTTP"
            autoFocus
            returnKeyType="next"
          />
          <Field
            label="Mô tả"
            hint="Không bắt buộc. Giúp bạn nhận ra khóa học trong danh sách."
            value={description}
            onChangeText={setDescription}
            error={errors.description}
            multiline
          />
          <View style={{ gap: 6 }}>
            <Txt variant="smallStrong">Ngôn ngữ</Txt>
            <Segmented label="Ngôn ngữ bài học" value={language} options={LANGUAGES} onChange={setLanguage} />
            <Txt variant="caption" tone="subtle">
              Ngôn ngữ bài học được sinh ra.
            </Txt>
          </View>

          {create.isError && isQuotaExceededError(create.error) && (
            <QuotaNotice
              metric={create.error.meta.metric}
              limit={create.error.meta.limit}
              used={create.error.meta.used}
            />
          )}
          {create.isError && !isQuotaExceededError(create.error) && (
            <InlineError>{errorText(create.error, 'Không tạo được khóa học, vui lòng thử lại.')}</InlineError>
          )}

          <Button
            label={create.isPending ? 'Đang tạo…' : 'Tạo khóa học'}
            iconRight={create.isPending ? undefined : 'arrow-right'}
            size="lg"
            fullWidth
            loading={create.isPending}
            onPress={() => void onSubmit()}
          />
        </View>

        <View style={[styles.steps, { borderTopColor: p.line }]} accessibilityLabel="Các bước tạo khóa học">
          {STEPS.map((s, i) => (
            <View key={s.title} style={styles.step}>
              <Icon name={s.icon} size={20} color={i === 0 ? p.fg : p.fgSubtle} />
              <View style={{ flex: 1 }}>
                <Txt variant="caption" tone="subtle">
                  Bước {i + 1}
                </Txt>
                <Txt variant="smallStrong">{s.title}</Txt>
                <Txt variant="caption" tone="subtle">
                  {s.body}
                </Txt>
              </View>
            </View>
          ))}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  steps: { gap: space.lg, borderTopWidth: 1, paddingTop: space.xl },
  step: { flexDirection: 'row', gap: space.md },
});
