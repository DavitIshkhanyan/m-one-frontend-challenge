import styles from './states.module.css';

/**
 * The server returned zero users. Distinct from "your filters matched
 * nothing", which is a different situation with a different remedy and gets
 * its own component. Collapsing the two is a common tell that nobody thought
 * about either.
 */
export function EmptyState() {
  return (
    <div className={`${styles.panel} ${styles.centered}`}>
      <p className={styles.title}>No users yet</p>
      <p className={styles.detail}>
        The directory is empty. When users are added they will appear here.
      </p>
    </div>
  );
}
