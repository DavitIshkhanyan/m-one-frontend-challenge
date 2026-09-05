import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, rawUser, sleep } from '../test/fixtures';
import { useUsersQuery } from './useUsersQuery';

type ResponsePlan = { delayMs: number; body: unknown };

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

/**
 * A well-behaved fetch: it honours the abort signal, like the real one.
 */
function abortAwareFetch(plan: (call: number) => ResponsePlan) {
  let call = 0;
  return vi.fn(async (_input: unknown, init?: { signal?: AbortSignal }) => {
    const { delayMs, body } = plan(call++);
    const signal = init?.signal;

    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted === true) {
        reject(abortError());
        return;
      }
      const timer = setTimeout(resolve, delayMs);
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(abortError());
        },
        { once: true },
      );
    });

    return jsonResponse(body);
  });
}

/**
 * A fetch that ignores the abort signal entirely.
 *
 * This is not a strawman. It is the shape of every response that was already
 * past the abort boundary when abort fired — headers received, body buffered,
 * promise resolution scheduled. Abort cannot recall those, which is precisely
 * why the generation counter exists.
 */
function obliviousFetch(plan: (call: number) => ResponsePlan) {
  let call = 0;
  return vi.fn(async () => {
    const { delayMs, body } = plan(call++);
    await sleep(delayMs);
    return jsonResponse(body);
  });
}

const slowThenFast = (call: number): ResponsePlan =>
  call === 0
    ? { delayMs: 200, body: [rawUser({ id: 1, name: 'Leanne Stale' })] }
    : { delayMs: 10, body: [rawUser({ id: 2, name: 'Leanne Fresh' })] };

describe('useUsersQuery', () => {
  it('does not let a slow earlier response overwrite a fast later one', async () => {
    vi.stubGlobal('fetch', abortAwareFetch(slowThenFast));

    const { result, rerender } = renderHook(({ q }) => useUsersQuery(q), {
      initialProps: { q: 'le' },
    });
    rerender({ q: 'lea' });

    await waitFor(() => expect(result.current.status).toBe('success'));
    // Outlive the slow first response so it has every chance to land late.
    await act(async () => sleep(300));

    expect(result.current.users.map((user) => user.name)).toEqual(['Leanne Fresh']);
    expect(result.current.error).toBeNull();
  });

  it('drops a stale response that resolved past the abort boundary', async () => {
    vi.stubGlobal('fetch', obliviousFetch(slowThenFast));

    const { result, rerender } = renderHook(({ q }) => useUsersQuery(q), {
      initialProps: { q: 'le' },
    });
    rerender({ q: 'lea' });

    await waitFor(() => expect(result.current.status).toBe('success'));
    await act(async () => sleep(300));

    // Without the generation check this reads ['Leanne Stale'].
    expect(result.current.users.map((user) => user.name)).toEqual(['Leanne Fresh']);
    expect(result.current.error).toBeNull();
  });

  it('does not report an aborted request as an error', async () => {
    vi.stubGlobal(
      'fetch',
      abortAwareFetch(() => ({ delayMs: 60, body: [rawUser({ name: 'Leanne Graham' })] })),
    );

    const { result, rerender } = renderHook(({ q }) => useUsersQuery(q), {
      initialProps: { q: 'le' },
    });
    rerender({ q: 'lea' });
    rerender({ q: 'lean' });

    await waitFor(() => expect(result.current.status).toBe('success'));
    await act(async () => sleep(150));

    expect(result.current.status).toBe('success');
    expect(result.current.error).toBeNull();
  });

  it('keeps the last good results on screen when a refetch fails', async () => {
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        call += 1;
        return call === 1
          ? jsonResponse([rawUser({ id: 1, name: 'Leanne Graham' })])
          : jsonResponse({ message: 'boom' }, 500);
      }),
    );

    const { result, rerender } = renderHook(({ q }) => useUsersQuery(q), {
      initialProps: { q: 'le' },
    });
    await waitFor(() => expect(result.current.status).toBe('success'));

    rerender({ q: 'lean' });
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.users.map((user) => user.name)).toEqual(['Leanne Graham']);
    expect(result.current.error?.kind).toBe('http');
    expect(result.current.error?.status).toBe(500);
  });
});
