import type { User } from '../../data/types';
import { useUsersQuery, type UsersQueryStatus } from '../../data/useUsersQuery';
import { UserList } from './UserList';
import styles from './UsersScreen.module.css';
import { EmptyState } from './states/EmptyState';
import { ErrorState } from './states/ErrorState';
import { SkeletonList } from './states/SkeletonList';

function Body({
  status,
  users,
  hasError,
}: {
  readonly status: UsersQueryStatus;
  readonly users: readonly User[];
  readonly hasError: boolean;
}) {
  // First load: nothing to preserve, so show the shape of what is coming.
  if (status === 'loading' && users.length === 0) return <SkeletonList />;

  // Nothing to show. If a failure is already reported above, do not stack a
  // second explanation underneath it.
  if (users.length === 0) return hasError ? null : <EmptyState />;

  return <UserList users={users} />;
}

export function UsersScreen() {
  const { status, users, error, retry } = useUsersQuery('');

  const isFirstLoad = status === 'loading' && users.length === 0;
  const isRefreshing = status === 'loading' && users.length > 0;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Users</h1>
      </header>

      <main className={styles.main} aria-busy={status === 'loading'}>
        {error !== null && <ErrorState error={error} onRetry={retry} />}
        {isRefreshing && <div className={styles.progress} />}

        <Body status={status} users={users} hasError={error !== null} />

        <p className="visually-hidden" role="status">
          {isFirstLoad ? 'Loading users' : `${users.length} users`}
        </p>
      </main>
    </div>
  );
}
