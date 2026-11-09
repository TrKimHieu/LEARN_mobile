import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { layoutFor } from '@/theme/layout';
import { Screen } from '../screen';
import { Txt } from '../text';

let mockLayout = layoutFor(844, 390);
jest.mock('@/theme/theme', () => ({ usePalette: () => jest.requireActual('@/theme/tokens').light }));
jest.mock('@/theme/layout', () => ({
  ...jest.requireActual('@/theme/layout'),
  useLayout: () => mockLayout,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 47, right: 0 }),
}));

let tree: ReactTestRenderer;
beforeEach(() => {
  mockLayout = layoutFor(844, 390);
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
});

function Counter() {
  const [n, setN] = useState(0);
  return <Txt testID="counter" onPress={() => setN(n + 1)}>{`n${n}`}</Txt>;
}

it('pads past the landscape notch and the gutter', () => {
  act(() => { tree = create(<Screen><Txt>A</Txt></Screen>); });
  const scroll = tree.root.findByType(ScrollView);
  const style = StyleSheet.flatten(scroll.props.contentContainerStyle);
  expect(style.paddingLeft).toBe(47 + 32);
  expect(style.paddingRight).toBe(32);
  expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
});

it('caps reading width and centres it', () => {
  act(() => { tree = create(<Screen width="reading"><Txt>A</Txt></Screen>); });
  const body = StyleSheet.flatten(tree.root.findByProps({ testID: 'screen-body' }).props.style);
  expect(body).toMatchObject({ maxWidth: 720, alignSelf: 'center', width: '100%' });
});

it('keeps child state across a rotation', () => {
  mockLayout = layoutFor(390, 844);
  act(() => { tree = create(<Screen><Counter /></Screen>); });
  act(() => tree.root.findByProps({ testID: 'counter' }).props.onPress());
  expect(JSON.stringify(tree.toJSON())).toContain('n1');
  mockLayout = layoutFor(844, 390);
  act(() => tree.update(<Screen><Counter /></Screen>));
  expect(JSON.stringify(tree.toJSON())).toContain('n1');
});
