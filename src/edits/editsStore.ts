import { useSyncExternalStore } from 'react';
import { readJson, subscribeToKey, writeJson } from '../lib/storage';

/**
 * One locally edited field, plus the server value it was made against.
 *
 * `baseName` is what makes the merge policy honest. Without it we can only
 * ask "is there a local edit?", and the answer is always yes; with it we can
 * ask "has the server changed since this edit was made?" and tell the user
 * their edit is now masking something new rather than silently sitting on it.
 */
export type UserEdit = {
  readonly name: string;
  readonly baseName: string;
  readonly editedAt: number;
};

/** Keyed by user id, as a string, because JSON object keys are strings. */
export type EditMap = Readonly<Record<string, UserEdit>>;

/**
 * Version suffix, deliberately. If the stored shape ever changes, the new
 * shape gets a new key and old data is neither misread nor destroyed.
 */
export const EDITS_KEY = 'mone.userEdits.v1';

const EMPTY: EditMap = Object.freeze({});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Same philosophy as the API parser: a wholly wrong shape is corruption and
 * gets discarded, but individual bad entries are dropped while the rest of
 * the user's work survives.
 */
export function parseEdits(value: unknown): EditMap | null {
  if (!isRecord(value)) return null;

  const edits: Record<string, UserEdit> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!/^\d+$/.test(key) || !isRecord(entry)) continue;

    const { name, baseName, editedAt } = entry;
    if (typeof name !== 'string' || name === '') continue;
    if (typeof baseName !== 'string') continue;
    if (typeof editedAt !== 'number' || !Number.isFinite(editedAt)) continue;

    edits[key] = { name, baseName, editedAt };
  }
  return edits;
}

let snapshot: EditMap = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load(): EditMap {
  return readJson(EDITS_KEY, parseEdits) ?? EMPTY;
}

function ensureLoaded(): void {
  if (loaded) return;
  snapshot = load();
  loaded = true;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function commit(next: EditMap): void {
  snapshot = next;
  writeJson(EDITS_KEY, next);
  emit();
}

export function getEdits(): EditMap {
  ensureLoaded();
  return snapshot;
}

export function saveEdit(userId: number, name: string, baseName: string): void {
  ensureLoaded();
  commit({ ...snapshot, [String(userId)]: { name, baseName, editedAt: Date.now() } });
}

export function clearEdit(userId: number): void {
  ensureLoaded();
  const key = String(userId);
  if (!(key in snapshot)) return;

  const next: Record<string, UserEdit> = { ...snapshot };
  delete next[key];
  commit(next);
}

let unsubscribeStorage: (() => void) | undefined;

export function subscribeToEdits(listener: () => void): () => void {
  ensureLoaded();
  listeners.add(listener);

  // One storage listener for the whole store, attached with the first
  // subscriber and removed with the last. Scoping it per subscriber would
  // mean the first component to unmount tears down cross-tab sync for every
  // component still mounted.
  //
  // Another tab writing the same key must not leave this one showing stale
  // values. The storage event never fires in the writing tab, so this only
  // ever delivers somebody else's change.
  if (listeners.size === 1) {
    unsubscribeStorage = subscribeToKey(EDITS_KEY, () => {
      snapshot = load();
      emit();
    });
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      unsubscribeStorage?.();
      unsubscribeStorage = undefined;
    }
  };
}

export function useEdits(): EditMap {
  return useSyncExternalStore(subscribeToEdits, getEdits, () => EMPTY);
}

/** Test seam: drop the in-memory cache so the next read hits storage again. */
export function resetEditsCache(): void {
  snapshot = EMPTY;
  loaded = false;
}
