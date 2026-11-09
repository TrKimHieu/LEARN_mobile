import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Button } from '@/components/ui';
import { ReviewEntry } from '../components/review-entry';

let mockData: { dueCount: number } | undefined;
const mockPush = jest.fn();
jest.mock('../reviews-api', () => ({ useDueReviews: () => ({ data: mockData }) }));
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
jest.mock('@/theme/theme', () => ({ usePalette: () => jest.requireActual('@/theme/tokens').light }));
jest.mock('@/components/ui/icon', () => ({ Icon: () => null }));

let tree: ReactTestRenderer;
afterEach(() => { if (tree) act(() => tree.unmount()); });

it('renders nothing when nothing is due', () => {
  mockData = { dueCount: 0 };
  act(() => { tree = create(<ReviewEntry />); });
  expect(tree.toJSON()).toBeNull();
});

it('shows count and opens /review', () => {
  mockData = { dueCount: 7 };
  act(() => { tree = create(<ReviewEntry />); });
  expect(JSON.stringify(tree.toJSON())).toContain('Ôn hôm nay');
  expect(JSON.stringify(tree.toJSON())).toContain('7');
  const b = tree.root.findByType(Button);
  expect(b.props.label).toBe('Ôn ngay');
  b.props.onPress();
  expect(mockPush).toHaveBeenCalledWith('/review');
});
