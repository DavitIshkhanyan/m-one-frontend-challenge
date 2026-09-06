import styles from './states.module.css';

/**
 * Filters matched nothing. Different from an empty directory: the data is
 * there, the user just cannot see it, and the remedy is an action they can
 * take right now - so unlike EmptyState this one has a button.
 */
export const NoResults = ({ onClearFilters }: { readonly onClearFilters: () => void }) => {
  return (
    <div className={`${styles.panel} ${styles.centered}`}>
      <p className={styles.title}>No users match your filters</p>
      <p className={styles.detail}>Try a different search term, or clear the filters to start over.</p>
      <button type="button" className={styles.button} onClick={onClearFilters}>
        Clear filters
      </button>
    </div>
  );
};
