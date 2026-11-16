import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useOffline } from '@/features/offline/offline-provider';
import { cancelScheduled, ensureNotificationPermission, scheduleAt } from '@/lib/notifications';
import {
  advance, initialState, normalizeSettings, parseTimer, pause, remaining, start,
  type Phase, type PomodoroSettings, type TimerState,
} from './timer';
import { recordFocus } from './study-log';

const SETTINGS_KEY = 'learn.focus.settings';
const TIMER_KEY = 'learn.focus.timer';
const NOTIFY_ID = 'learn.focus.end';

/**
 * Bộ đếm Pomodoro (T3-2): cài đặt và trạng thái lưu cục bộ, nên đóng app rồi mở lại vẫn đúng giờ.
 * Không gửi gì lên server (ADR 006: Pomodoro không sinh XP).
 */
export function useFocusTimer(ctx: { courseId?: string; lessonId?: string } = {}) {
  const { kv } = useOffline();
  const qc = useQueryClient();
  const [settings, setSettingsState] = useState<PomodoroSettings>(normalizeSettings(null));
  const [timer, setTimer] = useState<TimerState>(() => initialState(normalizeSettings(null)));
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState<Phase | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([AsyncStorage.getItem(SETTINGS_KEY), AsyncStorage.getItem(TIMER_KEY)])
      .then(([s, t]) => {
        if (cancelled) return;
        const loaded = normalizeSettings(s ? JSON.parse(s) : null);
        setSettingsState(loaded);
        setTimer(parseTimer(t) ?? initialState(loaded));
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setReady(true));
    return () => { cancelled = true; };
  }, []);

  const save = useCallback((next: TimerState) => {
    setTimer(next);
    AsyncStorage.setItem(TIMER_KEY, JSON.stringify(next)).catch(() => undefined);
    // T3-3: hết chu kỳ khi app ở nền vẫn báo; dừng hoặc đặt lại thì huỷ lịch.
    if (next.running && next.endsAt !== null) {
      const [title, body] = next.phase === 'focus'
        ? ['Hết giờ học', 'Nghỉ một chút nhé.']
        : ['Hết giờ nghỉ', 'Quay lại học tiếp nhé.'];
      void scheduleAt(NOTIFY_ID, new Date(next.endsAt), title, body);
    } else {
      void cancelScheduled(NOTIFY_ID);
    }
  }, []);

  useEffect(() => {
    if (!timer.running) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [timer.running]);

  useEffect(() => {
    const out = advance(timer, settings, now);
    if (out.finished) {
      setFinished(out.finished);
      save(out.state);
      // T3-5: chỉ ghi chu kỳ học chạy hết (tính cả khi hết lúc app đóng); bỏ dở không tính.
      if (out.finished === 'focus' && kv) void recordFocus(kv, settings.focusMin, ctx)
          .then(() => qc.invalidateQueries({ queryKey: ['study-log'] }))
          .catch(() => undefined);
    }
  }, [timer, settings, now, save, kv, ctx, qc]);

  const setSettings = useCallback((raw: Partial<Record<keyof PomodoroSettings, string | number>>) => {
    const next = normalizeSettings({ ...settings, ...raw });
    setSettingsState(next);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => undefined);
    // Đổi thời lượng khi đang dừng ở đầu chu kỳ thì áp dụng ngay.
    if (!timer.running) save(initialState(next, timer.phase));
  }, [settings, timer, save]);

  return {
    ready,
    settings,
    setSettings,
    phase: timer.phase,
    running: timer.running,
    remainingMs: remaining(timer, now),
    /** Đang giữa chu kỳ: đã chạy hoặc đã tạm dừng sau khi bắt đầu. */
    inProgress: timer.running || remaining(timer, now) < initialState(settings, timer.phase).remainingMs,
    finished,
    clearFinished: () => setFinished(null),
    start: () => {
      // Giờ lúc bấm, không phải lúc render: màn tạm dừng không render lại nên giờ render có thể đã cũ.
      const t = Date.now();
      setFinished(null);
      setNow(t);
      save(start(timer, t));
      // Hỏi quyền lúc người dùng tự bấm bắt đầu; từ chối thì bộ đếm vẫn chạy, chỉ không có thông báo.
      void ensureNotificationPermission();
    },
    pause: () => {
      const t = Date.now();
      setNow(t);
      save(pause(timer, t));
    },
    reset: () => save(initialState(settings, timer.phase)),
  };
}
