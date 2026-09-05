import type { User } from './types';

/**
 * Case- and diacritic-insensitive. "Jose" matches "José", and vice versa,
 * because a user typing on a keyboard without dead keys should still find
 * the row they are looking at.
 */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function tokenize(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .filter((token) => token !== '');
}

/**
 * The brief says "searchable by name or email" and stops there. The rules
 * below are a decision, not a reading — they are written up in the README:
 *
 *   - substring, not prefix ("ham" finds "Graham")
 *   - every token must match, in any order ("graham leanne" finds
 *     "Leanne Graham"; so does "leanne graham")
 *   - name and email are one haystack, so "leanne april" matches a user
 *     named Leanne at april.biz
 *   - username is NOT searched; the brief says name or email, and matching
 *     on a field the list does not show produces results that look like bugs
 */
export function matchesUser(user: User, query: string): boolean {
  const tokens = tokenize(query);
  if (tokens.length === 0) return true;

  const haystack = `${normalize(user.name)} ${normalize(user.email)}`;
  return tokens.every((token) => haystack.includes(token));
}
