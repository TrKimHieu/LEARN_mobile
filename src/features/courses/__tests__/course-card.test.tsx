import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { CourseSummary } from '@/contracts';
import { Txt } from '@/components/ui';
import { CourseCard } from '../components/course-card';

jest.mock('@/theme/theme', () => ({ usePalette: () => jest.requireActual('@/theme/tokens').light }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/components/course-cover', () => ({ CourseCover: () => null }));
jest.mock('@/components/ui/icon', () => ({ Icon: () => null }));

let tree: ReactTestRenderer;
afterEach(() => { if (tree) act(() => tree.unmount()); });

it('limits the title to two lines', () => {
  const course = {
    id: 'c1',
    title: 'Một tiêu đề khóa học tiếng Việt rất dài '.repeat(5),
    description: null,
    status: 'READY',
    progress: { completed: 1, total: 4 },
    documentCount: 2,
  } as unknown as CourseSummary;
  act(() => { tree = create(<CourseCard course={course} />); });
  const title = tree.root.findAllByType(Txt).find((t) => t.props.children === course.title);
  expect(title?.props.numberOfLines).toBe(2);
});
