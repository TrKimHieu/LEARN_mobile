import { CryptoDigestAlgorithm, digest } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import type { SourceFile, SourceFileStore } from '@/lib/db/stores';

/** Thư mục bản sao của một tài khoản: tên DB bỏ `.db`, nên tách theo environment + origin + user. */
export function sourceDirName(dbName: string): string {
  return dbName.replace(/\.db$/, '');
}

/** Tên tệp trong thư mục riêng: mã tài liệu + đuôi gốc (chỉ chữ/số), không dùng tên người dùng đặt. */
export function sourceFileName(documentId: string, filename: string): string {
  const ext = /\.([A-Za-z0-9]{1,8})$/.exec(filename)?.[1]?.toLowerCase();
  const id = documentId.replace(/[^A-Za-z0-9_-]/g, '_');
  return ext ? `${id}.${ext}` : id;
}

export function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Of(uri: string): Promise<string> {
  return toHex(await digest(CryptoDigestAlgorithm.SHA256, await new File(uri).bytes()));
}

function sourceDir(dbName: string): Directory {
  return new Directory(Paths.document, 'sources', sourceDirName(dbName));
}

/**
 * Sao tệp vừa nhập vào thư mục riêng của app và ghi chỉ mục (T1-2). Chỉ chạy sau khi server đã
 * nhận văn bản, vì cần mã tài liệu. Tệp gốc không rời máy.
 */
export async function saveSourceCopy(args: {
  store: SourceFileStore;
  dbName: string;
  pickedUri: string;
  documentId: string;
  courseId: string;
  filename: string;
  mime: string;
  now?: number;
}): Promise<SourceFile> {
  const dir = sourceDir(args.dbName);
  dir.create({ intermediates: true, idempotent: true });
  const target = new File(dir, sourceFileName(args.documentId, args.filename));
  if (target.exists) target.delete();
  await new File(args.pickedUri).copy(target);
  const record: SourceFile = {
    documentId: args.documentId,
    courseId: args.courseId,
    filename: args.filename,
    mime: args.mime,
    sizeBytes: target.size ?? 0,
    sha256: await sha256Of(target.uri),
    uri: target.uri,
    createdAt: args.now ?? Date.now(),
  };
  await args.store.put(record);
  return record;
}

/** Đăng xuất hẳn: xoá mọi bản sao của tài khoản cùng với DB. */
export function deleteSourceDir(dbName: string): void {
  try {
    const dir = sourceDir(dbName);
    if (dir.exists) dir.delete();
  } catch {
    // Không có thư mục, hoặc nền tảng web không có file system: không có gì để xoá.
  }
}
