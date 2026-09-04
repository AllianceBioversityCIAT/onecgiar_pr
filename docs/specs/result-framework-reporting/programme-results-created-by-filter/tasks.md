# Tasks — Filter the programme Results tab by Created by

## 1. Scope of this task list

- **Module / feature:** `programme-results` — Created by filter dimension (client only)
- **Linked spec:** `./requirements.md` (`CBF-R-1`…`R-3`, `CBF-AC-1`…`AC-4`) · `./design.md` (`CBF-DD-1`…`DD-4`)
- **Owner / driver:** session implementer
- **Status:** `approved` (Phase 3, 2026-09-03) · execution `not-started`
- **Depth:** Lite · **Budget:** 2 tasks / ~160 LOC / 1 review round (`design.md` §1)

## 2. Pre-flight checklist

- [ ] `requirements.md` approved (Phase 1)
- [ ] `design.md` approved (Phase 2)
- [ ] Open questions resolved (none blocking; Lite locks in `requirements.md` §11)
- [ ] No migrations, no backend, no CLARISA change
- [ ] No conflicting in-flight spec editing `programme-results/**` (re-check `docs/specs/` at execute start)
- [ ] Do not touch `package.json` / `package-lock.json`

## 3. Task list

### `CBF-T-1` — Add the Created by filter dimension (service + options + chips) `[x]`

- **Type:** `client`
- **Description:** Extend the pure filter service and the row-derived options list so Created by is an eighth dimension. No router, no template. Match the Center pattern (`CBF-DD-1`).
- **Implements:**
  - `CBF-R-1` — *Filter by a person who has rows*: THEN only that person’s rows remain; AND status counters can recount over the subset via existing `{ ignoreStatus: true }` + new predicate; **BUT NOT** offer a blank option (`optionsOf` non-empty guard). Predicate case-insensitive (`normalize`).
  - `CBF-R-1` — *Combine with another dimension*: THEN Angel Jarrin ∩ Submitted only; **BUT NOT** drop the Status chip or the Created by chip.
  - `CBF-R-2` — *Chip and Clear all*: chip label `Created by: {name}`; `clearChip` on that dimension leaves Status set; `clearAll` nulls Created by (and Status). **AND IT MUST** include the chip in `activeChips()` so the badge (T-2) can count it.
  - `CBF-AC-1` · `CBF-AC-2` (service half)
- **Does not implement:** the popover control (`AND IT MUST` `app-pr-filter-select`) — T-2. Phase-default restore after Clear all — T-2 (component wraps `clearAll`).
- **Design:** `CBF-DD-1` · §2.1 filter + data services · §10 first two spec rows
- **Files (expected):**
  - `programme-results-filter.service.ts` + `.spec.ts`
  - `programme-results.service.ts` + `.spec.ts`
- **Depends on:** — · **Blocks:** `CBF-T-2`
- **Estimate:** S (~70 LOC incl. spec)
- **Skills:** `angular-developer` · `tdd`
- **Scope:**
  - Dimension type + state: `createdBy`
  - `selectedCreatedBy` signal (`null` = off)
  - Predicate: `normalize(selectedCreatedBy) === normalize(row.createdBy)`
  - Chip after Center: `Created by: {name}`
  - `clearCreatedBy` / `clearChip` / `clearAll`
  - `createdByOptions = optionsOf(rows, row => row.createdBy)`
  - Update “seven dimensions” comments in the filter service only
- **Tests:**
  - Filter-service: two authors + one blank-name row; select A → only A; blank excluded; mixed-case select still matches; A + Status Submitted → intersection; both chips present; `clearChip(createdBy)` keeps Status; `clearAll` nulls Created by.
  - Data-service: options sorted, deduped, **no blanks** when fixtures include `''` / missing name.
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="programme-results-filter.service.spec|programme-results.service.spec" --silent --reporters=summary --no-coverage
  ```
  - **Pass:** both suites green; new cases above present.
  - **FAIL input:** predicate compares `row.center` (or ignores Created by) → two-author fixture still returns B. Options drop the `!!value` filter → blank appears.
  - **Disqualifier:** a green run that never constructs a two-author fixture is not evidence for `CBF-R-1`. A presence-only assert that `selectedCreatedBy` exists is not a behavioral proof.
- **Definition of done:**
  - [x] All T-1 tests above green on the scoped command
  - [x] Filter service still has no `Router` / `ActivatedRoute` import (`CBF` NFR Purity)
  - [x] No template / URL / `package.json` edits
  - [x] No secrets in logs (`.cursorrules`)

### `CBF-T-2` — Popover control + URL hydrate/mirror

- **Type:** `client`
- **Description:** Wire Created by into the Filter popover (Center | Created by two-column row) and into the existing hydrate/mirror effects. Param name `createdBy` (`CBF-DD-3`). Same equality + `untracked` + `replaceUrl` + `merge` guards as Center (`RFD-DD-4/5`).
- **Implements:**
  - `CBF-R-1` — *Filter by a person*: popover select; **AND** status summary recounts on the running table; **AND IT MUST** use `app-pr-filter-select` (never `custom-fields/pr-select`).
  - `CBF-R-1` — *Combine with another dimension*: selecting Created by then Status leaves both chips and the intersection on the table.
  - `CBF-R-2` — *Chip and Clear all*: chip × via existing `clearChip`; **Clear all** calls component `clearAll()` which restores `defaultPhase()` (**BUT NOT** remove the Phase chip’s default); **AND IT MUST** badge `=== activeChips().length` after each clear.
  - `CBF-R-3` — *Deep link and copy link*: hydrate `createdBy`; dropdown + chip match; later change `navigate`s with `replaceUrl: true`, `queryParamsHandling: 'merge'`; **BUT NOT** alter `phase` / `reviewResult` / `reviewResultId` / `status` / `category` / `origin` / `center`; **AND IT MUST** keep an unknown name (chip + filtered-empty text).
  - `CBF-R-3` — *No createdBy param*: Created by stays `null`; no extra `navigate` from that key.
  - `CBF-AC-2` (badge / table) · `CBF-AC-3` · `CBF-AC-4`
- **Design:** `CBF-DD-2` · `CBF-DD-3` · `CBF-DD-4` · §6.3 · §10 component row
- **Files (expected):**
  - `services/programme-results-query-params.ts`
  - `programme-results.component.ts` / `.html` / `.spec.ts`
- **Depends on:** `CBF-T-1` · **Blocks:** —
- **Estimate:** S (~90 LOC incl. spec)
- **Skills:** `angular-developer` · `ui-ux-pro-max`
- **Scope:**
  - Map `createdBy` in `PROGRAMME_RESULTS_QUERY_PARAM_MAP`
  - `createdBySelectOptions`, `onCreatedByChange` → `toFilterValue`
  - Hydrate + mirror include the new key (write only when different)
  - Template: row 3 two-column grid, Center | Created by; `aria-label="Filter by created by"`; overline **Created by**
- **Tests:**
  - `onCreatedByChange('Angel Jarrin')` → only those rows, chip, badge incremented
  - Created by + Status → intersection; both chips
  - Hydrate `createdBy=Angel%20Jarrin` → signal + chip; `navigate` count `0` after hydrate
  - `createdBy=Nobody` → chip + filtered-empty copy; no throw
  - No `createdBy` param → `selectedCreatedBy` null; today’s chips unchanged
  - Change/clear → `navigate` once with `replaceUrl: true`, `merge`, key `createdBy`; other keys preserved
  - Component `clearAll()` → `createdBy` null in next params **and** `selectedPhase === defaultPhase()`
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npm run test -- --testPathPattern="programme-results.component.spec|programme-results-filter.service.spec|programme-results.service.spec" --silent --reporters=summary --no-coverage
  ```
  - **Pass:** suites green; `navigate` assertions use the **actual args**.
  - **FAIL input:** hydrate maps `createdBy` onto `center` → Angel Jarrin never appears as Created by. Omit `replaceUrl` → assertion red. `clearAll` without restoring `defaultPhase` → phase chip gone.
  - **Disqualifier:** a spec that only reads `snapshot` and never emits on the `queryParamMap` subject cannot prove the anti-loop clause. A class-name grep for `app-pr-filter-select` is presence-only — it cannot prove the mandatory-field scan stays quiet.
- **HITL (required; jsdom cannot see these):**
  - Diff: the new control is `app-pr-filter-select`.
  - Live Orca tab, Filter open: Center | Created by share one row; no overflow at ~1280px; keyboard can open and pick a name; badge matches chips.
  - **What HITL proves that Jest cannot:** popover layout and the mandatory-field false-positive. **What Jest still must prove:** filter math and URL args.
- **Definition of done:**
  - [ ] Scoped Jest command above green
  - [ ] HITL notes recorded in `execution.md` when executed
  - [ ] No `package.json` / server / i18n-module edits
  - [ ] No secrets in logs

## 4. Dependency graph

```
CBF-T-1 (dimension + options + chips)
   └── CBF-T-2 (popover + URL)
```

No cycles. Not parallel — T-2 writes `selectedCreatedBy`, which T-1 introduces.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `CBF-TEST-1` | unit (pure filter) | `CBF-R-1` both scenarios (THEN / BUT chips / case-insensitive) · `CBF-R-2` chip + `clearChip` + `clearAll` · `CBF-AC-1` · `CBF-AC-2` | `programme-results-filter.service.spec.ts` |
| `CBF-TEST-2` | unit (options) | `CBF-R-1` **BUT NOT** blank option | `programme-results.service.spec.ts` |
| `CBF-TEST-3` | unit (component + route stubs) | `CBF-R-1` table + status recount · `CBF-R-2` badge + phase default · `CBF-R-3` both scenarios · `CBF-AC-3` · `CBF-AC-4` | `programme-results.component.spec.ts` |
| `CBF-TEST-4` | HITL live | `CBF-R-1` **AND IT MUST** `app-pr-filter-select` · popover two-column row · a11y name | Orca Filter-open on `entity-details/SP01/results` |

Coverage matrix (clause → task). A gap may not be discharged by citing a different requirement.

| Clause | Owner |
|---|---|
| `CBF-R-1` Filter by person — THEN only that person | `CBF-T-1` |
| `CBF-R-1` Filter by person — AND status summary recounts | `CBF-T-2` (`CBF-TEST-3`) |
| `CBF-R-1` Filter by person — BUT NOT blank option | `CBF-T-1` (`CBF-TEST-2`) |
| `CBF-R-1` Filter by person — AND IT MUST `app-pr-filter-select` | `CBF-T-2` HITL |
| `CBF-R-1` Combine — THEN intersection | `CBF-T-1` + `CBF-T-2` |
| `CBF-R-1` Combine — BUT NOT drop either chip | `CBF-T-1` |
| `CBF-R-2` chip × leaves Status | `CBF-T-1` |
| `CBF-R-2` Clear all removes Status | `CBF-T-1` |
| `CBF-R-2` BUT NOT remove default Phase | `CBF-T-2` |
| `CBF-R-2` AND IT MUST badge === chip count | `CBF-T-2` |
| `CBF-R-3` deep link THEN / AND address bar | `CBF-T-2` |
| `CBF-R-3` BUT NOT alter sibling params | `CBF-T-2` |
| `CBF-R-3` AND IT MUST unknown name stays | `CBF-T-2` |
| `CBF-R-3` No createdBy param | `CBF-T-2` |

## 6. Rollout & verification

- [ ] **Single PR** — ~160 LOC, under the ~400 LOC split threshold. Review `programme-results-query-params.ts` and the two effects first; out of scope: Results Center, result-detail ⓘ, Overview deep links.
- [ ] Scoped Jest + `npx eslint` on touched files (or `npx ng lint --quiet` if already running for the package).
- [ ] Manual: `…/entity-details/SP01/results?phase=Reporting%202026&createdBy=Angel%20Jarrin` then change the dropdown and confirm the address bar updates without a Back-button trap.

## 7. Cleanup & follow-ups

- [ ] Spec status → `shipped` at archive
- [ ] `programme-results/CLAUDE.md` “seven dimensions” → “eight” (pending on spec branch; apply on default branch per write discipline)
- [ ] Multi-select / Created by me remain deferred (`design.md` §13)

## 8. Roll-back plan

1. Revert the single PR.
2. No migration, no flag, no payload change.
3. URLs with `?createdBy=` become unused query params and are ignored — harmless.

## Required cross-references

- `./requirements.md` · `./design.md`
- `docs/prd.md` G1 · `US-P1` · `AC-3` · `AC-4` · `AC-9`
- `docs/ux-ui/design.md` §2 · §10
- `docs/trd/trd.md` results list
- Archived sibling tasks: `docs/specs/archive/2026-08-27-changes--sp-overview-echarts/results-tab-filter-deeplink/tasks.md`
