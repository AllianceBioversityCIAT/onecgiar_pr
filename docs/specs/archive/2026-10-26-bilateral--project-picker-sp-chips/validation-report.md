# Validation Report — Science Program chips in the replicated-result project picker (`PSC`)

> **Verdict: PASS with 3 WARN — ready for `/akili-archive`.** All 5 requirements and 4 NFRs are implemented and evidenced. No FAIL findings. The WARNs are evidence or test-strength gaps, none of them behavior defects.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/project-picker-sp-chips/` |
| Validated commit | `d6be984c1` on `qa-development-2026-ss` (pushed) |
| Date | 2026-10-26 |
| Validator | Claude Opus 5.5 (T3). The code was written by the `akili-implementer` subagent, so author ≠ auditor holds |
| Inputs | proposal, requirements, design, tasks, execution (no `test-report.md`, no Visual Reference) |

## 2. Summary

| Area | Result |
|---|---|
| Task completion | PASS |
| File existence / scope | PASS |
| Build integrity | WARN: not re-run (RAM 0.76 GB free); reuses recorded green run on identical code |
| Requirement coverage | PASS (R-1..R-5, NFR-1..4) |
| Code quality | PASS + 4R advisories |
| Design conformance | PASS |
| Test evidence | WARN: 2 tests weaker than they look (S-3.2, S-3.4 propagation) |
| Constitution impact | PASS: none |
| Cross-document figures | WARN, fixed: execution.md chip count corrected 13 → 12 |

## 3. Task Completion

| Task | Status | Evidence | Result |
|---|---|---|---|
| PSC-T-1 | `[x]` | execution.md: Reviewer PASS attempt 1, Jest/eslint output, manual check table, HITL budget acceptance | PASS |

## 4. File Existence

| Expected (tasks.md *Files*) | Present in `d6be984c1` | Result |
|---|---|---|
| `bilateral-project-selector.component.ts` | modified | PASS |
| `bilateral-project-selector.component.html` | modified | PASS |
| `bilateral-project-selector.component.scss` | modified | PASS |
| `bilateral-project-selector.component.spec.ts` | modified | PASS |
| No other source file / no server diff (NFR-2) | `git diff HEAD~1 HEAD -- onecgiar-pr-server` empty; only the spec docs besides the 4 files | PASS |

## 5. Build Integrity

| Check | Evidence | Result |
|---|---|---|
| Jest selector spec | 27/27 (execution.md, attempt 1) | PASS (recorded) |
| Jest `--findRelatedTests` (incl. section-zero-dashboard, bilateral-result-creator) | 23 suites / 974 tests green, consumer specs unedited | PASS (recorded) |
| ESLint on touched dir | clean with `ESLINT_USE_FLAT_CONFIG=false` | PASS (recorded) |
| Type-check / build | Covered by Jest TS compile and `ng serve` build during the manual check (served bundle rendered the chips) | PASS (indirect) |
| Re-run at validation | **Not run.** Free RAM was 0.76 GB, below the machine rule's 4 GB floor. Selector files are byte-identical to the verified state (`git diff --quiet HEAD` on the folder) | **WARN** |
| Local stack boot | Booted per `docs/infrastructure.md` §6 during execute: server :3400, client :4200 | PASS |

## 6. Requirement Coverage

Clause-level, against tasks.md *Clause ownership*:

| Clause | Code | Automated test | Manual (result 8406) | Result |
|---|---|---|---|---|
| S-1.1 chips per program: code, short name, count, sorted | `programChips` sort `localeCompare` | "renders deduped, counted, code-sorted…" | 12 chips, SP01 count 33 matches Home card | PASS |
| S-1.2 no row (non-replicated / wizard) **BUT list/search as today** | `showProgramChips` gates both template and predicate | 2 tests asserting `filteredProjects()` = text-only | — | PASS |
| S-1.3 **MUST dedupe by code**; **MUST NOT render with no mappings** | `byCode` map + per-project `seen` set | dedupe (SP06 = 2) + empty-mappings test | — | PASS |
| S-2.1 default pre-selected | `defaultProgramCode` → `linkedSignal` | "pre-selects the stored primary chip" | SP01 pressed on open | PASS |
| S-2.2 id mismatch **BUT same-id/other-code MUST NOT be selected** | code-only match, `normalizeCode` | fixture `{52,'sp06 '}` vs SP02 id 52 | — | PASS |
| S-2.3 default absent → none, full list | `null` when code not in chips | 2 tests | — | PASS |
| S-2.4 kept across close/reopen; **MUST re-seed on new primary** | `linkedSignal` source = default code | toggle → reopen → re-seed to SP03 | SP01+SP06 kept after reopen | PASS |
| S-3.1 OR union, each once | `.some(...)` per project | SP01+SP03+SP06 → [1,2,3] | 33 + 1 = 34 | PASS |
| S-3.2 chips ∧ search | `matchesText && …` | "chips AND search" | — | PASS (see WARN-2) |
| S-3.3 deselect last → full list | `size > 0` guard | test | Clear → 57 | PASS |
| S-3.4 open, nothing staged **BUT MUST NOT change project / Program / stored value** | `stopPropagation`; toggle touches only `selectedProgramCodes` | DOM click: open, no emit, no `setLeadProject`/`selectProject` | Real click: still open, nothing staged | PASS (see WARN-3) |
| S-4.1 empty message + *Clear filters* | template `@if` branch | DOM test | "zzz" + SP06 → message + clear | PASS |
| R-5 native buttons, `aria-pressed`, group label, no propagation | template | presence test | — | PASS (keyboard is native-button behavior, not tested) |
| NFR-1 no new request | No HTTP code added | — | — | PASS |
| NFR-2 no server/payload diff | §4 | — | — | PASS |
| NFR-3 wrap, no horizontal scroll, list scrolls | `.bps-chips` flex-wrap | none (jsdom) | scrollWidth = clientWidth; list scrollable | PASS (manual only, as planned) |
| NFR-4 Spartan + existing tokens | `hlmBtn`/`hlmBadge`; `#F3F4F6` reused from the same file | — | — | PASS |

## 7. Linting & Code Quality

ESLint clean (recorded). Architecture: logic stays inside the standalone selector; it reads service state directly (DD-4); no new service or input. Matches the `angular-developer` signal idioms (`computed`, `linkedSignal`).

**4R advisory (not spec violations):**

| Lens | Finding | Origin |
|---|---|---|
| Readability | Separator is a hex literal like its siblings; there is no semantic `--pr-*` border token. Fix file-wide later | Reviewer |
| Reliability | `spShortName` null → label "SP06 · " with an empty tail; fall back to code or `spName` | Reviewer |
| Reliability | `filteredProjects` now always returns a new array (before, it returned the catalogue reference when search was empty). Harmless with `@for track project.id` | Validator |
| Resilience | `linkedSignal` re-seeds on a transient null → code flip while the catalogue reloads; happens before interaction | Reviewer |
| Risk / UX | Selected chip (`brandSoft`) differs only by border + text color at `xs` size: readable, but subtle at a glance | Manual check |
| Process | Task verification eslint command needs `ESLINT_USE_FLAT_CONFIG=false` in the client | Reviewer → kaizen |

## 8. Design Conformance

| Design item | Implemented | Result |
|---|---|---|
| §2 signal table (5 signals, normalization helper, gate) | Exactly as specified | PASS |
| §6.2 template (group role/label, variants, `title` = `spName`, badge count, Clear, empty branch, stopPropagation) | Exactly as specified | PASS |
| §6.3 Spartan only, no new tokens | Yes | PASS |
| DD-1..DD-5 | All honored; no id fallback (DD-2) | PASS |
| Proposal intent / non-goals (no server, no save change, no wizard, no persistence) | Honored | PASS |
| Budget (design §1) | 1 task / 1 review round met; LOC 290 vs ~150, recorded and **accepted by the user** | PASS (accepted drift) |

**Cross-document figures:**

| Figure | Finding | Action |
|---|---|---|
| execution.md manual check: "13 chips (SP01…SP13 minus SP03)" | Self-contradictory: 13 programs minus 1 = 12, and the screenshot shows 12 | **Fixed → 12** (no other occurrence in the spec folder; NFR-3's "≤ 13 SPs" is a cap, unaffected) |
| Count 33 for SP01 | Matches the CIP Home "Breeding for Tomorrow 33 Projects" card | Consistent |
| LOC ~60/~90 (design, tasks) vs 104/186 (execution) | Recorded as a budget overrun, accepted | Consistent |

## 9. Test Evidence Summary

No `test-report.md` (no `/akili-test` run); evidence comes from execution.md.

| ID | Gap | Result |
|---|---|---|
| WARN-2 | S-3.2 fixture: "potato" matches only an SP06 project, so the test stays green even without the chip predicate. The AND is proven by code reading, not by the test | WARN |
| WARN-3 | Falsifier #4 cannot fire: the overlay is a sibling, so S-3.4 passes even without `stopPropagation`. The real-browser click (8406) confirmed the dropdown stays open | WARN (covered manually) |
| — | Keyboard operability (R-5) relies on native `<button>`; not exercised | Accepted per tasks.md disqualifier note |

## 10. Agent Guide / Constitution Impact

No module was created, moved or given a new public surface; execution.md has no `## Constitution Impact` block. No guide sync needed. CodeGraph re-index: optional (small diff in one component).

## 11. Remediation

| # | Item | Severity | Recommendation |
|---|---|---|---|
| 1 | Re-run the scoped Jest suite once RAM is ≥ 4 GB | WARN-1 | Optional confirmation, since the code is identical to the verified run |
| 2 | Strengthen the S-3.2 fixture with a non-SP06 "potato" project | WARN-2 | Kaizen / future touch of this spec file. Not a new task here |
| 3 | `spShortName` fallback; selected-chip contrast | Advisory | Record in the kaizen entry; a Lite follow-up only if users report it |
| 4 | Eslint command flag | Advisory | Kaizen standardization for the client test/lint commands |

No FAIL items, so nothing blocks archive.

## 12. Archive Readiness Recommendation

**Ready.** All tasks are `[x]`, there are no FAILs, and the WARNs are evidence-strength gaps. The user accepted the budget drift. Next step:

```text
/akili-archive bilateral/project-picker-sp-chips
```
