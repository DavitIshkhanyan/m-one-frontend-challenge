import { fetchJson } from './net';
import { parseUsers } from './parseUsers';
import { NO_SIMULATION, amplify, applyLatency, maybeFail, type SimulationConfig } from './simulation';
import type { User } from './types';

export const USERS_ENDPOINT = 'https://jsonplaceholder.typicode.com/users';

export async function fetchUsers(
  signal: AbortSignal,
  simulation: SimulationConfig = NO_SIMULATION,
): Promise<User[]> {
  // Latency first, so a cancelled request is cancelled during the wait rather
  // than after the network work has already been done.
  await applyLatency(simulation, signal);
  maybeFail(simulation);

  const payload = await fetchJson(USERS_ENDPOINT, signal);
  return amplify(parseUsers(payload), simulation.rows);
}
