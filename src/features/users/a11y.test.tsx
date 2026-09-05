import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEditsCache } from '../../edits/editsStore';
import { resetStorageProbe } from '../../lib/storage';
import { jsonResponse, rawUser } from '../../test/fixtures';
import { UsersScreen } from './UsersScreen';

const LEANNE = rawUser({ id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz', city: 'Gwenborough' });
const ERVIN = rawUser({ id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv', city: 'Wisokyburgh' });

function stubUsers(...users: unknown[]) {
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(users)));
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
  resetStorageProbe();
  resetEditsCache();
});

describe('keyboard and assistive technology', () => {
  it('jumps to search when slash is pressed', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    document.body.focus();
    await user.keyboard('/');

    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: /search users/i }));
  });

  it('does not hijack slash while the user is typing it into a field', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    const search = screen.getByRole('searchbox', { name: /search users/i });
    await user.click(search);
    await user.keyboard('a/b');

    // The slash has to reach the field; someone searching for "and/or" would
    // otherwise never be able to type it.
    expect(search).toHaveValue('a/b');
  });

  it('does not steal focus out of the open detail dialog', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    await user.click(screen.getByRole('button', { name: 'Ervin Howell, view details' }));
    const dialog = await screen.findByRole('dialog');

    await user.keyboard('/');

    expect(dialog).toBeInTheDocument();
    expect(document.activeElement).not.toBe(screen.getByRole('searchbox', { name: /search users/i }));
  });

  it('gives the dialog an accessible name that survives entering edit mode', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    await user.click(screen.getByRole('button', { name: 'Ervin Howell, view details' }));
    expect(await screen.findByRole('dialog', { name: /ervin howell/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit name/i }));

    // The heading is replaced by the form here; the dialog must stay named.
    expect(screen.getByRole('dialog', { name: /ervin howell/i })).toBeInTheDocument();
  });

  it('reports loading state to assistive technology', async () => {
    stubUsers(LEANNE, ERVIN);
    render(<UsersScreen />);

    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    await waitFor(() =>
      expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false'),
    );
  });

  it('announces the result count politely rather than assertively', async () => {
    stubUsers(LEANNE, ERVIN);
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    const status = screen.getByRole('status');
    // Assertive would interrupt the screen reader mid-character while typing.
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('2 users');
  });
});
