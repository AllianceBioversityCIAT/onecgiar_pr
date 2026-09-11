# Kaizen Entry — changes/overview-aow-cross-filter

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/overview-aow-cross-filter` |
| Date | 2026-09-02 |
| Branch | `qa-development-2026` — **spec branch** (pin: `master`); every shared-file edit recorded, none applied |
| Archive Run | 1 |
| Approval Mode | `gated` in the proposal; run pragmatically (≤1 Reviewer round/task, targeted jest) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | **18** — 10 planned, **8 added mid-flight** from measured defects | tasks.md |
| Reviewer FAIL rounds | **6** (`T-2c` Leader-side, `T-6`, `T-8`, `T-2b`, `T-12`, `T-14`) — all remediated, none consumed a 2nd round | execution.md §5, §10, §13, §14, §18, §19 |
| HALT / FATAL_FAIL | **0** | execution.md |
| Pivots | **1** — `OSF-T-1` refuted the design's own root-cause analysis | execution.md §3 Pivot Record |
| Judgment-day severe findings | 3, all resolved pre-execution | tasks.md pre-flight |
| **Defects found by the browser gate that jest + lint + `ng build` all passed clean** | **7** | execution.md §13, §14, §16, §18, §20, §21 |
| Budget | ~10 tasks / ~880 LOC estimated → **18 tasks** actual; overrun disclosed in `tasks.md` §7, not absorbed | design.md budget |
| Validation FAIL / WARN | n/a — `/akili-validate` not run; absence explicitly accepted (archive-summary §6) | — |

## Lessons

- **KZ-changes--overview-aow-cross-filter-1 — A measurement DoD that names the number but not the *condition* produces confident false passes.** (Product + Methodology, High)
  - Root cause: every layout DoD in this spec said *what* to measure (`scrollWidth === clientWidth`, `overflowsParent`, a contrast ratio) and none said *under what condition*. Six distinct variants followed, each a true number answering the wrong question: `overflowsParent` instead of page level · page level with the band **expanded** · verified at 768 and **inferred** for 900 · two offenders of similar size (47px/48px) masking each other in an aggregate · `set viewport` in sequence without reload · a reading taken during the loading skeleton. Four separate tasks reported a width "clean" that was not, and the Leader itself hit two of the six.
  - Evidence: execution.md §22 (the six-variant table), §16 (`overflowsParent` true and irrelevant), §20 (sequential-resize false positive), §21 (skeleton read).
  - Standardization → P1. Upstream → P4 (methodology).
- **KZ-changes--overview-aow-cross-filter-2 — An approved mockup that no DoD references cannot fail anything.** (Product + Methodology, High)
  - Root cause: `OSF-DD-9` described the per-scope breakdown without enumerating its columns, and no task DoD said "match the mockup's column set". The pre-flight recorded *Mockup approved*, but the mockup was never a **gate** — so `OSF-T-7` shipped a 3-column row where the mockup has 4 (a whole status-bar column missing), and its Reviewer **passed it correctly**, auditing the DD text the diff satisfied. Two owner-visible defects shipped this way and were only caught when the owner compared screens by hand.
  - Evidence: execution.md §19 (the drift and its cause), §21; `mockup/Main.dc.html` `:410` vs the shipped `grid-cols-[62px_minmax(0,1fr)_46px]`.
  - Standardization → P2. Upstream → P5 (methodology).
- **KZ-changes--overview-aow-cross-filter-3 — A task that hides, shortens or relocates content must carry the treatment to the site it creates.** (Product + Methodology, Medium)
  - Root cause: twice a task fixed one accessibility defect and introduced another **at the same widths**, both times because the correct treatment already existed at one site and was not carried to the site the task itself added. `OSF-T-2b` shed the achievement column to a **hover-only** fallback (no `tabindex`, roleless span, `aria-hidden` icon) unreachable by keyboard, screen reader or touch; `OSF-T-14` routed the trigger through a new short-code mapping and left the combobox's accessible name a bare em-dash at 900–1099px. In both cases the sibling site was already correct.
  - Evidence: execution.md §14 (issue 1), §19 (the FAIL). Counter-example: §21, where `OSF-T-16` carried it on attempt 1 (`sr-only` not `hidden`, `title` moved to the pointer-reachable ancestor).
  - Standardization → P3. Upstream → P6 (methodology).

## Noted, not a lesson

- **`900px` is the squeeze band on this surface** — wider than 768 yet more constrained, because at 768 the sidebar is `hidden md:block` and the identity block drops, while at 900 the 64px rail renders. This single fact caused three of the six measurement variants. Recorded as a project fact rather than a lesson because the *general* rule is already KZ-…-1; if a third surface shows the same shape, promote it.
- Blind dual judgment paid again: 3 severe design findings resolved pre-execution, 0 HALT, 0 FATAL_FAIL across 18 tasks. Same pattern as the previous two specs — gate works, no methodology change.
- The Leader twice gave the owner an option list that omitted the approved design's own answer (the breakdown bar; the short codes), because it diagnosed statically without opening the mockup. Sub-threshold on its own — it is the same root cause as KZ-…-2 seen from the Leader's side.
- `reporting-aow-table/CLAUDE.md` is 133 lines against a 120 cap; it was already 125 before this spec. Restraint in not trimming other tasks' content was correct — see P7.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization (KZ-…-1) |
| Target | `docs/specs/general-setup/task.md` |
| Edit | Add to the verification guidance: "A DoD that specifies a measurement MUST also specify the **condition** it is taken under — viewport, scroll/collapse state, data-loaded state, and page-level vs element-level scope. A number recorded without its condition is not falsifiable, and a true measurement of the wrong quantity is more dangerous than none, because it closes the question." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization (KZ-…-2) |
| Target | `docs/specs/general-setup/task.md` |
| Edit | Add: "When a spec has an approved mockup, at least one task DoD MUST name it as a gate — 'matches `mockup/<file>` for <the specific structure>'. An approved mockup that no DoD references cannot fail anything, and a Reviewer auditing only the design prose will pass a diff that contradicts it." |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization (KZ-…-3) |
| Target | `.agents/implementer.md` → verification discipline |
| Edit | Append: "If your change hides, shortens, or relocates content, the accessible treatment moves with it — keyboard reachability, accessible name, and a hover affordance on an element a pointer can actually reach. Carry it to the site YOU created, not only the site that was already correct." |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | standardization (KZ-…-1, methodology upstream) |
| Target | AKILI methodology repo — `/akili-specify` task-authoring guidance |
| Edit | Same rule as P1, generalized: measurement DoDs carry their condition. Names no stack, domain or local convention. |
| Severity | High |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | standardization (KZ-…-2, methodology upstream) |
| Target | AKILI methodology repo — `/akili-specify` + `/akili-execute` |
| Edit | Same rule as P2, generalized: an approved design artifact must be referenced by a DoD to function as a gate. |
| Severity | High |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | standardization (KZ-…-3, methodology upstream) |
| Target | AKILI methodology repo — `.agents/implementer.md` |
| Edit | Same rule as P3, generalized: carry the treatment to the site the change creates. Universal persona rule, nothing project-specific. |
| Severity | Medium |
| Status | pending |

### P7

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/CLAUDE.md` |
| Edit | Trim to the 120-line cap (currently 133; was 125 before this spec). Every ⚠️ entry was earned by a live defect — trim the oldest institutionalized content, not the newest findings. |
| Severity | Low |
| Status | pending |

### P8

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-OAH-1` (from `changes/overview-aow-progress-hero`) |
| Edit | Raise to **High** and add `changes/overview-aow-cross-filter` as a source: **third occurrence**, same component. A px/`max-content` track starving a `minmax(0,1fr)` text column — the AoW row identity column (0px at 1100 and 768) and the breakdown's 62px code column (`INTERMEDIATE` overflowing onto the name). Its standardization is still `pending`; the lesson was diagnosed correctly three times and never reached the code. |
| Severity | High |
| Status | pending |

### P9

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/CLAUDE.md` §5 Styling |
| Edit | Add: "Tailwind v4 compiles `max-[Npx]:` to `@media (width < N)` — **exclusive**, unlike classic `max-width`. `max-[N]` and `min-[N]` tile exactly at N. Using `max-[N]` to mean '≤ N' leaves width N itself uncovered." Five pre-existing sites already carry this bug (`program-overview.component.html:267`, `:282`, `:285`, `:293`, `:352`), left untouched as out of scope. |
| Severity | Medium |
| Status | pending |

*(Spec branch — nothing above was written to a shared file. Apply phase runs on `master`.)*

## Constitution Sync — nothing owed

| Item | Result |
|---|---|
| `guide-sync` | **None.** Both folder guides (`program-overview/`, `reporting-aow-table/`) were updated in-task as spec deliverables. `src/app/spartan/` is already documented in both client guides; `popover/` is one more component in an existing tree. |
| `factual-sweep` | **None.** Root guide claims verified accurate: Angular 21 ✓, NestJS 11 ✓, `.codegraph/` present ✓. Nothing this cycle falsified. |
| `trd-adr` | **None.** The pivot overturned spec-level design decisions (`OSF-DD-10` → `OSF-DD-14`), not a TRD ADR. |
