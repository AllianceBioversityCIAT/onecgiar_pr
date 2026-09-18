# Proposal — Bilateral Capacity Sharing: "Long-term" never reveals the Degree sub-radio

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3382-bilateral-long-term-degree` |
| Slug | `p2-3382-bilateral-long-term-degree` — derived from a free-text argument ("Long-term no despliega las 2 opciones en type-specific"); routed to `bugfix/` per the Bug Track taxonomy, prefixed with the ticket key to match the sibling folders |
| Type | Bug |
| Approval Mode | gated |
| Author (session) | Proposed on behalf of j.delgado@cgiar.org |
| Date | 2026-09-18 |
| Jira | [P2-3382](https://cgiarmel.atlassian.net/browse/P2-3382) — *[Bilateral Results] Capacity Sharing for Development — MDS + full metadata toggle*, status **To Be Improved**, assignee Juan David Delgado |
| Branch | `JuanGuzman-io/akili-propose-p2-3382` (base: `performance-refactor` — the bilateral/centres module does not exist on `staging`) |
| Depends on | none |
| Parallel-safe | yes — one client template, one component spec; no server, no migration, no shared API contract |
| Related | `docs/specs/bilateral/` (W3 module specs) · P2-3385 (the W1/W2 "Degree" label decision) · P2-3346/P2-3348 (MDS checklist) · P2-3556 (autosave guard, same file) |

## 2. Intent

Make the bilateral (W3) Capacity Sharing section behave like the W1/W2 one it was ported from: selecting **Long-term** under *Length of training* must immediately reveal the **Degree** sub-radio (PhD / Master), without the reporter having to expand *Complete full metadata*.

## 3. Problem / Current Behavior

| Surface | URL (prtest, phase 36) | Behaviour on selecting *Long-term* |
|---|---|---|
| W1/W2 — `app-cap-dev-info` | `/result/result-detail/9448/cap-dev-info?phase=36` | ✅ A **Degree** card appears right below, with PhD / Master |
| W3/Bilateral — `app-type-capacity-sharing` | `/bilateral/AfricaRice/result/9460?phase=36` | ❌ Nothing appears. The section just sits there |

The reporter has no way to discover that a sub-choice exists, so every bilateral long-term training is stored as the generic parent term (`capdev_term_id = 4`) instead of PhD (`1`) or Master (`2`). This contradicts the story's own **AC5** ("a second radio button group appears immediately below") and **AC6** ("Short-term hides and clears it").

## 4. Bug Diagnosis

### Observed Symptom

In the bilateral result editor, *Length of training* → **Long-term** produces no follow-up question. The equivalent W1/W2 screen shows a **Degree** card with PhD / Master.

### Reproduction Steps

1. Sign in to prtest and open a W3/Bilateral **Capacity Sharing for Development** result in Editing status — e.g. `/bilateral/AfricaRice/result/9460?phase=36`.
2. Scroll to the *Type-specific information* section.
3. Under **Length of training**, click **Long-term**.
4. **Expected:** a second radio group (PhD / Master) appears immediately below *Length of training*, as it does on `/result/result-detail/9448/cap-dev-info?phase=36`.
5. **Actual:** nothing renders. The sub-question only becomes reachable after clicking **Complete full metadata**, and even then it is drawn *below* the organization question, visually detached from the field it qualifies.

### Root Cause (confirmed)

The sub-term radio is nested **inside the full-metadata `@if` block**, ~40 lines away from the MDS field it belongs to:

`onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-capacity-sharing/type-capacity-sharing.component.html:99-118`

```html
@if (showAllFields()) {          <!-- ← collapsed by default -->
  <div class="flex flex-col gap-[18px]">
    <app-pr-radio-button label="Were the trainees attending on behalf of an organization?" …>
    @if (capdevTermId1 === 4 || capdevTermId1 === 1 || capdevTermId1 === 2) {
      <app-pr-radio-button [options]="capdevsSubTerms" …>   <!-- the Degree radio -->
```

`showAllFields` starts as `false` (`type-capacity-sharing.component.ts:110`, seeded from `BilateralExpandableStateService`), so the outer guard is false on first render and the inner condition is never evaluated. **The condition itself is correct** and identical to W1/W2 (`cap-dev-info.component.html:50`).

**The cascade logic is not at fault.** `hydrateTermCascade()`, `syncCapdevTermId()`, `onCapdevTermId1Change()` and the `GET_capdevsTerms` splice (`capdevsSubTerms` = `[PhD, Master]`, `capdevsTerms` = `[Short-term, Long-term]`, matching the seed order in `onecgiar-pr-server/src/migrations/1668784095214-addCapDevMethodsAndTerm.ts:12` + `1668806452093-migrationCaptDev.ts:7`) are all correct and unit-tested. This is purely **template placement**.

**Origin:** `7aa95fe6d` (2026-08-11, "Bilateral: KP handle, lead-contact & UI updates") introduced the cascade already inside the toggle block. `6de8274b0` (P2-3382, 2026-08-25) moved the *attendance* question into the same block and left the sub-radio where it was — so it has been wrong since the section was built, never a regression.

**Why the tests did not catch it:** `type-capacity-sharing.component.spec.ts:372-419` asserts the cascade on the **component instance** (`capdevTermId2` values), never on the DOM. The Cypress suite `cypress/e2e/bilateral-capacity-sharing-mds.cy.ts` asserts the three MDS fields and the attendance question, but says nothing about the Degree radio. A state-only test can never see a misplaced template node.

### Secondary defect in the same block (same file, same fix window)

The bilateral sub-radio carries **no `label`**. Per the P2-3385 decision recorded at `cap-dev-info.component.html:42-48`, `app-field-card`'s `isBare` getter (`field-card.component.ts:268`) skips the whole `field_card` class when `label` is empty — so even once revealed, the PhD/Master radio renders *loose*, outside the card frame every sibling question has. This is the exact presentation bug P2-3385 already fixed on the W1/W2 side. The user's screenshot of W1/W2 shows the **"Degree"** card; the ticket body, written before P2-3385, still calls the group "unlabelled" (see §12, OQ-1).

### Impact & Scope

| Dimension | Assessment |
|---|---|
| Data | **Under-specification, not corruption.** Bilateral long-term results stored so far hold `capdev_term_id = 4` (generic Long-term). Nothing is wrong, the PhD/Master granularity was simply never collectable. No data repair needed; no migration. |
| MDS / green check | **Unaffected.** `updateMds()` marks `length-of-training` filled on `capdev_term_id != null`, satisfied by `4` alone. Submit was never blocked by this — consistent with W1/W2, where the sub-term is `[required]="false"` because the server's `validate_capdev_term_id()` falls back to the parent. |
| Save | **Unaffected.** `syncCapdevTermId()` already writes `capdevTermId2 ?? capdevTermId1` into `body.capdev_term_id`, and round-trips correctly via `hydrateTermCascade()`. |
| Blast radius | One template. The only other client surface reading these terms is the bilateral review drawer — see below. |

### Adjacent finding (not the reported bug — scope decision needed, OQ-2)

`result-framework-reporting/.../cap-sharing-content/cap-sharing-content.component.ts:65-68` loads **only** the two parent terms (`response.slice(2, 4)`) and binds them straight to `resultTypeResponse[0].capdev_term_id` (`cap-sharing-content.component.html:50-55`) — there is no cascade at all. So for any result stored as PhD (`1`) or Master (`2`), the reviewer's drawer shows *Length of training* as **nothing selected**, even though a value is stored. Today no bilateral result can reach state 1/2 (precisely because of the bug above), so this is latent — **fixing the editor makes it reachable.** Confirmed by code reading; not yet reproduced in a browser.

## 5. Proposed Outcome

In the bilateral Capacity Sharing section: choosing **Long-term** immediately shows a **Degree** card (PhD / Master) directly under *Length of training*, inside the always-visible MDS block. Choosing **Short-term** hides it and clears the stored sub-value. A saved PhD/Master selection reappears on reload. The *Complete full metadata* toggle no longer has any bearing on it.

## 6. Scope

| In | Out |
|---|---|
| Move the sub-term `app-pr-radio-button` out of `@if (showAllFields())` to sit directly after the *Length of training* radio | Any change to `cap-dev-info` (W1/W2) — it is the reference behaviour and is correct |
| Add `label="Degree"`, keep `[required]="false"` (mirrors P2-3385 / `cap-dev-info.component.html:49-56`) | Any change to `updateMds()`, the MDS checklist, or the three published items |
| Regression tests: DOM assertions in the existing `rendered template` describe block + one Cypress case in `bilateral-capacity-sharing-mds.cy.ts` | Any server, DTO, migration, or validation-function change |
| Optionally (OQ-2) the review-drawer cascade in `cap-sharing-content` | Data repair / backfill of existing `capdev_term_id = 4` rows |

## 7. Non-Goals

- Re-litigating which fields are MDS vs full metadata (settled by `6de8274b0`).
- Making the Degree sub-radio mandatory (W1/W2 keeps it optional by design; flipping it would make the section uncompletable for results where neither degree applies).
- Touching the other four `section-type-specific` sections.

## 8. Affected Users, Systems, And Specs

| Item | Detail |
|---|---|
| Users | Researchers reporting W3/Bilateral Capacity Sharing for Development results; reviewers reading them in the bilateral-review drawer |
| Primary file | `onecgiar-pr-client/…/section-type-specific/type-capacity-sharing/type-capacity-sharing.component.html` |
| Tests | `type-capacity-sharing.component.spec.ts` (`rendered template` block, line 525) · `cypress/e2e/bilateral-capacity-sharing-mds.cy.ts` |
| Reference behaviour | `…/rd-result-types-pages/cap-dev-info/cap-dev-info.component.html:31-57` |
| Adjacent (OQ-2) | `…/bilateral-review/…/cap-sharing-content/cap-sharing-content.component.{ts,html}` |
| Server | None — read-only dependency on `GET /capdevs-terms` |

## 9. Visual Reference

- **Source:** Screenshots attached to the request (W1/W2 expected vs W3 actual).
- **Location:** Jira P2-3382 / this session. The live reference implementation is `/result/result-detail/9448/cap-dev-info?phase=36`.
- **Notes:** No Figma or new mockup needed — the target state is an existing, shipped screen. Match its **Degree** card verbatim.

## 10. Approach Options

| # | Option | Trade-off | Verdict |
|---|---|---|---|
| **A** | **Move the sub-radio block to sit right after *Length of training*, add `label="Degree"`** | ~10 lines of template, no TS change. Matches W1/W2 exactly and satisfies AC5/AC6 with the logic that already exists | ✅ **Recommended** |
| B | Leave it in place, but force `showAllFields` open when `capdevTermId1 === 4` | Makes a user choice (the collapsed/expanded preference persisted per result in `BilateralExpandableStateService`) jump on its own, and drags the organization fields into view unasked. Fixes the symptom, not the placement | ❌ |
| C | Duplicate the radio: one in MDS, one in full metadata | Two controls on one `ngModel`; a second place to forget. Pure debt | ❌ |

## 11. Recommended Approach

**Option A.** Cut the `@if (capdevTermId1 === 4 \|\| capdevTermId1 === 1 \|\| capdevTermId1 === 2) { … }` block out of the full-metadata container and paste it between the *Length of training* and *Delivery Method* radios, adding `label="Degree"` and keeping `[required]="false"`. `.tsf-fields` already supplies the `18px` column gap (`section-type-shared.scss:1-5`), so no SCSS change is needed. No component, service or API change — the cascade handlers, hydration and MDS tracker stay exactly as they are.

This is the smallest safe path: it is a **relocation**, the guard condition it carries is already the one W1/W2 has shipped for two years, and every behavioural rule the story asks for (AC5, AC6, persistence) is already implemented in TypeScript and unit-tested.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Notes |
|---|---|---|
| R-1 | Moving a node out of the `@if` changes which template tests match | Low. The existing `rendered template` describe block already queries by label text; the new assertions make the placement explicit so it cannot silently drift back |
| R-2 | Section is shared with the AI-draft prefill path | No: the prefill writes `body.capdev_term_id`, which `hydrateTermCascade()` already decomposes. Unchanged |
| R-3 | Term IDs differ between environments | Per the recorded lesson on phase/catalog IDs across environments: `capdevs_term` is seeded by migration (`1668784095214`, `1668806452093`) so 1=PhD, 2=Master, 3=Short-term, 4=Long-term is stable — but the hardcoded `=== 4` literals are an existing smell in **both** components. Out of scope here; worth a note on the ticket |
| **OQ-1** | **Label: "Degree" or unlabelled?** | The ticket body says "a second *unlabelled* radio button group", but it predates P2-3385, which deliberately added `label="Degree"` to W1/W2 so the control renders inside a `field-card` instead of loose. The screenshot in the request shows **Degree**. → Recommend **"Degree"**, and note the ticket wording as stale |
| **OQ-2** | **Include the review-drawer cascade (§4 adjacent finding) in this fix?** | Fixing the editor is what makes PhD/Master reachable, which in turn makes the drawer render a blank *Length of training*. Shipping the editor fix alone creates a visible reviewer-side gap. → Recommend **including it**, and per the module-ownership rule, DM the `result-framework-reporting`/bilateral-review owner before touching it. If declined, the editor fix ships alone and the finding goes on the P2-3382 comment |
| **OQ-3** | Should this close P2-3382 or open a QA bug under it? | P2-3382 is **To Be Improved** and assigned to you, and AC5/AC6 are its own criteria — so this is unfinished work on that story, not a new ticket. Recommend fixing under P2-3382 |

## 13. Success Criteria

| # | Criterion | Maps to |
|---|---|---|
| SC-1 | On a bilateral Capacity Sharing result with *Complete full metadata* **collapsed**, selecting **Long-term** renders a **Degree** radio with PhD and Master, directly below *Length of training* | AC5 |
| SC-2 | Switching to **Short-term** hides the Degree radio and clears `capdevTermId2`; the saved payload carries `capdev_term_id = 3` | AC6 |
| SC-3 | Selecting **Master**, saving, and reloading brings back Long-term + Master selected (`capdev_term_id = 2` → hydrated as `4` / `2`) | Edge case in ticket |
| SC-4 | The MDS checklist still publishes exactly three items and the green check still trips without a Degree selection | AC12, guards P2-3346/P2-3348 |
| SC-5 | The Degree control renders inside a `field_card`, matching the W1/W2 screenshot | P2-3385 |
| SC-6 | A red-before/green-after regression test asserts the Degree radio is in the DOM **without** expanding full metadata | Bug Mode requirement |

## 14. Next Step

```text
/akili-specify bugfix/p2-3382-bilateral-long-term-degree
```

Run in **Bug Mode**: convert the confirmed root cause into a fix plan plus the mandatory regression test. Not `/akili-quick` — the change alters conditional rendering and needs a regression test, so it is not a cosmetic one-liner.
