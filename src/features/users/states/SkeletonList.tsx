import { ROW_HEIGHT } from '../layout';
import styles from './states.module.css';

const PLACEHOLDER_ROWS = 6;
const LINE_WIDTHS = ['58%', '38%'] as const;

/**
 * Skeleton rows are the same height as real rows, so the list does not jump
 * when data arrives. A spinner would be smaller to build and worse: it tells
 * the user something is happening without telling them what is coming.
 */
export function SkeletonList() {
  return (
    <div
      className={styles.skeletonList}
      style={{ '--row-height': `${ROW_HEIGHT}px` }}
      aria-hidden="true"
    >
      {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
        <div key={index} className={styles.skeletonRow}>
          <div className={`${styles.skeletonAvatar} ${styles.shimmer}`} />
          <div className={styles.skeletonLines}>
            {LINE_WIDTHS.map((width) => (
              <div
                key={width}
                className={`${styles.skeletonLine} ${styles.shimmer}`}
                style={{ width }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
