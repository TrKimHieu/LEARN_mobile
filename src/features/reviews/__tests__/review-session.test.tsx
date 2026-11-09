import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { ReviewCard } from '@/contracts';
import { Button, EmptyState } from '@/components/ui';
import { ReviewSession } from '../components/review-session';

const mockMutate = jest.fn();
const mockPush = jest.fn();
jest.mock('../reviews-api', () => ({
  useSubmitReview: () => ({ mutateAsync: (...a: unknown[]) => mockMutate(...a), isPending: false }),
}));
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a), navigate: (...a: unknown[]) => mockPush(...a) } }));
jest.mock('@/theme/theme', () => ({ usePalette: () => jest.requireActual('@/theme/tokens').light }));
jest.mock('@/theme/layout', () => ({ ...jest.requireActual('@/theme/layout'), useLayout: () => jest.requireActual('@/theme/layout').layoutFor(400, 800) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/components/ui/icon', () => ({ Icon: () => null }));
jest.mock('@/components/mascot', () => ({ Mascot: () => null, LogoMark: () => null }));
jest.mock('@/components/ui/screen', () => ({
  Screen: ({ children }: { children: React.ReactNode }) => jest.requireActual('react').createElement(jest.requireActual('react-native').View, null, children),
  PageHeader: () => null,
}));

const card = (id: string): ReviewCard => ({
  questionId: id, prompt: `Hỏi ${id}`, type: 'SHORT', answerText: `Đáp ${id}`, explanation: null,
  courseId: 'c', courseTitle: 'C', lessonId: 'l', lessonTitle: 'L', dueAt: '2026-11-09T00:00:00.000Z',
  intervalDays: 1, repetitions: 1,
});

let tree: ReactTestRenderer;
beforeEach(() => { jest.clearAllMocks(); mockMutate.mockResolvedValue(undefined); });
afterEach(() => { if (tree) act(() => tree.unmount()); });

const json = () => JSON.stringify(tree.toJSON());
const labels = () => tree.root.findAllByType(Button).map((b) => b.props.label as string);
// Bấm nút lật thật của FlipCard: cùng đường với TalkBack/VoiceOver (onPress), không qua cử chỉ chạm.
const flip = () => act(() => { tree.root.findAllByType(Button).find((b) => b.props.label === 'Lật thẻ xem đáp án')!.props.onPress(); });
const grade = async (label: string) => {
  const b = tree.root.findAllByType(Button).find((x) => x.props.label === label)!;
  await act(async () => { await b.props.onPress(); });
};

it('hides answer and grade buttons until flipped', () => {
  act(() => { tree = create(<ReviewSession cards={[card('q1')]} />); });
  expect(json()).not.toContain('Đáp q1');
  expect(labels()).not.toContain('Quên');
  flip();
  expect(labels()).toEqual(expect.arrayContaining(['Quên', 'Khó', 'Được', 'Dễ']));
});

it('walks all cards, sends the matching grade, then shows done', async () => {
  act(() => { tree = create(<ReviewSession cards={[card('q1'), card('q2')]} />); });
  expect(json()).toContain('1/2');
  flip();
  await grade('Dễ');
  expect(mockMutate).toHaveBeenLastCalledWith({ questionId: 'q1', grade: 'EASY' });
  expect(json()).toContain('Hỏi q2');
  expect(labels()).not.toContain('Quên');
  flip();
  await grade('Quên');
  expect(mockMutate).toHaveBeenLastCalledWith({ questionId: 'q2', grade: 'AGAIN' });
  expect(mockMutate).toHaveBeenCalledTimes(2);
  expect(json()).toContain('Xong');
});

it('maps Khó and Được', async () => {
  act(() => { tree = create(<ReviewSession cards={[card('q1'), card('q2')]} />); });
  flip(); await grade('Khó');
  expect(mockMutate).toHaveBeenLastCalledWith({ questionId: 'q1', grade: 'HARD' });
  flip(); await grade('Được');
  expect(mockMutate).toHaveBeenLastCalledWith({ questionId: 'q2', grade: 'GOOD' });
});

it('stays on the card when grading fails', async () => {
  mockMutate.mockRejectedValueOnce(new Error('x'));
  act(() => { tree = create(<ReviewSession cards={[card('q1'), card('q2')]} />); });
  flip(); await grade('Được');
  // Vẫn thẻ q1 (mặt đáp án đang mở), chưa sang q2.
  expect(json()).toContain('Đáp q1');
  expect(json()).not.toContain('q2');
  expect(json()).toContain('1/2');
});

it('shows empty state with a way to courses when no cards', () => {
  act(() => { tree = create(<ReviewSession cards={[]} />); });
  const empty = tree.root.findByType(EmptyState);
  expect(empty.props.action.label).toBe('Tới Khóa học');
  empty.props.action.onPress();
  expect(mockPush).toHaveBeenCalledWith('/(tabs)/courses');
});
