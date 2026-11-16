import { ScrollView } from 'react-native';
import { Button, Txt } from '@/components/ui';
import { space } from '@/theme/tokens';
import { useCourseOptions } from '../flashcards-api';

/** Chọn khóa học để gắn bộ thẻ (không bắt buộc). `null` = không gắn. */
export function CourseChips({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const courses = useCourseOptions();
  const list = courses.data?.courses ?? [];
  return (
    <>
      <Txt variant="smallStrong">Khóa học</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        <Button label="Không gắn khóa học" size="sm" variant={value === null ? 'primary' : 'secondary'} onPress={() => onChange(null)} />
        {list.map((c) => (
          <Button
            key={c.id}
            label={c.title}
            size="sm"
            variant={value === c.id ? 'primary' : 'secondary'}
            onPress={() => onChange(c.id)}
          />
        ))}
      </ScrollView>
    </>
  );
}
