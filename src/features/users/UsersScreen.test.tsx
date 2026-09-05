import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { jsonResponse, rawUser } from '../../test/fixtures';
import { UsersScreen } from './UsersScreen';

it('renders the list once data arrives', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      jsonResponse([
        rawUser({ id: 1, name: 'Leanne Graham', email: 'Sincere@april.biz', city: 'Gwenborough' }),
        rawUser({ id: 2, name: 'Ervin Howell', email: 'Shanna@melissa.tv', city: 'Wisokyburgh' }),
      ]),
    ),
  );

  render(<UsersScreen />);
  expect(screen.getByRole('heading', { name: 'Users', level: 1 })).toBeInTheDocument();

  await waitFor(() => expect(screen.getByText('Leanne Graham')).toBeInTheDocument());
  expect(screen.getByText('Wisokyburgh')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
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
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse([])));

  render(<UsersScreen />);
  await waitFor(() => expect(screen.getByText(/no users yet/i)).toBeInTheDocument());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
