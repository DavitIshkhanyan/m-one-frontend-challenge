import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import type { MergedUser } from '../../edits/merge';
import { NameEditor } from './NameEditor';
import styles from './UserDetail.module.css';

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
      <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div>
      <dt className={styles.term}>{label}</dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  );
}

function formatAddress(user: MergedUser): string {
  return [user.suite, user.street, user.city, user.zipcode]
    .filter((part) => part !== '')
    .join(', ');
}

function Modal({
  onCancel,
  children,
}: {
  readonly onCancel: (event: SyntheticEvent) => void;
  readonly children: ReactNode;
}) {
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
       * effect has already reset the flag, which is the bug this replaced.
       *
       * It is also cancelable, which lets an open editor swallow Escape
       * instead of losing the user's typing along with the panel.
       */
      onCancel={onCancel}
      onClick={(event) => {
        // showModal() makes the backdrop part of the dialog element itself,
        // so a click landing on the element rather than its contents is a
        // backdrop click.
        if (event.target === ref.current) onCancel(event);
      }}
    >
      {children}
    </dialog>
  );
}

export function UserNotFound({ onClose }: { readonly onClose: () => void }) {
  return (
    <Modal onCancel={onClose}>
      <div className={styles.notFound}>
        <h2 className={styles.heading}>We could not find that user</h2>
        <p className={styles.subheading}>
          The link may be out of date, or the user may have been removed.
        </p>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          Back to the list
        </button>
      </div>
    </Modal>
  );
}

export function UserDetail({
  user,
  onClose,
  onSaveName,
  onRevertName,
  canPersist,
}: {
  readonly user: MergedUser;
  readonly onClose: () => void;
  readonly onSaveName: (name: string) => void;
  readonly onRevertName: () => void;
  readonly canPersist: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const address = formatAddress(user);

  /**
   * Escape while editing cancels the edit; Escape otherwise closes the panel.
   * Without this, one keypress discards both the typing and the panel, and
   * the user has no idea which of the two they meant to lose.
   */
  const handleCancel = (event: SyntheticEvent) => {
    if (isEditing) {
      event.preventDefault();
      setIsEditing(false);
      return;
    }
    onClose();
  };

  return (
    <Modal onCancel={handleCancel}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.headerMain}>
            {isEditing ? (
              <>
                <NameEditor
                  initialName={user.name}
                  onSave={(name) => {
                    onSaveName(name);
                    setIsEditing(false);
                  }}
                  onCancel={() => setIsEditing(false)}
                />
                {!canPersist && (
                  <p className={styles.warning}>
                    This browser is blocking local storage, so changes will last until you
                    reload.
                  </p>
                )}
              </>
            ) : (
              <>
                <h2 className={styles.heading}>{user.name}</h2>
                {user.username !== '' && <p className={styles.subheading}>@{user.username}</p>}

                <div className={styles.nameActions}>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit name
                  </button>
                  {user.isEdited && (
                    <button type="button" className={styles.textButton} onClick={onRevertName}>
                      Revert to server value
                    </button>
                  )}
                </div>

                {user.isEdited && !user.serverChangedSinceEdit && (
                  <p className={styles.note}>
                    Edited on this device. The server still has &ldquo;{user.serverName}&rdquo;.
                  </p>
                )}

                {/*
                  The server changed underneath a local edit. The local value
                  still wins - that is the policy - but saying nothing would
                  mask a real change and leave the user acting on stale
                  information they never agreed to.
                */}
                {user.serverChangedSinceEdit && (
                  <p className={styles.conflict}>
                    Your edit is being shown. The server has since changed this name to
                    &ldquo;{user.serverName}&rdquo;.
                  </p>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close details"
          >
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
