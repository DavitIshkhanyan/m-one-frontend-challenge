import { useEffect, useRef } from 'react';
import styles from './Toolbar.module.css';
import type { SortDirection } from './viewState';

const SearchIcon = () => {
  return (
    <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

const Chevron = () => {
  return (
    <svg className={styles.chevron} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

export const Toolbar = ({
  query,
  onQueryChange,
  city,
  cities,
  onCityChange,
  direction,
  onDirectionChange,
  summary,
}: {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly city: string;
  readonly cities: readonly string[];
  readonly onCityChange: (city: string) => void;
  readonly direction: SortDirection;
  readonly onDirectionChange: (direction: SortDirection) => void;
  readonly summary: string;
}) => {
  // A city arriving from the URL may no longer exist in the data. Keep it as
  // an option so the control shows what is actually being filtered on,
  // instead of rendering blank and looking broken.
  const options = city === '' || cities.includes(city) ? cities : [city, ...cities];
  const searchRef = useRef<HTMLInputElement>(null);

  /*
   * "/" jumps to search, the convention this kind of screen has had since
   * before it was a convention. Ignored while the user is typing somewhere
   * else, or while the detail dialog is open - stealing focus out of a modal
   * would break the trap the platform is maintaining.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;
      if (target instanceof HTMLElement) {
        if (target.isContentEditable) return;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        if (target.closest('dialog') !== null) return;
      }

      event.preventDefault();
      searchRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className={styles.toolbar}>
      <div className={styles.controls}>
        <div className={styles.searchField}>
          <SearchIcon />
          <label className="visually-hidden" htmlFor="user-search">
            Search users by name or email. Press slash to jump here.
          </label>
          <input
            id="user-search"
            ref={searchRef}
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

        <div className={styles.selectField}>
          <label className="visually-hidden" htmlFor="user-city">
            Filter users by city
          </label>
          <select
            id="user-city"
            className={styles.select}
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
          >
            <option value="">All cities</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <Chevron />
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
};
