import { describe, expect, it } from 'vitest';
import type { User } from '../../data/types';
import { cityOptions, filterByCity, sortUsersByName } from './derive';

function user(id: number, name: string): User {
  return {
    id,
    name,
    username: '',
    email: `${id}@example.com`,
    phone: '',
    website: '',
    street: '',
    suite: '',
    city: '',
    zipcode: '',
    company: '',
  };
}

const names = (users: readonly User[]) => users.map((u) => u.name);

describe('sortUsersByName', () => {
  it('sorts ascending and descending', () => {
    const users = [user(1, 'Clementine'), user(2, 'Antonette'), user(3, 'Bret')];

    expect(names(sortUsersByName(users, 'asc'))).toEqual(['Antonette', 'Bret', 'Clementine']);
    expect(names(sortUsersByName(users, 'desc'))).toEqual(['Clementine', 'Bret', 'Antonette']);
  });

  it('uses locale collation rather than code-point order', () => {
    // Code-point order puts every uppercase letter before every lowercase one,
    // which would sort "Zoe" before "ada". Collation does not.
    const users = [user(1, 'Zoe'), user(2, 'ada')];
    expect(names(sortUsersByName(users, 'asc'))).toEqual(['ada', 'Zoe']);
  });

  it('orders accented names next to their unaccented counterparts', () => {
    const users = [user(1, 'Zoe'), user(2, 'Ángela'), user(3, 'Bret')];
    expect(names(sortUsersByName(users, 'asc'))).toEqual(['Ángela', 'Bret', 'Zoe']);
  });

  it('breaks ties deterministically instead of leaving order to the input', () => {
    const forward = [user(3, 'Same Name'), user(1, 'Same Name'), user(2, 'Same Name')];
    const backward = [user(2, 'Same Name'), user(3, 'Same Name'), user(1, 'Same Name')];

    const ids = (users: readonly User[]) => sortUsersByName(users, 'asc').map((u) => u.id);
    expect(ids(forward)).toEqual([1, 2, 3]);
    expect(ids(backward)).toEqual([1, 2, 3]);
  });

  it('does not mutate the array it is given', () => {
    const users = [user(2, 'Bret'), user(1, 'Antonette')];
    sortUsersByName(users, 'asc');
    expect(names(users)).toEqual(['Bret', 'Antonette']);
  });
});

describe('cityOptions', () => {
  it('lists each city once, collated', () => {
    const users = [
      { ...user(1, 'A'), city: 'Wisokyburgh' },
      { ...user(2, 'B'), city: 'Gwenborough' },
      { ...user(3, 'C'), city: 'Wisokyburgh' },
    ];
    expect(cityOptions(users)).toEqual(['Gwenborough', 'Wisokyburgh']);
  });

  it('omits users with no city rather than offering a blank option', () => {
    const users = [{ ...user(1, 'A'), city: '' }, { ...user(2, 'B'), city: 'Gwenborough' }];
    expect(cityOptions(users)).toEqual(['Gwenborough']);
  });
});

describe('filterByCity', () => {
  it('returns everything when no city is selected', () => {
    const users = [{ ...user(1, 'A'), city: 'Gwenborough' }];
    expect(filterByCity(users, '')).toHaveLength(1);
  });

  it('keeps only the selected city', () => {
    const users = [
      { ...user(1, 'A'), city: 'Gwenborough' },
      { ...user(2, 'B'), city: 'Wisokyburgh' },
    ];
    expect(filterByCity(users, 'Wisokyburgh').map((u) => u.id)).toEqual([2]);
  });
});
