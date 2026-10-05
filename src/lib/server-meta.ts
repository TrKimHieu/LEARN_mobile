import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { CONTRACTS_HASH, type MetaResponse } from '@/contracts';
import { apiFetch } from './api-client';

/** Phiên bản app đang chạy (`app.json` → `expo.version`). */
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

/** So hai phiên bản `x.y.z` — âm nếu `a` cũ hơn `b`. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Máy chủ và app có còn khớp không — `GET /api/v1/meta` (xem contracts `meta.ts`).
 * - `outdated`: app cũ hơn `minMobileVersion` → nhắc cập nhật (bắt buộc về nghiệp vụ).
 * - `contractsDiffer`: schema của app khác máy chủ → chỉ là cảnh báo cho người phát triển; không
 *   phải lúc nào cũng vỡ (thêm trường tuỳ chọn vẫn tương thích).
 */
export function useServerMeta() {
  const query = useQuery({
    queryKey: ['meta'],
    queryFn: () => apiFetch<MetaResponse>('/api/v1/meta'),
    staleTime: 10 * 60_000,
  });
  const meta = query.data;
  return {
    meta,
    outdated: meta ? compareVersions(APP_VERSION, meta.minMobileVersion) < 0 : false,
    contractsDiffer: meta ? meta.contractsHash !== CONTRACTS_HASH : false,
  };
}
