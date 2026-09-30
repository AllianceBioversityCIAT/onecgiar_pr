# Design — Bilateral External partners: optional, in Full metadata

## Document Control

| Field | Value |
|---|---|
| Module | `bilateral` |
| Sub-feature | `contributors-partners-optional` |
| Depth | **Lite** |
| Requirements | `./requirements.md` (approved 2026-09-29) |
| Verified at | `20328cee3` (worktree; 4 behind `origin/performance-refactor` @ `db1317995`, none touching this spec's files — P-10) |
| Status | approved (2026-09-29) |

## 1. Summary

The change is client-only and touches one component, `section-contributors`.

- **Placement.** The External partners block moves out of Block 1 into the Full metadata container.
- **Visibility.** That container gets its own gate (`showAllFields()`), so it no longer shares the linked question's type exclusion.
- **Optional.** The `external-partners` item leaves the MDS tracker, and the required marks and red hint go.
- **Hidden-fields note.** The note also counts the partner answer.
- **What does not change.** The save payload, hydration and every server path.

## 1A. Premise Ledger

**Count:** 10 verified · 0 `UNVERIFIED`.
**Blast-radius triggers fired:**
- `live-path`: the design names the user action "open the section / Submit".
- `shared-state`: the Full metadata gate is read by more than one block.
- `consumer`: the tracker key `external-partners`, the DOM placement of the partner picker and the `centers-load-error` banner all change.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | The server `submitForReview` does not check partners or any MDS field. It guards id, lead-centre permission, submittable status, an assigned Science Program and the assessment decision | existence | `bilateral-center.service.ts:2200-2208` (`assertSubmittable`, `assertAssessmentDecision`); `:2335-2376` throws only on id, not found, status, Science Program | `20328cee3` | High: making the field optional in the client would not unblock Submit, and a server task would be needed | — |
| P-2 | No bilateral client or server path reads the `validation_partners_*` green checks to gate or colour a bilateral result | existence | `grep -rln "green-checks\|greenChecks\|GET_greenChecks\|validation_partners" onecgiar-pr-client/src/app/pages/bilateral onecgiar-pr-server/src/api/bilateral \| grep -v spec` → only comment/doc hits (`section-contributors.component.ts`, two `CLAUDE.md`, `bilateral-center.service.ts` comments at :1807, :1928) | `20328cee3` | High: a green check elsewhere would keep flagging partners, and a scope item would be added | — |
| P-3 | Section completion and Submit read only the client MDS tracker | live-path | Rail: `bilateral-result-creator.component.ts:776-785` (`canSubmitFromRail` → `mdsTracker.overallStatus()`); footer: `:251` (`missingFields` → `missingFieldsFor`); tracker input: `section-contributors.component.ts:703-738` (`setSectionFields('contributors', …, PARTNERS_MDS_GROUP)`) | `20328cee3` | High: dropping the item would not clear the footer | — |
| P-4 | The Full metadata container today is gated by `showLinkedResultQuestion()`, which is `false` for Innovation Use (2) and Innovation Development (7) | shared-state | `section-contributors.component.html:275` (`@if (showLinkedResultQuestion())`); `.ts:425` (`showAllFields() && !linkedQuestionOwnedElsewhere()`); `.ts:409-414` (type 2/7). **Readers of `showAllFields`:** `.ts:393` (`showHiddenFieldsNote`), `:425` (`showLinkedResultQuestion`), `:427` (`fullMetadataButtonLabel`), `:877` (`toggleShowAll`), `:953` (localStorage persist); template `:275` via the computed | `20328cee3` | High: DD-2 would be unnecessary, or would break another reader | — |
| P-5 | The partner payload keys are gated by `partnersHydrated()`, independently of the tracker item | location | `section-contributors.component.ts:658-668` | `20328cee3` | High: removing the tracker item could leak unhydrated keys, and T-1 would need a guard | — |
| P-6 | `showAllFields` is persisted per result in localStorage | data-env | `.ts:301` (`signal(this.loadShowAllFromStorage())`), `:953` (`localStorage.setItem(this.showAllStorageKey(), …)`) | `20328cee3` | Low: a user who expanded once sees partners expanded afterwards, which is acceptable | — |
| P-7 | `section-contributors.component.spec.ts` stubs the template (`overrideTemplate`), and `section-contributors.readonly.spec.ts` renders the **real** template | location | `component.spec.ts:105` (`.overrideTemplate(SectionContributorsComponent, '<div></div>')`); `readonly.spec.ts:30-32` (comment) and `:155` (`overrideComponent` removing only `SectionTocComponent`) | `20328cee3` | High: without a real-template spec, the placement gate would need a new harness | — |
| P-8 | Consumers of the changed hooks (tracker key/label, picker placement, banner testids, `externalPartnersSatisfied`) | consumer | `grep -rn "external-partners\|'External partners'\|PARTNERS_MDS_GROUP\|externalPartnersSatisfied\|sc-block--partners\|partners-load-error\|centers-load-error" onecgiar-pr-client/src onecgiar-pr-client/cypress`, excluding the pooled/IPSR files (`rd-contributors`, `ipsr`, `hide-chrome`, `normal-selector`, which have their own "external partner" copy). Hits: `section-contributors.component.ts` (:40, :270, :296, :726-737, :837); `section-contributors.component.html` (:160, :168, :191); `component.spec.ts` (:1035, :1047, :1072-1139, :1146-1170, :1260, :1304-1350); `readonly.spec.ts` (:45, :236-261); `bilateral-result-creator.component.spec.ts:383-387` (a generic footer fixture that uses the key as sample data only); `section-contributors/CLAUDE.md` (:28-30, :93, :117). Cypress: 0 hits | `20328cee3` | Low: an unlisted consumer breaks later, and T-1 or T-2 grows | — |
| P-9 | The Fetcher schema does not require `contributing_partners` | other | `onecgiar_result_functions/services/fetcher/src/validator/schemas/common_fields.json:7-17` (the `required` list omits it), `:313-331` | `72c55f3` (fetcher repo) | High: the premise of the PO decision would fall, and the spec would be reopened | — |
| P-10 | `origin/performance-refactor`'s 4 extra commits do not touch `section-contributors/` or `bilateral-result-creator/` | data-env | `git diff --stat HEAD origin/performance-refactor -- onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator` → empty output | `20328cee3` vs `db1317995` | Low: a rebase conflict; T-1 would rebase first | — |

## 2. Architecture Overview

- **Client, touched:**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/` — the component `.ts` and `.html`, its two specs, and its `CLAUDE.md`.
- **Server:** none (P-1, P-2).
- **Data / migrations / API:** none. Requests keep their shape (P-5), so the AC-4 bilateral contract is untouched and the change log of `bilateral-result-summaries.en.md` is not affected.

## 3. Frontend Plan

### 3.1 Template layout (after)

1. **Block 1 — Minimum data:**
   - lead centre, lead project, primary SP, contributing SPs / centres / projects;
   - **`centers-load-error` banner + Retry**, moved out of `sc-block--partners` to sit with the centres picker it is about (BIL-R-5).
2. Banner "The fields above are the minimum data standards…" + the Full metadata toggle (unchanged).
3. Hidden-fields note (the count changes, see 3.2).
4. **Full metadata container**, gated by a new named computed `showFullMetadata` (= `showAllFields()`):
   - the intro line "You are completing the full metadata for this section. These fields are optional.";
   - **the partner block** (`sc-block--partners`): the `partners-load-error` banner + Retry, the checkbox, and the multi-select + chips. The multi-select is `[required]="false"` and has no red hint;
   - the **linked question**, still behind `showLinkedResultQuestion()` (unchanged).

### 3.2 Component logic

- **Tracker.** `updateContributorsMds()` publishes only `lead-center` (and `lead-project` when applicable) to `PARTNERS_MDS_GROUP`. `external-partners` is removed.
- **Full metadata gate.** A new computed `showFullMetadata` is named, per the file's own convention (`.ts:416-420`), so the specs assert the same expression the template renders.
- **Hidden-fields count.** `hiddenFieldsWithValues` = linked count (the current rule, still 0 for types 2/7 and before `linkedHydrated`) + partner count (1 when `partnersHydrated() && externalPartnersSatisfied()`, else 0).
- **Kept.** `externalPartnersSatisfied` stays and now feeds the count. `buildContributorsPayload`, hydration, `onNoExternalPartnersChange`, `removePartner` and the load-failure re-publish (`:837`) stay; only their comments are updated.
- **Comments.** Every "mandatory / AC5 / AC7" comment on the partner block is rewritten to cite P2-3821 (BIL-R-10). The same goes for `section-contributors/CLAUDE.md` lines 28-30, 93 and 117.

### 3.3 Design system

No new component or token. Existing `app-pr-checkbox`, `app-pr-multi-select` and `sc-*` classes (`docs/ux-ui/design.md` §7–§8).

## 4. Testing Plan

| Gate | Where | Covers |
|---|---|---|
| Tracker fields | `component.spec.ts`: rewrite :1035, :1047, :1146-1170, :1329-1350 so no `external-partners` item is published in any state | BIL-AC-1, AC-2 |
| Named gate | `component.spec.ts`: `showFullMetadata` follows `showAllFields` for types 2, 7 and one other type; `showLinkedResultQuestion` stays false for 2/7 | BIL-AC-3, AC-4 |
| Hidden-fields count | `component.spec.ts`: extend :1546-1767 with a partners-only, a both, a not-hydrated and a type-2 case | BIL-AC-7 |
| Payload | Existing payload specs stay green unchanged (the regression guard) | BIL-AC-5, AC-6 |
| Real template | `readonly.spec.ts`: the partner picker is **absent** with `showAllFields=false` and present with `true`, for type 1 and type 2; the multi-select carries no required marker and the hint text is absent; `centers-load-error` renders with `showAllFields=false`; the `PARTNER_PICKER_LABELS` read-only cases expand Full metadata before looking up "External partners" | BIL-AC-3, AC-4, AC-8, AC-9 |
| Type-check | `npx tsc -p onecgiar-pr-client/tsconfig.app.json --noEmit` | compile |
| Visual | Manual in the local app: one Policy and one Innovation Use result, collapsed and expanded | placement (no automated gate) |

## 5. Backwards Compatibility

- **Stored data** is read and written as before.
- **Results already stuck** in Pending Review with no partner answer (#9503) complete on the next load, because the check is client-side only (P-3). Nothing is migrated.

## 6. Design Decisions

### BIL-DD-1 — Drop the requirement instead of making it status-aware

External partners is removed from the tracker outright rather than skipped only in read-only mode.

- **Why.** The PO decision aligns the rule with the Fetcher. A status-aware skip would keep two rules and would still block centre reporters for an answer the API never requires.
- **Rejected.** Proposal option C.
- **Reversion challenge (Step 2.3), "what does removing this break?"**
  1. The P2-3368 AC5/AC7 tests. They are in scope (T-1/T-2).
  2. The hydration invariant documented at `.ts:728-734`, which kept the tracker from going green while partner keys were dropped. With no tracker item, that invariant has nothing to protect: the payload gate (P-5) still stops unhydrated keys, and the `partners-load-error` banner still tells the user.
  3. A silent loss of attention. A reporter could skip partners they would have entered. **Accepted:** this is the PO decision.

  No unaddressed breakage.

### BIL-DD-2 — A dedicated Full metadata gate

The container moves from `showLinkedResultQuestion()` to `showFullMetadata` (= `showAllFields()`), and the linked question stays nested under its own gate.

- **Why.** P-4 shows that the current gate would hide partners for types 2/7, which would violate BIL-R-1.
- **Rejected.** Adding the partner block as a second, separate `@if (showAllFields())` block next to the linked one. That duplicates the intro line, or leaves it inside the type-gated block, where it would disappear for 2/7.

### BIL-DD-3 — The centres banner stays in Block 1

The `centers-load-error` banner moves out of the partner block.

- **Why.** It reports a failure of Block 1 data (the contributing centres catalogue, BIL-T-1). Hiding it behind the toggle would hide an error that blocks every save.

### BIL-DD-4 — No auto-expand in read-only mode (OQ-1 default)

- **Why.** The hidden-fields note already signals stored partners. Auto-expanding would also override the localStorage preference (P-6). The user can overrule this at this gate.

## 7. Budget (tripwire for `/akili-execute`)

| Measure | Expected |
|---|---|
| Tasks | 2 |
| LOC (src + spec, excluding comments) | ~120 (≈40 src/template, ≈80 spec) |
| Review rounds | 1 |

**Depth re-check.** 2 tasks and ~120 LOC match **Lite**. It is not `/akili-quick`: logic and the submit gate change.

## 8. Open Gaps

- The visual placement check is manual, at the execute HITL pause.
