# Requirements — Bilateral Capacity Sharing: Long-term must reveal the Degree sub-radio

## 1. Module / Feature

| Field | Value |
|---|---|
| Module | `bilateral` (primary) · `result-framework-reporting` / bilateral-review (secondary, per OQ-2) |
| Sub-feature | Capacity Sharing for Development — *Length of training* term cascade |
| Module code | `CSD` |
| Owner | Juan David Delgado (`j.delgado@cgiar.org`) |
| Status | `approved` (all three phases approved by Juan David Delgado, 2026-09-18) |
| Type | Bug · **Bug Mode** |
| Depth | **Lite** — root cause confirmed in `proposal.md`, two client files, no server/API/migration surface, no design exploration needed |
| Approval Mode | `gated` |
| Ticket | [P2-3382](https://cgiarmel.atlassian.net/browse/P2-3382) (*To Be Improved*) — this closes its own **AC5** and **AC6** |
| Source | `proposal.md` (this folder). Both open questions resolved by the user on 2026-09-18 → **OQ-1: label "Degree"** · **OQ-2: include the review drawer** |
| Branch | `JuanGuzman-io/akili-propose-p2-3382`, base `performance-refactor` |

## 2. Context

The bilateral (W3) Capacity Sharing section was ported from the W1/W2 `cap-dev-info` screen. In W1/W2, choosing **Long-term** under *Length of training* reveals a **Degree** card with PhD / Master. In bilateral the same control exists, with the same guard condition, but the template places it **inside the `@if (showAllFields())` full-metadata block**, which is collapsed by default — so the guard is never evaluated and the reporter sees nothing (`proposal.md` §4).

The consequence is data granularity, not corruption: every bilateral long-term training is stored as the generic parent term (`capdev_term_id = 4`) because PhD (`1`) and Master (`2`) were never selectable. Fixing the editor makes those values reachable, which in turn exposes a latent gap in the reviewer's drawer, where the same cascade was never modelled at all.

- PRD: `docs/prd.md` — result reporting completeness (`AC-1` typed result integrity).
- UX: `docs/ux-ui/design.md` §8 (components) — the reference rendering is the already-shipped W1/W2 screen.
- TRD: `docs/trd/trd.md` — no architectural change; this is template placement inside an existing Angular component.
- Local authority: `…/type-capacity-sharing/CLAUDE.md` (section contract and traps) and `…/result-review-drawer/AGENTS.md` §8 (sub-content mutation contract).

## 3. In Scope / Out of Scope

### In scope

- Relocating the sub-term radio in `type-capacity-sharing.component.html` so it renders directly under *Length of training*, inside the always-visible MDS block.
- Giving that control `label="Degree"`, matching the P2-3385 decision already shipped in W1/W2.
- Adding the missing term cascade to `cap-sharing-content` (bilateral review drawer) so a stored PhD/Master resolves to *Long-term* + *Degree*.
- Regression tests (jest DOM + Cypress) that fail on current code and pass after the fix.

### Out of scope

- Any change to `cap-dev-info` (W1/W2) — it is the reference behaviour and is correct.
- Changing the MDS checklist, the three published items, or the green-check rule.
- Making the Degree selection mandatory (see `CSD-R-4`).
- Server, DTO, migration, or `validation_capacity_dev_P25` changes.
- Backfill of existing `capdev_term_id = 4` rows — nothing is wrong with them.
- Read-only mode for the bilateral form (does not exist for any bilateral section; recorded as pending in the component's `CLAUDE.md`).
- The hardcoded term-id literals (`=== 4`, `slice/splice` catalogue split) — a real smell in **both** components, pre-existing, recorded as `CSD-OQ-1`.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (bilateral reporter) | Choosing **Long-term** now asks for the degree, as it already does on the W1/W2 screen. Nothing they must do that they did not have to do before — the Degree stays optional |
| QA reviewer / PMU (bilateral review drawer) | *Length of training* now shows the stored value even when it is PhD or Master, instead of rendering blank |

## 5. User Stories

- **`CSD-US-1`** — As a bilateral reporter, I want the Degree question to appear when I choose Long-term, so that I can record PhD or Master without hunting through *Complete full metadata*. *(Refines P2-3382 AC5/AC6.)*
- **`CSD-US-2`** — As a reviewer, I want *Length of training* to show what was reported even when the value is a long-term sub-term, so that I do not read a filled field as empty.

## 6. Functional Requirements

### Required (MUST)

- **`CSD-R-1`** In the bilateral Capacity Sharing section, when *Length of training* is set to **Long-term**, the system MUST render the Degree radio group (PhD / Master) immediately below it, **independently of the state of the *Complete full metadata* toggle**.
- **`CSD-R-2`** When *Length of training* is changed to **Short-term**, the system MUST hide the Degree group and clear any previously chosen degree, persisting `capdev_term_id = 3`.
- **`CSD-R-3`** A stored long-term sub-term MUST round-trip: saving a degree and reloading the result MUST restore *Long-term* selected with that degree selected.
- **`CSD-R-4`** The Degree selection MUST remain optional, and the MDS checklist for `type-specific` MUST continue to publish **exactly three** items (`people-trained`, `delivery-method`, `length-of-training`). Selecting *Long-term* without a degree MUST still satisfy the length-of-training item.
- **`CSD-R-5`** The Degree group MUST render inside the standard field card, framed like every sibling question, rather than as a loose row.
- **`CSD-R-6`** In the bilateral review drawer, a result stored with a long-term sub-term (`capdev_term_id` 1 or 2) MUST display *Length of training* as **Long-term** with that degree shown, and the drawer MUST write the reviewer's resolved choice back into `capdev_term_id` using the same parent/sub contract as the editor.

### Should (SHOULD)

- **`CSD-R-10`** The bilateral Degree control SHOULD present the same label, option order and optionality as the W1/W2 control it mirrors, so the two screens do not diverge again.

### Scenarios

#### Scenario: Long-term reveals Degree with full metadata collapsed *(`CSD-R-1`)*

- GIVEN a bilateral Capacity Sharing result in Editing status
- AND the *Complete full metadata* toggle is in its default **collapsed** state
- WHEN the reporter selects **Long-term** under *Length of training*
- THEN a Degree radio group showing **PhD** and **Master** is rendered directly below *Length of training*
- AND the reporter can select a degree without ever clicking *Complete full metadata*
- BUT it must NOT open, expand, or otherwise alter the *Complete full metadata* toggle state
- AND IT MUST NOT render when *Length of training* has no selection

#### Scenario: Short-term hides and clears the Degree *(`CSD-R-2`)*

- GIVEN the reporter has selected **Long-term** and then **Master**
- WHEN the reporter changes *Length of training* to **Short-term**
- THEN the Degree group disappears
- AND the staged payload carries `capdev_term_id = 3`
- BUT it must NOT leave a stale degree in the component state that a later switch back to Long-term would silently re-apply
- AND IT MUST NOT emit a save while the section has not finished loading (`loaded() === true` gate, P2-3556)

#### Scenario: A saved degree survives a reload *(`CSD-R-3`)*

- GIVEN a bilateral result stored with `capdev_term_id = 2` (Master)
- WHEN the reporter reopens the result
- THEN *Length of training* shows **Long-term** selected
- AND the Degree group is rendered with **Master** selected, with the toggle still collapsed
- AND IT MUST require no user interaction to reach that state

#### Scenario: Green check does not regress *(`CSD-R-4`)*

- GIVEN a bilateral result with at least one participant count, a delivery method, and *Long-term* selected but **no** degree
- WHEN the MDS checklist is published
- THEN the section counts 3/3 and shows the green check
- BUT it must NOT add a fourth checklist item for the degree
- AND IT MUST keep `overallStatus()` reachable as `complete`, so Submit is never silently disabled (the failure mode of P2-3348 and of the attendance field in P2-3382)

#### Scenario: The Degree group is framed like its siblings *(`CSD-R-5`)*

- GIVEN the Degree group is visible
- WHEN the section is rendered
- THEN the group's host carries the field-card frame (`field_card`), as *Length of training* and *Delivery Method* do
- AND IT MUST be verified by the rendered class, not by the presence of the `label` input alone — see §9, defect class **B**

#### Scenario: The reviewer sees a stored degree *(`CSD-R-6`)*

- GIVEN a bilateral Capacity Sharing result whose stored `capdev_term_id` is `1` (PhD)
- WHEN a reviewer opens it in the bilateral review drawer
- THEN *Length of training* shows **Long-term** selected and a Degree group shows **PhD** selected
- BUT it must NOT mark the drawer's data-standard snapshot as dirty merely by resolving the stored value — `hasDataStandardUnsavedChanges()` must stay `false` until the reviewer actually changes something, or Approve is wrongly blocked
- AND IT MUST honour the drawer's `[disabled]` input exactly as the sibling controls do

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | The PATCH payload shape is unchanged: `capdev_term_id` remains a single integer resolved as sub-term-or-parent. No new key, no server change |
| Data safety | No write path is added. All writes continue through `queueTypeSave()` behind the `loaded() === true` gate (`type-capacity-sharing/CLAUDE.md`, P2-3556). The drawer continues to mutate `resultTypeResponse[0]` in place, per `result-review-drawer/AGENTS.md` §8 |
| Accessibility | The Degree group gains a **visible** group heading via the field card. This variant of `pr-radio-button` has no `role="radiogroup"`/`aria-label` (only the segmented variant does), so no ARIA claim is made here — the improvement is the visible label and the card frame, nothing more |
| Internationalization | "Degree" is hardcoded, matching `cap-dev-info.component.html:51` and every other string in these two components. No new i18n surface |
| Performance | No new HTTP call. Both components already fetch `GET_capdevsTerms`; only how the response is split changes in the drawer |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `CSD-AC-1` | Bilateral Capacity Sharing, full metadata collapsed | Long-term is selected | The Degree group (PhD/Master) is in the DOM, below *Length of training* |
| `CSD-AC-2` | Long-term + Master selected | *Short-term* is selected | Degree group gone, `capdev_term_id === 3`, `capdevTermId2 === null` |
| `CSD-AC-3` | Stored `capdev_term_id = 2` | The section loads | `capdevTermId1 === 4`, `capdevTermId2 === 2`, Degree visible with the toggle collapsed |
| `CSD-AC-4` | Counts + delivery method + Long-term, no degree | The checklist publishes | Exactly 3 items, all filled |
| `CSD-AC-5` | Degree group visible | The section renders | Its host carries the `field_card` class |
| `CSD-AC-6` | Drawer opened on a result with `capdev_term_id = 1` | The drawer renders | Long-term + PhD shown; `hasDataStandardUnsavedChanges()` is `false` |

Cross-cutting project ACs that already apply: `AC-1` (typed result integrity), `AC-4` (bilateral payload stability — unchanged here).

## 9. Defect Classes & Their Gates

The classes this spec can actually produce, and the command that catches each:

| # | Defect class | Gate | Input that makes the gate FAIL |
|---|---|---|---|
| **A** | **Conditional rendering / template placement** — the exact bug. A node guarded by the wrong ancestor | Jest DOM assertion in the existing `rendered template` describe block (`type-capacity-sharing.component.spec.ts:525`): query the Degree group **without** toggling `showAllFields`. Plus one Cypress case in `bilateral-capacity-sharing-mds.cy.ts` | Put the block back inside `@if (showAllFields())` → both fail. This is the red-before condition of the mandatory regression test |
| **B** | **Presentation — bare vs carded** | Assert the rendered `field_card` **class** on the Degree host, not the `label` input. `isBare = !hasLabel && !(showDescription && description)` (`field-card.component.ts:268`) makes the class a real behavioural consequence, so this is a rendered effect, not a presence-assertion | Remove `label="Degree"` → `isBare` becomes true, the class is absent, the assertion fails |
| **B′** | **Visual fidelity vs the W1/W2 screenshot** (spacing, order, card chrome) | ❗ **No automated gate.** jsdom cannot measure layout, and the class assertion in **B** proves the frame exists, not that it *looks* like the reference. **Substitute: a human visual check against `/result/result-detail/9448/cap-dev-info?phase=36` at the Phase-3 HITL pause**, recorded in `execution.md` | — (accepted: verified by eye, not by command) |
| **C** | **Cascade state regression** — sync/clear logic broken while moving the node | Existing unit tests `type-capacity-sharing.component.spec.ts:372-419` (`capdevTermId1/2`, `syncCapdevTermId`) | Drop the `capdevTermId2 = null` branch in `onCapdevTermId1Change()` → the clear test fails |
| **D** | **Drawer false-dirty** — hydration writing back into `capdev_term_id` and tripping `hasDataStandardUnsavedChanges()`, which blocks **Approve** | New unit test: set `resultDetail` with `capdev_term_id = 1`, assert the normalized snapshot is byte-identical before and after hydration | Hydrate by assigning `capdev_term_id = capdevTermId1` → the snapshot differs, the test fails |
| **E** | **Green-check / Submit regression** — a fourth checklist item disabling Submit | Existing test asserting the checklist has exactly three keys (added by `6de8274b0`) | Register a `degree` item in `setSectionFields` → the test fails |

**Inconclusive is a legitimate outcome.** If the Cypress run cannot reach a Capacity Sharing result (the suite visits `/bilateral/PRMS/create`), report it as *not run* — do not let a jest-only green stand in for class **A** coverage at the browser level, and do not read a skipped spec as a pass.

Verification commands (per root `CLAUDE.md`, agent-lean):

```
npx jest --silent --reporters=summary --no-coverage --testPathPattern="(type-capacity-sharing|cap-sharing-content)"
npx ng lint --quiet
```

⚠️ Per the recorded lesson, copy `src/environments/*.ts` (gitignored, per-environment) into this worktree before running any client suite, or every spec dies with `Cannot find module` / `Tests: 0` — a `Tests: 0` result is **not** a pass.

## 10. Dependencies & Assumptions

### Upstream

- `GET /capdevs-terms` (`capdevs-terms.service.ts` → `find()` with no `ORDER BY`), seeded by migrations `1668784095214` (PhD, Master, Short-term) and `1668806452093` (Long-term) → ids 1, 2, 3, 4 in that order.
- `BilateralExpandableStateService` (toggle persistence), `BilateralMdsTrackerService` (checklist), `BilateralAutoSaveService` (staged writes).

### Downstream

- Bilateral review drawer (`cap-sharing-content`) — in scope here, `CSD-R-6`.
- Nothing else reads `capdev_term_id` on the client.

### Assumptions

- **`A1`** — `GET_capdevsTerms` returns `[PhD, Master, Short-term, Long-term]` in that order. Both components already depend on this (the editor's two `splice(0,2)` calls, the drawer's `slice(2,4)`); this spec does not make the dependency worse, and does not fix it either (`CSD-OQ-1`).
- **`A2`** — The drawer's `[disabled]` input blocks interaction but does not switch controls to a read-only rendering. Pre-existing and deliberately unchanged (`result-review-drawer/AGENTS.md`, P2-3154).

## 11. Open Questions

- **`CSD-OQ-1`** — The term ids are hardcoded as literals in both components (`=== 4`, `=== 1 || === 2`) and the catalogue is split positionally (`splice` / `slice`). Given the recorded lesson that catalogue ids can differ between environments, this is fragile — but it is **pre-existing, identical in W1/W2, and outside a bugfix's scope**. Recommendation: note it on P2-3382 rather than fold it in. Does not block this spec.
- **`CSD-OQ-2`** — Before touching `result-framework-reporting/…/cap-sharing-content`, notify that module's owner (Slack DM: epic, activity, components), per the repo's module-ownership rule. Pending, and it gates only the drawer task, not the editor task.

## 12. Requirement ID Index

| ID | Title | Scenarios | ACs |
|---|---|---|---|
| `CSD-R-1` | Long-term reveals Degree regardless of the toggle | Long-term reveals Degree | `CSD-AC-1` |
| `CSD-R-2` | Short-term hides and clears Degree | Short-term hides and clears | `CSD-AC-2` |
| `CSD-R-3` | Stored sub-term round-trips | A saved degree survives a reload | `CSD-AC-3` |
| `CSD-R-4` | Degree optional; checklist stays at three items | Green check does not regress | `CSD-AC-4` |
| `CSD-R-5` | Degree renders inside the field card | Framed like its siblings | `CSD-AC-5` |
| `CSD-R-6` | Reviewer drawer resolves stored sub-terms | The reviewer sees a stored degree | `CSD-AC-6` |
| `CSD-R-10` | Parity with the W1/W2 control | (covered by `CSD-R-1`, `CSD-R-5`) | — |

## Required cross-references

- `docs/prd.md` — `AC-1` typed result integrity.
- `docs/ux-ui/design.md` §8 — component framing; the live reference is the W1/W2 Capacity Sharing screen.
- `docs/trd/trd.md` — no ADR affected; no architectural change.
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-capacity-sharing/CLAUDE.md` — section contract and traps (load gate, three-item checklist, the load-bearing `splice` order).
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/AGENTS.md` §8 — sub-content mutation contract for `result_type_id = 5`.
