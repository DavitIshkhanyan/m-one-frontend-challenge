import type { User } from '../../data/types';
import styles from './UserRow.module.css';

function initials(name: string): string {
  const parts = name.split(/\s+/).filter((part) => part !== '');
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function UserRow({
  user,
  onSelect,
}: {
  readonly user: User;
  readonly onSelect: (id: number) => void;
}) {
  const hasCity = user.city !== '';
  const hasCompany = user.company !== '';

  return (
    <li>
      {/*
        A real <button>, not a div with a click handler: it is reachable by
        Tab, activates on both Enter and Space, and announces itself as
        actionable. The accessible name is the user's name, so a screen reader
        user hears "Leanne Graham, button" rather than the whole row read out
        as one run-on string.
      */}
      <button
        type="button"
        className={styles.row}
        onClick={() => onSelect(user.id)}
        aria-label={`${user.name}, view details`}
      >
        <span className={styles.avatar} aria-hidden="true">
          {initials(user.name)}
        </span>

        <span className={styles.content}>
          <span className={styles.name}>{user.name}</span>
          <span className={styles.email}>{user.email}</span>

          <span className={styles.meta}>
            {hasCity && <span className={styles.city}>{user.city}</span>}
            {hasCity && hasCompany && (
              <span className={styles.separator} aria-hidden="true">
                &middot;
              </span>
            )}
            {hasCompany && <span className={styles.company}>{user.company}</span>}
          </span>
        </span>
      </button>
    </li>
  );
}
