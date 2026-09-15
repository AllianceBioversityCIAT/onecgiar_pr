# Kaizen Entry — bilateral/center-overview-tab

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/center-overview-tab` |
| Date | 2026-09-14 |
| Branch | qa-development-2026 (spec branch — every shared-file write below is recorded, not applied) |
| Archive Run | 1 |
| Approval Mode | pre-approved (applied at execute; spec text said gated) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 8 of 8 | tasks.md |
| Reviewer rounds | 14 (8 first-pass + 3 delta/amendment + 3 HITL-fix) | execution.md |
| Reviewer FAIL rework attempts | 2 counted (T-7 ×1, T-5 ×1) + 1 round-2 FAIL adjudicated non-spec (T-5, test for a Leader-added item → carried to T-8) | execution.md — T-7, T-5 |
| Leader-ordered amendments (not FAILs) | 3 (T-2 contract defaults, T-3 per-stream errors, T-7 explicit-all writes) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 (three in-place design corrections recorded in design.md instead) | design.md `COV-DD-3`, §6.2, §6.3 |
| Budget tripwire | 1 — fired after task 4 (~3,835 vs 1,700 LOC); user re-based to ~5,500; final ~8,300 | execution.md — Document Control, T-3 entry |
| HITL findings | 3 fixed (H-1 highlight id type, H-2 phase id type, H-3 legacy selector look) | execution.md — T-8 |
| Gate-only defects | 2 (CT: breakpoint cascade; HITL: string ids) — invisible to Jest and to every Reviewer | execution.md — T-8 |
| Runtime failures | 4 workers killed by provider session limits (sonnet ×2, session model ×2); rotation opus/sonnet/session model | execution.md — T-3, T-5, T-6 notes |
| PRODUCT_BUGs | — | no test-report.md (absence accepted by the user) |
| Validation FAIL / WARN | — / — | no validation-report.md (absence accepted) |
| Drift attributable | — | `docs/specs/audits/` holds no report; no legacy drift-report.md |

## Lessons

- **KZ-bilateral--center-overview-tab-1 — Never mix named (`sm:`/`md:`/`lg:`) and arbitrary (`min-[Npx]:`) Tailwind breakpoints on one property; gate responsive rows with a CT column-count measurement.** (Product, Medium)
  - Root cause: Tailwind v4 emits named-breakpoint rules after the arbitrary-value group, so `sm:grid-cols-2` beside `min-[900px]:grid-cols-3 min-[1280px]:grid-cols-5` won the cascade at every width ≥ 640 px and capped the KPI deck at 2 columns. The class list came from `design.md` §6.3 itself; two Reviewers and 99 Jest assertions (class presence) passed it; the first CT run failed it.
  - Evidence: execution.md — T-8 "Automated half" (first run RED 2/2/2/1, compiled `styles.css` line order 10686 vs 10393/10476); design.md §6.3 correction note.
  - Standardization: → P1

- **KZ-bilateral--center-overview-tab-2 — A design clarification the Leader writes during `/akili-execute` must be handed to that task's Reviewer as an explicit check item, and re-checked by the next task's Reviewer.** (Methodology, Medium)
  - Root cause: the Leader clarified `COV-DD-3` (defaults reconciliation) at T-2 spawn time; the gap in that clarification (a tab click carrying only `?phase=` would suppress the Results default) surfaced only because the T-2 Reviewer volunteered an advisory. Nothing in `/akili-execute` routes an execute-time design edit through review; the second correction (Results writes need `explicitDefaults`) again arrived as a worker's flagged assumption at T-7. Each fix cost one Implementer + Reviewer round.
  - Evidence: execution.md — T-2 "Leader adjudication" and attempt 2; T-7 amendment; design.md `COV-DD-3` "Clarification" + "Amended" bullets.
  - Standardization: no local edit — upstream to the AKILI repo (`/akili-execute` §2.3: "if the Leader edited `design.md` since the last PASS, list the edited sections as explicit Reviewer checks"). Recorded → P2 (methodology).

- **KZ-bilateral--center-overview-tab-3 — Specify must anchor every UI widget choice to a live module exemplar (file + lines), not to a component name.** (Product, Low)
  - Root cause: `design.md` §6.2 named `app-pr-select` for the phase selector "as the SP Overview"; the SP Overview does not use it (it uses an `hlm-popover` combobox/listbox), and `app-pr-select` renders PrimeNG's legacy look. The Implementer followed the design faithfully; the user caught it on the live page (H-3) and it cost a fix + review round after all eight tasks had passed.
  - Evidence: execution.md — T-8 "Finding H-3"; design.md §6.2 correction; `program-overview.component.html:283–360` (the real pattern).
  - Standardization: → P3

## Noted, not a lesson

- The "No bilateral project" row (30) links to the unfiltered scope (71) because `COV-R-9` C says "without a project param" — reconciliation exception written into the spec itself; proposal candidate (`project=none`).
- `/overview?status=pending` scopes cards without any chip — `status` is a contract key but not a controls dimension (`COV-R-3` table); spec gap → proposal.
- Reviewer advisories were acted on selectively (three folded into amendments when they were one-liners in the same file, the rest recorded); no advisory became a task. The T-5 round-2 FAIL on a Leader-added test item was adjudicated as non-spec — the *Advisory Never Gates* rule held, but the brief wording "closed as described and tested" invited the FAIL; briefs should mark Leader-added items as advisory-grade explicitly.
- Reviewer pointed at a scratchpad diff file instead of an inlined diff on every round > 300 lines (Reviewer has `Read`); no information lost, large output-token saving — candidate methodology tweak to `/akili-execute` §2.3's "always inline" wording.
- `execution.md` grew to ~350 lines for 8 tasks; still readable bounded, but the per-attempt narrative could move to a `## Appendix` on long specs.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization (KZ-bilateral--center-overview-tab-1) |
| Target | `onecgiar-pr-client/CLAUDE.md` §5 Hard UI rules (new rule after rule 19) |
| Edit | "Never combine a named breakpoint (`sm:`/`md:`/`lg:`/`xl:`) with an arbitrary one (`min-[Npx]:`/`max-[Npx]:`) on the same property of one element — Tailwind v4 emits the named group after the arbitrary group and the later rule wins the cascade. Use `min-[640px]:`/`min-[768px]:`/`min-[1024px]:` when any arbitrary breakpoint is present. Responsive specs gate with a CT column/overflow measurement, never class presence." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization (KZ-bilateral--center-overview-tab-2, Methodology — upstream) |
| Target | AKILI methodology repo — `/akili-execute` §2.3 Reviewer brief; local mirror `.agents/leader.md` → *Delegation Discipline* (append 1 line) |
| Edit | "If you (Leader) edited `requirements.md`/`design.md` since the previous PASS, name the edited sections in the Reviewer brief as explicit conformance checks — an execute-time clarification is spec text nobody reviewed." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization (KZ-bilateral--center-overview-tab-3) |
| Target | `docs/specs/general-setup/design.md` §6.3 Design system usage checklist |
| Edit | "For every interactive widget, cite the live exemplar (`path:lines`) whose look the widget must match; a component name alone (`app-pr-select`, `p-*`) is not a spec — several legacy wrappers render the old design." |
| Severity | Low |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--bilateral-review-center-strip-and-phase-1` (fixtures must use the shell's real cold-boot and wire values) |
| Edit | Add `bilateral/center-overview-tab` as a source; recurrence note: "PRMS APIs deliver ids as strings (`/api/versioning` `Phases.id`, `/api/bilateral/center/projects` `id`, `bilateral-center-results` `project_id`) although interfaces type them `number`; three components compared with `===` and two live defects (H-1, H-2) passed every Jest suite and every Reviewer. Raise to **High**; rule: every id comparison through `Number()`, phase/project fixtures carry string ids." |
| Severity | High |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` (LOC budgets under-count) |
| Edit | Add `bilateral/center-overview-tab` as a source (recurrence REH → AIS → KCR → COV): 1,700 estimated / ~8,300 delivered; tests ≈ 60 % of LOC, L page task 2,600. Note: estimate tests at 1.2–1.5× production for fixture-heavy pure modules; an L standalone page ≥ 1,500 LOC; under `pre-approved`, phrase the tripwire as "report the delta and continue unless told to stop". |
| Severity | Medium |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-MRF-*` resume-pattern / provider-limit worker deaths row (per `changes--mass-reporting-flow.md` P4; add if absent) |
| Edit | Recurrence (REH ×1 → MRF ×3 → COV ×4): two distinct quotas in one run (sonnet 17:20, session model ~19:00). Rotation that held author ≠ auditor: Implementer opus, Reviewer sonnet/session model. Probe the tree for the dead worker's partial edits before re-briefing; an idle echo repeating the *first* report means the follow-up was not processed — check the file, then poke once. |
| Severity | Medium |
| Status | pending |

### P7

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/bilateral/CLAUDE.md` (create — the feature-root index does not exist) |
| Edit | Create the bilateral feature-root guide with a `## Module Guides` index linking `pages/bilateral-overview/CLAUDE.md`, `pages/bilateral-results-list/CLAUDE.md`, `pages/bilateral-result-creator/CLAUDE.md`, the drawer/manual-create guides (pending from `bilateral--manual-create-drawer` P1) and `services/`; one line per guide. |
| Severity | Low |
| Status | pending |

### P8

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/CLAUDE.md` |
| Edit | Remove/replace the stale "the centre's default landing page" line (false since `shell-sp-alignment`; the landing is Reporting, the first tab is Overview). |
| Severity | Low |
| Status | pending |

### P9

| Field | Value |
|---|---|
| Kind | standardization (constitution doc) |
| Target | `docs/ux-ui/design.md` §4 screen inventory |
| Edit | Add row: "Bilateral center · Overview — `/bilateral/:acronym/overview`, first tab (not landing); KPI deck + 6 cards; controls row sticky in `#workArea`; deep links via the bilateral query-param contract." |
| Severity | Low |
| Status | pending |

### P10

| Field | Value |
|---|---|
| Kind | standardization (constitution doc) |
| Target | `docs/trd/trd.md` §6 frontend state + §11 patterns (additive notes, no ADR superseded) |
| Edit | §6: "New dashboards chart with ECharts through `pr-viz-chart`; series colors only via `resolveChartTokens()` (status tokens are for pills)." §11: "One query-param contract + one filter function per shell (`bilateral-query-params.ts` / `bilateral-result-filter.ts`, `COV-DD-3`): destinations apply the same predicate the overview counted with; shell context keys (`phase`) are excluded from filter-default tests." |
| Severity | Low |
| Status | pending |

### P11

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `.agents/model-routing.md` Registry (T1 Architect row) |
| Edit | The T1 entry `opus` predates the session model (Fable 5.1); add a note under the registry: "When the session model is newer than the T1 entry, the Leader runs on the session model — the registry is a floor." Also record the quota rotation used 2026-09-14 (Implementer opus / Reviewer sonnet or session model) as an accepted degradation path. |
| Severity | Low |
| Status | pending |

Root `CLAUDE.md`/`AGENTS.md` factual sweep: no falsified claim found (module layout, commands, CodeGraph status still true). CodeGraph re-index (`codegraph sync`) recommended — ~25 new/changed client files.
