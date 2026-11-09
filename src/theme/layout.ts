import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { space } from './tokens';

/**
 * Phân loại cửa sổ theo chiều rộng (dp): compact < 600, medium 600–839, expanded >= 840.
 * `shortHeight` (cao < 480) là điện thoại xoay ngang — ít chỗ dọc dù rộng.
 * Màn nào cũng đọc qua `useLayout()`, không đọc `Dimensions` tĩnh (không cập nhật khi xoay).
 */
export type WindowClass = 'compact' | 'medium' | 'expanded';

export type Layout = {
  windowClass: WindowClass;
  landscape: boolean;
  shortHeight: boolean;
  columns: 1 | 2 | 3;
  statColumns: 2 | 4;
  gutter: number;
};

/** Chiều rộng tối đa của nội dung: form/đăng nhập, đọc bài, lưới. */
export const contentWidth = { narrow: 480, reading: 720, wide: 1200 } as const;

/** Truyền cho mọi `<Modal supportedOrientations>` — iOS mặc định khoá Modal ở chiều dọc. */
export const ALL_ORIENTATIONS = ['portrait', 'landscape-left', 'landscape-right'] as const;

export function layoutFor(width: number, height: number): Layout {
  const windowClass: WindowClass = width >= 840 ? 'expanded' : width >= 600 ? 'medium' : 'compact';
  return {
    windowClass,
    landscape: width > height,
    shortHeight: height < 480,
    columns: windowClass === 'expanded' ? 3 : windowClass === 'medium' ? 2 : 1,
    statColumns: windowClass === 'compact' ? 2 : 4,
    gutter: windowClass === 'expanded' ? space.xxl : windowClass === 'medium' ? space.xl : space.lg,
  };
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return useMemo(() => layoutFor(width, height), [width, height]);
}
