import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { ExerciseRead } from '@/contracts';
import { Button } from '@/components/ui';
import { QuickSession } from '../components/quick-session';

const mockCheck = jest.fn();
const mockSubmit = jest.fn();
const mockMark = jest.fn(async () => undefined);
let mockChange: ((a: unknown) => void) | null = null;

jest.mock('expo-crypto', () => ({ randomUUID: () => 'session-key' }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('../exercises-api', () => ({
  useCheckAnswer: () => ({ mutateAsync: (...a: unknown[]) => mockCheck(...a), isPending: false }),
  useSubmitExercise: (_c: string, _l: string, key: string) => ({ mutateAsync: (input: unknown) => mockSubmit(input, key) }),
}));
jest.mock('../components/question-card', () => ({
  QuestionCard: (p: { onChange: (a: unknown) => void }) => { mockChange = p.onChange; return null; },
}));
jest.mock('@/components/mascot', () => ({ Mascot: () => null }));
jest.mock('@/components/ui/icon', () => ({ Icon: () => null }));
jest.mock('@/theme/theme', () => ({ usePalette: () => jest.requireActual('@/theme/tokens').light }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/lib/use-reduced-motion', () => ({ useReducedMotion: () => false }));
jest.mock('@/lib/today-store', () => ({ markTodayDone: (...a: unknown[]) => mockMark(...(a as [])) }));
jest.mock('@/features/offline/offline-provider', () => ({ useOffline: () => ({ kv: null }) }));

const tf = (id: string) => ({ id, type: 'TRUE_FALSE', prompt: id, options: [] });
const data = { id: 'EX', title: 'Bài tập', passScore: 70, exercises: [], questions: [tf('q1'), tf('q2')] } as unknown as ExerciseRead;

let tree: ReactTestRenderer;
const press = async (label: string) => {
  const b = tree.root.findAllByType(Button).find((n) => n.props.label === label)!;
  await act(async () => { await b.props.onPress(); });
};
const answer = (questionId: string, value: boolean) => act(() => mockChange!({ type: 'TRUE_FALSE', questionId, value }));

beforeEach(() => jest.clearAllMocks());
afterEach(() => act(() => tree.unmount()));

it('checks each answer, requeues a wrong one once, and submits the first answers with one session key', async () => {
  const onFinished = jest.fn();
  mockCheck
    .mockResolvedValueOnce({ questionId: 'q1', isCorrect: false, correctAnswer: { value: true }, explanation: null })
    .mockResolvedValueOnce({ questionId: 'q2', isCorrect: true, correctAnswer: null, explanation: null })
    .mockResolvedValueOnce({ questionId: 'q1', isCorrect: true, correctAnswer: null, explanation: null });
  mockSubmit.mockResolvedValue({ score: 50, passed: false });
  act(() => { tree = create(<QuickSession courseId="C" lessonId="L" data={data} onFinished={onFinished} onExamMode={jest.fn()} />); });

  answer('q1', false);
  await press('Kiểm tra');
  expect(mockCheck).toHaveBeenLastCalledWith({ exerciseId: 'EX', answer: { type: 'TRUE_FALSE', questionId: 'q1', value: false } });
  await press('Hiểu rồi');

  answer('q2', true);
  await press('Kiểm tra');
  await press('Tiếp');

  answer('q1', true); // requeued question comes back
  await press('Kiểm tra');
  await press('Tiếp');

  expect(mockSubmit).toHaveBeenCalledTimes(1);
  const [input, key] = mockSubmit.mock.calls[0]!;
  expect(key).toBe('session-key');
  expect(input.exerciseId).toBe('EX');
  expect(input.answers).toEqual([
    { type: 'TRUE_FALSE', questionId: 'q1', value: false },
    { type: 'TRUE_FALSE', questionId: 'q2', value: true },
  ]);
  expect(mockMark).toHaveBeenCalledWith(null, 'exercise:EX');
  expect(onFinished).toHaveBeenCalledWith({ score: 50, passed: false }, expect.any(Object), expect.objectContaining({ bestStreak: 2 }));
});

it('switches to exam mode on request', async () => {
  const onExamMode = jest.fn();
  act(() => { tree = create(<QuickSession courseId="C" lessonId="L" data={data} onFinished={jest.fn()} onExamMode={onExamMode} />); });
  await press('Làm kiểu kiểm tra');
  expect(onExamMode).toHaveBeenCalled();
});
