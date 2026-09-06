import type { RequestError } from '../../../data/net';
import styles from './states.module.css';

export const ErrorState = ({
  error,
  onRetry,
}: {
  readonly error: RequestError;
  readonly onRetry: () => void;
}) => {
  const { title, detail, canRetry } = describe(error);

  return (
    <div className={`${styles.panel} ${styles.error}`} role="alert">
      <p className={styles.title}>{title}</p>
      <p className={styles.detail}>{detail}</p>
      {canRetry && (
        <button type="button" className={styles.button} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
};

/**
 * The three failures get different copy because they imply different
 * actions. Telling someone to "try again" when the server sent unreadable
 * JSON wastes their time - retrying will produce the same result.
 */
function describe(error: RequestError): { title: string; detail: string; canRetry: boolean } {
  switch (error.kind) {
    case 'network':
      return {
        title: 'Could not reach the server',
        detail: 'Check your connection. Nothing you have done here has been lost.',
        canRetry: true,
      };
    case 'http':
      return {
        title: `The server returned an error${error.status === undefined ? '' : ` (${error.status})`}`,
        detail: 'This is usually temporary. Trying again in a moment often works.',
        canRetry: true,
      };
    case 'parse':
      return {
        title: 'The server sent something unreadable',
        detail: 'Retrying will not help until the server is fixed.',
        canRetry: false,
      };
  }
}
