import { memorySourceFiles } from '../db/stores';
import {
  deleteSourceCopy, reattachSource, saveSourceCopy, SourceMismatchError, sourceDirName, sourceFileName,
  sourceStatus, toHex, totalBytes,
} from '../source-files';

const mockFiles = new Map<string, Uint8Array>();
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digest: jest.fn(async () => new Uint8Array([0xab, 0x01]).buffer),
}));
jest.mock('expo-file-system', () => {
  const join = (parts: unknown[]) =>
    parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/');
  class Directory {
    uri: string;
    constructor(...parts: unknown[]) { this.uri = join(parts); }
    create() {}
    get exists() { return true; }
    delete() {}
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) { this.uri = join(parts); }
    get exists() { return mockFiles.has(this.uri); }
    get size() { return mockFiles.get(this.uri)?.length ?? null; }
    delete() { mockFiles.delete(this.uri); }
    async bytes() { return mockFiles.get(this.uri)!; }
    async copy(target: File) { mockFiles.set(target.uri, mockFiles.get(this.uri)!); }
  }
  return { Directory, File, Paths: { document: { uri: 'doc:' } } };
});

describe('source file names', () => {
  it('keeps a safe extension and strips the db suffix', () => {
    expect(sourceFileName('doc-1', 'Bài giảng.PDF')).toBe('doc-1.pdf');
    expect(sourceFileName('../x', 'notes')).toBe('___x');
    expect(sourceDirName('learn-dev-abc-u1.db')).toBe('learn-dev-abc-u1');
  });
  it('hex encodes', () => expect(toHex(new Uint8Array([0, 15, 255]).buffer)).toBe('000fff'));
});

describe('saveSourceCopy', () => {
  it('copies into the account folder and indexes size and SHA-256', async () => {
    mockFiles.set('picked://a.pdf', new Uint8Array([1, 2, 3]));
    const store = memorySourceFiles();
    const rec = await saveSourceCopy({
      store, dbName: 'learn-dev-abc-u1.db', pickedUri: 'picked://a.pdf',
      documentId: 'd1', courseId: 'c1', filename: 'a.pdf', mime: 'application/pdf', now: 5,
    });
    expect(rec).toEqual({
      documentId: 'd1', courseId: 'c1', filename: 'a.pdf', mime: 'application/pdf',
      sizeBytes: 3, sha256: 'ab01', uri: 'doc:/sources/learn-dev-abc-u1/d1.pdf', createdAt: 5,
    });
    expect(await store.get('d1')).toEqual(rec);
    expect(mockFiles.get(rec.uri)).toEqual(new Uint8Array([1, 2, 3]));
  });
});

describe('status, reattach, delete', () => {
  const rec = {
    documentId: 'd2', courseId: 'c1', filename: 'b.pdf', mime: 'application/pdf',
    sizeBytes: 2, sha256: 'ab01', uri: 'doc:/sources/acc/d2.pdf', createdAt: 9,
  };

  it('reports missing when the copy is gone, present after reattach', async () => {
    const store = memorySourceFiles();
    await store.put(rec);
    expect(sourceStatus(rec)).toBe('missing');
    mockFiles.set('picked://b.pdf', new Uint8Array([7, 8]));
    const back = await reattachSource({ store, dbName: 'acc.db', rec, pickedUri: 'picked://b.pdf' });
    expect(back).toMatchObject({ documentId: 'd2', sha256: 'ab01', createdAt: 9 });
    expect(sourceStatus(back)).toBe('present');
  });

  it('rejects a different file', async () => {
    const { digest } = jest.requireMock('expo-crypto') as { digest: jest.Mock };
    digest.mockResolvedValueOnce(new Uint8Array([0xff]).buffer);
    mockFiles.set('picked://other.pdf', new Uint8Array([1]));
    await expect(
      reattachSource({ store: memorySourceFiles(), dbName: 'acc.db', rec, pickedUri: 'picked://other.pdf' }),
    ).rejects.toBeInstanceOf(SourceMismatchError);
  });

  it('delete removes file and index; total sums sizes', async () => {
    const store = memorySourceFiles();
    mockFiles.set(rec.uri, new Uint8Array([1, 2]));
    await store.put(rec);
    await deleteSourceCopy(store, rec);
    expect(mockFiles.has(rec.uri)).toBe(false);
    expect(await store.get('d2')).toBeNull();
    expect(totalBytes([{ sizeBytes: 3 }, { sizeBytes: 4 }])).toBe(7);
  });
});

describe('memorySourceFiles', () => {
  it('lists newest first and removes', async () => {
    const s = memorySourceFiles();
    const base = { courseId: 'c', filename: 'f', mime: 'm', sizeBytes: 1, sha256: 'h', uri: 'u' };
    await s.put({ ...base, documentId: 'old', createdAt: 1 });
    await s.put({ ...base, documentId: 'new', createdAt: 2 });
    expect((await s.list()).map((f) => f.documentId)).toEqual(['new', 'old']);
    await s.remove('new');
    expect(await s.get('new')).toBeNull();
  });
});
