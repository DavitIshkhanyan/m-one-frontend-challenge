# Working brief — m-one-frontend-challenge

This is the brief I worked from, updated at the end of the build with the
traps that actually turned up. It is written for whoever picks this up next,
human or agent. It assumes you can read React and TypeScript; it does not
explain those. It explains what is specific and non-obvious *here*, and what
will break if you ignore it.

---

## What this is

One screen. Users from `GET https://jsonplaceholder.typicode.com/users` —
searchable by name or email, sortable by name, filterable by city, with a
detail view and an editable name that survives a reload.

It is deliberately small. Resist generalising anything here into a framework.

## Out of scope — do not add these

- **A backend or any real write path.** Edits are local-only, on purpose.
- **Authentication.**
- **Persistence beyond browser storage.** No IndexedDB, no service worker.
- **Routing beyond this one screen.** No router, no path segments, no second
  page. View state goes in the query string and that is the whole routing
  story. See invariant 1.
- **A design system.** There is one token file. Do not build a component
  library on top of it or add variants "for later".
- **Dependencies.** Runtime deps are `react` and `react-dom`. That is not a
  starting point. If you think you need another, say so and why first.

## Commands

```bash
npm install
npm run dev         # vite, http://localhost:5173
npm test            # vitest, single run — 97 tests
npm run test:watch
npm run typecheck   # tsc --noEmit, strict
npm run build       # typecheck + production build
```

Single file: `npx vitest run src/data/useUsersQuery.test.tsx`
Single test: `npx vitest run -t "stale response"`

**Before any commit: `npm run typecheck && npm test` must both pass.**

## Seeing slow / failing / large states

The endpoint is fast, reliable and ten rows long, so those states are
simulated. Use the "Simulate conditions" panel in the header, or the URL:
`?sim.latency=2500`, `?sim.fail=1`, `?sim.rows=10000`.

---

## The four invariants

Load-bearing rules. Breaking one does not produce a type error; it produces a
bug that looks like something else.

### 1. The URL is the only source of truth for view state

`q`, `city`, `dir` and `user` live in `URLSearchParams`, read and written
through `src/url/useUrlState.ts` and `src/features/users/viewState.ts`.
**Never mirror them into React state**, not even "just for the input".

Reload persistence, deep links and the back button are all the same mechanism.
Mirror a value into `useState` and all three break at once, in ways that look
unrelated.

History semantics are a product decision, not an implementation detail:
`replaceState` for query, city and sort; `pushState` only for opening the
detail, so Back closes it.

### 2. No fetch result reaches state without the generation check

Exactly one place a response becomes state: `src/data/useUsersQuery.ts`. It
holds a monotonic generation counter and an `AbortController`. A resolved
response whose generation is not the latest is **dropped silently**.

Do not add a second fetch path. Do not call `fetch` from a component.

**`AbortController` alone is not sufficient.** A response can already be past
the abort boundary when abort fires, and the simulated-latency path resolves
from a timer abort cannot unwind. Both guards are needed, and each has its own
test — deleting the generation check fails exactly one of them.

**An aborted request is not an error.** Check `signal.aborted` before touching
error state, or every fast typist sees a spurious failure.

### 3. Server data and local edits meet in exactly one function

`src/edits/merge.ts` → `applyEdits(users, edits)`. Pure, synchronous, tested.
**Never merge in a component.**

Policy: **local edits win, per field.** An edited `name` overrides the
server's; every other field always comes from the server. Each edit records
the `baseName` it was made against, so the app can tell "there is an edit
here" from "the server changed since this edit was made".

### 4. `localStorage` is only touched through `src/lib/storage.ts`

Versioned, validating, and total — it never throws. Storage being unavailable
must degrade the app, not break it.

If you change the stored shape, **bump the version in the key**. Unknown
version or unparseable JSON means discard and start clean. There is a test
that corrupts storage and asserts the app still renders.

Never store the fetched user list. Only edits.

---

## The order things happen in

`UsersScreen` derives its view in a fixed order, and the order is load-bearing:

```
fetch (query-keyed, race-guarded)
  → applyEdits            merge local edits in
  → matchesUser           search, on the MERGED data
  → filterByCity
  → sortUsersByName
  → useVirtualRows        window to what fits
```

**Search runs after the merge, not in the data layer.** The endpoint's index
has never heard of a name typed on this device, so filtering server-side means
a locally renamed user cannot be found by their new name. If you move matching
back into the hook to "save a pass", you will reintroduce that.

---

## Traps

Real things that bit during this build.

- **`<dialog>`: listen for `cancel`, never `close`.** `close` fires for
  programmatic `close()` too, so it cannot tell a user dismissal from our own
  teardown. StrictMode mounts, unmounts and remounts; the teardown closed the
  dialog, that counted as a dismissal, the selection was wiped from the URL,
  and **the panel never opened in development at all** while every test passed.
  Guarding `close` with a ref does not work either — React dispatches the event
  after the second effect has already reset the flag.
- **Testing Library does not render inside StrictMode; the app does.** That is
  why the bug above survived seven passing tests. `UserDetail.test.tsx` now has
  one that renders with `{ wrapper: StrictMode }`. Keep it.
- **Run the app, not just the tests.** Two real bugs here were only ever
  visible in a browser: the one above, and a contrast token that shipped with a
  comment claiming 4.6:1 while measuring 4.12:1.
- **Contrast is measured, not eyeballed.** Compute ratios from the browser's
  own computed styles. A palette that looks fine and a palette that passes AA
  are different things.
- **`Intl.Collator` is constructed once at module scope** in
  `src/lib/collator.ts`. Building one inside a comparator builds it O(n log n)
  times — invisible at ten rows, a visible freeze at ten thousand.
- **Row height is in `rem`, resolved at runtime** (`features/users/layout.ts`).
  It is not a pixel constant, deliberately: a fixed one clipped row content at
  about 250% default text size. The resolved number is handed to the
  virtualizer *and* written onto the element as `--row-height` for the
  stylesheet, so the two cannot disagree. If you change row padding or font
  size, change `ROW_HEIGHT_REM` with it.
- **`useUrlState` reads `location.search` live and does not cache it.** A
  cached snapshot desynchronises the moment anything calls `history.*` without
  going through `navigate()` — which a test harness or a future contributor
  will do.
- **The `storage` event fires in *other* tabs, never the one that wrote.** If a
  change is not propagating, that is usually why.
- **CSS tokens are defined on bare `:root` and only *overridden* inside media
  queries.** A colour whose only definition lives inside
  `prefers-color-scheme: dark` is undefined in light mode, and nothing will
  tell you.
- **The simulator is product surface, not dead code.** It is the only way to
  demonstrate slow, failing and large-list behaviour. Do not delete it as test
  scaffolding.
- **The jsdom `<dialog>` shim (`src/test/dialogShim.ts`) is deliberately
  incomplete.** It implements open/close state, the `close` and `cancel`
  events, and focus restoration. It does **not** fake the focus trap or
  background inertness — a shim that pretended to would let a test pass while
  the real modal leaked focus. Do not "improve" it into lying.

---

## Conventions

- Named exports. No default exports.
- Tests colocated: `foo.ts` → `foo.test.ts`.
- No `any`. No `!` non-null assertions. No `as` to silence the checker — if a
  type is wrong, fix the type. Custom CSS properties type-check because
  `src/styles/css-vars.d.ts` augments csstype, not because of a cast.
- `strict`, plus `noUncheckedIndexedAccess` — the virtualizer indexes arrays by
  computed offset, so guard array reads rather than asserting them.
- Pure logic lives in `src/data/`, `src/edits/` and `src/lib/`. Components
  render; they do not reconcile, parse, or fetch.
- CSS Modules, one per component. Colour, spacing and radii come from tokens —
  never a raw hex value in a component stylesheet.
- Tests assert observable behaviour through the UI. No snapshots, no shallow
  rendering, no test that renders a component and asserts nothing.
- Interactive targets are at least 44px, even when the glyph inside is smaller.

---

## Verifying a change

| Touched | Run |
| --- | --- |
| fetch layer, race guard | `src/data/useUsersQuery.test.tsx` |
| payload parsing | `src/data/parseUsers.test.ts` |
| simulator (latency, failure, amplification) | `src/data/simulation.test.ts`, `src/features/users/simulation.test.ts` |
| merge policy, revert | `src/edits/merge.test.ts` |
| storage, corruption, cross-tab | `src/edits/editsStore.test.ts` |
| URL encoding, defaults | `src/features/users/viewState.test.ts` |
| sort, city options | `src/features/users/derive.test.ts` |
| search, filter, states | `src/features/users/UsersScreen.test.tsx` |
| detail, back button, focus restore | `src/features/users/UserDetail.test.tsx` |
| editing, persistence end to end | `src/features/users/editing.test.tsx` |
| windowing | `src/features/users/UserList.test.tsx` |
| keyboard, ARIA | `src/features/users/a11y.test.tsx` |
| error handling, retry | `src/features/users/recovery.test.tsx` |

Then `npm run typecheck && npm test`. For anything touching the dialog,
layout, or colour, **also open it in a browser** — see the traps above.

---

## Never do here

- Add a dependency without asking.
- Add routes, a router, or a second page.
- Add a backend, auth, or a real write path.
- Store the user list in `localStorage`.
- Loosen `tsconfig` strictness to make an error go away.
- Write a test that renders a component and asserts nothing.
- Commit without `npm run typecheck && npm test` passing.

---

## A worked example

*"Add a filter for company, alongside the city filter."*

1. `src/features/users/derive.ts` — add `companyOptions` and `filterByCompany`
   next to the city pair. Keep them generic over `T extends User` so the merged
   row type survives.
2. `src/features/users/derive.test.ts` — options come from the **whole**
   dataset, not the visible rows. Getting this wrong makes the options vanish
   as the user types, which is the classic bug in this control.
3. `src/features/users/viewState.ts` — add `company` to `PARAM`, to
   `ViewState`, to `decodeViewState` and to `encode`. Omit it from the URL when
   empty. Use `replaceState`, like the other filters.
4. `src/features/users/Toolbar.tsx` — another native `<select>`, with a
   visually-hidden `<label>`. Do not build a custom dropdown.
5. `src/features/users/UsersScreen.tsx` — add it to the derived pipeline in the
   order above, and include it in `isFiltered` so the no-results state and
   "Clear filters" keep working.
6. Tests in `UsersScreen.test.tsx`: combines with search as AND, survives a
   reload via the URL, and appears in "Clear filters".
7. `npm run typecheck && npm test`, then open it in a browser at 320px.
