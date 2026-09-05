/**
 * One collator, constructed once, for the whole app.
 *
 * Intl.Collator is expensive to build and cheap to reuse. Constructing one
 * inside a comparator means constructing it O(n log n) times, which at ten
 * rows is invisible and at ten thousand is a visible freeze. This is the kind
 * of thing that never shows up until the dataset grows.
 *
 * No explicit locale: the runtime default is the user's locale, which is a
 * system setting this app should respect rather than override. A Swedish user
 * expects a-with-ring to sort after z, and hard-coding 'en' would take that
 * away from them.
 */
export const nameCollator = new Intl.Collator(undefined, { numeric: true });
