import type { User } from '../../data/types';
import { nameCollator } from '../../lib/collator';
import type { SortDirection } from './viewState';

/**
 * Sort by name, with id as a tiebreaker.
 *
 * The tiebreaker is not decoration. Array.prototype.sort is stable, but the
 * input order here comes off the network and is not guaranteed, so two users
 * sharing a name could swap places between renders and make rows jump.
 * Falling back to id gives a total order that is the same every time.
 *
 * Direction is applied by negating the comparison rather than reversing the
 * sorted array, because reversing also reverses the tiebreaker and turns a
 * deterministic order back into an arbitrary one.
 */
export function sortUsersByName(users: readonly User[], direction: SortDirection): User[] {
  const factor = direction === 'desc' ? -1 : 1;

  return [...users].sort((a, b) => {
    const byName = nameCollator.compare(a.name, b.name);
    if (byName !== 0) return factor * byName;
    return factor * (a.id - b.id);
  });
}

/**
 * The distinct cities present in the data, collated for display.
 *
 * Derived from the whole dataset rather than the currently visible rows. The
 * alternative - building options from what is on screen - makes the filter's
 * own options disappear as you narrow the list, so the control fights the
 * user instead of helping them.
 *
 * Worth recording: on the real ten-user fixture every user lives in a
 * different city, so each option matches exactly one row and the "filter"
 * behaves like a picker. It only reads as a filter once the dataset is larger.
 */
export function cityOptions(users: readonly User[]): string[] {
  const cities = new Set<string>();
  for (const user of users) {
    if (user.city !== '') cities.add(user.city);
  }
  return [...cities].sort((a, b) => nameCollator.compare(a, b));
}

/**
 * Exact match. City strings are compared to values taken from the same
 * dataset, so normalising case or whitespace here would only mask upstream
 * inconsistency rather than fix it.
 */
export function filterByCity(users: readonly User[], city: string): readonly User[] {
  if (city === '') return users;
  return users.filter((user) => user.city === city);
}
