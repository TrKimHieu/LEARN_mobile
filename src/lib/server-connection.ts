import { useSyncExternalStore } from 'react';

let disconnected = false;
const listeners = new Set<() => void>();
export function setServerDisconnected(value: boolean) {
  if (value === disconnected) return;
  disconnected = value;
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export function useServerDisconnected() {
  return useSyncExternalStore(subscribe, () => disconnected, () => false);
}
