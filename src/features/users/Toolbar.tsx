import styles from './Toolbar.module.css';
import type { SortDirection } from './viewState';

function SearchIcon() {
  return (
    <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className={styles.chevron} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Toolbar({
  query,
  onQueryChange,
  direction,
  onDirectionChange,
  summary,
}: {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly direction: SortDirection;
  readonly onDirectionChange: (direction: SortDirection) => void;
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

        {/*
          Sort lives in the toolbar rather than on a clickable column header.
          Header sorting needs table semantics this list deliberately does not
          use, and it disappears entirely at narrow widths where there are no
          headers to click. A labelled control is identical everywhere.
        */}
        <div className={styles.selectField}>
          <label className="visually-hidden" htmlFor="user-sort">
            Sort users by name
          </label>
          <select
            id="user-sort"
            className={styles.select}
            value={direction}
            onChange={(event) => onDirectionChange(event.target.value === 'desc' ? 'desc' : 'asc')}
          >
            <option value="asc">Name A to Z</option>
            <option value="desc">Name Z to A</option>
          </select>
          <Chevron />
        </div>
      </div>

      {/*
        Announced politely rather than assertively: a filter result is worth
        knowing but must not interrupt the screen reader mid-character.
      */}
      <p className={styles.count} role="status" aria-live="polite">
        {summary}
      </p>
    </div>
  );
}
