/**
 * Trước khi đăng xuất: thử gửi hàng chờ; còn sót thì hỏi người dùng có bỏ không.
 * Đăng xuất xoá DB của tài khoản, nên không được bỏ thao tác chưa gửi một cách lặng lẽ.
 */
export async function mayLogout(d: {
  flush: () => Promise<void>;
  countPending: () => Promise<number>;
  confirm: (pending: number) => Promise<boolean>;
}): Promise<boolean> {
  if ((await d.countPending()) === 0) return true;
  await d.flush();
  const left = await d.countPending();
  return left === 0 ? true : d.confirm(left);
}
