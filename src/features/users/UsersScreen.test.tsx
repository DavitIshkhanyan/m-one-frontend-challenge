import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, rawUser } from '../../test/fixtures';
import { UsersScreen } from './UsersScreen';

const LEANNE = rawUser({
  id: 1,
  name: 'Leanne Graham',
  email: 'Sincere@april.biz',
  city: 'Gwenborough',
});
const ERVIN = rawUser({
  id: 2,
  name: 'Ervin Howell',
  email: 'Shanna@melissa.tv',
  city: 'Wisokyburgh',
});

function stubUsers(...users: unknown[]) {
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(users)));
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('UsersScreen', () => {
  it('renders the list once data arrives', async () => {
    stubUsers(LEANNE, ERVIN);
    render(<UsersScreen />);

    expect(screen.getByRole('heading', { name: 'Users', level: 1 })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());

    expect(screen.getByText('Wisokyburgh')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('2 users')).toBeInTheDocument();
  });

  it('shows a retryable error and no empty state when the first load fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'nope' }, 503)));
    render(<UsersScreen />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/server returned an error \(503\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText(/no users yet/i)).not.toBeInTheDocument();
  });

  it('distinguishes an empty directory from a failure', async () => {
    stubUsers();
    render(<UsersScreen />);

    await waitFor(() => expect(screen.getByText(/no users yet/i)).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('searches names and email addresses', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    // "melissa" appears only in Ervin's email address, never on screen.
    await user.type(screen.getByRole('searchbox', { name: /search users/i }), 'melissa');

    await waitFor(() => expect(screen.queryByText('Leanne Graham')).not.toBeInTheDocument());
    expect(screen.getByText('Ervin Howell')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 2 users')).toBeInTheDocument();
  });

  it('offers a clear action when filters match nothing, not the empty state', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    await user.type(screen.getByRole('searchbox', { name: /search users/i }), 'zzzz');

    expect(await screen.findByText(/no users match your filters/i)).toBeInTheDocument();
    expect(screen.getByText('Showing 0 of 2 users')).toBeInTheDocument();
    // The empty-directory state must not appear when the directory has users.
    expect(screen.queryByText(/no users yet/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(await screen.findByText('Leanne Graham')).toBeInTheDocument();
  });

  it('applies a query supplied in the URL on first load', async () => {
    window.history.replaceState(null, '', '/?q=ervin');
    stubUsers(LEANNE, ERVIN);
    render(<UsersScreen />);

    expect(await screen.findByText('Ervin Howell')).toBeInTheDocument();
    expect(screen.queryByText('Leanne Graham')).not.toBeInTheDocument();
  });

  it('writes the query to the URL without stacking history entries', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    const lengthBefore = window.history.length;
    await user.type(screen.getByRole('searchbox', { name: /search users/i }), 'ervin');

    await waitFor(() => expect(window.location.search).toBe('?q=ervin'));
    // Five keystrokes must not become five history entries.
    expect(window.history.length).toBe(lengthBefore);
  });
});
