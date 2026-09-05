import { useCallback, useMemo } from 'react';
import { NO_SIMULATION, type SimulationConfig } from '../../data/simulation';
import { navigate, useUrlSearchParams } from '../../url/useUrlState';

export const SIM_PARAM = {
  latency: 'sim.latency',
  fail: 'sim.fail',
  rows: 'sim.rows',
} as const;

export const LATENCY_PRESETS = [
  { label: 'Instant', latencyMs: 0, jitterMs: 0 },
  { label: 'Slow (0.8s)', latencyMs: 800, jitterMs: 400 },
  { label: 'Very slow (2.5s)', latencyMs: 2500, jitterMs: 1000 },
] as const;

export const FAILURE_PRESETS = [
  { label: 'Never fails', value: 0 },
  { label: 'Fails sometimes', value: 0.4 },
  { label: 'Always fails', value: 1 },
] as const;

export const ROW_PRESETS = [
  { label: 'Real data (10)', value: 0 },
  { label: '1,000 rows', value: 1000 },
  { label: '10,000 rows', value: 10000 },
] as const;

function readNumber(params: URLSearchParams, key: string): number {
  const raw = params.get(key);
  if (raw === null) return 0;

  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function readSimulation(params: URLSearchParams): SimulationConfig {
  const latencyMs = readNumber(params, SIM_PARAM.latency);
  const preset = LATENCY_PRESETS.find((entry) => entry.latencyMs === latencyMs);

  return {
    latencyMs,
    jitterMs: preset?.jitterMs ?? 0,
    failureRate: Math.min(readNumber(params, SIM_PARAM.fail), 1),
    rows: Math.round(readNumber(params, SIM_PARAM.rows)),
  };
}

/**
 * The simulation lives in the URL like every other piece of view state, so a
 * failing slow 10,000-row session is a link somebody else can open. It is
 * also why a plain visit gets NO_SIMULATION: absent parameters mean the real
 * endpoint, unmodified.
 *
 * The returned config is memoised on the query string because it is a
 * dependency of the fetch effect - a fresh object on every render would
 * refetch on every render.
 */
export function useSimulation(): {
  readonly config: SimulationConfig;
  readonly setConfig: (patch: Partial<SimulationConfig>) => void;
  readonly isActive: boolean;
} {
  const params = useUrlSearchParams();
  const config = useMemo(() => readSimulation(params), [params]);

  const setConfig = useCallback(
    (patch: Partial<SimulationConfig>) => {
      const next = { ...readSimulation(params), ...patch };
      const updated = new URLSearchParams(params);

      const write = (key: string, value: number) => {
        if (value <= 0) updated.delete(key);
        else updated.set(key, String(value));
      };

      write(SIM_PARAM.latency, next.latencyMs);
      write(SIM_PARAM.fail, next.failureRate);
      write(SIM_PARAM.rows, next.rows);

      navigate(updated, 'replace', window.history.state);
    },
    [params],
  );

  const isActive =
    config.latencyMs > 0 || config.failureRate > 0 || config.rows > 0;

  return { config, setConfig, isActive };
}

export { NO_SIMULATION };
