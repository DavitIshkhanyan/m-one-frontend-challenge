import { describe, expect, it } from 'vitest';
import { PARAM, decodeViewState } from './viewState';

function decode(search: string) {
  return decodeViewState(new URLSearchParams(search));
}

describe('decodeViewState', () => {
  it('falls back to sane defaults on an empty URL', () => {
    expect(decode('')).toEqual({
      query: '',
      city: '',
      direction: 'asc',
      selectedUserId: null,
    });
  });

  it('reads a fully specified URL', () => {
    expect(decode('q=leanne&city=Gwenborough&dir=desc&user=3')).toEqual({
      query: 'leanne',
      city: 'Gwenborough',
      direction: 'desc',
      selectedUserId: 3,
    });
  });

  it('ignores a user id that is not a number rather than throwing', () => {
    expect(decode('user=not-a-number').selectedUserId).toBeNull();
    expect(decode('user=').selectedUserId).toBeNull();
  });

  it('treats any direction other than desc as ascending', () => {
    expect(decode('dir=sideways').direction).toBe('asc');
  });

  it('exposes parameter names as a single source of truth', () => {
    expect(Object.values(PARAM)).toEqual(['q', 'city', 'dir', 'user']);
  });
});
