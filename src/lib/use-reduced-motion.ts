import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Người dùng bật "Giảm chuyển động" trong cài đặt hệ thống — mọi animation trang trí phải dừng. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduced(v);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
