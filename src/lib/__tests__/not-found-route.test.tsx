import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import NotFoundScreen from '@/app/+not-found';

let mockStatus = 'guest';
const mockRedirect = jest.fn((_: { href: string }) => null);
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => mockRedirect(props),
  router: { replace: jest.fn() },
  Stack: { Screen: () => null },
}));
jest.mock('@/features/auth/auth-context', () => ({ useAuth: () => ({ status: mockStatus }) }));
jest.mock('@/theme/theme', () => ({ usePalette: () => jest.requireActual('@/theme/tokens').light }));
jest.mock('@/components/mascot', () => ({ Mascot: () => null }));
jest.mock('@/components/ui/icon', () => ({ Icon: () => null }));

let tree: ReactTestRenderer;
afterEach(() => { act(() => tree.unmount()); mockRedirect.mockClear(); });

it('sends a guest to login instead of trapping them on the not-found screen', () => {
  mockStatus = 'guest';
  act(() => { tree = create(<NotFoundScreen />); });
  expect(mockRedirect).toHaveBeenCalledWith({ href: '/login' });
});

it('shows the not-found screen to a signed-in user', () => {
  mockStatus = 'authed';
  act(() => { tree = create(<NotFoundScreen />); });
  expect(mockRedirect).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain('Không tìm thấy trang này');
});
