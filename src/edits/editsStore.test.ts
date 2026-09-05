import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetStorageProbe } from '../lib/storage';
import {
  EDITS_KEY,
  clearEdit,
  getEdits,
  parseEdits,
  resetEditsCache,
  saveEdit,
  subscribeToEdits,
} from './editsStore';

beforeEach(() => {
  window.localStorage.clear();
  resetStorageProbe();
  resetEditsCache();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('edits persistence', () => {
  it('survives a reload', () => {
    saveEdit(3, 'Ada Lovelace', 'Clementine Bauch');

    // Simulate a fresh page load: drop every in-memory cache, keep storage.
    resetEditsCache();

    expect(getEdits()['3']?.name).toBe('Ada Lovelace');
    expect(getEdits()['3']?.baseName).toBe('Clementine Bauch');
  });

  it('removes an edit without disturbing the others', () => {
    saveEdit(1, 'One', 'A');
    saveEdit(2, 'Two', 'B');

    clearEdit(1);

    expect(getEdits()['1']).toBeUndefined();
    expect(getEdits()['2']?.name).toBe('Two');
  });

  it('starts clean when stored JSON is corrupt, rather than crashing', () => {
    window.localStorage.setItem(EDITS_KEY, '{ this is not json');

    expect(getEdits()).toEqual({});
    // Unreadable data is cleared, so it cannot fail the same way every load.
    expect(window.localStorage.getItem(EDITS_KEY)).toBeNull();
  });

  it('starts clean when stored JSON is valid but the wrong shape', () => {
    window.localStorage.setItem(EDITS_KEY, '"a string, not a map"');
    expect(getEdits()).toEqual({});
  });

  it('drops individual malformed entries and keeps the good ones', () => {
    window.localStorage.setItem(
      EDITS_KEY,
      JSON.stringify({
        '1': { name: 'Kept', baseName: 'Base', editedAt: 1 },
        '2': { name: 42, baseName: 'Base', editedAt: 1 },
        '3': { baseName: 'Base', editedAt: 1 },
        'not-an-id': { name: 'Nope', baseName: 'Base', editedAt: 1 },
      }),
    );

    expect(Object.keys(getEdits())).toEqual(['1']);
    expect(getEdits()['1']?.name).toBe('Kept');
  });

  it('keeps working when localStorage throws, without persisting', () => {
    const original = window.localStorage.setItem;
    // Safari private mode, exhausted quota, disabled cookies: all look like this.
    window.localStorage.setItem = () => {
      throw new DOMException('QuotaExceededError');
    };
    resetStorageProbe();
    resetEditsCache();

    expect(() => saveEdit(1, 'Ada', 'Clementine')).not.toThrow();
    expect(getEdits()['1']?.name).toBe('Ada');

    window.localStorage.setItem = original;
  });

  it('picks up a change written by another tab', () => {
    let notified = 0;
    const unsubscribe = subscribeToEdits(() => {
      notified += 1;
    });

    window.localStorage.setItem(
      EDITS_KEY,
      JSON.stringify({ '7': { name: 'From another tab', baseName: 'Base', editedAt: 2 } }),
    );
    // jsdom does not dispatch storage events between contexts, so the event a
    // real browser would deliver to this tab is dispatched here directly.
    window.dispatchEvent(new StorageEvent('storage', { key: EDITS_KEY }));

    expect(notified).toBe(1);
    expect(getEdits()['7']?.name).toBe('From another tab');

    unsubscribe();
  });
});

describe('parseEdits', () => {
  it('rejects a non-object outright', () => {
    expect(parseEdits(null)).toBeNull();
    expect(parseEdits([])).toBeNull();
    expect(parseEdits('nope')).toBeNull();
  });

  it('accepts a well-formed map', () => {
    expect(parseEdits({ '5': { name: 'A', baseName: 'B', editedAt: 3 } })).toEqual({
      '5': { name: 'A', baseName: 'B', editedAt: 3 },
    });
  });
});
