import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mascot } from '@/components/mascot';
import { Button, Txt } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api-client';
import { setServerDisconnected, useServerDisconnected } from '@/lib/server-connection';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';

export function ServerConnectionScreen() {
  const { testing, enterTesting, status, retry: retryAuth } = useAuth();
  const disconnected = useServerDisconnected();
  const p = usePalette();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Check guests too: having no stored session does not prove the API is reachable.
  useEffect(() => {
    if (testing) router.replace('/(tabs)');
    else void apiFetch('/api/v1/health').catch(() => {});
  }, [testing]);

  const retry = async () => {
    setBusy(true);
    setError('');
    try {
      await apiFetch('/api/v1/health');
      setServerDisconnected(false);
      if (status === 'offline') retryAuth();
    } catch {
      setServerDisconnected(true);
      setError('Vẫn chưa kết nối được với server. Bạn có thể chọn Testing để dùng thử.');
    } finally { setBusy(false); }
  };

  const start = async () => {
    setBusy(true);
    setError('');
    try { await enterTesting(); }
    catch { setError('Không mở được Testing. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal visible={disconnected && !testing} supportedOrientations={['portrait', 'landscape']} animationType="fade" onRequestClose={() => {}}>
      <ScrollView style={{ flex: 1, backgroundColor: p.app }} contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg }}>
        <Mascot state="alerting" size={88} />
        <Txt variant="heading" style={{ textAlign: 'center' }}>Sản phẩm đang không kết nối được với server</Txt>
        <Txt variant="small" tone="subtle" style={{ textAlign: 'center' }}>
          Kiểm tra kết nối rồi thử lại, hoặc chọn Testing để test các tính năng với dữ liệu mẫu ngay trên thiết bị.
        </Txt>
        <Button label="Testing" onPress={() => void start()} disabled={busy} />
        <Button label="Thử lại" variant="secondary" onPress={() => void retry()} loading={busy} />
        {error ? <Txt variant="small" style={{ textAlign: 'center' }}>{error}</Txt> : null}
      </ScrollView>
    </Modal>
  );
}

export function TestingBanner() {
  const { testing, exitTesting } = useAuth();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  if (!testing) return null;
  return (
    <View style={{ backgroundColor: p.panel, paddingTop: insets.top + space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.xs }}>
      <Txt variant="small">Testing · Dữ liệu mẫu, thay đổi sẽ bị xóa khi thoát.</Txt>
      <Button label="Thoát Testing" variant="secondary" size="sm" onPress={() => void exitTesting()} />
    </View>
  );
}
