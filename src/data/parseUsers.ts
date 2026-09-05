import { RequestError } from './net';
import type { User } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === 'string' ? value : '';
}

/**
 * Parse one record, or return null if it is not usable.
 *
 * "Usable" is deliberately narrow: an id, a name and an email. Those three
 * are what the list renders and what search matches on, so a record missing
 * any of them cannot be displayed or found. Every other field degrades to an
 * empty string — a user with no phone number is still a user.
 */
export function parseUser(raw: unknown): User | null {
  if (!isRecord(raw)) return null;

  const id = raw['id'];
  if (typeof id !== 'number' || !Number.isFinite(id)) return null;

  const name = readString(raw, 'name').trim();
  const email = readString(raw, 'email').trim();
  if (name === '' || email === '') return null;

  const address = isRecord(raw['address']) ? raw['address'] : {};
  const company = isRecord(raw['company']) ? raw['company'] : {};

  return {
    id,
    name,
    email,
    username: readString(raw, 'username'),
    phone: readString(raw, 'phone'),
    website: readString(raw, 'website'),
    street: readString(address, 'street'),
    suite: readString(address, 'suite'),
    city: readString(address, 'city').trim(),
    zipcode: readString(address, 'zipcode'),
    company: readString(company, 'name'),
  };
}

/**
 * Two different failures, handled two different ways.
 *
 * If the payload is not an array we did not get a user list at all — that is
 * a parse error and the screen should say so. If individual records inside a
 * valid array are malformed we drop them and render the rest, because one bad
 * row is not a reason to show the user nothing.
 */
export function parseUsers(raw: unknown): User[] {
  if (!Array.isArray(raw)) {
    throw new RequestError('parse', 'The server sent a response we could not read.');
  }

  const users: User[] = [];
  for (const item of raw) {
    const user = parseUser(item);
    if (user !== null) users.push(user);
  }
  return users;
}
