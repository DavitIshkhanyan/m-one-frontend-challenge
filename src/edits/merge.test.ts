import { describe, expect, it } from 'vitest';
import type { User } from '../data/types';
import type { EditMap } from './editsStore';
import { applyEdits } from './merge';

function serverUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Clementine Bauch',
    username: 'Samantha',
    email: 'Nathan@yesenia.net',
    phone: '1-463-123-4447',
    website: 'ramiro.info',
    street: 'Douglas Extension',
    suite: 'Suite 847',
    city: 'McKenziehaven',
    zipcode: '59590-4157',
    company: 'Romaguera-Jacobson',
    ...overrides,
  };
}

const edit = (name: string, baseName: string): EditMap => ({
  '1': { name, baseName, editedAt: 1 },
});

describe('applyEdits', () => {
  it('leaves untouched users exactly as the server sent them', () => {
    const [merged] = applyEdits([serverUser()], {});

    expect(merged?.name).toBe('Clementine Bauch');
    expect(merged?.isEdited).toBe(false);
    expect(merged?.serverChangedSinceEdit).toBe(false);
  });

  it('shows the local value instead of the server value', () => {
    const [merged] = applyEdits([serverUser()], edit('Ada Lovelace', 'Clementine Bauch'));

    expect(merged?.name).toBe('Ada Lovelace');
    expect(merged?.isEdited).toBe(true);
    expect(merged?.serverName).toBe('Clementine Bauch');
  });

  it('keeps every other field live from the server', () => {
    // The point of per-field precedence: editing a name must not freeze the
    // rest of the record against future server changes.
    const updated = serverUser({ email: 'new@example.com', city: 'Rome', company: 'New Co' });
    const [merged] = applyEdits([updated], edit('Ada Lovelace', 'Clementine Bauch'));

    expect(merged?.name).toBe('Ada Lovelace');
    expect(merged?.email).toBe('new@example.com');
    expect(merged?.city).toBe('Rome');
    expect(merged?.company).toBe('New Co');
  });

  it('does not flag a conflict while the server value is unchanged', () => {
    const [merged] = applyEdits([serverUser()], edit('Ada Lovelace', 'Clementine Bauch'));
    expect(merged?.serverChangedSinceEdit).toBe(false);
  });

  it('flags that the server changed under an edit, without discarding it', () => {
    const renamedUpstream = serverUser({ name: 'Clementine Bauch-Smith' });
    const [merged] = applyEdits([renamedUpstream], edit('Ada Lovelace', 'Clementine Bauch'));

    // The user's value still wins - but they can now be told why it matters.
    expect(merged?.name).toBe('Ada Lovelace');
    expect(merged?.serverChangedSinceEdit).toBe(true);
    expect(merged?.serverName).toBe('Clementine Bauch-Smith');
  });

  it('ignores edits for users the server no longer returns', () => {
    const merged = applyEdits([serverUser({ id: 2 })], edit('Ada Lovelace', 'Clementine Bauch'));

    expect(merged).toHaveLength(1);
    expect(merged[0]?.name).toBe('Clementine Bauch');
    expect(merged[0]?.isEdited).toBe(false);
  });

  it('does not mutate the users it is given', () => {
    const users = [serverUser()];
    applyEdits(users, edit('Ada Lovelace', 'Clementine Bauch'));
    expect(users[0]?.name).toBe('Clementine Bauch');
  });
});
