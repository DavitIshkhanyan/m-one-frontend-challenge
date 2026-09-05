import { useEffect, useRef, useState } from 'react';
import styles from './NameEditor.module.css';

export const MAX_NAME_LENGTH = 80;

/**
 * The brief does not specify what a valid name is, so these are decisions:
 * leading and trailing whitespace is trimmed rather than rejected, a name
 * made only of whitespace is empty, and there is an upper bound so a paste
 * accident cannot produce a row nothing can render. No character class
 * restriction - names contain apostrophes, hyphens, accents and scripts this
 * developer cannot enumerate, and guessing would exclude real people.
 */
export function validateName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return 'Enter a name.';
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `Use ${MAX_NAME_LENGTH} characters or fewer.`;
  }
  return null;
}

export function NameEditor({
  initialName,
  onSave,
  onCancel,
}: {
  readonly initialName: string;
  readonly onSave: (name: string) => void;
  readonly onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initialName);
  // Not validated until the first submit: telling somebody their name is
  // invalid while they are still typing it is noise, not help.
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const submit = () => {
    const problem = validateName(draft);
    if (problem !== null) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    onSave(draft.trim());
  };

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      noValidate
    >
      <div>
        <label className="visually-hidden" htmlFor="edit-name">
          Name
        </label>
        <input
          id="edit-name"
          ref={inputRef}
          className={`${styles.input} ${error === null ? '' : styles.inputInvalid}`}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error !== null) setError(validateName(event.target.value));
          }}
          aria-invalid={error !== null}
          aria-describedby={error === null ? undefined : 'edit-name-error'}
          autoComplete="off"
        />
        {error !== null && (
          <p className={styles.error} id="edit-name-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.primary}>
          Save
        </button>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
