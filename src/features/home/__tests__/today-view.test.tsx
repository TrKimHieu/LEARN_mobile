import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TodayView } from '../components/today-view';
import type { SavedPlan } from '../today-plan';

const mockPush = jest.fn();
let mockState: Record<string, unknown>;
const mockMascot = jest.fn((_: { state: string }) => null);
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a), navigate: jest.fn() } }));
jest.mock('../use-today-plan', () => ({ useTodayPlan: () => mockState }));
const mockSync = jest.fn();
jest.mock('@/features/reviews/reminder', () => ({ syncStudyReminder: (...a: unknown[]) => mockSync(...a) }));
jest.mock('@/components/mascot', () => ({ Mascot: (p: { state: string }) => mockMascot(p) }));
jest.mock('@/components/update-notice', () => ({ UpdateNotice: () => null }));
jest.mock('@/components/ui/icon', () => ({ Icon: () => null }));
jest.mock('@/theme/theme', () => ({ usePalette: () => jest.requireActual('@/theme/tokens').light }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/lib/use-reduced-motion', () => ({ useReducedMotion: () => false }));

const plan = (done: string[]): SavedPlan => ({
  day: '2026-11-19',
  done,
  tasks: [
    { id: 'review', kind: 'review', dueCount: 5 },
    { id: 'lesson:L', kind: 'lesson', courseId: 'C', lessonId: 'L', title: 'Bài một', courseTitle: 'Khóa A', index: 2, total: 4 },
  ],
});
const base = (over: Record<string, unknown>) => ({
  gate: 'ready', failed: undefined, retry: jest.fn(), day: '2026-11-19', previousSeen: null, studying: 1,
  hasCourses: true, liveDue: 5, questionsDue: 5,
  overview: { data: { activeStreak: 3, lastStudyDay: '2026-11-18' }, refetch: jest.fn() },
  ...over,
});

let tree: ReactTestRenderer;
// Chỉ lấy chữ hiển thị: cây có RefreshControl nên toJSON() bị vòng tham chiếu.
const text = () => tree.root.findAll((n) => typeof n.props.children === 'string').map((n) => n.props.children).join('|');
afterEach(() => { act(() => tree.unmount()); jest.clearAllMocks(); });

it('shows the first-course prompt when there is no course', () => {
  mockState = base({ hasCourses: false, plan: plan([]) });
  act(() => { tree = create(<TodayView />); });
  expect(text()).toContain('Tạo khóa học đầu tiên');
});

it('lists today tasks with streak and goal, and opens a task', () => {
  mockState = base({ plan: plan([]) });
  act(() => { tree = create(<TodayView />); });
  expect(text()).toContain('Ôn 5 thẻ đến hạn');
  expect(text()).toContain('Khóa A · Bài 2/4');
  expect(text()).toContain('Đã xong 0 trên 2 việc hôm nay');
  expect(mockMascot).toHaveBeenLastCalledWith({ state: 'listening', size: 88 });
  expect(mockSync).toHaveBeenLastCalledWith(['5 thẻ đến hạn', 'Bài: Bài một']);
  const learn = tree.root.findAll((n) => n.props.label === 'Học' && typeof n.props.onPress === 'function')[0]!;
  act(() => learn.props.onPress());
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/course/[courseId]/lesson/[lessonId]', params: { courseId: 'C', lessonId: 'L' } });
});

it('celebrates when every task is done and hides the action buttons', () => {
  mockState = base({ plan: plan(['review', 'lesson:L']), liveDue: 0 });
  act(() => { tree = create(<TodayView />); });
  expect(text()).toContain('Đã xong 2 trên 2 việc hôm nay');
  expect(text().split('|')).not.toContain('Ôn');
  expect(mockMascot).toHaveBeenLastCalledWith({ state: 'celebrate', size: 88 });
  expect(mockSync).toHaveBeenLastCalledWith([]);
});
