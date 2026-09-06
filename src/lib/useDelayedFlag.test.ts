import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDelayedFlag } from './useDelayedFlag';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

describe('useDelayedFlag', () => {
  it('stays hidden for work that finishes quickly', async () => {
    const { result, rerender } = renderHook(({ busy }) => useDelayedFlag(busy), {
      initialProps: { busy: true },
    });

    // A request that resolves in 40ms should never produce a flash.
    await advance(40);
    rerender({ busy: false });
    await advance(1000);

    expect(result.current).toBe(false);
  });

  it('appears once the wait is long enough to notice', async () => {
    const { result } = renderHook(() => useDelayedFlag(true));

    expect(result.current).toBe(false);
    await advance(240);
    expect(result.current).toBe(false);

    await advance(20);
    expect(result.current).toBe(true);
  });

  it('stays up long enough to be read, even if the work already finished', async () => {
    const { result, rerender } = renderHook(({ busy }) => useDelayedFlag(busy), {
      initialProps: { busy: true },
    });

    await advance(260);
    expect(result.current).toBe(true);

    // Work finishes immediately after the indicator appeared. Vanishing now
    // would read as a glitch rather than as feedback.
    rerender({ busy: false });
    await advance(100);
    expect(result.current).toBe(true);

    await advance(400);
    expect(result.current).toBe(false);
  });

  it('does not restart the minimum-visible clock on re-render', async () => {
    const { result, rerender } = renderHook(({ busy }) => useDelayedFlag(busy), {
      initialProps: { busy: true },
    });

    await advance(260);
    rerender({ busy: true });
    rerender({ busy: true });
    rerender({ busy: false });

    await advance(420);
    expect(result.current).toBe(false);
  });
});
