import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEditsCache } from '../../edits/editsStore';
import { resetStorageProbe } from '../../lib/storage';
import { jsonResponse, rawUser } from '../../test/fixtures';
import { UsersScreen } from './UsersScreen';

const LEANNE = rawUser({ id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz' });
const ERVIN = rawUser({ id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv' });

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
  resetStorageProbe();
  resetEditsCache();
});

describe('failure recovery', () => {
  it('recovers when the user retries after a failed first load', async () => {
    let attempt = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        attempt += 1;
        return attempt === 1
          ? jsonResponse({ message: 'down' }, 500)
          : jsonResponse([LEANNE, ERVIN]);
      }),
    );

    const user = userEvent.setup();
    render(<UsersScreen />);

    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Leanne Graham')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('keeps the list readable when a later request fails', async () => {
    let attempt = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        attempt += 1;
        return attempt === 1
          ? jsonResponse([LEANNE, ERVIN])
          : jsonResponse({ message: 'down' }, 503);
      }),
    );

    const user = userEvent.setup();
    render(<UsersScreen />);
    await screen.findByText('Leanne Graham');

    await user.type(screen.getByRole('searchbox', { name: /search users/i }), 'lea');

    await screen.findByRole('alert');
    // The failure is reported above data the user can still read, rather than
    // replacing a populated page with an error.
    expect(screen.getByText('Leanne Graham')).toBeInTheDocument();
  });

  it('does not offer a retry for a response that cannot be parsed', async () => {
    // Retrying cannot fix malformed JSON, so offering the button wastes the
    // user's time and teaches them the button does nothing.
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ not: 'an array' })));

    render(<UsersScreen />);

    await screen.findByRole('alert');
    expect(screen.getByText(/sent something unreadable/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('distinguishes an unreachable server from one that answered with an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));

    render(<UsersScreen />);

    await screen.findByRole('alert');
    expect(screen.getByText(/could not reach the server/i)).toBeInTheDocument();
    // Reassurance that matters: a failed read has not lost their local edits.
    expect(screen.getByText(/nothing you have done here has been lost/i)).toBeInTheDocument();
  });
});
