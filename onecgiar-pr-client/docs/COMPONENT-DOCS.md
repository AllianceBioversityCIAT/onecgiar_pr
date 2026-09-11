# Component docs convention — `CLAUDE.md` beside the code

One `CLAUDE.md` per feature folder, holding **only what the code does not say out loud**: invariants,
cross-file contracts, traps, and the reason behind non-obvious wiring.

## 1. Why this filename
Claude Code auto-loads `CLAUDE.md` from the cwd upward and from folders it reads into; `README.md` and
`AGENTS.md` are **never** auto-loaded — opened by hand or not at all, so they rot. Name not negotiable.

## 2. Where a file goes
Mandatory in every `src/app/pages/<feature>/`, every `pages/<sub-page>/` inside it, and every
`src/app/shared/sections-components/<name>/`.

A lone `components/<name>/` gets one **only** if it earns its file:
- \> 300 LOC in the folder, **or**
- non-obvious wiring (state passed through a service, effect ordering matters, a signal written from
  two places, a PrimeNG control that ignores a rebound input), **or**
- it already burned someone — a bug, a rollback, a QA cycle lost.

Otherwise: **one row** in the parent's Components table. No file per leaf.

## 3. What goes in — and what must not
In: invariants ("phase must resolve before the table renders"), cross-file contracts, data flow
spanning files, known traps, decisions with their reason, ticket IDs behind odd code.

Out, hard no: stack/versions; the `auth` header, base URLs, git or commit rules (root `CLAUDE.md`,
once); folder trees, file listings, selector inventories — anything derivable from `ls`; restating a
method the reader is already looking at. If deleting a sentence loses nothing that opening the file
gives you, delete it.

## 4. The 120-line cap
Hard cap **120 lines**. Over it means one of three things: (1) it documents the obvious → cut per §3;
(2) it covers two concerns → push a section down into the sub-folder that owns it; (3) it is history,
not context → move the narrative to the Jira `Technical documentation` subtask and leave one line
with the ticket ID. Never fix an overflow by adding a second doc file in the same folder.

## 5. The freshness stamp
Last line of every file — date, branch, short sha the content was checked against:

`**Verified:** 2026-08-21 · performance-refactor · eed5bb706`

Staleness check: `git log -1 --format=%h -- src/app/pages/<feature>`. Differs from the stamped sha →
the doc is unverified: read it as a lead, not truth, and re-stamp once confirmed against the code.

## 6. Update in the same commit
A behaviour change and the edit to that folder's `CLAUDE.md` ship in **one** commit — no follow-up, no
"doc sweep later" (a sweep is how the twin-file drift below happened). If no invariant changed, say so
in the ticket instead of touching the stamp.

## 7. Template
```markdown
# <folder name>

**What this owns:** one or two sentences — the responsibility, not the file list.
## Invariants
- <what must always hold, and what breaks if it does not>
## Data flow
- <where state comes from, who writes it, when it is read> (`file.ts:120`)
## Gotchas
- <trap, plus the symptom someone sees first> — P2-XXXX
## Components
| Folder | Role | Notes |
|---|---|---|
| `foo-table/` | renders X | pagination is server-side |
## Decisions
- <choice> — because <reason>. Rejected: <alternative>.
## Not verified
- <area nobody confirmed, so the next reader does not assume it was>

**Verified:** YYYY-MM-DD · branch · sha
```

## 8. Not chosen, and why
- **Per-folder `README.md`** — invisible to the loader; the agent never sees it, so it rots.
- **One big per-feature index** — all-or-nothing load (1721 lines today in
  `result-framework-reporting/AGENTS.md`) and nobody reviews a 1700-line diff.
- **A `docs/` mirror of the tree** — worst drift: never in the same diff as the code.

## Migration note (recorded, not done)
The client has 7 nested `AGENTS.md` files (356–1721 lines) that are **never auto-loaded**, plus
`src/AGENTS.md` and `src/CLAUDE.md` kept as hand-synced twins. The fix, per folder:

```bash
git mv AGENTS.md CLAUDE.md && ln -s CLAUDE.md AGENTS.md
```

Then trim to the cap per §3–§4 and add the stamp. The symlink keeps `AGENTS.md`-seeking tools working
off one source of truth. **Not performed yet** — separate ticketed change, never folded into an
unrelated commit.
