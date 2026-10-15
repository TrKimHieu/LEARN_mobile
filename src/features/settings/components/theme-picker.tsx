import { Card, Segmented, Txt } from '@/components/ui';
import { useTheme, type ThemePreference } from '@/theme/theme';
import { space } from '@/theme/tokens';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Tự động' },
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
];

export function ThemePicker() {
  const { preference, setPreference } = useTheme();
  return (
    <Card style={{ gap: space.md }}>
      <Txt variant="heading">Giao diện</Txt>
      <Txt variant="small" tone="subtle">
        &quot;Tự động&quot; theo chế độ sáng/tối của điện thoại. Lựa chọn được lưu trên máy này.
      </Txt>
      <Segmented label="Giao diện" value={preference} options={THEMES} onChange={setPreference} />
    </Card>
  );
}
