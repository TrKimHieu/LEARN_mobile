import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Button } from '@/components/ui';
import type { Question } from '@/features/exercises/answers';
import { QuickQuestion } from '../components/quick-question';

const mockCheck = jest.fn();
let mockChange: ((a: unknown) => void) | null = null;
jest.mock('@/features/exercises/exercises-api', () => ({
  useCheckAnswer: () => ({ mutateAsync: (...a: unknown[]) => mockCheck(...a), isPending: false }),
}));
jest.mock('@/features/exercises/components/question-card', () => ({
  QuestionCard: (p: { onChange: (a: unknown) => void }) => { mockChange = p.onChange; return null; },
}));
jest.mock('@/components/mascot', () => ({ Mascot: () => null }));
jest.mock('@/components/ui/icon', () => ({ Icon: () => null }));
jest.mock('@/theme/theme', () => ({ usePalette: () => jest.requireActual('@/theme/tokens').light }));
jest.mock('@/lib/use-reduced-motion', () => ({ useReducedMotion: () => false }));

const question = { id: 'q1', type: 'TRUE_FALSE', prompt: 'P', options: [] } as unknown as Question;
let tree: ReactTestRenderer;
const labels = () => tree.root.findAllByType(Button).map((b) => b.props.label);
const press = async (label: string) => {
  const b = tree.root.findAllByType(Button).find((n) => n.props.label === label)!;
  await act(async () => { await b.props.onPress(); });
};
const texts = () => tree.root.findAll((n) => typeof n.props.children === 'string').map((n) => n.props.children).join('|');

beforeEach(() => jest.clearAllMocks());
afterEach(() => act(() => tree.unmount()));

it('can be skipped without answering', async () => {
  const onDone = jest.fn();
  act(() => { tree = create(<QuickQuestion lessonId="L" exerciseId="E" question={question} onDone={onDone} />); });
  await press('Bỏ qua');
  expect(onDone).toHaveBeenCalled();
  expect(mockCheck).not.toHaveBeenCalled();
});

it('checks the answer, shows the correct answer when wrong, then continues', async () => {
  const onDone = jest.fn();
  mockCheck.mockResolvedValue({ questionId: 'q1', isCorrect: false, correctAnswer: { value: true }, explanation: 'Vì thế.' });
  act(() => { tree = create(<QuickQuestion lessonId="L" exerciseId="E" question={question} onDone={onDone} />); });
  act(() => mockChange!({ type: 'TRUE_FALSE', questionId: 'q1', value: false }));
  await press('Kiểm tra');
  expect(mockCheck).toHaveBeenCalledWith({ exerciseId: 'E', answer: { type: 'TRUE_FALSE', questionId: 'q1', value: false } });
  expect(texts()).toContain('Đáp án: Đúng');
  expect(texts()).toContain('Vì thế.');
  expect(labels()).toEqual(['Tiếp']);
  await press('Tiếp');
  expect(onDone).toHaveBeenCalled();
});
