import { RequestError } from './net';
import type { User } from './types';

/**
 * The brief describes an endpoint that "returns ten users instantly and never
 * fails", and then requires the interface to hold up when the network is
 * slow, when a request fails, and when there are far more rows than ten.
 *
 * Those conditions cannot be observed against that endpoint. The only way to
 * build them is to produce them, so this is product surface, visible and
 * labelled in the UI, rather than a hidden developer flag. It is not test
 * scaffolding and should not be deleted as such.
 */
export type SimulationConfig = {
  readonly latencyMs: number;
  readonly jitterMs: number;
  /** 0 never fails, 1 always fails. */
  readonly failureRate: number;
  /** Target dataset size. 0 leaves the response exactly as it arrived. */
  readonly rows: number;
};

export const NO_SIMULATION: SimulationConfig = {
  latencyMs: 0,
  jitterMs: 0,
  failureRate: 0,
  rows: 0,
};

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

/**
 * An abort-aware sleep.
 *
 * If this ignored the signal, cancelling a request would still wait out the
 * full delay before noticing - and the response would resolve after the abort
 * rather than before it, which is precisely the case AbortController cannot
 * cover and the generation counter exists for.
 */
export function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }

    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true },
    );
  });
}

export async function applyLatency(
  config: SimulationConfig,
  signal: AbortSignal,
): Promise<void> {
  if (config.latencyMs <= 0 && config.jitterMs <= 0) return;
  await delay(config.latencyMs + Math.random() * config.jitterMs, signal);
}

export function maybeFail(config: SimulationConfig): void {
  if (config.failureRate <= 0) return;
  if (Math.random() >= config.failureRate) return;

  throw new RequestError('network', 'Could not reach the server.');
}

const FIRST_NAMES = [
  'Amara', 'Bao', 'Camille', 'Dmitri', 'Elif', 'Farid', 'Greta', 'Hiroshi',
  'Ingrid', 'Jamal', 'Kiara', 'Lucas', 'Mira', 'Nadia', 'Omar', 'Priya',
  'Quentin', 'Rosa', 'Soren', 'Tomas', 'Ulla', 'Viktor', 'Wren', 'Zaid',
];

const LAST_NAMES = [
  'Abara', 'Bergstrom', 'Cortes', 'Duarte', 'Eriksen', 'Fontaine', 'Gallo',
  'Haddad', 'Ivanov', 'Jensen', 'Kowalski', 'Lindqvist', 'Moreau', 'Nakamura',
  'Okafor', 'Petrov', 'Quintero', 'Rossi', 'Sandoval', 'Tanaka', 'Ueda',
  'Vargas', 'Whitfield', 'Zielinski',
];

/**
 * Grow the fixture to `target` rows.
 *
 * The real users are kept first and untouched, so ids 1-10 still resolve and
 * a link shared from an unsimulated session keeps working. Generated rows
 * cycle the cities present in the data, which is what turns the city control
 * into an actual filter: on the real ten-user response every user lives in a
 * different city, so each option matches exactly one row.
 */
export function amplify(users: readonly User[], target: number): User[] {
  if (target <= users.length || users.length === 0) return [...users];

  const cities = [...new Set(users.map((user) => user.city).filter((city) => city !== ''))];
  const companies = [...new Set(users.map((user) => user.company).filter((c) => c !== ''))];
  const template = users[0];
  if (template === undefined) return [...users];

  const grown: User[] = [...users];

  for (let index = users.length; index < target; index += 1) {
    const first = FIRST_NAMES[index % FIRST_NAMES.length] ?? 'Ada';
    const last =
      LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length] ?? 'Lovelace';

    grown.push({
      ...template,
      id: index + 1,
      name: `${first} ${last}`,
      username: `${first.toLowerCase()}${index}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${index}@example.com`,
      city: cities[index % cities.length] ?? template.city,
      company: companies[index % companies.length] ?? template.company,
    });
  }

  return grown;
}
