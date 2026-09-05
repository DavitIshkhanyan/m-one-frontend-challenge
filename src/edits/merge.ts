import type { User } from '../data/types';
import type { EditMap } from './editsStore';

export type MergedUser = User & {
  /** True when a local edit is being shown instead of the server's value. */
  readonly isEdited: boolean;
  /** What the server currently says, so "revert" has something to revert to. */
  readonly serverName: string;
  /** The server's value changed after this edit was made. */
  readonly serverChangedSinceEdit: boolean;
};

/**
 * The single point where server data and local edits meet.
 *
 * Policy: local edits win, per field.
 *
 * Why local wins: the brief requires an edit to survive a reload and requires
 * that nothing a user has done disappears because they reloaded. A
 * server-wins policy breaks both. Between a value somebody deliberately typed
 * and a value that arrived over the wire, the typed one is the more recent
 * and more explicit statement of intent, and silently discarding it is the
 * worst failure available here.
 *
 * Why per field and not per record: pinning the whole record would freeze it.
 * A server-side change to email, city or company would never reach a user
 * just because someone once corrected their name. Only the edited field is
 * overridden; everything else stays live.
 *
 * Why baseName: it lets the app notice that the server's value changed after
 * the edit was made, and say so, instead of masking the change and pretending
 * nothing happened. The local value still wins - the user decides - but they
 * decide with the information in front of them.
 *
 * The honest cost, which the README states: against a real multi-user backend
 * this lets one client's stale edit hide another client's newer change
 * indefinitely. The correct answer there is server-authoritative with
 * conflict resolution at write time, which needs a write path this brief
 * explicitly puts out of scope.
 */
export function applyEdits(users: readonly User[], edits: EditMap): MergedUser[] {
  return users.map((user) => {
    const edit = edits[String(user.id)];

    if (edit === undefined) {
      return { ...user, isEdited: false, serverName: user.name, serverChangedSinceEdit: false };
    }

    return {
      ...user,
      name: edit.name,
      isEdited: true,
      serverName: user.name,
      serverChangedSinceEdit: user.name !== edit.baseName,
    };
  });
}
