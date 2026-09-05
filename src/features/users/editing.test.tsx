import { render, screen, waitFor, within } from '@testing-library/react';
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

const rowFor = (label: string) => screen.getByRole('button', { name: label });

async function openAndRename(user: ReturnType<typeof userEvent.setup>, from: string, to: string) {
  await user.click(rowFor(`${from}, view details`));
  await screen.findByRole('dialog');
  await user.click(screen.getByRole('button', { name: /edit name/i }));

  const input = screen.getByLabelText('Name');
  await user.clear(input);
  await user.type(input, to);
  await user.click(screen.getByRole('button', { name: 'Save' }));
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
  resetStorageProbe();
  resetEditsCache();
});

describe('editing a name', () => {
  it('updates the list and marks the row as edited', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    await openAndRename(user, 'Leanne Graham', 'Ada Lovelace');

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    // The row's accessible name carries the edited state, so it is announced
    // rather than only shown as a coloured pill.
    expect(rowFor('Ada Lovelace, edited, view details')).toBeInTheDocument();
    expect(screen.queryByText('Leanne Graham')).not.toBeInTheDocument();
  });

  it('survives a reload', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    const { unmount } = render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    await openAndRename(user, 'Leanne Graham', 'Ada Lovelace');

    // A reload: everything in memory goes, localStorage stays.
    unmount();
    resetEditsCache();
    window.history.replaceState(null, '', '/');
    render(<UsersScreen />);

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByText('Leanne Graham')).not.toBeInTheDocument();
  });

  it('keeps the server value visible and restores it on revert', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    await openAndRename(user, 'Leanne Graham', 'Ada Lovelace');

    const dialog = screen.getByRole('dialog');
    // The user can always see what they are overriding.
    expect(within(dialog).getByText(/the server still has/i)).toHaveTextContent('Leanne Graham');

    await user.click(within(dialog).getByRole('button', { name: /revert to server value/i }));

    await waitFor(() =>
      expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'Leanne Graham' })).toBeInTheDocument(),
    );
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
  });

  it('finds a user by the name they were given locally', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    await openAndRename(user, 'Leanne Graham', 'Ada Lovelace');
    await user.click(screen.getByRole('button', { name: /close details/i }));

    // The server's index has never heard of "Ada", so matching has to happen
    // after local edits are merged in or this search returns nothing.
    await user.type(screen.getByRole('searchbox', { name: /search users/i }), 'ada');

    await waitFor(() => expect(screen.queryByText('Ervin Howell')).not.toBeInTheDocument());
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('leaves every other field coming from the server', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    await openAndRename(user, 'Leanne Graham', 'Ada Lovelace');

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Sincere@april.biz')).toBeInTheDocument();
    expect(within(dialog).getByText(/Gwenborough/)).toBeInTheDocument();
  });

  it('refuses an empty name instead of saving a nameless row', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    await user.click(rowFor('Leanne Graham, view details'));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /edit name/i }));

    const input = screen.getByLabelText('Name');
    await user.clear(input);
    await user.type(input, '   ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/enter a name/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // Still editing, and the list is untouched.
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
  });

  it('trims surrounding whitespace rather than rejecting it', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    await openAndRename(user, 'Leanne Graham', '   Ada Lovelace   ');

    expect(
      within(screen.getByRole('dialog')).getByRole('heading', { name: 'Ada Lovelace' }),
    ).toBeInTheDocument();
  });

  it('lets Escape cancel the edit without also closing the panel', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    await user.click(rowFor('Leanne Graham, view details'));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /edit name/i }));
    await user.type(screen.getByLabelText('Name'), 'something');

    await user.keyboard('{Escape}');

    // One keypress must not discard both the typing and the panel.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog')).getByRole('heading', { name: 'Leanne Graham' }),
    ).toBeInTheDocument();

    // And a second Escape, with no edit in progress, does close it.
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
