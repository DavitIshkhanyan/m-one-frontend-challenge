import type { SimulationConfig } from '../../data/simulation';
import styles from './SimulationPanel.module.css';
import { FAILURE_PRESETS, LATENCY_PRESETS, ROW_PRESETS } from './simulation';

/**
 * Deliberately part of the interface rather than a hidden flag.
 *
 * The brief asks the app to hold up on a slow network, on a failing request
 * and with far more rows than ten, against an endpoint that is fast, reliable
 * and ten rows long. Those conditions have to be manufactured, and putting
 * the controls on screen - labelled, and reflected in the URL so a broken
 * state can be shared - is more honest than a console incantation buried in
 * the README.
 */
export function SimulationPanel({
  config,
  onChange,
  isActive,
}: {
  readonly config: SimulationConfig;
  readonly onChange: (patch: Partial<SimulationConfig>) => void;
  readonly isActive: boolean;
}) {
  return (
    <details className={styles.panel}>
      <summary className={styles.summary}>
        Simulate conditions
        {isActive && <span className={styles.dot} aria-label="Simulation active" role="img" />}
      </summary>

      <div className={styles.controls}>
        <p className={styles.explain}>
          The real endpoint returns ten users instantly and never fails. These controls
          reproduce the conditions it cannot, so the loading, error and large-list behaviour
          can actually be seen.
        </p>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="sim-latency">
              Network speed
            </label>
            <select
              id="sim-latency"
              className={styles.select}
              value={config.latencyMs}
              onChange={(event) => {
                const latencyMs = Number(event.target.value);
                const preset = LATENCY_PRESETS.find((entry) => entry.latencyMs === latencyMs);
                onChange({ latencyMs, jitterMs: preset?.jitterMs ?? 0 });
              }}
            >
              {LATENCY_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.latencyMs}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="sim-failure">
              Reliability
            </label>
            <select
              id="sim-failure"
              className={styles.select}
              value={config.failureRate}
              onChange={(event) => onChange({ failureRate: Number(event.target.value) })}
            >
              {FAILURE_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="sim-rows">
              Dataset size
            </label>
            <select
              id="sim-rows"
              className={styles.select}
              value={config.rows}
              onChange={(event) => onChange({ rows: Number(event.target.value) })}
            >
              {ROW_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </details>
  );
}
