import { describe, expect, it } from 'vitest';
import { readSimulation } from './simulation';

const read = (search: string) => readSimulation(new URLSearchParams(search));

describe('readSimulation', () => {
  it('means "use the real endpoint" when no parameters are present', () => {
    expect(read('')).toEqual({ latencyMs: 0, jitterMs: 0, failureRate: 0, rows: 0 });
  });

  it('reads a configured session', () => {
    expect(read('sim.latency=800&sim.fail=0.4&sim.rows=10000')).toEqual({
      latencyMs: 800,
      jitterMs: 400,
      failureRate: 0.4,
      rows: 10000,
    });
  });

  it('clamps a failure rate above 1', () => {
    expect(read('sim.fail=7').failureRate).toBe(1);
  });

  it('ignores nonsense rather than propagating NaN into the fetch layer', () => {
    expect(read('sim.latency=fast&sim.rows=-5&sim.fail=abc')).toEqual({
      latencyMs: 0,
      jitterMs: 0,
      failureRate: 0,
      rows: 0,
    });
  });
});
