# User management screen

**Applying for: Middle+ / Senior Frontend Engineer**

A single screen over `GET https://jsonplaceholder.typicode.com/users`: users listed,
searchable by name or email, sortable by name, filterable by city, with a detail
view and an editable name that survives a reload.

---

## Running it

Built on Node 24 (needs 20.19+).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 97 tests
npm run typecheck  # tsc, strict
npm run build
```

### Seeing the things the API cannot show you

The endpoint returns ten users instantly and never fails, so the loading, error and
large-list behaviour cannot be observed against it. **Open “Simulate conditions” in
the header** to set network speed, reliability and dataset size. The settings live in
the URL, so a broken state is a link:

| Try | URL |
| --- | --- |
| Slow network, so the race guard is visible | `/?sim.latency=2500` |
| Always fails | `/?sim.fail=1` |
| Fails about half the time | `/?sim.fail=0.4` |
| 10,000 rows | `/?sim.rows=10000` |
| All three at once | `/?sim.latency=2500&sim.fail=0.4&sim.rows=10000` |

With latency turned up, type quickly in the search field: several requests are in
flight, they resolve out of order, and the list only ever shows the newest.

---

## Gaps and contradictions in the brief

The brief says it contains gaps and contradictions, does not say how many, and asks
for them to be named rather than quietly worked around. Here is what I found, with
what I did about each.

### 1. The API cannot exhibit the conditions the app must handle

> “It returns ten users instantly and never fails.”
> “The interface needs to hold up when the network is slow, when a request fails.”

Both are requirements, and the first makes the second unobservable. Slow and failing
states cannot be reached against this endpoint — they can only be manufactured.

**Resolution:** a simulator, in the interface rather than hidden behind a build flag,
labelled and explained, with its state in the URL. Putting it on screen is more
honest than a console incantation buried in a README, and it means the reviewer sees
the same thing I did.

### 2. “Far more rows than ten” against an endpoint that returns exactly ten

Same shape. The requirement cannot be demonstrated on real data, so the fixture is
amplified synthetically. The ten real users are kept first and unchanged, so ids 1–10
still resolve and links from an unsimulated session keep working.

### 3. The stale-response requirement presupposes an architecture ten rows do not justify

> “Typing quickly must not let a stale response overwrite a newer one.”

This only has meaning if each keystroke issues a request. For a ten-row payload the
correct engineering answer is to fetch once and filter in memory — which makes the
race structurally impossible and leaves the requirement undemonstrated. **Satisfying
the requirement means deliberately choosing the worse architecture.**

**Resolution:** the query is a request input, so the race is real and guarded. I think
this is what the brief is asking for, and I think it is the wrong call on the merits
at this data size. Both halves of that sentence are in the code comments too.

### 4. The local-vs-server question is more constrained than it looks

The brief presents this as an open choice. But it separately requires that an edit
*“survives a reload”* and that *“nothing a user has done should disappear because
they reloaded the page.”* A server-wins policy violates both. The space of legal
answers is narrower than the question implies — see [Server data vs local
edits](#server-data-vs-local-edits).

### 5. “Nothing a user has done” is broader than editing

Read literally it covers the search query, the sort direction, the city filter and
which user was open — not just name edits. Reading it as “edits only” is a convenient
narrowing.

**Resolution:** the literal reading. All view state lives in the URL, so all of it
survives a reload, from one mechanism.

### 6. The back button requires routing; routing is out of scope

> “The back button should do what a user expects.”
> “Not in scope: routing to anything other than what this screen needs.”

Any correct back behaviour needs history entries, which is routing.

**Resolution:** I read the fence as “do not add a second page, and do not add a router
dependency to reach it” — not “do not touch history”, under which the back-button
requirement would be unsatisfiable. So: the History API directly, one screen, no path
segments, no dependency, under 80 lines.

### 7. Design decisions are graded, but a design system is out of scope

Producing consistent spacing, colour, type and state styling *is* a small design
system. **Resolution:** one token file, no component abstraction layer on top of it,
nothing built for reuse beyond this screen.

### 8. “Behaves like a shipped app” versus “tests optional”

No shipped app with a stale-response guard and a persistence merge ships untested.
**Resolution:** tests for the things that would page someone, an explicit list of what
is deliberately untested, and no test that renders a component and asserts nothing.

### 9. On the real data, the city filter is not a filter

Not a contradiction in the brief so much as a property of the fixture worth naming:
**all ten users live in ten different cities**, so every selection matches exactly one
row. The control cannot be seen behaving like a filter until the dataset is larger,
which is one more reason the simulator exists — amplified rows cycle the real cities
so the filter has actual groups to work on.

---

## Decisions

### Server data vs local edits

**Local edits win, per field, with the server value tracked and a one-click revert.**

Each edit stores the name the user typed *and* the server value it was made against:

```ts
{ name: 'Ada Lovelace', baseName: 'Clementine Bauch', editedAt: 1725… }
```

- **Local wins**, because the brief requires the edit to survive a reload and requires
  that nothing the user has done disappears. Between a value somebody deliberately
  typed and one that arrived over the wire, the typed one is the more recent and more
  explicit statement of intent. Silently discarding it is the worst failure available.
- **Per field, not per record.** Pinning the whole record would freeze it: a
  server-side change to email, city or company would never reach a user just because
  someone once corrected their name. Only the edited field is overridden.
- **`baseName` is what makes it honest.** It lets the app tell “there is an edit here”
  apart from “the server has changed since this edit was made”. In the second case the
  local value still wins — but the panel says so, instead of masking the change.
- **Always reversible.** Every edited row is marked, the panel shows what the server
  still says, and “Revert to server value” restores it.

**The cost, stated rather than hidden:** against a real multi-user backend this lets
one client's stale edit hide another client's newer change indefinitely. The correct
answer there is server-authoritative with conflict resolution at write time — which
needs a write path this brief puts out of scope.

### Stale responses

Two guards, one choke point (`src/data/useUsersQuery.ts`):

- **`AbortController`** cancels the in-flight request when the query changes.
- **A generation counter** drops any response that is not the newest, which catches
  what abort cannot: a response already past the abort boundary — resolved, buffered,
  or sitting in a microtask. **Abort alone is not sufficient**, and treating it as
  sufficient is the bug this requirement is looking for.

There is a test for each, and they fail independently: deleting the generation check
fails exactly one test while the other three keep passing.

**Third rule: cancellation is not failure.** An aborted request returns silently.
Rendering it as an error puts a spurious “something went wrong” on screen every time
somebody types quickly.

**One disclosure.** jsonplaceholder has no search parameter, so the request cannot
actually narrow server-side. The concurrency, the abort and the guard are real and
would be unchanged against a real search endpoint; what the fixture cannot provide is
server-side *matching*. Matching therefore runs on the client — which it would have to
anyway, because the server's index has never heard of a name typed on this device, so
a locally renamed user could not otherwise be found by their new name.

### Back button and reload persistence

The URL is the single source of truth for view state — `q`, `city`, `dir`, `user`. It
is never mirrored into React state. Reload persistence, deep links and back/forward
all fall out of that one mechanism instead of three that can disagree.

| Change | History | Why |
| --- | --- | --- |
| search query | `replaceState` | Back must not step backwards through typing |
| city filter | `replaceState` | Same family — continuous refinement |
| sort direction | `replaceState` | Same |
| open detail | `pushState` | **Back closes the detail** |

Closing the panel prefers `history.back()` so the forward entry is consumed rather
than orphaned — but only when this app pushed it. Someone arriving on a `?user=3` deep
link has nothing to go back to, and calling `back()` would eject them from the app, so
that case rewrites the URL instead.

**This is a product decision with a defensible alternative:** pushing on filter changes
so Back rewinds refinements one at a time. I chose against it because Back's primary
job is leaving the page, and burying that under a stack of filter tweaks makes the
button useless for it.

### Persistence

`localStorage`, key `mone.userEdits.v1`, **edits only** — never the user list, which
would go stale and defeat the point of fetching. Chosen over `sessionStorage` because
someone who reopens the app in a new tab has not “done nothing”.

Everything goes through one module where no function throws. Storage fails in more
ways than people plan for — Safari private browsing, exhausted quota, cookies disabled
by policy, third-party iframes — and none of them are a reason to show a blank page.
When storage is unavailable the app falls back to memory and **the panel tells the
user the change will not outlive the reload** rather than pretending it was saved.

Corrupt data is discarded and the app starts clean; individual malformed entries are
dropped while the rest of the user's work survives. The version suffix means a future
shape gets its own key and is never at risk from that cleanup. Cross-tab changes
arrive through the `storage` event.

### Search, sort and filter rules

The brief says “searchable by name or email” and stops. These are decisions:

- Substring, not prefix — “ham” finds “Graham”.
- Every token must match, in any order — “graham leanne” and “leanne graham” both find
  Leanne Graham.
- Name and email are one haystack, so “leanne april” matches a Leanne at `april.biz`.
- Case- and diacritic-insensitive — “Jose” finds “José”, for keyboards without dead keys.
- `username` is **not** searched. The brief says name or email, and matching on a field
  the list does not display produces results that look like bugs.
- Search and the city filter combine with **AND**.

Sorting uses `Intl.Collator` at the user's own locale — collation order is a system
setting, and hard-coding `en` would take it from people whose alphabet disagrees. Ties
break on id, because the input order arrives off the network and is not guaranteed, so
without a tiebreaker two users sharing a name could swap places between renders.

### Stack

| Choice | Why |
| --- | --- |
| React 19 + TypeScript strict + Vite | Asked for. Strict, plus `noUncheckedIndexedAccess` — the virtualizer indexes arrays by computed offset, so out-of-range reads are a live risk here. |
| **CSS Modules + custom-property tokens** | No component library. This screen's grading is about focus rings, contrast, forced-colors and reduced-motion behaviour, and hand-rolling those makes them my decisions rather than inherited defaults. One token file; “a design system” is out of scope. |
| **No router** | `useUrlState` is 78 lines over the History API, gives exactly the behaviour required, adds no dependency, and cannot grow a second page by accident. |
| **No state library** | Two stores, both `useSyncExternalStore` over a module snapshot. Everything else is `useMemo`. Redux or Zustand here would be ceremony. |
| **No virtualization library** | Fixed-height rows reduce windowing to arithmetic. Owning ~70 lines keeps the technique the requirement is asking about visible instead of hidden in a dependency. |
| **Native `<dialog>`** | `showModal()` gives the focus trap, Escape, inertness, top-layer stacking and focus restoration in one call. A library for that is a dependency for something the platform ships. |
| **Native `<select>`** | Keyboard navigation, typeahead, screen-reader semantics and the platform's own mobile picker, free and correct. |

Runtime dependencies are `react` and `react-dom`. Everything else is dev tooling.

---

## What I checked, on what, and how

Not “tested on mobile”. This is what was actually exercised.

### Widths and zoom

Driven through Chrome DevTools Protocol with real device-metric emulation, asserting
`document.scrollWidth === clientWidth` and that no element extends past the viewport:

| Width | Result |
| --- | --- |
| 320px | No horizontal overflow, no clipped content |
| 390px | No horizontal overflow |
| 768px | Layout switches to two-column rows |
| 1440px | Detail opens as a side panel rather than a sheet |

WCAG 1.4.10 defines reflow as 320 CSS pixels of width, which is what 400% zoom on a
1280px display produces — so the 320px row above **is** the 400% zoom case, and it
passes with a 1,000-row list loaded. Layout is `rem` throughout, so zoom scales the
whole interface rather than parts of it.

### Input methods

- **Keyboard only.** Full pass with the mouse unplugged: reach search, city, sort, open
  a row with Enter, edit, save, cancel, close. Focus returns to the originating row —
  tested, not assumed.
- **Touch.** Every target at least 44px, including the clear-search button, whose glyph
  is smaller than its hit area. Detail is a bottom sheet within thumb reach on phones.
- **Mouse.** Hover and active states on rows; `:focus-visible` so pointer users do not
  get a ring on click while keyboard users always do.
- **Screen reader.** VoiceOver on macOS (Safari and Chrome): list semantics, row
  accessible names including edited state, the polite result count, the dialog's
  accessible name, and the `aria-setsize` / `aria-posinset` values that keep a windowed
  list from announcing “item 3 of 21” inside ten thousand rows.

### System settings

Verified by emulating each in a browser and reading back computed styles.

| Setting | Behaviour |
| --- | --- |
| `prefers-color-scheme` | Both schemes. Tokens defined on bare `:root`, only *overridden* in the media query — a colour whose sole definition sits inside `dark` is undefined in light mode. |
| `prefers-reduced-motion` | Dialog animation 0.2s → effectively zero; skeleton shimmer becomes a static placeholder. |
| `prefers-contrast: more` | Muted and subtle text collapse to full strength, borders harden, shadows drop, focus ring thickens. |
| `forced-colors` (Windows High Contrast) | Colours handed back to the system, shadows removed, focus ring uses the `Highlight` keyword. |
| **OS / browser text size** | Row height is expressed in `rem` and resolved at runtime, so rows grow with the user's text size. Verified at 100/200/250/300%: rows 72 → 144 → 180 → 216px, nothing clipped, windowing still exact. |

**Contrast is measured, not asserted.** Ratios are computed from the browser's own
computed styles. This caught a real failure: `--fg-subtle` shipped with a comment
claiming 4.6:1 when it was actually 4.12:1 on white and 3.84:1 on the sunken
background — below AA, on placeholder text and field labels. It is now 4.95:1 and
4.61:1. Every text token in both schemes passes AA.

---

## Tests

97 tests, Vitest + Testing Library. They assert behaviour through the UI. No
snapshots, no shallow rendering, nothing that renders a component and asserts nothing.

The ones that earn their place:

- A slow earlier response never overwrites a fast later one.
- A stale response that resolved **past the abort boundary** is dropped — the case
  abort cannot cover. Deleting the generation check fails this test and only this test.
- An aborted request never surfaces as an error.
- A failed refetch keeps the last good list on screen; retry recovers.
- A parse failure offers no retry button, because retrying cannot fix it.
- An edit survives a remount with storage intact.
- Server changes reach every field except the edited one; revert restores the original.
- Corrupt `localStorage` does not crash the app; malformed entries are dropped
  individually.
- Search matches name and email and combines with city as AND; a locally renamed user
  is findable by their new name.
- Sort is locale-aware, stable, and does not mutate its input.
- Deep links render; Back closes the detail; typing does not stack history entries.
- Escape returns focus to the row that opened the panel; Escape while editing cancels
  the edit *without* closing the panel.
- 10,000 rows produce fewer than 60 DOM rows, with honest `aria-setsize`.

**Deliberately not tested:** visual output and CSS; the exact windowing indices (the
*behaviour* is asserted instead); media-query behaviour, which jsdom does not
meaningfully implement and which was verified in a browser instead; and the focus trap
and background inertness of `<dialog>` — the jsdom shim implements open/close state,
the `close` and `cancel` events and focus restoration, and **deliberately does not fake
the trap**, because a shim that pretended to would let a test pass while the real modal
leaked focus.

Two bugs were found by running the app rather than by testing it, which is itself part
of the answer to how this was verified:

1. **The detail panel never opened in development.** StrictMode mounts, unmounts and
   remounts; the teardown closed the dialog, that `close` event was read as a user
   dismissal, and the selection was wiped from the URL. All seven detail tests passed
   against a screen that was blank in the browser, because Testing Library does not
   render inside StrictMode. There is now a test that does.
2. **The contrast failure above**, which no amount of looking at it would have caught.

---

## What is still wrong with this

Ordered roughly by how much they would bother me in review.

1. **Every keystroke issues a network request.** At ten rows this is worse engineering
   than filtering in memory, and I did it because the brief's stale-response
   requirement is otherwise unobservable. I believe it is what was asked for. I do not
   believe it is what I would ship.
2. **Tab order only reaches rendered rows.** In a windowed list, tabbing stops at the
   end of the current window instead of scrolling on. It does not affect the real
   ten-row dataset, where every row is rendered, but it is a genuine hole in the
   keyboard story at scale. The fix is a roving-tabindex composite widget, which is a
   larger rewrite of the list than I wanted to make here.
3. **Two tabs editing the same user still lose a write.** Cross-tab sync only fires on
   write, so a form already open in the second tab never learns its base value moved,
   and saving overwrites. Last-writer-wins with no warning.
4. **A saved rename can move the row out of view.** The list re-sorts immediately, so
   on a long list the row you just edited can jump somewhere off screen with nothing
   indicating where it went.
5. **`applyEdits` re-maps the whole dataset on every edit.** A single save at 10,000
   rows rebuilds 10,000 objects. Fast enough to be invisible when measured, and still
   O(n) where it could be O(1).
6. **Changing dataset size with a panel open can strand it.** Going from 10,000 rows to
   1,000 with `?user=5000` open produces the “could not find that user” panel. Correct,
   but abrupt.
7. **No offline detection.** `navigator.onLine` is never consulted, so a user with no
   connection gets the generic network error rather than being told they are offline.
8. **The result count can announce several times during fast typing.** It is a polite
   live region so announcements queue rather than interrupt, but it is chattier than it
   should be. A short settle delay would fix it.
9. **IME composition is untested.** The search input is controlled through a URL
   round-trip, and I have not verified that composing Japanese or Chinese text behaves.
   I would not ship this to a market that needs it without checking.
10. **Failure injection is random**, so “fails sometimes” is not reproducible between
    runs. A seeded sequence would make bug reports repeatable.
11. **The simulator ships in the production bundle.** It is a few kilobytes and it is
    deliberate — it is how the requirements are demonstrated — but in a real product it
    would sit behind a flag or a dev-only entry point.

---

## What I would need before building this for real

- **What does search actually mean here?** Does it include username, phone, company?
  Should it be server-side, and if so what does the endpoint accept — substring,
  fuzzy, ranked? The answer changes the architecture, and the current design is a
  guess dressed up as a decision.
- **Is the city filter single or multi-select?** And where do the options come from
  once the dataset is bigger than one page — a facets endpoint, or a fixed list?
- **What should Back actually do?** I chose “Back closes the detail, nothing else”.
  Whether users expect it to rewind filters is an empirical question I would answer
  with session recordings, not taste.
- **What is the write path?** The whole merge policy is only correct in the absence of
  one. With real writes the answer becomes server-authoritative with conflict
  resolution, and almost everything in that section changes.
- **Which conformance level, and audited by whom?** I targeted WCAG 2.1 AA. If this
  needs to survive a procurement audit, the list of what to fix is different and
  longer.
- **How large is “far more rows than ten”, really?** A few thousand is a windowed list.
  A few million is server-side pagination and a different screen.
- **Who else edits these users, and how do they find out about each other?** The
  cross-tab bug above is the single-user shadow of a much larger multi-user question.
- **Is one editable field the requirement, or the example?** Editing name only was the
  literal reading. If every field is eventually editable, the storage shape and the
  merge function should be generalised now rather than later.
