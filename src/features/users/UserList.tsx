import type { MergedUser } from '../../edits/merge';
import { ROW_HEIGHT } from './layout';
import styles from './UserList.module.css';
import { UserRow } from './UserRow';

export function UserList({
  users,
  onSelect,
}: {
  readonly users: readonly MergedUser[];
  readonly onSelect: (id: number) => void;
}) {
  return (
    <ul className={styles.list} style={{ '--row-height': `${ROW_HEIGHT}px` }}>
      {users.map((user) => (
        <UserRow key={user.id} user={user} onSelect={onSelect} />
      ))}
    </ul>
  );
}
