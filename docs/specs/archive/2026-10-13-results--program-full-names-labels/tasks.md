# Module Spec — `tasks.md`

## 1. Scope

- **Module / feature:** `results` / `program-full-names-labels`
- **Linked spec:** `requirements.md` + `design.md` (same folder)
- **Depth:** Lite · **Status:** `approved` (2026-10-13)

## 2. Pre-flight

- [x] `requirements.md` approved (2026-10-13)
- [x] `design.md` approved (2026-10-13)

**Test rules (all tasks):** Jest always with `--maxWorkers=2 --no-coverage` and a scoped `--testPathPattern`. Never the full suite. One test run at a time. Lint only the touched files: `npx eslint <files> --quiet`.

## 3. Tasks

### [x] `PFN-T-1` — Shared label rule + pipe

- **Type:** `client`
- **Description:** Create `shared/utils/science-program-label.util.ts` with `scienceProgramLabel(code, ...nameCandidates)` and the moved `withScienceProgramLabel`. Create the standalone pure pipe `shared/pipes/sp-label.pipe.ts` (`spLabel`). In `aow-hlo-create-modal.component.ts`, delete the local helper, import it from shared and re-export it.
- **Implements:** PFN-R-2 (no `undefined`/`null`, no trailing `" - "`; empty → `''`), PFN-R-3 (single rule, `" - "` separator)
- **Design refs:** §3, §9, DD-1
- **Files:** the 2 new files + their `.spec.ts`, `aow-hlo-create-modal.component.ts`
- **Depends on:** — · **Blocks:** T-2, T-3 · **Estimate:** S · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** `('SP10', null, undefined, 'GEI')` must give `SP10 - GEI`. `('SP10', '  ')` must give `SP10`. `(null, 'X')` must give `X`. `(undefined)` must give `''`. Any output containing `undefined`, `null`, or ending in `" - "` fails.
  - **Run:** `npx jest --maxWorkers=2 --no-coverage --testPathPattern="science-program-label|sp-label.pipe|aow-hlo-create-modal"`. The existing helper cases at `aow-hlo-create-modal.component.spec.ts:1124-1142` must stay green unchanged, which proves the move kept the behavior.
  - **Disqualifier:** if those existing helper assertions had to be edited to pass, the behavior changed. Stop.

### [x] `PFN-T-2` — Results Center surfaces (S1–S4)

- **Type:** `client`
- **Description:**
  - **Interface:** add the optional `submitter`, `submitter_name` and `submitter_short_name` to `current-result.interface.ts`.
  - **S1:** add `programLabel(r)` to `results-list`. The Program cell renders it, with the dot unchanged, an ellipsis span and `[attr.title]`. In `RC_COLUMNS`, the program width goes to `200px` and `minPx` to 120.
  - **S2:** build the chip label (`results-list-filters.ts:425`) and `displayName` (`:572`) with the shared rule.
  - **S3:** in `results-to-update-modal`, both submitter spots use the label.
  - **S4:** in `global-search-palette.service`, add `submitterLabel` to the row model and mapper. Render it in the chip and include it in the aria string.
- **Implements:** PFN-R-1 (S1 scenario incl. one line + ellipsis + title, BUT the dot colour unchanged; S2 dropdown scenario incl. BUT the value unchanged; text-mention scenario S3/S4), PFN-R-2 (S1 `—` placeholder kept)
- **Design refs:** §8 (S1, S2), DD-3, DD-4
- **Files:** `current-result.interface.ts`, `results-list.component.{ts,html,scss}`, `results-list-filters.component.ts`, `results-to-update-modal.component.{html,ts}`, `global-search-palette.service.ts`, `global-search-palette.component.html`, and the specs of those components
- **Depends on:** T-1 · **Estimate:** M · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** a row with `{submitter:'SP10', submitter_name:'Gender'}` must render a Program cell containing `SP10 - Gender` with `title` equal to the same string. A row with `{submitter:'SP10'}` only must render `SP10`. A row with neither must render `—`. `programDotColor` must receive `SP10`. The filter chip must read `SP10 - Name`. Any filter payload or `optionValue` change shows up as a red existing filter spec.
  - **Run:** `npx jest --maxWorkers=2 --no-coverage --testPathPattern="results-list.component|results-list-filters|results-to-update-modal|global-search-palette"`
  - **Disqualifier:** if existing assertions on the old `"SP01 Name"` text are rewritten to the new format, that is expected (DD-4). If a **filter value** assertion has to change, that is not expected. Stop.
  - **Not provable in jsdom:** the column width, the ellipsis and the absence of wrapping. Covered by a manual check at the HITL pause: Results Center at 1280px and 1920px, long names truncate on one line, hover shows the full label.

### [x] `PFN-T-3` — Dropdowns and notifications elsewhere (S5–S8)

- **Type:** `client`
- **Description:**
  - **S5:** `lab-report-form` maps `GET_AllInitiatives('p25')` through `withScienceProgramLabel`. Set `optionLabel="sp_label"`.
  - **S6:** `outcome-indicator` `mapInitiativeData` adds `sp_label` (entity-type group header rows untouched). The `indicator-results-modal` filter uses `optionLabel="sp_label"`, with `optionValue="official_code"` kept.
  - **S7:** `user-management`: the entity options get `sp_label` and the html uses `optionLabel="sp_label"`. The chip at `ts:274` uses the rule.
  - **S8:** `notification-item` (9 spots) and `pop-up-notification-item` (4 spots: lines 113, 118, 129 + the `@let` at 29 only if it is displayed) use `| spLabel`, with the pipe added to `imports`. First confirm that `obj_shared_inititiative` / `obj_owner_initiative` carry `name` in the notifications payload. If not, the fallback shows the code; record it.
- **Implements:** PFN-R-1 (dropdown scenario for S5–S7 incl. BUT the value unchanged; text-mention scenario S8), PFN-R-2 (fallback in notifications)
- **Design refs:** §8, DD-2
- **Files:** `lab-report-form.component.{ts,html}`, `outcome-indicator.component.ts`, `indicator-results-modal.component.html`, `user-management.component.{ts,html}`, `notification-item.component.{ts,html}`, `pop-up-notification-item.component.{ts,html}`, and their specs
- **Depends on:** T-1 · **Parallel-safe with T-2:** yes for code, no for test runs (one run at a time) · **Estimate:** M · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** options built from `[{id:1, official_code:'SP01', name:'Breeding'}]` must expose `sp_label === 'SP01 - Breeding'` and keep `id`/`official_code` untouched. A notification with `obj_shared_inititiative:{official_code:'SP01', name:'X'}` must render `SP01 - X`. With no name it must render `SP01`.
  - **Run:** `npx jest --maxWorkers=2 --no-coverage --testPathPattern="lab-report-form|outcome-indicator.component|indicator-results-modal|user-management.component|notification-item"`
  - **Disqualifier:** if an existing assertion on a selected value, query param or request body changes, the value contract was broken. Stop.
- **Lint (T-1..T-3):** `npx eslint <touched files> --quiet` from `onecgiar-pr-client`.

## 4. Dependency graph

```
PFN-T-1 ──▶ PFN-T-2
        └─▶ PFN-T-3
```

## 5. Coverage closure

| Clause | Task |
|---|---|
| R-1 S1: label, one line + ellipsis + title | T-2 (jsdom: text + title; layout: manual) |
| R-1 S1 BUT: dot colour unchanged | T-2 |
| R-1 dropdown: option + chip label, search by code or name | T-2 (S2), T-3 (S5–S7) |
| R-1 dropdown BUT: value unchanged | T-2, T-3 (existing value assertions stay green) |
| R-1 text mentions S3, S4, S8 | T-2, T-3 |
| R-2 code-only fallback; no `undefined`/`null`; `—` kept | T-1 (rule), T-2 (S1 placeholder), T-3 (notifications) |
| R-3 single rule, `" - "` | T-1 |

## 6. Definition of done (spec)

- [x] T-1..T-3 green on their scoped runs; lint clean
- [x] Manual check of the Results Center Program column at 1280/1920 px (HITL): user screenshot 2026-10-13 shows one line + ellipsis, dot unchanged; column rendered narrower than 200px (likely persisted user column width)
- [x] `git diff --stat` touches only the files listed above plus the spec docs (+ recorded deviations: `outcome-indicator.service.{ts,test}`, 3 folder `CLAUDE.md`)
- [x] Commit only on user go-ahead: `✨ feat(results-list) [SPEC:results/program-full-names-labels]: show program full name next to code in lists and filters`
