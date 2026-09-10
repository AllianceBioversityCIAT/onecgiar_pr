# Kaizen — `bilateral/overview-redesign`

| Field | Value |
|---|---|
| Date | 2026-09-01 |
| Branch context | spec branch (`qa-development-2026` ≠ pin `master`) — every shared-file edit recorded as pending, nothing applied |
| Archive | `docs/specs/archive/2026-09-01-bilateral--overview-redesign/` |

## Metrics

| Signal | Value |
|---|---|
| Judgment-day (spec stage) | 1 pass, fix-only: **5 findings** (1 High, 4 Warning), all resolved in `design.md` pre-execution |
| Reviewer FAIL rework | **0 of 3 tasks** — T-1, T-2, T-3 all PASS first attempt |
| HALT / FATAL_FAIL / Pivot | 0 |
| Validation FAIL / WARN | no `validation-report.md` (accepted); no FAIL findings anywhere |
| `/akili-quick` escalation | none |
| Budget | 3 tasks estimated / 3 actual · ~220 LOC estimated / **~1373 LOC actual (6.2×)** · ≤1 round/task honoured |
| Test evidence | 12/12 component · 876/876 module · `ng lint` clean |
| Post-hoc drift found at archive | **2** (guide-rule violations in shipped code; commit traceability) |

The budget line is the tell: a spec that estimated ~220 LOC shipped ~1373, and 631 of those lines were SCSS nobody's gate was reading.

## Lessons

- **KZ-BOR-1 — A spec can be approved, implemented and reviewed entirely inside its own bubble while contradicting a hard rule that landed a week earlier.** (Product, High)
  - Root cause: `design.md` §2 named **PrimeIcons** as the icon set and §4 prescribed `bg-[var(--pr-color-*)]` utilities. `onecgiar-pr-client/CLAUDE.md` rules 8/19/21 — no hardcoded hex, Tailwind-first for new styling, `@ng-icons/lucide` only, *no new primeicons* — had been in force since commit `8a84769d2` (**2026-08-21**), seven days before execution (2026-08-28). Nothing in the chain reads the guide: Judgment Day audited `requirements.md` + `design.md` against each other, the Reviewer audited the diff against `design.md`, and `ng lint` has no opinion about design tokens. Result: hex literals 6 → **16** and `pi pi-*` classes 7 → **12** in the shipped component, and 229 → **674** lines of SCSS on a file the guide explicitly says to migrate away from, not extend.
  - Evidence: `judgment.md` FIND-05 ("Normalized all color tokens… to CSS variables") vs `bilateral-projects-panel.component.scss` at `fd7c3826a` (`#1e202f`, `#7c3aed`, `#5733c4`, …); `design.md:16,110,112`; `onecgiar-pr-client/CLAUDE.md` §5 "Hard UI rules" 8/19/21; `git log -S` dating the rule to 2026-08-21.
  - Standardization → P1: the constitution's Skill Map is where a task learns its rules, and it currently points nowhere at the client hard-rules list.
- **KZ-BOR-2 — FIND-05 shows a spec-doc fix is not a code fix, and the ledger implies otherwise.** (Methodology, Medium)
  - Root cause: Judgment Day findings are resolved by editing `design.md`, and the ledger's `Resolution` column then reads as closed. FIND-05's resolution — "Normalized all color tokens in `design.md` to CSS variables" — was true of the document and false of the delivered code, and no later gate re-checks a finding after execution. A finding whose subject is *code output* needs a verification hook in the task that implements it, not just a rewritten paragraph.
  - Evidence: `judgment.md` FIND-05 vs the 16 hexes in the shipped SCSS; `tasks.md` `BIL-OVW-T-2` DoD says "full compliance with `docs/ux-ui/design.md` §7" with no check that produces a pass/fail.
  - Standardization → P2: a judgment finding about code output carries its verification into the DoD of the task that implements it.
- **KZ-BOR-3 — A spec that ships inside someone else's commit leaves no trail back.** (Product, Medium)
  - Root cause: no per-spec commit at execute close-out. This spec's 4 code files, its 7 documents, two *other* specs' archives and a third spec's kaizen entry all landed in `fd7c3826a` (35 files, +4584/−180) under the subject `feat(reporting): add collapsible explainer panels…`. `git log` on the component path returns only unrelated subjects, so the shipped code cannot be traced to the spec that specifies it — precisely the traceability AKILI exists to produce.
  - Evidence: `git show --stat fd7c3826a`; `git log --oneline -- <panel path>` (top entry is the explainer-panels subject).
  - Standardization → P3: close-out commits per spec, scoped to the spec's own files.

## Noted, not a lesson

- **Zero Reviewer FAILs across 3 tasks with a 6.2× LOC overrun.** A clean review sheet on a spec that shipped six times its estimate is not proof of quality — it is the review scope tracking the spec rather than the code. Same shape as KZ-BOR-1; no separate entry.
- Judgment Day again caught the state bugs that automation cannot: FIND-01 (`viewMode` with no `sessionStorage`) would have failed AC-4 in the field, FIND-02 (filters surviving a center switch) was a latent false-empty-state. Third spec running where the spec-stage gate pays for itself on state and misses on style — the *pattern* is now worth watching, the gate itself stays.
- The `try/catch` around both `sessionStorage` reads and writes (private-mode safe) was implemented without being specified. Good instinct, no action.
- `requirements.md` Status still reads `draft` on a shipped spec. Cosmetic; several archived specs carry richer status strings. Not worth a rule.

## Pending Items

| # | Kind | Target | Edit (verbatim) | Severity | Status |
|---|---|---|---|---|---|
| 1 | standardization (KZ-BOR-1) | root `CLAUDE.md` → `## Skill Map`, `angular-developer` row | Extend the "When to load" cell with: "— and read `onecgiar-pr-client/CLAUDE.md` §5 *Hard UI rules* before writing any markup or style; those 25 rules bind the diff even when the spec's own `design.md` says otherwise, and a `design.md` that contradicts one is the thing that is stale." | High | pending |
| 2 | standardization (KZ-BOR-1) | `docs/specs/general-setup/design.md` | Add to the UI/styling section: "A client-facing design MUST cite the icon set, colour source and styling mechanism it assumes, each as a link to the live rule in `onecgiar-pr-client/CLAUDE.md` §5 — an assumption stated without that citation is treated as unverified at review time." | High | pending |
| 3 | standardization (KZ-BOR-2) | `docs/specs/general-setup/task.md` | Add to the verification guidance: "Every judgment finding whose subject is code output carries a verifiable check into the DoD of the task that implements it (a grep, a count, an assertion). A finding resolved only by editing `design.md` is resolved for the document, not for the diff." | Medium | pending |
| 4 | standardization (KZ-BOR-3) | root `CLAUDE.md` → `### Branches & PRs` | Add: "One close-out commit per spec, scoped to that spec's own files (`git add` by name, never `-A`). A spec's code sharing a commit with unrelated work erases the spec↔code trail that `git log <path>` is supposed to carry." | Medium | pending |
| 5 | guide-sync | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/CLAUDE.md` (create) | New folder doc per `onecgiar-pr-client/docs/COMPONENT-DOCS.md`, covering: session key `pr.bilateral.viewMode` (try/catch guarded, `'grid'` default); `kpiSummary` dedupes programs *within* a project so per-program counts are project counts, not membership counts; `setProgramFilter` and `setMultiProgramOnly` are mutually exclusive by design; search is token-AND over NFD-normalized text across code/title/summary/description/SP fields; `bpp_` SCSS namespace; **known debt — 16 hex literals and 12 `pi pi-*` classes pending migration to `var(--pr-color-*)` + Lucide.** Add the row to the bilateral parent guide index. | Medium | pending |
| 6 | factual-sweep | root `CLAUDE.md` line 14 | Replace `├── onecgiar-pr-client/   # Angular 21 frontend (PrimeNG, Jest, Cypress)` with `├── onecgiar-pr-client/   # Angular 21 frontend (Tailwind 4 + Spartan UI, Jest, Cypress)` — `primeng` is not in `onecgiar-pr-client/package.json`; only `primeicons` (^7.0.0) CSS remains. | High | pending |
| 7 | factual-sweep | root `CLAUDE.md` line 245 (Skill Map Evidence) | Replace `Angular 21 + PrimeNG (\`onecgiar-pr-client/package.json\`), Jest + Cypress. No React/Tailwind/shadcn in this repo — those skills are deliberately not mapped.` with `Angular 21 + Tailwind 4 + Spartan UI (\`onecgiar-pr-client/package.json\`: \`tailwindcss\` ^4.3.2, \`@spartan-ng/brain\` ^1.1.0; no \`primeng\`), Jest + Cypress. No React in this repo; \`tailwind-design-system\` IS mapped to the client, and Spartan work loads the client-scoped \`spartan\` skill.` — the current text tells every agent to skip the Tailwind skill on a Tailwind-first codebase, which is the same root cause as KZ-BOR-1. | High | pending |
| 8 | trd-adr | — | None — no TRD ADR overturned; the five judgment findings changed spec-level clauses only | — | n/a |

*(Apply phase runs on `master`; nothing above was written to shared files from this branch.)*
