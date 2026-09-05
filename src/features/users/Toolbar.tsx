import styles from './Toolbar.module.css';

function SearchIcon() {
  return (
    <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Toolbar({
  query,
  onQueryChange,
  summary,
}: {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly summary: string;
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.controls}>
        <div className={styles.searchField}>
          <SearchIcon />
          <label className="visually-hidden" htmlFor="user-search">
            Search users by name or email
          </label>
          <input
            id="user-search"
            className={styles.input}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search name or email"
            autoComplete="off"
            spellCheck={false}
          />
          {query !== '' && (
            <button
              type="button"
              className={styles.clear}
              onClick={() => onQueryChange('')}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
                <path
                  d="m6 6 8 8M14 6l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/*
        Announced politely rather than assertively: a filter result is worth
        knowing but must not interrupt what the screen reader is already
        saying about the character just typed.
      */}
      <p className={styles.count} role="status" aria-live="polite">
        {summary}
      </p>
    </div>
  );
}
