import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChartColumn,
  Check,
  CircleCheck,
  CircleX,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Flame,
  GripVertical,
  House,
  Info,
  Layers,
  LoaderCircle,
  Lock,
  LogOut,
  Menu,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Target,
  Trash,
  TriangleAlert,
  Trophy,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';

/**
 * Bộ icon. Mặt tiền (`<Icon name="..." />`) được giữ nguyên từ bản vẽ tay, chỉ
 * đổi phần ruột sang `lucide-react`.
 *
 * Vì sao đổi: bộ cũ là 19 chuỗi `path` gõ tay, mỗi lần cần hình mới lại phải
 * tự vẽ — và vài hình đã sai tỉ lệ so với phần còn lại (`book`, `chart`). Lucide
 * là cùng một hệ hình học (lưới 24px, stroke 2, đầu nét bo tròn) nên thay vào
 * không đổi cảm giác thị giác, nhưng mở ra ~1600 hình đã chuẩn hoá.
 *
 * Vì sao **không** gọi thẳng component của Lucide ở call site:
 * - `IconName` là union hẹp, nên gõ sai tên hỏng typecheck ngay.
 * - `aria-hidden` + `focusable="false"` được áp ở một chỗ duy nhất. Icon ở đây
 *   luôn là trang trí; ý nghĩa phải nằm ở nhãn chữ hoặc `aria-label` phía gọi.
 *   Màu không bao giờ là tín hiệu duy nhất (HANDBOOK §14).
 * - Đổi bộ icon lần sau chỉ phải sửa một file.
 */
const ICONS = {
  // — 19 tên của bản vẽ tay, giữ nguyên để không phải sửa call site —
  check: Check,
  lock: Lock,
  play: Play,
  book: BookOpen,
  trophy: Trophy,
  flame: Flame,
  target: Target,
  star: Star,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  plus: Plus,
  x: X,
  alert: TriangleAlert,
  home: House,
  layers: Layers,
  chart: ChartColumn,
  settings: Settings,
  shield: Shield,
  logout: LogOut,

  // — bổ sung —
  'chevron-left': ChevronLeft,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  upload: Upload,
  file: FileText,
  trash: Trash,
  edit: Pencil,
  retry: RotateCcw,
  search: Search,
  sparkles: Sparkles,
  clock: Clock,
  'circle-check': CircleCheck,
  'circle-x': CircleX,
  info: Info,
  eye: Eye,
  'eye-off': EyeOff,
  menu: Menu,
  external: ExternalLink,
  spinner: LoaderCircle,
  grip: GripVertical,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  className,
  filled = false,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Tô đặc bằng màu chữ hiện hành — dùng cho node đã "khoá" trên lộ trình. */
  filled?: boolean;
}) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      aria-hidden="true"
      focusable="false"
    />
  );
}
