import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { inviteFriendSchema, type FriendRequest } from '@/contracts';
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  Notice,
  Screen,
  SectionTitle,
  Txt,
} from '@/components/ui';
import {
  isFriendsUnavailable,
  useAcceptRequest,
  useDropRequest,
  useFriends,
  useInviteFriend,
  useLeaderboard,
  useRemoveFriend,
  useRotateCode,
} from '@/features/friends/friends-api';
import { errorDetail, errorText } from '@/lib/api-client';
import { confirmAction } from '@/lib/dialog';
import { usePalette } from '@/theme/theme';
import { space } from '@/theme/tokens';

/** Bạn học (T5-7): mã mời, lời mời, bảng XP tuần trong nhóm bạn. Mở từ tab Tiến trình. */
export default function FriendsScreen() {
  const friends = useFriends();
  const board = useLeaderboard();
  const refresh = () => Promise.all([friends.refetch(), board.refetch()]);

  if (isFriendsUnavailable(friends.error)) {
    return (
      <Screen width="reading">
        <EmptyState title="Chưa dùng được bạn học" description="Máy chủ hiện tại chưa bật tính năng này." />
      </Screen>
    );
  }
  if (friends.isError) {
    return (
      <Screen width="reading">
        <ErrorState
          title="Không tải được bạn học"
          description={errorText(friends.error, 'Vui lòng thử lại.')}
          detail={errorDetail(friends.error)}
          onRetry={() => void refresh()}
        />
      </Screen>
    );
  }
  if (!friends.data) {
    return (
      <Screen width="reading">
        <LoadingState rows={3} height={72} label="Đang tải bạn học" />
      </Screen>
    );
  }

  const data = friends.data;
  return (
    <Screen width="reading" onRefresh={refresh}>
      <InviteCard myCode={data.myCode} />

      {data.incoming.length > 0 && (
        <View>
          <SectionTitle title="Lời mời kết bạn" />
          <RequestList requests={data.incoming} incoming />
        </View>
      )}

      <View>
        <SectionTitle title="Xếp hạng tuần này" description="XP từ thứ Hai. Trần 100 XP mỗi ngày." />
        {data.leaderboardHidden && (
          <Notice icon="eye-off">Bạn đang ẩn khỏi bảng của bạn bè. Đổi trong Cài đặt.</Notice>
        )}
        {board.isLoading && <LoadingState rows={2} height={48} label="Đang tải bảng xếp hạng" />}
        {board.isError && (
          <ErrorState
            title="Không tải được bảng xếp hạng"
            description={errorText(board.error, 'Vui lòng thử lại.')}
            onRetry={() => void board.refetch()}
          />
        )}
        {board.data && (
          <Card padded={false}>
            {board.data.entries.map((e, i) => (
              <View key={e.userId}>
                {i > 0 && <Divider />}
                <View
                  style={styles.row}
                  accessible
                  accessibilityLabel={`Hạng ${e.rank}, ${e.me ? 'bạn' : e.displayName}, ${e.xp} XP`}
                >
                  <Txt variant="smallStrong" style={styles.rank}>
                    {e.rank}
                  </Txt>
                  <Txt variant="small" numberOfLines={1} style={{ flex: 1 }}>
                    {e.displayName}
                  </Txt>
                  {e.me && <Badge label="Bạn" tone="outline" />}
                  <Txt variant="smallStrong" style={styles.xp}>{`${e.xp} XP`}</Txt>
                </View>
              </View>
            ))}
          </Card>
        )}
        {board.data && board.data.entries.length === 1 && (
          <Txt variant="small" tone="subtle" style={{ marginTop: space.sm }}>
            Gửi mã mời cho bạn bè để cùng xếp hạng.
          </Txt>
        )}
      </View>

      {data.friends.length > 0 && (
        <View>
          <SectionTitle title={`Bạn bè (${data.friends.length})`} />
          <FriendList friends={data.friends} />
        </View>
      )}

      {data.outgoing.length > 0 && (
        <View>
          <SectionTitle title="Đã gửi lời mời" />
          <RequestList requests={data.outgoing} incoming={false} />
        </View>
      )}
    </Screen>
  );
}

function InviteCard({ myCode }: { myCode: string }) {
  const invite = useInviteFriend();
  const rotate = useRotateCode();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();

  const send = () => {
    const text = value.trim();
    const parsed = inviteFriendSchema.safeParse(text.includes('@') ? { email: text } : { code: text });
    if (!parsed.success) {
      setError(text.includes('@') ? 'Email chưa đúng.' : 'Mã mời gồm 8 ký tự chữ và số.');
      return;
    }
    setError(undefined);
    invite.mutate(parsed.data, { onSuccess: () => setValue('') });
  };
  const changeCode = async () => {
    const ok = await confirmAction({
      title: 'Đổi mã mời?',
      message: 'Mã cũ sẽ không dùng được nữa.',
      confirmLabel: 'Đổi mã',
    });
    if (ok) rotate.mutate();
  };

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <Txt variant="caption" tone="subtle">
          Mã mời của bạn
        </Txt>
        <Txt variant="title" selectable style={styles.code} accessibilityLabel={`Mã mời ${myCode.split('').join(' ')}`}>
          {myCode}
        </Txt>
      </View>
      <View style={styles.actions}>
        <Button
          label="Chia sẻ"
          size="sm"
          variant="secondary"
          onPress={() => void Share.share({ message: `Kết bạn với mình trên LEARN bằng mã ${myCode}` })}
        />
        <Button label="Đổi mã" size="sm" variant="ghost" loading={rotate.isPending} onPress={() => void changeCode()} />
      </View>
      <Divider />
      <Field
        label="Thêm bạn"
        placeholder="Mã mời hoặc email"
        value={value}
        onChangeText={(t) => {
          setValue(t);
          setError(undefined);
          invite.reset();
        }}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="send"
        onSubmitEditing={send}
        error={error ?? (invite.isError ? errorText(invite.error, 'Không gửi được lời mời.') : undefined)}
      />
      {invite.data && <Notice icon="check">{invite.data.message}</Notice>}
      <Button label="Gửi lời mời" loading={invite.isPending} disabled={!value.trim()} onPress={send} />
    </Card>
  );
}

function RequestList({ requests, incoming }: { requests: FriendRequest[]; incoming: boolean }) {
  const accept = useAcceptRequest();
  const drop = useDropRequest();
  const busy = accept.isPending || drop.isPending;
  return (
    <Card padded={false}>
      {requests.map((r, i) => (
        <View key={r.id}>
          {i > 0 && <Divider />}
          <View style={styles.row}>
            <Txt variant="small" numberOfLines={1} style={{ flex: 1 }}>
              {r.displayName}
            </Txt>
            {incoming && (
              <Button
                label="Chấp nhận"
                size="sm"
                accessibilityLabel={`Chấp nhận lời mời của ${r.displayName}`}
                disabled={busy}
                onPress={() => accept.mutate(r.id)}
              />
            )}
            <Button
              label={incoming ? 'Từ chối' : 'Huỷ'}
              size="sm"
              variant="ghost"
              accessibilityLabel={`${incoming ? 'Từ chối lời mời của' : 'Huỷ lời mời gửi'} ${r.displayName}`}
              disabled={busy}
              onPress={() => drop.mutate(r.id)}
            />
          </View>
        </View>
      ))}
    </Card>
  );
}

function FriendList({ friends }: { friends: { userId: string; displayName: string; xpThisWeek: number | null }[] }) {
  const remove = useRemoveFriend();
  const p = usePalette();
  const confirmRemove = async (userId: string, name: string) => {
    const ok = await confirmAction({ title: `Xoá ${name} khỏi bạn học?`, confirmLabel: 'Xoá' });
    if (ok) remove.mutate(userId);
  };
  return (
    <Card padded={false}>
      {friends.map((f, i) => (
        <View key={f.userId}>
          {i > 0 && <Divider />}
          <View style={styles.row}>
            <Txt variant="small" numberOfLines={1} style={{ flex: 1 }}>
              {f.displayName}
            </Txt>
            <Txt variant="caption" style={{ color: p.fgSubtle }}>
              {f.xpThisWeek === null ? 'Ẩn XP' : `${f.xpThisWeek} XP tuần`}
            </Txt>
            <IconButton
              icon="x"
              label={`Xoá ${f.displayName} khỏi bạn học`}
              onPress={() => void confirmRemove(f.userId, f.displayName)}
              size={40}
            />
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, minHeight: 56 },
  rank: { width: 24, textAlign: 'center', fontVariant: ['tabular-nums'] },
  xp: { fontVariant: ['tabular-nums'] },
  code: { letterSpacing: 4, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: space.sm },
});
