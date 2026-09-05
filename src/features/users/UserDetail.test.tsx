import { StrictMode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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

const rowFor = (name: string) => screen.getByRole('button', { name: `${name}, view details` });

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('user detail', () => {
  it('opens from a row and records the selection in the URL', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    await user.click(rowFor('Ervin Howell'));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Ervin Howell' })).toBeInTheDocument();
    expect(within(dialog).getByText('Shanna@melissa.tv')).toBeInTheDocument();
    expect(window.location.search).toBe('?user=2');
  });

  it('closes on Escape and returns focus to the row that opened it', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    const trigger = rowFor('Ervin Howell');
    await user.click(trigger);
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.location.search).toBe('');
    // A keyboard user must land back where they were, not at the top of the page.
    expect(document.activeElement).toBe(trigger);
  });

  it('is opened by keyboard alone', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    rowFor('Leanne Graham').focus();
    await user.keyboard('{Enter}');

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Leanne Graham' })).toBeInTheDocument();
  });

  it('closes when the browser back button is pressed', async () => {
    stubUsers(LEANNE, ERVIN);
    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    await user.click(rowFor('Ervin Howell'));
    await screen.findByRole('dialog');

    window.history.back();

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.location.search).toBe('');
    // The list is still there, with its state intact.
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
  });

  it('opens from a deep link even when the current filter excludes that user', async () => {
    window.history.replaceState(null, '', '/?q=leanne&user=2');
    stubUsers(LEANNE, ERVIN);
    render(<UsersScreen />);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Ervin Howell' })).toBeInTheDocument();
    // Ervin is open, but the list behind it still honours the search.
    expect(screen.queryByRole('button', { name: 'Ervin Howell, view details' })).not.toBeInTheDocument();
  });

  it('stays open under StrictMode, whose double-invoked effects closed it', async () => {
    window.history.replaceState(null, '', '/?user=2');
    stubUsers(LEANNE, ERVIN);

    // The app mounts inside StrictMode, so the tests must too. Without this
    // wrapper the panel passed every test and never opened in the browser.
    render(<UsersScreen />, { wrapper: StrictMode });

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Ervin Howell' })).toBeInTheDocument();
    expect(window.location.search).toBe('?user=2');
  });

  it('explains an unknown user id instead of silently ignoring it', async () => {
    window.history.replaceState(null, '', '/?user=999');
    stubUsers(LEANNE, ERVIN);
    render(<UsersScreen />);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: /could not find that user/i })).toBeInTheDocument();
  });

  it('does not claim a user is missing while the list is still loading', async () => {
    window.history.replaceState(null, '', '/?user=2');
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        await gate;
        return jsonResponse([LEANNE, ERVIN]);
      }),
    );

    render(<UsersScreen />);
    expect(screen.queryByText(/could not find that user/i)).not.toBeInTheDocument();

    release?.();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Ervin Howell' })).toBeInTheDocument();
  });
});
