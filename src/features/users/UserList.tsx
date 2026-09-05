import type { User } from '../../data/types';
import { ROW_HEIGHT } from './layout';
import styles from './UserList.module.css';
import { UserRow } from './UserRow';

export function UserList({
  users,
  onSelect,
}: {
  readonly users: readonly User[];
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
