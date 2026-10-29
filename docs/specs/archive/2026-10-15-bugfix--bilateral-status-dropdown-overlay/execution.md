# Execution Log — `bugfix/bilateral-status-dropdown-overlay`

## 1. Document Control

- **Spec path:** `docs/specs/bugfix/bilateral-status-dropdown-overlay/`
- **Executor:** AKILI Leader (Claude Code, Sonnet 5), session `qa-development-2026-mc-2-36`
- **Branch:** `qa-development-2026-mc-2`
- **Started:** 2026-10-15
- **Agent wrappers used:** `.claude/agents/akili-implementer.md`, `.claude/agents/akili-reviewer.md`.
- **Budget (from `design.md` §Budget):** 1 task, ~10-15 LOC, 1 review round.
- **Concurrency note:** running in parallel with `docs/specs/bugfix/bilateral-save-draft-footer/`'s two tasks — disjoint files, no conflict expected.

## 2. Task Execution History

### `BSD-T-1` — attempt 1 — Implementer report

- **Files changed:** `type-policy-change.component.html` (-1 line, `[expandSpaceOnOpen]="true"` removed), `type-policy-change.component.spec.ts` (+48 lines, new regression test + `RolesService` import).
- **Falsifier confirmed genuinely (red/green, both directions):** pre-fix, `expect(spacer).toBeNull()` failed with `Received: {"nativeNode": <div class="expandable-space expanded" />}`; post-fix, green. Disqualifier check (overlay `.options` panel still renders) also passed — no checkpoint triggered.
- **Verification commands run:** `npx jest --testPathPattern="type-policy-change.component.spec"` → 41/41 passed; `npx ng lint --quiet` → clean; `npx ng build --configuration development` → succeeded; repo-wide grep for `expandSpaceOnOpen` → no other current call site.
- **Leader evidence re-run (non-author, mechanical):** `npm run test -- --testPathPattern="type-policy-change.component.spec"` → 41/41 passed. `npx ng lint --quiet` → clean. **VERIFIED** (matches Implementer's report).
- **Not Done / Assumptions:** Cypress consumer (`bilateral-policy-change-mds.cy.ts`) reported **inconclusive, not run** — the only `ng serve` on :4200 has been running ~2 days, predating this session's commits; running against it would be a stale-bundle reading, not evidence. Implementer declined to start a fresh server unprompted (judged out of scope for a `low`-effort task) and reported this honestly rather than silently skipping or assuming green. No blocker named.

#### Attempt 1 — Reviewer verdict: `FAIL`

**STATUS: FAIL**

Summary: the code change itself is correct — Status's block is byte-identical except for the removed attribute (`BSD-R-4`); the falsifier is genuine, checked against the actual `pr-select` source (not just the comment); scope is clean (only the two expected files, `RolesService` override correctly scoped to one test via `TestBed.resetTestingModule()`); prior tests (`PCL-T-2`, `PCL-T-2 control`, `PCL-AC-3`, `PCP-T-1`) present and unmodified. One issue:

1. **Discovered Issue:** `type-policy-change/CLAUDE.md` was not updated or re-stamped — still reads `**Verified:** 2026-10-15 · ... · 68889f292` and says nothing about this change.
   - **Violated Rule:** `onecgiar-pr-client/CLAUDE.md` §10 "Folder docs" (update + re-stamp `Verified:` in the same commit as any edit to that folder); also `onecgiar-pr-client/src/CLAUDE.md` §22.
   - **Remediation Suggestion:** re-stamp `Verified:`, add a one-line trap: *"⚠️ Status (like Policy type) must not set `expandSpaceOnOpen` — it adds a normal-flow 300px spacer that pushes Stage and the rest of the form down; the options panel is already an overlay without it (`BSD-R-1`, `docs/specs/bugfix/bilateral-status-dropdown-overlay/`)."*

**Reviewer's own call on the Cypress "inconclusive" disposition:** acceptable and correct — per `onecgiar-pr-client/CLAUDE.md` §9 ("never trust a dev server you did not start"), and the change cannot affect the text-presence assertions that suite makes either way. Not a FAIL issue. But `tasks.md`'s Definition of Done still requires the named consumer suite re-run AND the manual `ng serve` check for the visual "nothing moves" geometry (`BSD-R-2`, requirements §8a's accepted-risk item) — both stay unchecked until the Leader runs them before archive, on a fresh server, with no delegated agent active at the same time.

**Accounting:** this FAIL consumes rework attempt 1 of 3. Effort bumped `low` → `medium` for attempt 2.

#### Attempt 2 (rework) — Implementer report

- **Files changed:** `type-policy-change/CLAUDE.md` only (docs-only; `.html`/`.spec.ts` from attempt 1 untouched, confirmed by identical 41/41 Jest count).
- **Re-stamp:** `**Verified:** 2026-10-15 · branch qa-development-2026-mc-2 · 52d4b1ad5` (current HEAD at time of fix).
- **New trap bullet:** "⚠️ Status must not set `[expandSpaceOnOpen]="true"` — it renders a second, normal-flow spacer div that animates 0→300px on open, pushing Stage and the rest of the form down. The options panel is already an absolutely-positioned overlay and works without it, same as Policy type (`BSD-R-1`, `docs/specs/bugfix/bilateral-status-dropdown-overlay/`)."
- **Verification:** `npm run test -- --testPathPattern="type-policy-change.component.spec"` → 41/41 passed (identical count to attempt 1). File length 101 lines, under the 120-line cap (`docs/COMPONENT-DOCS.md` §4).
- **Leader evidence re-run (non-author, mechanical):** same command → 41/41 passed. **VERIFIED.**

#### Attempt 2 — Reviewer verdict: `PASS`

Confirmed: `Verified:` line genuinely re-stamped (today's date, correct branch, valid differing SHA matching the session's HEAD and the design.md Premise Ledger's own "Verified at" commit); new trap bullet accurate, correctly cites `BSD-R-1` and the spec path, doesn't duplicate/contradict the existing "Traps" or "What it is" sections (the prior spec's Policy-type/USD-amount/Status grouping description was left untouched); file under the 120-line cap; attempt-1 code/test conclusions still hold since no code/test file was touched this attempt (confirmed via identical 41/41 count).

**ADVISORY (non-gating):** `docs/COMPONENT-DOCS.md` §5 says the `Verified:` stamp should be the last line of the file; here it's on line 3, a pre-existing convention in this file predating this change — not introduced or worsened by this fix, noted for a possible future docs-format cleanup, not this spec's concern.

**Accounting:** attempt 2 PASSed — no further rework attempts consumed. Total: 1 FAIL + 1 PASS, within the 3-attempt ceiling.

**Requirements covered:** `BSD-R-1`, `BSD-R-2`, `BSD-R-3`, `BSD-R-4`, `BSD-AC-1`, `BSD-AC-2`.
**Decisions made:** none beyond the Implementer's documented `RolesService` override pattern (attempt 1) and the folder-doc re-stamp (attempt 2).
**Open items carried forward (non-blocking, per both Reviewer passes):**
- `cypress/e2e/bilateral-policy-change-mds.cy.ts` was not independently re-run this spec (stale `ng serve` on :4200, ~2 days old, predating this session) — reported inconclusive rather than trusted. Re-run on a fresh server before archive.
- Manual browser check for the "nothing moves" visual geometry (`BSD-R-2`, requirements §8a's accepted-risk item) — not yet performed.
**Final verification result:** PASS — Reviewer PASS (attempt 2) + evidence re-run VERIFIED (Jest, both attempts). Task closed `[x]`, with the two open items above still to close before this spec is archived.
