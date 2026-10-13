# Execution Log — `results/program-full-names-labels`

## Document Control

- **Spec:** `docs/specs/results/program-full-names-labels/` (Lite, approved 2026-10-13)
- **Branch:** `qa-development-2026-ss`
- **Approval mode:** `gated` (none recorded in Document Control → default)
- **Leader:** Opus (T1) · **Implementer:** `akili-implementer` wrapper (T2) · **Reviewer:** `akili-reviewer` wrapper (T3)
- **Budget (design §11):** 3 tasks · ~120 prod + ~90 test LOC · 1–2 review rounds · tripwire at > 4 tasks or ~300 LOC

## Task Execution History

### PFN-T-1 — Shared label rule + pipe · **PASS** · 2026-10-13

- **Attempts:** 1 · **Effort:** medium · **Skills assigned:** `angular-developer`, `tdd`
- **Files changed** (under `onecgiar-pr-client/src/app/`):
  - New: `shared/utils/science-program-label.util.ts` (`scienceProgramLabel`, moved `withScienceProgramLabel`, exported `ScienceProgramNameFields`)
  - New: `shared/utils/science-program-label.util.spec.ts`
  - New: `shared/pipes/sp-label.pipe.ts` (standalone pure `SpLabelPipe`, name `spLabel`)
  - New: `shared/pipes/sp-label.pipe.spec.ts`
  - Edited: `pages/result-framework-reporting/.../aow-hlo-create-modal.component.ts` — local type + helper removed, imported from shared, `export { withScienceProgramLabel };`
- **Verification:** `npx jest --maxWorkers=2 --no-coverage --testPathPattern="science-program-label|sp-label.pipe|aow-hlo-create-modal"` → 3 suites, 73 tests passed, 0 failed. `aow-hlo-create-modal.component.spec.ts` unmodified (helper cases 1124-1142 green unedited → Disqualifier not triggered).
- **Lint:** `npx eslint` is unusable in the client (no ESLint 9 flat config); substituted `npx ng lint --quiet --lint-file-patterns <5 files>` → all files pass. Reviewer accepted as an equivalent file-scoped gate.
- **Reviewer verdict (attempt 1):** `STATUS: PASS`: one rule with the `" - "` separator; all four Falsifier cases are asserted verbatim; the signature is kept and re-exported; scope is limited to the task's files. No advisory block (small diff).
- **Implementer Not Done / Assumptions (verbatim intent):** blank/whitespace-only name candidates now count as missing and fall through to the next candidate. The old helper used `??`, so `{official_code:'SP10', name:'  ', short_name:'GEI'}` gave `SP10`; it now gives `SP10 - GEI`. No existing assertion exercises it.
  - **Leader decision:** this is an accepted behavior refinement, not outstanding scope. It follows the requirements §3 glossary fallback order and the T-1 Falsifier `('SP10','  ') → 'SP10'`. The Reviewer judged it consistent with the spec and noted that, read strictly, it is a small departure from design §9's "keeps its output". Recorded here for traceability.
- **Requirements covered:** PFN-R-2, PFN-R-3
- **Issues:** none blocking.

### PFN-T-2 — Results Center surfaces (S1–S4) · **PASS** (attempt 2) · 2026-10-13

- **Attempt 1** (effort medium, skills `angular-developer`, `spartan`). Ran in parallel with PFN-T-3 under a shared Jest lock (`scratchpad/jest.lock`).
  - **Files:** `current-result.interface.ts` (+`submitter_name`, `submitter_short_name`; `submitter` already existed); `results-list.component.{ts,html,scss,spec}` (`programLabel`, width 200px / minPx 120, ellipsis on `.rc-program__code`, `[attr.title]`); `results-list-filters.component.{ts,spec}` (chip label + `displayName` via the shared rule); `results-to-update-modal.component.{ts,html,spec}` (`submitterLabel`); `global-search-palette.{service,component}.{ts,spec}` + `.component.html` (`submitterLabel`, chip, aria string, `max-w-[220px] truncate`).
  - **Verification:** scoped Jest → 9 suites, 356 passed. Lint by the Leader: `ESLINT_USE_FLAT_CONFIG=false npx eslint <T-1+T-2 ts/html> --quiet` → exit 0. `ng lint --lint-file-patterns` is rejected by this CLI ("Unknown arguments"), so the T-1 lint evidence was really this eslint run.
  - **Expected assertion changes (DD-4):** three `displayName` strings went from `INIT-01 Initiative A` to `INIT-01 - Initiative A`. No value, payload or `optionValue` assertion changed.
  - **Reviewer verdict:** `STATUS: FAIL`
    1. **Discovered Issue:** `programLabel()` omits `initiative_name` / `initiative_short_name`, so rows that fall back to `initiative_official_code` (W3/Bilateral) show only the code. **Violated Rule:** design.md §8 (S1) fallback chain; requirements.md §3. **Remediation:** pass `submitter_name, initiative_name, submitter_short_name, initiative_short_name`; add an `SGP-02 - X` case; optionally align the modal `submitterLabel`.
  - **ADVISORY (attempt 1):** RELIABILITY: no DOM test on the Program cell. READABILITY: the palette chip truncates with no `title`. READABILITY: the comment in `ipsr-list-filter.service.ts:6-7` still quotes the old format; noted for Part 2, not this spec. READABILITY: `programLabel` is called twice per row per change-detection cycle (allowed by design; a pipe would fit DD-2 if lists get heavy).
  - **Leader decision for attempt 2 (effort high):** fix issue 1 plus the modal alignment (S3 uses the same row type), and apply the first two advisories because they are cheap and inside S1/S4. The other advisories are recorded only.
- **Attempt 2** (effort high): fixed issue 1. `programLabel` = `scienceProgramLabel(programCode(r), submitter_name, initiative_name, submitter_short_name, initiative_short_name)`. The modal `submitterLabel` uses the same order. The palette chip gets `[attr.title]="row.submitterLabel || null"`. Specs added: results-list `SGP-02 - X`, the same fallback in the modal, and a palette DOM test (chip text + title `SP01 - Breeding`).
  - **Verification:** scoped Jest → 9 suites, 358 passed. `ESLINT_USE_FLAT_CONFIG=false npx eslint <touched> --quiet` → exit 0.
  - **Implementer Not Done:** no DOM test on the S1 Program cell. `results-list.component.spec.ts` stubs `app-pr-table` with an empty template, so the projected cell never renders. Covered by the `programLabel` unit tests plus the template binding. **Leader decision:** this was an advisory, not owed scope. It is recorded as an explicit coverage gap against tasks.md §5 ("T-2 (jsdom: text + title)"), and the real check is the HITL manual check.
  - **Reviewer verdict:** `STATUS: PASS`. The design §8 chain is exact; dot / placeholder / title / width are correct; S2 values are unchanged (only the DD-4 `displayName` strings moved); S3/S4 are correct; the interface only gains optional fields.
  - **ADVISORY (attempt 2):** RELIABILITY: the S1 cell DOM gap above; manual check at 1280/1920 px. READABILITY: the palette mapper has no `initiative_*` fallback, which is consistent with `submitterCode` having none either; relevant only if search rows can have a null `submitter`.
- **Final:** **PASS** on attempt 2. **Requirements covered:** PFN-R-1 (S1–S4), PFN-R-2.
- **Note:** another session in the same checkout has uncommitted changes in `program-overview/*` and `bilateral-overview/*` (SR-164368). They are not part of this spec and must stay out of its commit.

### PFN-T-3 — Dropdowns and notifications elsewhere (S5–S8) · **PASS** (attempt 2) · 2026-10-13

- **Attempt 1** (effort medium, skill `angular-developer`). Ran in parallel with PFN-T-2 under the shared Jest lock.
  - **Pre-review delta (Leader):** the first report listed `scienceChipLabel` (lab-report-form chip) and `primaryRequestParts().code` (pop-up) as Not Done. Both are in approved scope (PFN-R-1 dropdown-chip and text-mention scenarios), so the Leader sent them back before review. They were closed.
  - **Files:** lab-report-form `.{ts,html,spec}` (options via `withScienceProgramLabel`, both `otherScienceList()` selects use `sp_label`, `scienceChipLabel` uses the rule); outcome-indicator `.component.{ts,spec}` (`mapInitiativeData`); `services/outcome-indicator.service.{ts,test}` (**file-list deviation:** `loadAllInitiatives` maps `sp_label`, needed because the S6 modal reads the service signal); indicator-results-modal `.html`; user-management `.{ts,html,spec}`; notification-item `.{html,module,spec}` (9 spots use `| spLabel`); pop-up-notification-item `.{ts,html,spec}` (113 ×2, 118, 129, `primaryRequestParts`; the unused `@let` at line 29 is skipped).
  - **Payload finding:** `share-result-request.service.ts` ~1463–1471 selects `id, official_code, name` for both notification initiative objects, so names render.
  - **Verification:** full scoped Jest → 14/14 suites, 786/786 passed. `ESLINT_USE_FLAT_CONFIG=false npx eslint <touched> --quiet` → exit 0. The only edited existing assertion is the outcome-indicator.service load test (additive `sp_label`).
  - **Reviewer verdict:** `STATUS: FAIL`
    1. **Discovered Issue:** the S7 entity chip renders `[object Object]` in real use. `app-pr-filter-multiselect` has no `optionValue`, so the model holds whole entity objects, and `activeFilterChips` looks up `entityNames.get(object)` → `undefined` → `String(object)`. The bug predates this task. The new test passes only because it sets `selectedEntities.set([5])`, a numeric id the control never produces. **Violated Rule:** requirements.md §5 PFN-R-1 dropdown-chip scenario; tasks.md PFN-T-3 S7. **Remediation:** look up by `v?.id ?? v` and keep `value: v`; do not flatten `onEntitiesChange` (that would trip the Disqualifier at spec:371-372); add a spec that selects through the real control.
  - **Reviewer answers:** (a) the `Other(s) - Science Program(s)/Accelerator(s)` sentinel chip is acceptable; (b) moving `full_name` to `sp_label` at html:705 loses only the bold acronym and acronym search, which is acceptable under PFN-R-3; (c) the service edit is needed for S6. The component's `mapInitiativeData` `sp_label` is currently inert because the header select uses `full_name`.
  - **ADVISORY (attempt 1):** RISK: `sp_label` now travels in the create body via `mergeContributors` (`create-result-payload.util.ts:247,322`), like `full_name` and the AOW modal already do; no global whitelist pipe was found. READABILITY: the lab-report-form ToC-branch select (html:694) still uses `full_name`, so it shows two formats. RELIABILITY: acronym search is lost in lab-report-form. CONVENTION: client CLAUDE.md §10 says touched folders that have a `CLAUDE.md` need it updated and `Verified:` re-stamped.
  - **Leader decision for attempt 2 (effort high):** fix issue 1 as remediated. Apply the CONVENTION advisory to every folder this spec touched (T-1..T-3), since it is a constitution rule and not new scope. The other advisories are recorded only.
- **Attempt 2** (effort high): `user-management.component.ts` `activeFilterChips` now looks up the entity label by id (`selected.id`, or the raw value when it is not an object) and keeps `value: selected`, so `removeChip` and `toIdList` are unchanged and `onEntitiesChange` is untouched. New spec drives the real `PrFilterMultiselectComponent` (`multiselects[2].toggle(option)`): chip `SP01 - Breeding`, value is the same reference, `selectedEntities()` = `[option]`.
  - **CLAUDE.md (client §10):** updated and re-stamped `Verified: 2026-10-13` in `lab-report-form/`, `notification-item/` and `global-search-palette/` (the latter a T-2 folder). The other touched folders have no `CLAUDE.md` (Reviewer confirmed via Glob). `program-overview/`, `bilateral-overview/` and `dashboard-lab/CLAUDE.md` were not touched (owned by the other session).
  - **Verification:** full scoped Jest → 14/14 suites, 787/787 passed. `ESLINT_USE_FLAT_CONFIG=false npx eslint <touched> --quiet` → exit 0.
  - **Reviewer verdict:** `STATUS: PASS`. The S7 chip is fixed with the value contract intact, the new spec proves the real control path, the CLAUDE.md claims match the code, and there are no secrets. No advisories.
- **Final:** **PASS** on attempt 2. **Requirements covered:** PFN-R-1 (S5–S8), PFN-R-2.

## Summary

- **Status:** all 3 tasks PASS (T-1 on attempt 1; T-2 and T-3 on attempt 2). T-2 and T-3 ran in parallel under a shared Jest lock.
- **Requirements:** PFN-R-1 (S1–S8), PFN-R-2, PFN-R-3 covered.
- **Budget vs design §11:** 3 tasks, as planned. Review rounds: 4 Reviewer verdicts for the two reworked tasks against the expected 1–2. LOC: ~170 prod (126 changed lines + 42 new util/pipe), ~290 test (221 + ~68 new specs), ~9 docs. Prod is within the ~300 tripwire; prod + test is ~460, over the ~210 estimate. The tripwire was not hit mid-run because the overrun is mostly test lines that the Reviewers asked for. Flagged for kaizen: Lite test-LOC estimates for multi-site label work were low.
- **Open for HITL (not automatable):**
  1. Manual check of the Results Center Program column at 1280 and 1920 px: one line, ellipsis, hover title shows the full label. This also covers the S1 cell DOM gap, since jsdom cannot render the projected `app-pr-table` cell.
  2. Commit on user go-ahead only, with explicit paths for this spec's files. Exclude the other session's `program-overview/*`, `bilateral-overview/*` and `dashboard-lab/CLAUDE.md`.
- **Recorded, not actioned (advisories → candidates for Part 2 or a later proposal):** the old-format comment in `ipsr-list-filter.service.ts:6-7`; the lab-report-form ToC-branch select still uses `full_name` (two formats on one form); acronym search lost in lab-report-form; the palette mapper has no `initiative_*` fallback; `sp_label` travels in the create body (harmless, already the case for the AOW modal).
- **Tooling note:** `ng lint --lint-file-patterns` is rejected by this CLI and plain `npx eslint` finds no flat config. `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet` is the working file-scoped lint. The T-1 lint line above should be read in that light.
