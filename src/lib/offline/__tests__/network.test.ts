import { onlineManager } from '@tanstack/react-query';
import { act, create } from 'react-test-renderer';
import { createElement } from 'react';
import * as Network from 'expo-network';
import { isOnlineState, startNetworkSync, useIsOnline } from '../network';
import { startTesting, stopTesting } from '../../testing-mode';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
  addNetworkStateListener: jest.fn(),
}));

const getState = Network.getNetworkStateAsync as jest.Mock;
const addListener = Network.addNetworkStateListener as jest.Mock;

describe('isOnlineState', () => {
  const cases: [{ isConnected?: boolean; isInternetReachable?: boolean }, boolean][] = [
    [{}, true],
    [{ isConnected: true }, true],
    [{ isConnected: false }, false],
    [{ isInternetReachable: true }, true],
    [{ isInternetReachable: false }, false],
    [{ isConnected: true, isInternetReachable: false }, false],
    [{ isConnected: false, isInternetReachable: true }, true],
    [{ isConnected: true, isInternetReachable: true }, true],
    [{ isConnected: false, isInternetReachable: false }, false],
  ];
  it.each(cases)('%j -> %s', (s, expected) => {
    expect(isOnlineState(s)).toBe(expected);
  });
});

describe('startNetworkSync', () => {
  afterEach(() => {
    stopTesting();
    onlineManager.setEventListener(() => () => {});
    onlineManager.setOnline(true);
    jest.clearAllMocks();
  });

  it('allows local demo queries while the device is offline and restores connectivity on exit', async () => {
    let update: (event: { isConnected: boolean }) => void = () => {};
    addListener.mockImplementation((listener) => { update = listener; return { remove: jest.fn() }; });
    getState.mockResolvedValue({ isConnected: false });
    const stop = startNetworkSync();
    await act(async () => { await Promise.resolve(); });
    expect(onlineManager.isOnline()).toBe(false);
    startTesting();
    expect(onlineManager.isOnline()).toBe(true);
    update({ isConnected: false });
    expect(onlineManager.isOnline()).toBe(true);
    stopTesting();
    expect(onlineManager.isOnline()).toBe(false);
    stop();
  });

  it('seeds from getNetworkStateAsync and follows listener, unsubscribes on cleanup', async () => {
    const remove = jest.fn();
    let cb: (e: { isConnected?: boolean; isInternetReachable?: boolean }) => void = () => {};
    addListener.mockImplementation((fn) => {
      cb = fn;
      return { remove };
    });
    getState.mockResolvedValue({ isConnected: false, isInternetReachable: false });

    const stop = startNetworkSync();
    await act(async () => {
      await Promise.resolve();
    });
    expect(onlineManager.isOnline()).toBe(false);

    act(() => cb({ isConnected: true, isInternetReachable: true }));
    expect(onlineManager.isOnline()).toBe(true);

    stop();
    expect(remove).toHaveBeenCalled();
  });
});

describe('useIsOnline', () => {
  it('follows onlineManager', () => {
    onlineManager.setOnline(true);
    const seen: boolean[] = [];
    function Probe() {
      seen.push(useIsOnline());
      return null;
    }
    let r: ReturnType<typeof create>;
    act(() => {
      r = create(createElement(Probe));
    });
    expect(seen[seen.length - 1]).toBe(true);
    act(() => onlineManager.setOnline(false));
    expect(seen[seen.length - 1]).toBe(false);
    act(() => r.unmount());
    onlineManager.setOnline(true);
  });
});
