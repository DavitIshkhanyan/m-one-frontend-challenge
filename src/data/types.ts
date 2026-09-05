/**
 * A user, flattened.
 *
 * The API nests city under `address` and the company name under `company`.
 * Nothing in this screen needs that nesting — the city is a filter key and
 * the company is one line of the detail view — so the parser flattens it
 * once, at the boundary, rather than making every consumer reach through
 * two optional objects.
 */
export type User = {
  readonly id: number;
  readonly name: string;
  readonly username: string;
  readonly email: string;
  readonly phone: string;
  readonly website: string;
  readonly street: string;
  readonly suite: string;
  readonly city: string;
  readonly zipcode: string;
  readonly company: string;
};
