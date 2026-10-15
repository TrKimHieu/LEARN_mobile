import { Notice, Txt } from '@/components/ui';
import { useServerMeta } from '@/lib/server-meta';

/** App cũ hơn bản tối thiểu máy chủ còn hỗ trợ (`GET /meta`). Không hiện gì khi app còn hợp lệ. */
export function UpdateNotice() {
  const { outdated } = useServerMeta();
  if (!outdated) return null;
  return (
    <Notice icon="alert">
      <Txt variant="smallStrong">Có phiên bản mới của ứng dụng</Txt>
      <Txt variant="small" tone="muted">
        Bản đang dùng đã cũ so với máy chủ, một số màn có thể lỗi. Hãy cập nhật ứng dụng.
      </Txt>
    </Notice>
  );
}
