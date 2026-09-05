import { fetchJson } from './net';
import { parseUsers } from './parseUsers';
import type { User } from './types';

export const USERS_ENDPOINT = 'https://jsonplaceholder.typicode.com/users';

export async function fetchUsers(signal: AbortSignal): Promise<User[]> {
  const payload = await fetchJson(USERS_ENDPOINT, signal);
  return parseUsers(payload);
}
