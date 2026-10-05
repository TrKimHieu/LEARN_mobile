import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, ErrorState, Field, InlineError, LoadingState, Screen } from '@/components/ui';
import { useLesson, usePatchLesson } from '@/features/learning/learning-api';
import { errorDetail, errorText } from '@/lib/api-client';
import { space } from '@/theme/tokens';

/** Ràng buộc của `patchLessonSchema` trong contracts. */
const TITLE_MIN = 5;

/** Sửa nội dung bài học — user story C-01, modal (tác vụ tạm thời, cần tập trung). */
export default function EditLessonScreen() {
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>();
  const lesson = useLesson(courseId, lessonId);
  const patch = usePatchLesson(courseId, lessonId);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (lesson.data && !loaded) {
      setTitle(lesson.data.title);
      setSummary(lesson.data.summary ?? '');
      setContent(lesson.data.contentMd);
      setLoaded(true);
    }
  }, [lesson.data, loaded]);

  const titleTooShort = title.trim().length < TITLE_MIN;

  async function save() {
    try {
      await patch.mutateAsync({ title: title.trim(), summary: summary.trim() || null, contentMd: content });
      router.back();
    } catch {
      // Lỗi hiện bên dưới qua `patch.error`.
    }
  }

  if (lesson.isLoading) {
    return (
      <Screen>
        <LoadingState rows={3} height={80} label="Đang tải bài học" />
      </Screen>
    );
  }
  if (lesson.isError || !lesson.data) {
    return (
      <Screen>
        <ErrorState
          title="Không tải được bài học"
          description={errorText(lesson.error, 'Vui lòng thử lại.')}
          detail={errorDetail(lesson.error)}
          onRetry={() => void lesson.refetch()}
        />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Field
          label="Tiêu đề"
          value={title}
          onChangeText={setTitle}
          // Quy tắc luôn hiển thị; thành lỗi khi vi phạm.
          hint={titleTooShort ? undefined : `Tiêu đề cần ít nhất ${TITLE_MIN} ký tự.`}
          error={titleTooShort ? `Tiêu đề cần ít nhất ${TITLE_MIN} ký tự.` : undefined}
        />
        <Field label="Tóm tắt" value={summary} onChangeText={setSummary} />
        <Field
          label="Nội dung (Markdown)"
          value={content}
          onChangeText={setContent}
          multiline
          mono
          autoCapitalize="none"
          autoCorrect={false}
          style={{ minHeight: 320 }}
        />
        {patch.isError && <InlineError>{errorText(patch.error, 'Không lưu được, vui lòng thử lại.')}</InlineError>}
        <View style={{ gap: space.sm }}>
          <Button
            label={patch.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
            size="lg"
            fullWidth
            loading={patch.isPending}
            disabled={titleTooShort}
            onPress={() => void save()}
          />
          <Button label="Huỷ" variant="ghost" fullWidth disabled={patch.isPending} onPress={() => router.back()} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
