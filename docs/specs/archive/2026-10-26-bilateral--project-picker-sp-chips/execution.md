# Execution Log — Science Program chips in the replicated-result project picker (`PSC`)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/project-picker-sp-chips/` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` |
| Started | 2026-10-26 |
| Leader | Claude Opus 5.5 (T1) · Implementer `akili-implementer` · Reviewer `akili-reviewer` |

## Task Execution History

### PSC-T-1 — Chip row, default chip and OR filter in the inline project picker

| Field | Value |
|---|---|
| Final status | Reviewer **PASS** (attempt 1) — task held `[~]`: manual layout check (Done-when item) still outstanding; budget tripwire raised |
| Date | 2026-10-26 |
| Attempts | 1 |
| Skills assigned | `angular-developer`, `spartan`, `tailwind-design-system`, `tdd` (per task table, no deviation) |
| Effort | medium |
| Requirements covered | PSC-R-1..R-5, PSC-NFR-1, NFR-2, NFR-4 (NFR-3 layout → manual check pending) |

#### Attempt 1

**Files changed** (only the 4 allowed): `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-project-selector/bilateral-project-selector.component.{ts,html,scss,spec.ts}` — 290 insertions / 7 deletions (ts +65/−6, html +30/−1, scss +9, spec +186). No server diff.

**Implementer verification**

- Red run before implementation: selector spec `Tests: 10 failed, 17 passed, 27 total`.
- After: selector spec `Tests: 27 passed, 27 total`.
- `npx jest --maxWorkers=2 --no-coverage --findRelatedTests …/bilateral-project-selector.component.ts` → `Test Suites: 23 passed, 23 total` / `Tests: 974 passed, 974 total`; includes `section-zero-dashboard.component.spec.ts` and `bilateral-result-creator.component.spec.ts`, both unedited.
- ESLint: the task's `npx eslint <dir> --quiet` exits 2 (client has no flat config, only `.eslintrc.json`). Ran `ESLINT_USE_FLAT_CONFIG=false npx eslint --ext .ts,.html src/app/pages/bilateral/components/bilateral-project-selector --quiet` → no errors.

**Implementer Not Done / Assumptions (verbatim intent)**

- Falsifiers not mutation-run; red run covers new behavior.
- Manual layout check not run (Leader HITL).
- Chip labels / "Clear" / "Clear filters" / empty-state message in plain English, not i18n (spec dictates exact strings; template already plain English).

**Reviewer verdict: `STATUS: PASS`**

> PSC-T-1 attempt 1 conforms to the spec: all four files in scope, every clause-ownership row (S-1.1…S-4.1, R-5) has a matching test that clicks rendered buttons where the disqualifiers require it, and the id-match / gate-drop / AND-vs-OR mutations each break a test. Spartan variants used (`brandSoft`/`outline`/`link` `xs`, badge `secondary`) all exist in `src/app/spartan/{button,badge}`; the pre-existing spec only gained the two mock signals. NFR-3 (layout) remains the manual check owed by the Leader.

Checklist notes from Reviewer: 6 new tests green pre-impl are expected (S-1.2 ×2, S-1.3 no-row, S-2.3 ×2 describe today's behavior; S-3.2 see advisory). `#F3F4F6` is the file's existing separator value (`.bps-search` border, scss:117 + 3 others) — not a new color.

**ADVISORY (4R — recorded, no rework)**

1. RISK — falsifier #4 in tasks.md ("missing `stopPropagation` → S-3.4 red") cannot fire in this DOM: `.bps-dropdown-overlay` is a sibling, not an ancestor, of `.bps-dropdown`, so S-3.4 passes with or without `stopPropagation`. Implementation meets R-5; the test does not prove it. **Known gap** — manual check must confirm no outer Section 0 / document listener closes the picker on chip click.
2. RELIABILITY — S-3.2 fixture: "potato" only matches p1 (SP06), so the test is green without the chip predicate. A non-SP06 "potato" project would make it a real AND proof.
3. READABILITY — hex separator literal matches siblings; no semantic `--pr-*` border token exists. File-wide token cleanup later, not this task.
4. RELIABILITY — null `spShortName` renders "SP06 · " with empty tail; fallback to code/full name would be safer.
5. RESILIENCE — `linkedSignal` re-seeds on a transient null→code flip while `getProjects` reloads after `resultLeadCenterCode` arrives; happens before user interaction, acceptable.
6. PROCESS — task verification eslint command needs `ESLINT_USE_FLAT_CONFIG=false` in this package (kaizen candidate).
7. PROCESS — plain-English copy allowed by `src/CLAUDE.md` §11 for non-P22/P25 copy.

**Decisions**

- Leader passed the diff to the Reviewer as a pointer to an unmodified `git diff` scratch file (Reviewer has `Read`), instead of inline — deviation from brief economy rule, content identical.
- Task not marked `[x]`: tasks.md *Done when* requires the manual layout check reported; held `[~]` until the user runs or waives it.

**Budget tripwire**

| Item | Budget (design §1) | Actual |
|---|---|---|
| Tasks | 1 | 1 |
| LOC | ~150 (≈60 prod + ≈90 spec) | 290 (≈104 prod + 186 spec) |
| Review rounds | 1 | 1 |

Cause: test count (16 new cases, one per clause row plus a Clear-button case) and ts boilerplate (imports, `ProgramChip` interface, doc comments). Escalated to the user at the HITL pause.

**Final verification:** Jest green (27/27 selector, 974/974 related), eslint clean (legacy-config invocation). Manual layout check: **PASS** (below).

#### HITL resolution (2026-10-26)

- **Budget:** user accepted the LOC overrun (290 vs ~150).
- **Manual layout check** — run by the Leader at the user's request. Local stack (`npm run start:dev` server :3400, `npm start` client :4200), served bundle contained the chips (new code confirmed). Result **8406** (CIP, replicated "Previously reported", phase 36 / 2026, no-lead-project branch) → Overview → Project dropdown. Only open/close, chip toggles and search typing; **no project selected, Save never clicked**.

| Check | Observed |
|---|---|
| Chip row placement / wrap (NFR-3) | Under search, 12 chips (SP01…SP13 minus SP03; corrected from "13" by `/akili-validate`) wrap onto 2 rows; `.bps-chips` scrollWidth = clientWidth (1584); no page horizontal overflow |
| Default chip (S-2.1) | `SP01 · Breeding for Tomorrow 33` pressed on first open (stored primary SP01); count matches the Home card (33) |
| Chip click keeps dropdown open (S-3.4 / advisory #1) | Real click on SP06 → dropdown still open, nothing staged |
| OR filter (S-3.1) | SP01 + SP06 → 34 options (33 + 1) |
| Close/reopen keeps selection (S-2.4) | Trigger ×2 → SP01 + SP06 still pressed |
| Clear (R-4) | 0 pressed, 57 options (full catalogue), dropdown open |
| Empty state (S-4.1) | SP06 + search "zzz" → "No projects for the selected programs" + *Clear filters* |
| List scroll | `.bps-options` still scrollable |

Visual note (advisory, no rework): chip text is small (`xs`) and the selected `brandSoft` state is a brand border + brand text only — readable but subtle at a glance. Screenshots saved locally by the browser tool (not committed).

**Final status: PASS → `[x]`.** Gate auto-pass not applicable (gated mode); user approval given for budget and for Leader-run manual check.

## Summary

All tasks complete (1/1). PSC-T-1 PASS on attempt 1; manual layout check PASS on result 8406 (CIP). Budget: tasks 1/1, review rounds 1/1, LOC 290 vs ~150 (accepted by user). Open follow-ups for `/akili-archive` (kaizen candidates, not tasks): task-verification eslint command needs `ESLINT_USE_FLAT_CONFIG=false` in the client; S-3.2 fixture could be strengthened with a non-SP06 "potato" project; `spShortName` null fallback; selected-chip contrast is subtle. No commit yet — awaiting user go-ahead.
