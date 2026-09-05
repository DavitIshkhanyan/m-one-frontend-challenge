import { describe, expect, it } from 'vitest';
import { RequestError } from './net';
import { parseUser, parseUsers } from './parseUsers';
import { rawUser } from '../test/fixtures';

describe('parseUsers', () => {
  it('flattens the nested address and company', () => {
    const [user] = parseUsers([rawUser({ city: 'Gwenborough', company: 'Romaguera-Crona' })]);

    expect(user?.city).toBe('Gwenborough');
    expect(user?.company).toBe('Romaguera-Crona');
    expect(user?.zipcode).toBe('92998-3874');
  });

  it('treats a non-array payload as a parse failure', () => {
    // We did not receive a user list at all, so the screen must say so rather
    // than quietly render nothing.
    expect(() => parseUsers({ users: [] })).toThrow(RequestError);
    expect(() => parseUsers(null)).toThrow(RequestError);
    expect(() => parseUsers('nope')).toThrow(RequestError);
  });

  it('drops unusable records and renders the rest', () => {
    // One bad row is not a reason to show the user an empty screen.
    const parsed = parseUsers([
      rawUser({ id: 1, name: 'Leanne Graham' }),
      { id: 2 },
      null,
      'garbage',
      rawUser({ id: 3, name: 'Ervin Howell' }),
    ]);

    expect(parsed.map((user) => user.name)).toEqual(['Leanne Graham', 'Ervin Howell']);
  });

  it('accepts a record missing optional fields', () => {
    const user = parseUser({ id: 9, name: 'Minimal', email: 'a@b.c' });

    expect(user?.name).toBe('Minimal');
    expect(user?.city).toBe('');
    expect(user?.company).toBe('');
  });

  it('rejects records that cannot be listed or searched', () => {
    // id, name and email are what the row renders and what search matches on.
    expect(parseUser({ name: 'No id', email: 'a@b.c' })).toBeNull();
    expect(parseUser({ id: 1, name: '   ', email: 'a@b.c' })).toBeNull();
    expect(parseUser({ id: 1, name: 'No email', email: '' })).toBeNull();
    expect(parseUser({ id: '1', name: 'String id', email: 'a@b.c' })).toBeNull();
  });

  it('trims surrounding whitespace on the fields it keys off', () => {
    const user = parseUser({ id: 1, name: '  Padded  ', email: '  a@b.c  ', address: { city: ' Rome ' } });

    expect(user?.name).toBe('Padded');
    expect(user?.email).toBe('a@b.c');
    expect(user?.city).toBe('Rome');
  });
});
