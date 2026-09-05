import { useEffect, useRef, type ReactNode } from 'react';
import type { User } from '../../data/types';
import styles from './UserDetail.module.css';

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div>
      <dt className={styles.term}>{label}</dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  );
}

function formatAddress(user: User): string {
  return [user.suite, user.street, user.city, user.zipcode]
    .filter((part) => part !== '')
    .join(', ');
}

/**
 * Modal shell.
 *
 * showModal() is called once on mount and close() once on unmount. The
 * unmount call matters: pressing Back changes the URL and unmounts this
 * component, and a dialog removed from the DOM without close() never restores
 * focus - it is simply gone, and focus falls to <body>. Closing it first hands
 * focus back to the row that opened it, which is where a keyboard user
 * expects to be.
 */
function Modal({ onClose, children }: { readonly onClose: () => void; readonly children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();

    return () => {
      // Close before unmount rather than letting the node be ripped out: a
      // dialog removed from the DOM while open never restores focus, and the
      // keyboard user is left at the top of the document.
      if (dialog?.open === true) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      /*
       * `cancel`, not `close`.
       *
       * `cancel` is the platform's own signal that the USER asked to dismiss -
       * it fires for Escape and never for a programmatic close(). `close`
       * fires for both, which makes it useless for telling a real dismissal
       * apart from our own teardown.
       *
       * That distinction matters because StrictMode deliberately mounts,
       * unmounts and remounts: the teardown closes the dialog, and if that
       * counted as a dismissal the selection would be wiped from the URL and
       * the panel would never appear in development. Guarding `close` with a
       * ref does not work either - React dispatches the event after the second
       * effect has already reset the flag, which is exactly the bug that got
       * caught here by driving a real browser.
       */
      onCancel={onClose}
      onClick={(event) => {
        // showModal() makes the backdrop part of the dialog element itself,
        // so a click landing on the element rather than its contents is a
        // backdrop click.
        if (event.target === ref.current) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

export function UserNotFound({ onClose }: { readonly onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div className={styles.notFound}>
        <h2 className={styles.heading}>We could not find that user</h2>
        <p className={styles.subheading}>
          The link may be out of date, or the user may have been removed.
        </p>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
      </div>
    </Modal>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
      <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function UserDetail({
  user,
  onClose,
}: {
  readonly user: User;
  readonly onClose: () => void;
}) {
  const address = formatAddress(user);

  return (
    <Modal onClose={onClose}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.heading}>{user.name}</h2>
            {user.username !== '' && <p className={styles.subheading}>@{user.username}</p>}
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close details">
            <CloseIcon />
          </button>
        </div>

        <div className={styles.body}>
          <dl className={styles.fields}>
            <Field label="Email">
              <a className={styles.link} href={`mailto:${user.email}`}>
                {user.email}
              </a>
            </Field>

            {user.phone !== '' && (
              <Field label="Phone">
                <a className={styles.link} href={`tel:${user.phone.replace(/\s+/g, '')}`}>
                  {user.phone}
                </a>
              </Field>
            )}

            {user.website !== '' && (
              <Field label="Website">
                <a
                  className={styles.link}
                  href={`https://${user.website}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {user.website}
                </a>
              </Field>
            )}

            {address !== '' && <Field label="Address">{address}</Field>}
            {user.company !== '' && <Field label="Company">{user.company}</Field>}
          </dl>
        </div>
      </div>
    </Modal>
  );
}
