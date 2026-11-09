import type { Layout } from '@/theme/layout';

/** Mục lục bài học: cột bên phải chỉ ở tablet ngang; điện thoại ngang vẫn mở bằng Modal. */
export function tocModeFor(layout: Layout): 'modal' | 'side' {
  return layout.windowClass === 'expanded' && !layout.shortHeight ? 'side' : 'modal';
}

/** Màn đăng nhập: điện thoại xoay ngang chia đôi thương hiệu | form. */
export function authModeFor(layout: Layout): 'stack' | 'split' {
  return layout.landscape && layout.shortHeight ? 'split' : 'stack';
}
