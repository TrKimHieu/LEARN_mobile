import { AccessibilityInfo } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Button } from '../button';
import { FlipCard } from '../flip-card';

jest.mock('@/theme/theme', () => ({ usePalette: () => jest.requireActual('@/theme/tokens').light }));
jest.mock('../icon', () => ({ Icon: () => null }));

let tree: ReactTestRenderer;
beforeEach(() => jest.clearAllMocks());
afterEach(() => { if (tree) act(() => tree.unmount()); jest.restoreAllMocks(); });

it('never mounts the next answer when a revealed card is replaced', () => {
  act(() => { tree = create(<FlipCard prompt="Question A" answer="Secret A" />); });
  expect(JSON.stringify(tree.toJSON())).not.toContain('Secret A');
  act(() => tree.root.findByType(Button).props.onPress());
  expect(JSON.stringify(tree.toJSON())).toContain('Secret A');
  act(() => tree.update(<FlipCard prompt="Question B" answer="Secret B" />));
  expect(JSON.stringify(tree.toJSON())).toContain('Question B');
  expect(JSON.stringify(tree.toJSON())).not.toContain('Secret B');
});

it('announces the newly revealed content only after the user flips', () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  act(() => { tree = create(<FlipCard prompt="Question A" answer="Secret A" />); });
  expect(announce).not.toHaveBeenCalled();
  act(() => tree.root.findByType(Button).props.onPress());
  expect(announce).toHaveBeenLastCalledWith('Đáp án: Secret A');
});

it('reports each flip so callers can react to screen-reader activation too', () => {
  const onFlip = jest.fn();
  act(() => { tree = create(<FlipCard prompt="Q" answer="A" onFlip={onFlip} />); });
  act(() => tree.root.findByType(Button).props.onPress());
  expect(onFlip).toHaveBeenLastCalledWith(true);
  act(() => tree.root.findByType(Button).props.onPress());
  expect(onFlip).toHaveBeenLastCalledWith(false);
});
