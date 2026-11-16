import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useOffline } from '@/features/offline/offline-provider';
import type { SourceFile } from '@/lib/db/stores';
import { deleteSourceCopy, reattachSource, sourceStatus, type SourceStatus } from '@/lib/source-files';

export type LocalSource = SourceFile & { status: SourceStatus };

/** Bản sao tệp gốc trên máy của tài khoản hiện tại. Không persist: luôn đọc lại từ SQLite + file system. */
export function useLocalSources() {
  const { sources } = useOffline();
  return useQuery({
    queryKey: ['source-files', sources?.dbName ?? null],
    enabled: !!sources,
    queryFn: async (): Promise<LocalSource[]> =>
      (await sources!.store.list()).map((rec) => ({ ...rec, status: sourceStatus(rec) })),
  });
}

export function useReattachSource() {
  const { sources } = useOffline();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rec: SourceFile): Promise<SourceFile | null> => {
      if (!sources) throw new Error('Chưa mở được dữ liệu trên máy.');
      const res = await DocumentPicker.getDocumentAsync({ type: rec.mime, copyToCacheDirectory: true });
      const asset = res.canceled ? null : res.assets?.[0];
      if (!asset) return null;
      return reattachSource({ store: sources.store, dbName: sources.dbName, rec, pickedUri: asset.uri });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['source-files'] }),
  });
}

export function useDeleteSource() {
  const { sources } = useOffline();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rec: SourceFile) => {
      if (!sources) throw new Error('Chưa mở được dữ liệu trên máy.');
      await deleteSourceCopy(sources.store, rec);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['source-files'] }),
  });
}
