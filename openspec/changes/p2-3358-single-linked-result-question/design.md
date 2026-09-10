## Context

Section 2 (Contributors and Partners) renders the linked/bundled question through **two independent paths**, each with its own copy of the sentence. Verified on `performance-refactor`, head `c813fd719`:

| Path | Renderer | Label source | Serves |
|---|---|---|---|
| A | `rd-contributors-and-partners.component.html:447` — `app-pr-radio-button` with `fieldRef="[innovation-use-form]-has-innovation-link"` | `fields-manager.service.ts:182` | result types **2** (Innovation use) and **7** (Innovation development) |
| B | `rd-contributors-and-partners.component.html:460` — `app-pr-radio-button` with `[label]="linkedResultQuestionLabel()"` | `rd-contributors-and-partners.component.ts:241-242`, a ternary on `isPolicyChangeResult()` | **all other typologies**, with a dedicated Policy change branch |

Above both, `…html:443` renders `app-pr-field-header` bound to `linkedResultHeaderLabel` (`…ts:248`), gated by `showLinkedResultHeader() = isCP2026() && !isPolicyChangeResult()` (`…ts:249`). That header was introduced on this branch by P2-3201 and has **zero occurrences in `staging`** — it never reached production.

**Data flow (unchanged by this design):** `FieldsManagerService` / component computed → label input of `app-pr-radio-button` → the user's YES/NO answer binds to `has_innovation_link` → on YES, the linked-results dropdown writes `linked_results`. No stored value and no conditional logic reads the label text, in the client or in the server: the sentence has no occurrence anywhere under `onecgiar-pr-server/`.

**Constraint from the epic (P2-3243, PO instruction):** changes apply to the 2026 phase onwards and must not alter what a user sees when consulting a previous phase.

## Goals / Non-Goals

**Goals:**
- One sentence, one meaning, for all nine typologies, with **one source of truth** wherever the cost is trivial.
- Remove the Policy-change branch and the header, and remove the helpers that exist only to support them — leaving no orphaned code that invites the branch to grow back.
- Keep the saved payload byte-identical for the same user input.

**Non-Goals:**
- Changing the YES/NO behaviour, the linked-results dropdown, or anything about `has_innovation_link` / `linked_results`.
- Touching any other question in Section 2, including the ToC info note covered by `results-toc-reporting-adjustments`.
- Any server change. The exports are **verified**, not modified.
- Introducing a new shared component or refactoring `app-pr-radio-button`.

## Decisions

**D1 — Update both label sources rather than collapsing path B into path A now.**
Path B is not a drop-in for path A: it feeds the label as a plain input while path A resolves it through `fieldRef`, which also carries `hide` and `required`. Rewiring path B to `FieldsManagerService` is the recommended cleanup in the ticket and it is the real fix for the drift, but it changes how visibility and requiredness resolve for seven typologies. *Decision:* update both sources in this change; do the rewiring **only if it stays a mechanical swap with no behaviour delta**, and skip it otherwise rather than grow the change. Alternative rejected: force the rewiring now — it turns a copy change into a behaviour change across seven typologies, for a benefit that is preventive, not user-visible.

**D2 — `linkedResultQuestionLabel` stops being a `computed` and becomes a readonly constant.**
Once the ternary has nothing to branch on, a signal that never changes is misleading — the next reader assumes something varies. Alternative rejected: keep the `computed` returning a constant "in case a variant comes back". A future variant is a future ticket with its own decision; leaving the machinery warm is how the Policy-change branch survived this long.

**D3 — Delete `isPolicyChangeResult()` and `POLICY_CHANGE_RESULT_TYPE_ID`, not just their calls.**
Both have exactly two usages in the whole codebase, both in this component: the label ternary (`:242`) and the header flag (`:249`). D2 removes the first, the header removal removes the second. Alternative rejected: leave them for future use — an unused, correct-looking predicate is precisely what makes the next developer re-introduce a per-typology branch.

**D4 — Remove the header rather than showing it for every typology.**
PO decision, three reasons on the ticket: it nearly duplicates the new question so the two read as one question asked twice; its "(for innovations)" qualifier contradicts making the question general; and it was hidden for Policy change *because* Policy change had self-contained wording, a reason that disappears with this change. After removal the question stands alone — the same arrangement production has today, with the new wording.

**D5 — Update the phase scope in place; do not version the label.**
This is the documented exception to the epic rule, and it is safe by construction rather than by care: path A carries `hide: this.isP22()` (honoured by `pr-radio-button.component.ts:105-109`) and path B renders under `isCP2026()`. The question is already 2026-only on every surface, so there is no previous-phase rendering that could change.

**D6 — Rewrite the three existing specs, never delete them.**
`rd-contributors-and-partners.component.spec.ts:454-475` asserts the old strings and the Policy-change branch. Deleting them would silently drop coverage of the very behaviour this change alters. They become: one case per rendering path asserting the single new string, and one asserting no header renders.

## Risks / Trade-offs

- **A third copy of the sentence exists somewhere the grep missed** → the pre-implementation grep for "linked or bundled" is repeated across the whole client and server; today it returns only the two sources plus one code comment. If a third appears, it is reported on the ticket as a finding, not silently fixed.
- **The PDF or Excel export carries its own copy of the old wording** → cannot be ruled out by reading code, since the sentence is absent from the server. Mitigation: generate both from a 2026 result and read them; if a copy exists there, it is a separate finding handed over with evidence (the AI does not modify server code).
- **D1 leaves two label sources alive** → the drift can happen again. Mitigation: the change is small enough that the follow-up rewiring stays cheap, and the risk is recorded here rather than assumed away.
- **Removing the header changes what testers saw on `performance-refactor` yesterday** → QA may read its absence as a regression. Mitigation: the removal is stated explicitly in the verification steps on the ticket, with the reason.

## Migration Plan

No data migration, no feature flag. Copy and template changes only; rollback is reverting the commit. Nothing is deployed to a previous-phase surface, so there is no staged rollout to plan.

## Open Questions

None. The wording, the single-question decision and the header removal are all confirmed on the ticket by the PO. The only unknown is empirical — what the PDF and Excel exports actually print — and it is resolved by looking, not by deciding.
