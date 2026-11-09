import { layoutFor } from '@/theme/layout';
import { light } from '@/theme/tokens';
import { tabBarOptionsFor } from '../tab-bar-options';

it('keeps the bottom dock on compact windows', () => {
  const o = tabBarOptionsFor(layoutFor(390, 844), { left: 0, bottom: 34 }, light);
  expect(o).toMatchObject({ tabBarPosition: 'bottom', tabBarVariant: 'uikit', tabBarLabelPosition: 'below-icon' });
  expect(o.tabBarStyle.height).toBe(68 + 34);
  expect(o.tabBarStyle.paddingTop).toBe(6);
  expect(o.tabBarStyle.paddingBottom).toBe(34 + 6);
  expect(o.tabBarStyle.borderTopColor).toBe(light.line);
  expect(o.tabBarHideOnKeyboard).toBe(true);
});

it('uses a left rail clear of the notch on wide windows', () => {
  const o = tabBarOptionsFor(layoutFor(844, 390), { left: 47, bottom: 21 }, light);
  expect(o).toMatchObject({ tabBarPosition: 'left', tabBarVariant: 'material', tabBarLabelPosition: 'below-icon' });
  expect(o.tabBarStyle.paddingLeft).toBe(47);
  expect(o.tabBarStyle.height).toBeUndefined();
  expect(o.tabBarStyle.borderRightColor).toBe(light.line);
  expect(o.tabBarStyle.backgroundColor).toBe(light.panel);
  expect(o.tabBarHideOnKeyboard).toBe(false);
});
