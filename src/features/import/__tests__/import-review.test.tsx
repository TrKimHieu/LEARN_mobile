import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Button, Field, Notice } from '@/components/ui';
import { ImportReview } from '../components/import-review';

jest.mock('@/theme/theme', () => ({ usePalette: () => jest.requireActual('@/theme/tokens').light }));
jest.mock('@/components/ui/icon', () => ({ Icon: () => null }));

let tree: ReactTestRenderer;
afterEach(() => act(() => tree.unmount()));

const base = {
  filename: 'a.pdf', onFilename: jest.fn(), onPageText: jest.fn(), chars: 5, error: null,
  sending: false, canSend: true, onSend: jest.fn(), onCancel: jest.fn(),
};

it('shows skipped-pages notice, counter and actions', () => {
  act(() => {
    tree = create(<ImportReview {...base} pages={[{ page: 1, text: 'hello' }]} skippedPages={2} />);
  });
  expect(tree.root.findAllByType(Notice)).toHaveLength(1);
  const labels = tree.root.findAllByType(Button).map((b) => b.props.label);
  expect(labels).toEqual(['Gửi văn bản', 'Huỷ']);
  expect(tree.root.findAllByType(Field).find((f) => f.props.multiline)?.props.value).toBe('hello');
});

it('hides notice when nothing skipped and disables send', () => {
  act(() => {
    tree = create(<ImportReview {...base} canSend={false} pages={[{ page: 1, text: 'x' }]} skippedPages={0} />);
  });
  expect(tree.root.findAllByType(Notice)).toHaveLength(0);
  expect(tree.root.findAllByType(Button)[0]!.props.disabled).toBe(true);
});
