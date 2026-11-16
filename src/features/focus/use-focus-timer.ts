import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import {
  advance, initialState, normalizeSettings, parseTimer, pause, remaining, start,
  type Phase, type PomodoroSettings, type TimerState,
} from './timer';

const SETTINGS_KEY = 'learn.focus.settings';
const TIMER_KEY = 'learn.focus.timer';

/**
 * Bộ đếm Pomodoro (T3-2): cài đặt và trạng thái lưu cục bộ, nên đóng app rồi mở lại vẫn đúng giờ.
 * Không gửi gì lên server (ADR 006: Pomodoro không sinh XP).
 */
export function useFocusTimer() {
  const [settings, setSettingsState] = useState<PomodoroSettings>(normalizeSettings(null));
  const [timer, setTimer] = useState<TimerState>(() => initialState(normalizeSettings(null)));
  const [now, setNow] = useState(Date.now());
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
    }
  }, [timer, settings, now, save]);

  const setSettings = useCallback((raw: Partial<Record<keyof PomodoroSettings, string | number>>) => {
    const next = normalizeSettings({ ...settings, ...raw });
    setSettingsState(next);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => undefined);
    // Đổi thời lượng khi đang dừng ở đầu chu kỳ thì áp dụng ngay.
    if (!timer.running) save(initialState(next, timer.phase));
  }, [settings, timer, save]);

  const t = Date.now();
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
    start: () => { setFinished(null); setNow(t); save(start(timer, t)); },
    pause: () => { setNow(t); save(pause(timer, t)); },
    reset: () => save(initialState(settings, timer.phase)),
  };
}
