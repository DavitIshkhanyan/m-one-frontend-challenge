/**
 * The only place this app touches localStorage.
 *
 * Everything here is total: no function throws. Web storage fails in more
 * ways than people expect - Safari private browsing, quota exhaustion,
 * cookies disabled, enterprise policy, an iframe on a third-party origin -
 * and none of those are a reason for a user management screen to show a
 * blank page.
 *
 * When storage is unavailable the app keeps working against an in-memory
 * fallback for the session. Edits still apply; they just do not survive a
 * reload, and the UI says so rather than pretending they were saved.
 */

const memory = new Map<string, string>();
let available: boolean | undefined;

function storage(): Storage | null {
  if (available === false) return null;

  try {
    const probe = '__mone_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    available = true;
    return window.localStorage;
  } catch {
    // Reached in private mode and when quota is already exhausted. Writing
    // is the only reliable probe: localStorage can exist and still throw.
    available = false;
    return null;
  }
}

export function isPersistent(): boolean {
  return storage() !== null;
}

export function readRaw(key: string): string | null {
  const store = storage();
  if (store === null) return memory.get(key) ?? null;

  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string): void {
  const store = storage();
  if (store === null) {
    memory.set(key, value);
    return;
  }

  try {
    store.setItem(key, value);
  } catch {
    // Quota can be exceeded on a write even though the probe succeeded.
    // Fall back rather than lose the change outright.
    available = false;
    memory.set(key, value);
  }
}

export function removeKey(key: string): void {
  memory.delete(key);
  const store = storage();
  if (store === null) return;

  try {
    store.removeItem(key);
  } catch {
    /* nothing useful to do */
  }
}

/**
 * Read and validate in one step.
 *
 * `validate` decides what a usable value looks like. Anything unparseable or
 * rejected is removed, because data this version cannot read is data it can
 * never read, and leaving it there just means failing again on every load.
 * Keys carry a version suffix, so a future shape lives under its own key and
 * is never at risk from this.
 */
export function readJson<T>(key: string, validate: (value: unknown) => T | null): T | null {
  const raw = readRaw(key);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeKey(key);
    return null;
  }

  const value = validate(parsed);
  if (value === null) removeKey(key);
  return value;
}

export function writeJson(key: string, value: unknown): void {
  try {
    writeRaw(key, JSON.stringify(value));
  } catch {
    /* value was not serialisable; nothing to store */
  }
}

/**
 * Fires when another tab writes the key.
 *
 * The `storage` event never fires in the tab that performed the write, so
 * this only ever carries other tabs' changes - which is exactly what it is
 * for, and a common source of confusion when debugging.
 */
export function subscribeToKey(key: string, listener: () => void): () => void {
  const handler = (event: StorageEvent) => {
    if (event.key === null || event.key === key) listener();
  };

  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

/** Test seam: forget the cached availability probe. */
export function resetStorageProbe(): void {
  available = undefined;
  memory.clear();
}
