import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { applyEdits } from '../../edits/merge';
import type { User } from '../../data/types';
import { UserList } from './UserList';

function makeUsers(count: number): User[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `User ${String(index + 1).padStart(5, '0')}`,
    username: `u${index}`,
    email: `user${index}@example.com`,
    phone: '',
    website: '',
    street: '',
    suite: '',
    city: 'Gwenborough',
    zipcode: '',
    company: 'Acme',
  }));
}

const merged = (count: number) => applyEdits(makeUsers(count), {});

describe('UserList windowing', () => {
  it('renders every row when the list is short', () => {
    render(<UserList users={merged(8)} onSelect={() => {}} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
  });

  it('renders a small window instead of ten thousand rows', () => {
    render(<UserList users={merged(10000)} onSelect={() => {}} />);

    const rendered = screen.getAllByRole('listitem');
    expect(rendered.length).toBeGreaterThan(0);
    // The whole point: DOM size is bounded by the viewport, not the dataset.
    expect(rendered.length).toBeLessThan(60);
  });

  it('tells assistive technology the real list size, not the window size', () => {
    render(<UserList users={merged(10000)} onSelect={() => {}} />);

    const first = screen.getAllByRole('listitem')[0];
    // Without this a screen reader says "item 1 of 20" inside a list of 10,000.
    expect(first).toHaveAttribute('aria-setsize', '10000');
    expect(first).toHaveAttribute('aria-posinset', '1');
  });

  it('reserves the full scroll height so the scrollbar is honest', () => {
    const { container } = render(<UserList users={merged(1000)} onSelect={() => {}} />);
    // viewport > canvas: the canvas carries the full height so the scrollbar
    // is proportional to the real list rather than to the rendered window.
    const canvas = container.firstElementChild?.firstElementChild;

    expect(canvas).toHaveStyle({ height: `${1000 * 72}px` });
  });
});
