# Judgment Day Audit Ledger — Overview ToC-Scope Filter

## 1. Audit Metadata

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/overview-aow-cross-filter/` |
| **Audit Target** | `design.md` (immutable), against `requirements.md`, `proposal.md`, the mockup and the constitution |
| **Date** | 2026-09-01 |
| **Lineage** | Round 1 (initial blind dual review) |
| **Judges** | Judge 1 — Architecture / Data / Feasibility · Judge 2 — UX / Responsive / A11y / Testability |
| **Author ≠ auditor** | Design authored on `opus`; both judges run on `sonnet` (T3 fallback) |
| **Corroboration** | The two judges held **disjoint axes**, so no severe was reported by both. Every severe below was instead **verified by the orchestrator directly against source** before being accepted — recorded per finding |
| **Status** | Findings frozen; awaiting HITL decision on correction |

---

## 2. Findings Ledger

| ID | Judge | Category | Severity | Description | Corroboration | Status |
|---|---|---|---|---|---|---|
| **FIND-01** | J1 | data | **SEVERE** | `OSF-DD-3`'s residual math assumes the bucket query and the program total share one population. They do not: the progress endpoint restricts to W1/W2, the bucket query does not filter source at all, and `results_toc_result` is shared with bilateral results. The residual goes negative **routinely**, not as an anomaly — and that is the keystone `OSF-AC-3` test | **Verified in source:** `results.service.ts:1800` passes `fundingSource: ['Result']`; `getResultsCountByUnitAndStatus` WHERE (`results-framework-reporting.service.ts:918-925`) has no `r.source` predicate; `result.repository.ts:2970+` joins the same `results_toc_result` for W3 | open |
| **FIND-02** | J1 | coverage | **SEVERE** | `OSF-R-7` (MUST — URL state + Results deep-link) has **zero** design coverage: no DD, no file, no param name, absent from the Decisions Index | **Verified:** `grep -c 'OSF-R-7\|programme-results-query-params\|deep-link\|query param' design.md` → `0` | open |
| **FIND-03** | J2 | responsive | **SEVERE** | `OSF-DD-8`/`OSF-DD-10` present a track list as the fix and call it "all shrinkable". The list is **byte-identical to the shipped, already-broken markup**, and three of five tracks are bare `max-content` — i.e. `minmax(max-content,max-content)`, a hard floor. The real mechanism designed is width-gated column removal, which is a different thing; with no scroll-container fallback, `OSF-R-8` has no guarantee at the 1025–1200px band | **Verified:** `grep -o 'grid-cols-\[[^]]*\]'` on `program-overview.component.html` returns the identical string the design proposes | open |
| **FIND-04** | J1 | consistency | WARNING | §6's CASE table lists "no ToC row" as SQL-resolved, but `rtr`/`rtri`/`rit` remain INNER JOINs, so such rows never reach the CASE — only the residual can catch them | Single judge; consistent with the design's own text | info |
| **FIND-05** | J1+orchestrator | coverage | WARNING | `OSF-R-11`, `OSF-R-13` (SHOULD) and `OSF-R-14` (MAY) have no design coverage | **Verified:** R-ids in `requirements.md` minus R-ids in `design.md` = `R-7, R-11, R-13, R-14` | info |
| **FIND-06** | J1 | citation | WARNING | `OSF-DD-2` claims the EOI bucket condition is "lifted verbatim" from `countProgramLevelOutcomes`; that query has **no** `wp_id` predicate for EOI | Verified against `aow-bilateral.repository.ts:265-273` | info |
| **FIND-07** | J2 | a11y / constitution | WARNING | `OSF-DD-7` never names the implementing component for a grouped, subtext-bearing control, and §4 adds no component file. Hard rules forbid a bare native `<select>`; `app-pr-select`'s API has no grouped-header support. The ARIA structure the NFR mandates is unspecified | Single judge; consistent with `onecgiar-pr-client/CLAUDE.md` §5 | info |
| **FIND-08** | J2 | consistency | SUGGESTION | Label drift: design/requirements say `Not tagged`; the approved mockup says `Not tagged to a ToC area` | Single judge | info |

---

## 3. Correction Round 1 — `Fix only` (owner, 2026-09-01)

Owner selected **Fix only**: apply corrections, no scoped re-judgment. All 8 findings addressed — the 3 severes because they are severe, the warnings and the suggestion because they lived in the same paragraphs being rewritten and leaving a known-false statement in an edited document is worse than the cost of fixing it.

| ID | Resolution |
|---|---|
| **FIND-01** | `OSF-DD-2` now mandates `r.source IN ('Result')`, **single-homed** as one exported constant shared with the progress endpoint's filter, so the two populations cannot drift. `OSF-DD-3` restated: the subtraction is valid *only because* the populations are pinned, and that is named as its precondition. New **`OSF-DD-3b`**: W3 partitions its own local array, no residual arithmetic |
| **FIND-02** | New **`OSF-DD-12`**. Writing it surfaced that the propagation half of `OSF-R-7` is **blocked**: the Results tab's `section` dimension is inert — every row's `section` is `''` pending **P2-3399** — so propagating would land the user on an empty list, the very lying-filter failure `OSF-R-5` forbids. URL half ships; propagation deferred with its ticket. `requirements.md` `OSF-R-7`, `OSF-AC-8`, the in-scope bullet, the upstream dependency and the ID index all amended |
| **FIND-03** | `OSF-DD-8` rewritten: the mechanism is **per-breakpoint column removal**, not track shrinkage, with the false "all shrinkable" claim quoted and corrected in place. Per-breakpoint templates and derived row minimums tabulated, explicitly labelled derived-not-measured. `OSF-DD-10` gains a fallback: if `OSF-T-1`'s measurement defeats the ladder, the choice returns to the user rather than being made silently in execution |
| **FIND-04** | `OSF-DD-2`'s CASE table now marks `UNTAGGED` as **not SQL-reachable** and explains why (the `rtr`/`rtri`/`rit` INNER JOINs); it is listed for partition completeness only |
| **FIND-05** | `OSF-R-11`, `OSF-R-13`, `OSF-R-14` mapped in §10; all fourteen `OSF-R-*` ids now resolve to at least one DD |
| **FIND-06** | "lifted verbatim" corrected — `INTERMEDIATE` is taken from `countProgramLevelOutcomes`, `EOI_2030` is **adapted** (the source has no `wp_id` predicate for EOI) |
| **FIND-07** | New **`OSF-DD-13`**: Spartan/Helm popover + listbox (not `app-pr-select`, whose flat contract cannot carry grouped headers or subtext; not a bare native `<select>`, forbidden outright), with the full ARIA and keyboard contract tabulated |
| **FIND-08** | Bucket labels fixed in §5's data model; `UNTAGGED` displays as `Not tagged to a ToC area`, matching the mockup. `requirements.md` `OSF-R-2` amended to match |

**Correction closure sweep.** Forward: grepped the superseded values (`all shrinkable`, bare `Not tagged`, deep-link propagation) across the spec folder — 6 residual sites found in `requirements.md` and updated. Backward: grepped referrers to the corrected sections — `requirements.md:37` asserted `OSF-R-7` extends the `results-tab-filter-deeplink` contract, which the amendment falsified; corrected.

**Budget revised:** ~950 → ~1020 LOC (`OSF-DD-13` +90, `OSF-DD-12` −20).

---

## 4. Round 1 Receipt

- **Severe (verified against source, not by judge agreement):** 3 — FIND-01, FIND-02, FIND-03 · all **resolved**
- **Warnings:** 4 · **Suggestions:** 1 · all resolved
- **Contradictions between judges:** 0
- **Fabricated citations found:** 0 — both judges independently reported every other file:line claim in `design.md` checked out against real source
- **Scoped re-judgment:** not run (owner chose `Fix only`); lineage retains one unused fix round and two re-judgments
- **Terminal verdict:** `JUDGMENT: APPROVED ✅` — findings resolved without re-judgment, at owner's direction
