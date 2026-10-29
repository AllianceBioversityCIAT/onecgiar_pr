# Module Spec — `policy-change-usd-amount-layout` — `design.md`

---

## 1. Summary

Two client-only template fixes, no server/API/data changes:

1. **Pool Funding** — remove a redundant `description="USD amount"` attribute from one `app-pr-input` so the field stops rendering its own label text twice (once as label, once as the `app-field-card` description box).
2. **Bilateral** — move one existing `@if (body.policy_type_id == 1) { ... }` template block (USD Amount + Status) from inside the "Complete full metadata" toggle to the always-visible region of the Type-Specific Detail template, wrapped in the same grid utility Pool Funding already uses for side-by-side layout.

Biggest trade-off accepted: Bilateral's USD Amount/Status were deliberately gated behind "Complete full metadata" (P2-3388, documented as "AC6"). This design reverses that gate specifically for this field pair — see §2.3 below for the explicit challenge of that reversal.

Links: `requirements.md` (same folder), `docs/ux-ui/design.md` §1/§8, `docs/trd/trd.md` QAS-8.

---

## 1A. Premise Ledger

**Count:** 14 rows — 14 verified, 0 `UNVERIFIED`.
**Blast-radius triggers:** `live-path` fires (a user action — the Policy Type dropdown selection — drives both branch points); `consumer` fires (rendered DOM/visibility asserted by existing Jest/Cypress specs). `shared-state` does not fire — `showAllFields()` and the clearing methods are local component state with no sibling reader; no row required.

| # | Claim | Class | Citation (as run) | Verified at | If false |
|---|---|---|---|---|---|
| P-1 | `app-pr-input`'s `app-field-card` wrapper renders `label` and `description` as two visually separate boxed elements (header box + description box), not one | `other` | `custom-fields/pr-input/pr-input.component.html:5-16` (`[description]="effectiveDescription()"`, line 7) → `custom-fields/field-card/field-card.component.html:24-26` (`.field_card_header > .fch_title`) and `:80-82` (`.field_card_desc > .desc_text`); boxed chrome at `src/styles/field-card.scss:67-83` (header) and `:194-211` (desc) | `4ed4f6520` | DD-1 (below) would be wrong about *why* the field looks duplicated — re-diagnose before removing `description` |
| P-2 | Pool Funding's USD-amount field carries both `label="USD amount"` and `description="USD amount"` on the same `app-pr-input`, guarded by `*ngIf="innovationUseInfoBody.policy_type_id == 1"` | `location` | `policy-change-info.component.html:17-24` (read directly, confirmed) | `4ed4f6520` | PCL-R-1's fix site is wrong; re-locate |
| P-3 | `policy_type_id == 1` is CLARISA's "Program, budget or investment" | `data-env` | `policy-change-info.component.ts:19-23` (`POLICY_TYPE_WITH_AMOUNT = 1`, comment: *"CLARISA policy type 'Program, budget or investment' — the only one that carries a USD amount"*) | `4ed4f6520` | Every scenario in this spec targets the wrong policy type |
| P-4 | Pool Funding's existing side-by-side layout for Policy type / USD amount / Status is produced by one grid wrapper | `location` | `policy-change-info.component.html:6` (`<div class="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[20px]">`, confirmed, read directly) | `4ed4f6520` | PCL-R-10's "reuse this pattern" guidance has no concrete pattern to point to |
| P-5 | The existing P2-3667 regression test only scans `app-pr-select` elements, so it does not protect the `app-pr-input` USD-amount field at all | `consumer` | `policy-change-info.component.spec.ts:93-108` (`querySelectorAll('app-pr-select')`, confirmed, read directly) | `4ed4f6520` | The new regression test (task-level) can be skipped — it can't; this is why Bug Mode requires a *new* test, not reliance on the old one |
| P-6 | Bilateral's always-visible Type-Specific Detail block (Policy type / Stage / Implementing organizations) renders no USD Amount, Status, or "Is this result related to" field | `location` | `type-policy-change.component.html:8-72`, confirmed, read directly | `4ed4f6520` | PCL-R-2's target insertion region doesn't exist where assumed |
| P-7 | Bilateral's "Full Metadata" toggle block currently contains the "Is this result related to:" question (gated on `questions?.optionsWithAnswers?.length`) AND USD Amount + Status (gated on `body.policy_type_id == 1`), both inside `@if (showAllFields())` | `location` | `type-policy-change.component.html:73-132`, specifically the question at `:95-106` and the USD/Status block at `:108-129`, confirmed, read directly | `4ed4f6520` | The relocation boundary (move only 108-129, leave 95-106) would be mis-scoped |
| P-8 | Bilateral's `onPolicyTypeChange()` clears `body.amount` / `body.status_amount` independent of where those fields render in the template | `other` | `type-policy-change.component.ts:181-194`, confirmed present (template-independent logic reads/writes `body.*`, not DOM) | `4ed4f6520` | PCL-R-4 would need new code, not just a template move |
| P-9 | `cypress/e2e/bilateral-policy-change-mds.cy.ts` asserts the current gated behavior: MDS is exactly 3 items, USD amount/Status require expanding "Full metadata" first, and both stay hidden for policy type 2 | `consumer` | Scout-delegated read, quoted ranges `:68-76` (MDS assertion), `:87-91` ("shows USD amount and Status... AC6" — requires `expand()` first), `:93-99` (policy type 2 — USD amount stays hidden) | `4ed4f6520` | This test must be rewritten as part of the task, not left failing or silently skipped |
| P-10 | `type-policy-change.component.spec.ts:369-382` (clearing-logic tests) operate on `component.body` directly and are template-placement-independent (safe); `:466-527` (`toggleShowAll` / rendered-template assertions) touch `showAllFields()` and ordering and should be re-run after the restructure | `consumer` | Scout-delegated read, quoted line ranges | `4ed4f6520` | Clearing-logic tests might need updating too — re-check if red after the template change |
| P-11 | `cypress/e2e/bilateral-type-specific-section.cy.ts:59-91` asserts the "Type-Specific Details" accordion heading/count; this spec moves fields *within* that one accordion and does not split or rename it, so this test is unaffected | `consumer` | Scout-delegated read, quoted line ranges; confirmed in principle against `type-policy-change.component.html` structure (single accordion, no new `@if` wrapping a second accordion) | `4ed4f6520` | If accordion count/heading actually changes, this test breaks and needs a look — Impact: Low (no change intended here) |
| P-12 | Pool Funding's USD-amount duplicate is a known leftover: commit `a49e71a7a` (P2-3667) removed the identical `description`-duplicates-`label`-text pattern from the three sibling `app-pr-select` fields (Policy type / Status / Stage) in this same file but did not touch the USD-amount `app-pr-input`, whose `description="USD amount"` predates that commit (authored `78c0bb191b`, 2025-10-06 per `git blame`) | `other` | Commit message of `a49e71a7a` (git history, quoted by delegated research): *"the real descriptions on this screen (USD amount, actors influenced, implementing organizations) are untouched because they carry info the placeholder does not"* — a rationale that does not hold for USD amount, since `description="USD amount"` carries no information beyond `label="USD amount"` | `4ed4f6520` | DD-1's framing as "closing the P2-3667 gap" would be historically inaccurate (cosmetic to the design rationale, not to the fix itself) |
| P-13 | Bilateral's own USD-amount `app-pr-input` (`type-policy-change.component.html:109-116`) has no `description` attribute at all — it never had this specific duplicate bug | `location` | Read directly at `type-policy-change.component.html:109-116` (confirmed above, no `description=` line present) | `4ed4f6520` | Bug 1's scope would incorrectly include a Bilateral template edit it doesn't need |
| P-14 (live-path) | The user action "select 'Program, budget or investment' in the Policy Type dropdown" reaches both changed branches directly: Pool Funding via `[(ngModel)]="innovationUseInfoBody.policy_type_id"` → `*ngIf="innovationUseInfoBody.policy_type_id == 1"` (`policy-change-info.component.html:10,22,33`); Bilateral via `[(ngModel)]="body.policy_type_id"` → `@if (body.policy_type_id == 1)` (`type-policy-change.component.html:44,108`) — single template, no router/version/flag branch in between | `live-path` | Both dispatch chains read directly in the files above; no intermediate guard, resolver, or feature flag found between the dropdown binding and the `*ngIf`/`@if` | `4ed4f6520` | The fix would need to also account for an intermediate branch (e.g. a flag) that isn't actually there |

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/policy-change-info/` (Pool Funding, template + spec only); `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/` (Bilateral, template + spec/E2E only).
- **Server modules touched:** none.
- **External integrations touched:** none.

### 2.2 Sequence / interaction

No new interaction — purely a rendering change driven by the existing `policy_type_id` binding already described in each component. No new HTTP calls, no new events.

---

## 2.3 Reversion Challenge (Step 2.3)

**Trigger:** Bug 2's fix removes a gate (`@if (showAllFields())`) around already-delivered, intentionally engineered behavior — Bilateral's USD Amount/Status were deliberately placed behind "Complete full metadata" per P2-3388, documented as "AC6" in both the template comment (`type-policy-change.component.html:89-94`) and the component's own `CLAUDE.md` ("⚠️ The related-to question sits inside the full-metadata toggle but OUTSIDE the `policy_type_id == 1` gate. That gate is AC6 and covers only USD amount and Status...").

**Challenge — "what does removing this break?"**

- **MDS / green-check tracker:** unaffected. The component's own `CLAUDE.md` states the MDS tracker (`BilateralMdsTrackerService.setSectionFields('type-specific', …)`) tracks exactly three items — `policy-type`, `policy-stage`, `policy-institutions` — and explicitly warns that nothing outside the MDS may be registered with `filled: false` (P-9/P-10 class). USD Amount/Status were never part of that tracked set before or after this change, so completeness scoring is untouched.
- **Data-loss / clearing contract:** unaffected. `onPolicyTypeChange()` clears `amount`/`status_amount` based on `body.policy_type_id`, read/written independent of template placement (P-8).
- **The documented rationale (AC6) was about the *question*, not about USD Amount/Status being hidden on purpose for its own sake:** the template comment's point is that the question must sit *outside* the `policy_type_id == 1` gate (so it isn't wrongly hidden for policy types 2/3) — it does not argue that USD Amount/Status *should* stay behind an extra disclosure click once the user has already made the one choice (`policy_type_id == 1`) that makes them relevant. That choice is already visible and made in the always-visible region (Policy type dropdown, `type-policy-change.component.html:37-46`) — gating its direct consequence behind a second click is the inconsistency the ticket reports, not a load-bearing product decision this design is casually discarding.
- **Progressive-disclosure intent for the rest of the form is preserved:** Policy type / Stage / Implementing organizations stay the always-visible MDS; only the "Is this result related to:" question remains behind "Complete full metadata" afterward, per `PCL-R-3`. The disclosure still exists and still gates something — it just no longer gates a field pair whose relevance was already decided by a choice outside it.

**Outcome:** no functional breakage identified. Proceed with the reversal as specified in `PCL-R-2`/`PCL-R-3`. Record: the existing `cypress/e2e/bilateral-policy-change-mds.cy.ts` assertions that encode the *old* gated behavior (P-9) are expected to change as part of this task, not preserved.

---

## 3. Data Model Changes

None. No entity, migration, or CLARISA cache change.

---

## 4. API Surface

None. No endpoint, DTO, or bilateral/platform-report payload change. `onPolicyTypeChange()` / `clearAmountWhenNotApplicable()` request bodies (`PATCH_policyChanges`) are unchanged in shape — only which part of the *already-sent* body is user-editable before the "Full metadata" click changes.

---

## 5. Server Workflow / Business Rules

None touched.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No routing change. Both components keep their existing routes (`policy-change1-info` under `rdResultTypesPages`; Bilateral's `section-type-specific` rendered when the result type is Policy Change).

### 6.2 Components & services

- **`policy-change-info.component.html`** (Pool Funding): remove the `description="USD amount"` line (currently line 20 inside the `app-pr-input` block at `:17-24`). No TS change — `clearAmountWhenNotApplicable()` and the `*ngIf` conditions are untouched.
- **`type-policy-change.component.html`** (Bilateral): move the `@if (body.policy_type_id == 1) { ... }` block (lines `108-129`, containing the USD Amount `app-pr-input` and Status `app-pr-select`) out of the `@if (showAllFields())` region (lines `85-132`) into the always-visible `<div class="contents" [inert]="readOnly()">` block (lines `8-72`), placed after the "Implementing organizations" field. Wrap the moved USD Amount + Status pair in the same grid utility class Pool Funding uses (`grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[20px]`, per `PCL-R-10`) so they render side by side. The "Is this result related to:" block (lines `95-106`) stays inside the `showAllFields()` disclosure, now the only content left there. No TS change — `onPolicyTypeChange()`, `statusOptions`, and `[inert]="readOnly()"` gating (AC17, P2-3428/P2-3520) are untouched and must continue to apply to the relocated fields (they move with the block, inside the same `[inert]`-gated wrapper, so the read-only lock is preserved automatically).

### 6.3 Design system usage

- No new tokens, no new components. Reuses the existing `app-pr-input` / `app-pr-select` / `app-field-card` primitives and the existing grid utility class already in use elsewhere in the same file family (Pool Funding).
- A11y: removing the duplicate description removes a redundant `aria`-announced text node; no new labels needed (same `label=` attributes retained verbatim).
- i18n: no new strings — all moved/removed text already exists in the template.

### 6.4 Real-time / notification UX

None.

---

## 7. Security & Authorization

No change. No new endpoint, no new role gate. Bilateral's existing `[inert]="readOnly()"` (AC17) continues to apply to the relocated fields since they move within the same `[inert]`-wrapped `<div class="contents">` ancestor region — confirm this in task verification (see `tasks.md`).

---

## 8. Performance & Capacity

Negligible — two small template edits, no new network calls, no new heavy dependency.

---

## 9. Observability

None added; no new logs needed for a presentation-only change.

---

## 10. Testing Plan (forward-looking)

- **Pool Funding:** extend `policy-change-info.component.spec.ts` to assert the USD-amount `app-pr-input` renders its "USD amount" text exactly once in the DOM (no separate description box) when `policy_type_id == 1`. Falsifies against the pre-fix markup (currently fails — two renderings of "USD amount").
- **Bilateral unit:** verify (or add, if missing) a test asserting the USD Amount/Status `app-pr-input`/`app-pr-select` are present in the DOM without calling `toggleShowAll()`, when `body.policy_type_id === 1`; and that "Is this result related to:" requires `showAllFields()` to be true.
- **Bilateral E2E:** rewrite `cypress/e2e/bilateral-policy-change-mds.cy.ts` assertions at the ranges identified in P-9 to match the new always-visible-when-type-1 behavior; re-run `cypress/e2e/bilateral-type-specific-section.cy.ts` to confirm the accordion heading/count is unaffected (P-11).
- Coverage: both touched files already have specs; this spec does not need new coverage uplift beyond the regression assertions above (client thresholds 50/60/60/60 unaffected by a template-only change with existing spec files).

---

## 11. Backwards Compatibility & Migration Plan

- No database migration, no API contract change, no feature flag. Purely additive/corrective client template changes.
- No data backfill needed — `amount`/`status_amount` values already stored are unaffected; only their editing surface changes.
- No downstream consumer notification needed (no bilateral/platform-report payload shape change).

---

## 12. Design Decisions (ADRs)

### `PCL-DD-1` — Remove the redundant `description` on Pool Funding's USD-amount field

- **Context:** The P2-3667 fix (`a49e71a7a`) removed the identical description-duplicates-label pattern from the three sibling `app-pr-select` fields in this file (Policy type, Status, Stage) but left the USD-amount `app-pr-input`'s `description="USD amount"` in place, under a rationale ("real descriptions... carry info the placeholder doesn't") that does not actually hold for this field — `description` and `label` carry the identical string (P-12).
- **Decision:** Delete the `description="USD amount"` attribute from the `app-pr-input` at `policy-change-info.component.html:17-24`. Keep `label="USD amount"` and `placeholder="0"`.
- **Alternatives considered:**
  1. Keep `description` but change its text to carry genuinely new information (e.g., a currency-format hint). Rejected — not reported, not required by the ticket, and introduces new copy/i18n surface for a Lite bugfix.
  2. Remove `label` instead of `description`, keeping the description box as the sole label. Rejected — breaks the established pattern (`app-field-card`'s header/label box is the canonical place other required-field tooling reads from, per `src/CLAUDE.md` §21.5 "requiredness marker" notes), and would be the opposite of what the three sibling fields already did in P2-3667.
- **Consequences:** None beyond the visual fix — no data, no behavior change.

### `PCL-DD-2` — Relocate Bilateral's USD Amount + Status out of the Full Metadata toggle

- **Context:** See §2.3 (Reversion Challenge) for the full reasoning. Summary: the "AC6" gate documented in the template comment and `CLAUDE.md` is about keeping the *question* ungated by `policy_type_id`, not a stated reason to keep USD Amount/Status hidden behind a second click once `policy_type_id == 1` is already chosen in the always-visible area.
- **Decision:** Move the `@if (body.policy_type_id == 1) { USD amount; Status }` block from inside `@if (showAllFields())` to the always-visible region, after "Implementing organizations", wrapped in the same side-by-side grid utility Pool Funding uses.
- **Alternatives considered:**
  1. Leave USD Amount/Status gated but auto-expand "Full metadata" when `policy_type_id == 1` is selected. Rejected — still an extra DOM state to track, still inconsistent with Pool Funding's plain always-visible rendering, and adds behavior (auto-toggle) the ticket didn't ask for.
  2. Introduce a shared field-pair component used by both Pool Funding and Bilateral now. Rejected for this spec — out of scope per `requirements.md` §3 (no such component exists today; a larger refactor than this Lite bugfix warrants, see `PCL-OQ-1`-adjacent note in requirements' Out of Scope).
- **Consequences:** `cypress/e2e/bilateral-policy-change-mds.cy.ts` must be updated (P-9) since it currently encodes the pre-fix gated behavior as the expected/intended behavior.

---

## 13. Open Gaps & Follow-ups

- `PCL-OQ-1` (from `requirements.md`): whether the QA review drawer's `policy-change-content` component should get a matching consistency pass is deferred to a follow-up ticket.
- A shared "USD Amount + Status" field-pair component (eliminating the duplicated hand-rolled markup and clearing logic across Pool Funding and Bilateral) is a legitimate future refactor, explicitly out of scope here.

---

## Budget (Step 2.4)

- **Expected tasks:** 2 (one per component/bug), each bundling its own regression test per Bug Mode.
- **Expected LOC:** ~40-70 (≈2 lines removed in Pool Funding's template + spec additions; ≈25 lines moved/rewrapped in Bilateral's template + test rewrites in 2-3 spec/E2E files).
- **Expected review rounds:** 2 per task (`checklist` depth — DOM/consumer impact exists per the Premise Ledger's `consumer` rows, but no shared symbol, migration, auth, or payload-contract change that would warrant `full`).

These are a tripwire for `/akili-execute`, not a cap on quality — if execution trends well past them, the Leader stops and escalates rather than continuing silently.

---

## Required cross-references

- `docs/specs/bugfix/policy-change-usd-amount-layout/requirements.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/policy-change-info/CLAUDE.md`.
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/CLAUDE.md`.
