M-One Frontend Challenge

React and TypeScript. Create a public GitHub repo and send us the link.

1. Build
GET https://jsonplaceholder.typicode.com/users
Build a user management screen: the users listed, searchable by name or email, sortable by name,
filterable by city, with a detail view for a single user and the ability to edit a user's name so that the change
survives a reload.
No design is provided. What it looks like and how it is laid out is yours to decide, and we are looking at
those decisions as much as at the code.
The API is a fixture, not a backend. It returns ten users instantly and never fails. Real ones do neither. The
interface needs to hold up when the network is slow, when a request fails, and when there are far more
rows than ten. How you show us that is up to you.
It should behave like a shipped app, not a demo. Typing quickly must not let a stale response overwrite a
newer one. The back button should do what a user expects it to. Nothing a user has done should disappear
because they reloaded the page.
Edited users versus fresh server data. You are persisting local edits and also fetching from the API.
Nothing tells you which one wins when they disagree. Decide, and say why in the README.
It has to be responsive and usable. Not just at desktop widths, and not just with a mouse. Which devices,
input methods and system settings you checked, and how, goes in the README.
The requirements above have gaps and things that contradict each other. More than one, and we are not
saying how many. Name them in the README rather than quietly working around them. This is the
highest-value thing you can do here.
TypeScript in strict mode. A component or styling library is fine if you want one - say in the README which
you chose and why, and that answer matters more than the choice.

Tests
Optional. If you write them, we read them. If you skip them, skip them deliberately and say so; we would
rather see that than a token test that renders a component and asserts nothing.

2. Context brief
Commit AI/context.md - the briefing you would hand any assistant to make it useful on this codebase.
Conventions, architecture, the traps, what it should never do here.
Format does not matter: CLAUDE.md, .cursorrules, or the preamble you paste into a chat window. It has to
be the real thing you used, not a restatement of the React docs. If you used no AI at all, write it as the brief
you would hand a contractor joining the project on Monday - same skill, scores the same.
We run it through our own agent on a small task in your repo that you have never seen, and grade what
comes out. You do not need an agent to do well here. You need to have written something that makes one
useful.

Submitting
README.md - the level you are applying for, how to run it, the decisions listed above, and two short sections:
• What is still wrong with this - the problems you know are in your own code. The race you noticed but
did not fix, the state that resets when it should not, whatever it is. Required, and it counts for as much
as any feature you shipped.
• What I would need before building this for real - the questions you would have asked a product owner.
Also: AI/context.md, any tests you wrote, and real git history with commits that match their diffs. A single
"initial commit" tells us nothing.

Not in scope
A backend, authentication, real persistence beyond the browser, routing to anything other than what this
screen needs, and a design system. A small thing done well beats a large thing done badly.