/**
 * Giới hạn chữ khi tạo/sửa thẻ trên mobile: vừa khung thẻ lật cao cố định (`FLIP_CARD_HEIGHT`), chặt hơn
 * server (mặt trước 500, mặt sau 1000). Thẻ cũ hoặc thẻ AI dài hơn vẫn hiện, chỉ bị cắt "…" trên thẻ.
 * Tên bộ thẻ theo đúng giới hạn server.
 */
export const CARD_LIMITS = { title: 100, front: 200, back: 300 } as const;

export function sideError(front: string, back: string): string | null {
  if (!front.trim() || !back.trim()) return 'Mặt trước và mặt sau không được để trống.';
  if (front.length > CARD_LIMITS.front) return `Mặt trước tối đa ${CARD_LIMITS.front} ký tự.`;
  if (back.length > CARD_LIMITS.back) return `Mặt sau tối đa ${CARD_LIMITS.back} ký tự.`;
  return null;
}

/** Gợi ý dưới ô nhập, ví dụ "12/200 ký tự". */
export function counter(text: string, max: number): string {
  return `${text.length}/${max} ký tự`;
}
