# Working brief — m-one-frontend-challenge

This is the brief I work from on this repo. It is written for whoever picks
the code up next, human or agent. It assumes you can read React and
TypeScript; it does not explain those. It explains what is specific and
non-obvious *here*, and what will break if you ignore it.

---

## What this is

One screen. A list of users from `GET https://jsonplaceholder.typicode.com/users`
— searchable by name or email, sortable by name, filterable by city, with a
detail view and an editable name that survives a reload.

It is deliberately small. The brief it answers says, in as many words, that a
small thing done well beats a large thing done badly. Resist the urge to
generalise anything here into a framework.

## Out of scope — do not add these

- **A backend, or any real write path.** Edits are local-only, on purpose.
- **Authentication.**
- **Persistence beyond browser storage.** No IndexedDB, no service worker.
- **Routing beyond this one screen.** No router dependency, no path segments,
  no second page. View state goes in the query string, and that is the whole
  of the routing story. See invariant 1.
- **A design system.** There is one token file. Do not build a component
  library on top of it, do not add variants "for later".
- **Dependencies.** Runtime deps are `react` and `react-dom`. That is not an
  accident and it is not a starting point. If you think you need another one,
  say so and why before adding it.

## Commands

```bash
npm install
npm run dev         # vite dev server
npm test            # vitest, single run
npm run test:watch  # vitest, watch mode
npm run typecheck   # tsc --noEmit, strict
npm run build       # typecheck + production build
```

Run a single test file: `npx vitest run src/data/useUsersQuery.test.tsx`
Run one test by name: `npx vitest run -t "stale response"`

Before any commit: `npm run typecheck && npm test` must both pass.

---

## The four invariants

These are the load-bearing rules. Breaking one does not produce a type error;
it produces a bug that looks like something else.

### 1. The URL is the only source of truth for view state

`q`, `city`, `sort`, `dir` and `user` live in `URLSearchParams`, read and
written through `src/url/useUrlState.ts`. **Never mirror them into React
state**, not even "temporarily for the input".

Why: three separate requirements — state surviving reload, the back button
behaving, and deep links working — collapse into one mechanism this way. Mirror
the value into `useState` and all three break at once, subtly, and the tests
that catch it are the URL ones.

History semantics are a product decision, not an implementation detail:

| Change            | Method         | Reason                                       |
|-------------------|----------------|----------------------------------------------|
| search query      | `replaceState` | Back must not step backwards through typing  |
| city filter       | `replaceState` | Same family — continuous refinement          |
| sort / direction  | `replaceState` | Same                                         |
| open detail       | `pushState`    | Back closes the detail. This is the point.   |
| close detail      | `history.back()` | Keeps the stack clean, no orphan forward entry |

### 2. No fetch result reaches state without the generation check

There is exactly one place a response is allowed to become state:
`src/data/useUsersQuery.ts`. It holds a monotonic generation counter and an
`AbortController`. A resolved response whose generation is not the latest is
**dropped silently**.

Do not add a second fetch path. Do not call `fetch` from a component. If you
need a new query, extend the hook.

**`AbortController` alone is not sufficient.** A response can already be past
the abort boundary when the abort fires, and the simulated-latency path
resolves from a timer that abort does not unwind. Both guards are needed. This
is the single behaviour the whole app is built around; there is a test named
for it.

**An aborted request is not an error.** Rendering one as an error is the
second-most-common bug in this pattern. Check `signal.aborted` before touching
error state.

### 3. Server data and local edits meet in exactly one function

`src/edits/merge.ts` → `applyEdits(users, edits)`. Pure, synchronous, tested.

**Never merge in a component.** Never read the edits store and the users store
side by side in a render and reconcile them inline. Every consumer takes the
already-merged result.

The policy is: **local edits win, per field.** An edited `name` overrides the
server's; every other field always comes from the server. Each edit records
the `baseName` it was made against, so if the server value later diverges from
that base we can tell the user their edit is now masking a server change,
rather than silently pretending it isn't.

### 4. `localStorage` is only touched through `src/lib/storage.ts`

That module is versioned, validating, and total — it never throws. Storage
being unavailable (Safari private mode, quota exceeded, cookies disabled) must
degrade the app, not break it.

If you change the stored shape, **bump the version in the key** and handle the
old one. Unknown version or unparseable JSON means discard and start clean.
There is a test that corrupts storage and asserts the app still renders.

Never store the fetched user list. Only edits. Caching the server payload
would go stale and defeat the point of fetching it.

---

## Traps

Real things that have bitten, or will.

- **`Intl.Collator` is constructed once at module scope** in
  `src/lib/collator.ts`. Constructing one inside a comparator is a measurable
  stall at 10,000 rows — it is the difference between a smooth sort and a
  visible freeze.
- **Rows are a fixed height and the virtualizer depends on it.** Changing row
  padding or font size without updating the row-height constant breaks
  scrolling silently — no error, just wrong offsets.
- **The `storage` event fires in *other* tabs, never the one that wrote.** If
  you are debugging why a change didn't propagate, that is usually why.
- **`<dialog>.showModal()` already provides the focus trap, `Escape` handling
  and inert background.** Do not add a second focus trap on top; two traps
  fight each other and focus escapes.
- **The network simulator is product surface, not dead code.** It is the only
  way to demonstrate slow, failing and large-dataset behaviour, because the
  real endpoint returns ten rows instantly and never fails. Do not delete it
  as test scaffolding.
- **CSS tokens are defined on bare `:root` and only *overridden* inside media
  queries.** Give a colour its only definition inside `@media
  (prefers-color-scheme: dark)` and it is undefined in light mode.

---

## Conventions

- Named exports. No default exports.
- Tests colocated: `foo.ts` → `foo.test.ts`.
- No `any`. No `!` non-null assertions. No `as` used to silence the checker —
  if a type is wrong, fix the type.
- Pure logic lives in `src/data/`, `src/edits/` and `src/lib/`. Components
  render; they do not reconcile, parse, or fetch.
- CSS Modules, one per component. Colours, spacing and radii come from tokens
  — never a raw hex value in a component stylesheet.
- Tests assert observable behaviour through the UI. No snapshots, no shallow
  rendering, no test that renders a component and asserts nothing.

## Verifying a change

Map the area you touched to the test that covers it:

| Touched                          | Run                                    |
|----------------------------------|----------------------------------------|
| fetch layer, race guard          | `src/data/useUsersQuery.test.tsx`      |
| merge policy, revert             | `src/edits/merge.test.ts`              |
| storage, corruption, cross-tab   | `src/lib/storage.test.ts`              |
| URL state, back button           | `src/url/useUrlState.test.tsx`         |
| search / sort / filter behaviour | `src/features/users/*.test.tsx`        |

Then `npm run typecheck && npm test` for the whole thing.
