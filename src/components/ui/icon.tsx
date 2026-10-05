import type { IconProps as PhosphorProps } from 'phosphor-react-native';
import { ArrowCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowCounterClockwise';
import { ArrowLeftIcon } from 'phosphor-react-native/src/icons/ArrowLeft';
import { ArrowRightIcon } from 'phosphor-react-native/src/icons/ArrowRight';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { CaretUpIcon } from 'phosphor-react-native/src/icons/CaretUp';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { EyeSlashIcon } from 'phosphor-react-native/src/icons/EyeSlash';
import { FileTextIcon } from 'phosphor-react-native/src/icons/FileText';
import { FireIcon } from 'phosphor-react-native/src/icons/Fire';
import { GearIcon } from 'phosphor-react-native/src/icons/Gear';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { ListIcon } from 'phosphor-react-native/src/icons/List';
import { ListChecksIcon } from 'phosphor-react-native/src/icons/ListChecks';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { SignOutIcon } from 'phosphor-react-native/src/icons/SignOut';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { StackIcon } from 'phosphor-react-native/src/icons/Stack';
import { StarIcon } from 'phosphor-react-native/src/icons/Star';
import { TargetIcon } from 'phosphor-react-native/src/icons/Target';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import { TrendUpIcon } from 'phosphor-react-native/src/icons/TrendUp';
import { TrophyIcon } from 'phosphor-react-native/src/icons/Trophy';
import { UploadSimpleIcon } from 'phosphor-react-native/src/icons/UploadSimple';
import { UserIcon } from 'phosphor-react-native/src/icons/User';
import { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { View } from 'react-native';
import { usePalette } from '@/theme/theme';

/**
 * Bộ icon Phosphor — cùng họ icon với web (`apps/web/src/components/ui/icon.tsx`), cùng tên.
 * Import từng icon theo đường dẫn riêng: import từ gốc package kéo cả ~1500 icon vào bundle.
 */
const ICONS = {
  home: HouseIcon,
  layers: StackIcon,
  trend: TrendUpIcon,
  settings: GearIcon,
  plus: PlusIcon,
  'arrow-right': ArrowRightIcon,
  'arrow-left': ArrowLeftIcon,
  check: CheckIcon,
  'circle-check': CheckCircleIcon,
  x: XIcon,
  alert: WarningIcon,
  info: InfoIcon,
  sparkles: SparkleIcon,
  upload: UploadSimpleIcon,
  file: FileTextIcon,
  clock: ClockIcon,
  star: StarIcon,
  edit: PencilSimpleIcon,
  trash: TrashIcon,
  target: TargetIcon,
  trophy: TrophyIcon,
  retry: ArrowCounterClockwiseIcon,
  'chevron-up': CaretUpIcon,
  'chevron-down': CaretDownIcon,
  'chevron-right': CaretRightIcon,
  flame: FireIcon,
  'book-check': ListChecksIcon,
  logout: SignOutIcon,
  user: UserIcon,
  shield: ShieldCheckIcon,
  eye: EyeIcon,
  'eye-off': EyeSlashIcon,
  list: ListIcon,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color,
  filled = false,
  weight,
}: {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
  weight?: PhosphorProps['weight'];
}) {
  const p = usePalette();
  const Component = ICONS[name];
  // Icon luôn đi kèm chữ hoặc nhãn riêng — với trình đọc màn hình, hình chỉ là trang trí.
  return (
    <View aria-hidden>
      <Component size={size} color={color ?? p.fg} weight={weight ?? (filled ? 'fill' : 'regular')} />
    </View>
  );
}
