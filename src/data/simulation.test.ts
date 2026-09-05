import { describe, expect, it, vi } from 'vitest';
import { RequestError } from './net';
import { amplify, applyLatency, maybeFail, type SimulationConfig } from './simulation';
import type { User } from './types';

function user(id: number, name: string, city: string): User {
  return {
    id,
    name,
    username: name.toLowerCase(),
    email: `${id}@example.com`,
    phone: '',
    website: '',
    street: '',
    suite: '',
    city,
    zipcode: '',
    company: 'Acme',
  };
}

const base = [user(1, 'Leanne Graham', 'Gwenborough'), user(2, 'Ervin Howell', 'Wisokyburgh')];

const config = (overrides: Partial<SimulationConfig> = {}): SimulationConfig => ({
  latencyMs: 0,
  jitterMs: 0,
  failureRate: 0,
  rows: 0,
  ...overrides,
});

describe('amplify', () => {
  it('leaves the response alone when no growth is asked for', () => {
    expect(amplify(base, 0)).toEqual(base);
    expect(amplify(base, 2)).toEqual(base);
  });

  it('keeps the real users first and unchanged', () => {
    const grown = amplify(base, 500);

    expect(grown).toHaveLength(500);
    expect(grown[0]).toEqual(base[0]);
    expect(grown[1]).toEqual(base[1]);
  });

  it('gives every row a unique id so links and keys stay stable', () => {
    const ids = new Set(amplify(base, 1000).map((u) => u.id));
    expect(ids.size).toBe(1000);
  });

  it('spreads rows across the cities present in the data', () => {
    // Without this the city control stays a one-of-N picker even at scale,
    // because the real fixture gives every user their own city.
    const grown = amplify(base, 100);
    const perCity = new Map<string, number>();
    for (const u of grown) perCity.set(u.city, (perCity.get(u.city) ?? 0) + 1);

    expect([...perCity.keys()].sort()).toEqual(['Gwenborough', 'Wisokyburgh']);
    for (const count of perCity.values()) expect(count).toBeGreaterThan(10);
  });

  it('produces searchable, sortable names rather than numbered duplicates', () => {
    const names = amplify(base, 50).map((u) => u.name);
    expect(new Set(names).size).toBeGreaterThan(20);
    expect(names.every((name) => /^[A-Za-z]+ [A-Za-z]+$/.test(name))).toBe(true);
  });
});

describe('maybeFail', () => {
  it('never throws when reliability is left alone', () => {
    expect(() => maybeFail(config())).not.toThrow();
  });

  it('always throws a network error at rate 1', () => {
    expect(() => maybeFail(config({ failureRate: 1 }))).toThrow(RequestError);
  });

  it('respects the configured rate', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(() => maybeFail(config({ failureRate: 0.4 }))).not.toThrow();
    expect(() => maybeFail(config({ failureRate: 0.6 }))).toThrow();
  });
});

describe('applyLatency', () => {
  it('resolves immediately when no delay is configured', async () => {
    await expect(applyLatency(config(), new AbortController().signal)).resolves.toBeUndefined();
  });

  it('rejects as soon as the request is aborted, without waiting it out', async () => {
    const controller = new AbortController();
    const started = Date.now();
    const pending = applyLatency(config({ latencyMs: 5000 }), controller.signal);

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    // The point: cancelling does not sit through the remaining delay.
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('rejects straight away if the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      applyLatency(config({ latencyMs: 5000 }), controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
