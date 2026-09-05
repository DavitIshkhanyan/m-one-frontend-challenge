import { useVirtualRows } from '../../lib/useVirtualRows';
import type { MergedUser } from '../../edits/merge';
import { useRowHeight } from './layout';
import styles from './UserList.module.css';
import { UserRow } from './UserRow';

export function UserList({
  users,
  onSelect,
}: {
  readonly users: readonly MergedUser[];
  readonly onSelect: (id: number) => void;
}) {
  const rowHeight = useRowHeight();
  const { containerRef, startIndex, endIndex, totalHeight, offsetY } = useVirtualRows(
    users.length,
    rowHeight,
  );

  const visible = users.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      className={styles.viewport}
      style={{ '--row-height': `${rowHeight}px`, '--total-height': `${totalHeight}px` }}
    >
      {/* Holds the full scroll height so the scrollbar reflects the real list. */}
      <div className={styles.canvas} style={{ height: `${totalHeight}px` }}>
        <ul className={styles.list} style={{ transform: `translateY(${offsetY}px)` }}>
          {visible.map((user, index) => (
            <UserRow
              key={user.id}
              user={user}
              onSelect={onSelect}
              // Windowing means the DOM holds a slice, not the list. Without
              // these a screen reader announces "item 3 of 14" inside a list
              // of ten thousand.
              position={startIndex + index + 1}
              setSize={users.length}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
