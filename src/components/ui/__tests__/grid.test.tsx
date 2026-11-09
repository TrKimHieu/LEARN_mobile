import { StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Grid } from '../grid';
import { Txt } from '../text';

jest.mock('@/theme/theme', () => ({ usePalette: () => jest.requireActual('@/theme/tokens').light }));

let tree: ReactTestRenderer;
const render = (el: React.ReactElement) => { act(() => { tree = create(el); }); return tree; };
const byId = (id: string) => tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === id);
afterEach(() => { if (tree) act(() => tree.unmount()); });

it('splits children into equal rows and pads the last one', () => {
  render(<Grid columns={2}>{[1, 2, 3, 4, 5].map((n) => <Txt key={n}>{n}</Txt>)}</Grid>);
  expect(byId('grid-row')).toHaveLength(3);
  const spacers = byId('grid-spacer');
  expect(spacers).toHaveLength(1);
  expect(spacers[0]!.props.accessibilityElementsHidden).toBe(true);
  expect(spacers[0]!.props.importantForAccessibility).toBe('no-hide-descendants');
});

it('renders one column without spacers', () => {
  render(<Grid columns={1}>{[1, 2].map((n) => <Txt key={n}>{n}</Txt>)}</Grid>);
  expect(byId('grid-spacer')).toHaveLength(0);
});

it('stretches cells so a row has one height', () => {
  render(<Grid columns={3}><Txt>a</Txt></Grid>);
  const row = StyleSheet.flatten(byId('grid-row')[0]!.props.style);
  expect(row.alignItems).toBe('stretch');
  expect(row.flexDirection).toBe('row');
});
