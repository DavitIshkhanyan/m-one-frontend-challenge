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
