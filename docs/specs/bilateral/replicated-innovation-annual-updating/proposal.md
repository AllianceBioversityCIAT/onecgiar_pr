# Proposal — "Annual updating" (still active?) for replicated W3/Bilateral innovations

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/replicated-innovation-annual-updating/` |
| Slug | `replicated-innovation-annual-updating` — derived from a free-text argument ("Para las Innovations w3 bilaterales que fueron replicadas necesito colocar el mismo 'Annual updating' question…"). Placed under `bilateral/` per the domain-module taxonomy (precedent: `bilateral/project-overview-metrics`). |
| Type | **Change** |
| Approval Mode | **gated** (default) |
| Status | **approved** — Santiago Sanchez, 2026-09-29 (with the OQ answers recorded in "Decisions" below) |
| Owner | Santiago Sanchez |
| Date | 2026-09-29 |
| Ticket(s) | None given yet. Follows up on the Freshdesk "Replicated innovations for w3/bilat projects" thread (Nicoleta Trifa, 2026-09-22), whose spec `bilateral/project-overview-metrics` explicitly left *"where/how a project team updates a replicated innovation"* as a **separate spec**. This is that spec. |
| Baseline | `docs/prd.md` (bilateral reporting goals) · `docs/ux-ui/design.md` §8 (components) · `docs/trd/trd.md` (bilateral + results modules) |
| Related specs / code | W1/W2 source of truth: `rd-annual-updating` (`onecgiar-pr-client/.../rd-general-information/components/rd-annual-updating/`, its `CLAUDE.md` documents P2-3292 Steps 1–4). Bilateral target: `bilateral/components/section-general-info/`. |
| Depends on | none (carry-forward of bilateral results, P2-3229/P2-3652, is already live, so `is_replicated = 1` rows already exist) |
| Parallel-safe | **no**: it touches `results.service.ts` (the shared discontinuation block of `saveGeneralInformation`) and the shared `rd-annual-updating` component |

## Intent

When a W3/Bilateral **Innovation** result has been **replicated** (carried forward) into the current phase, the reporter must answer the same **Annual updating** question W1/W2 already asks: *"Is this innovation active and receiving investment?"*. If the answer is **No**, they give the reasons (checklist + "Other" text) and, for merge or split, the target innovations. The wording, catalogue and rules are the same as W1/W2.

## Problem / Current Behavior

| | W1/W2 (pooled) | W3/Bilateral |
|---|---|---|
| Where | Top of General Information, `<app-rd-annual-updating *ngIf="generalInfoBody.is_replicated">` | Missing: `section-general-info` has no such block |
| Types | 7 Innovation Development (2026 "Status Trigger" wording) and 2 Innovation Use (legacy wording) | — |
| Save | `PATCH …/general-information` → `ResultsService.saveGeneralInformation` (`results.service.ts:832-896`) writes `is_discontinued`, `results_investment_discontinued_option`, `result_innovation_merge_split` | `PATCH api/results/bilateral/general-info/:id` → `updateBilateralGeneralInfo` (`results.service.ts:5510`). The DTO **does not accept** any discontinuation key, and the "nothing to save" guard (`:5529-5554`) would reject such a payload |
| Lock | Stored inactive + phase ≥ 2026 + not admin → block goes read-only; admin sees "Reopen this innovation" | — |

So a replicated bilateral innovation cannot record whether it is still active. The overview counts (`project-overview-metrics`) show "N replicated", but those N can never be marked active or discontinued.

## Proposed Outcome

- On a bilateral result with `is_replicated = 1` and type **7** (and **2**, see OQ-1), Section 1 General information shows the **Annual updating** block. It looks and behaves exactly like W1/W2: same labels, same phase-year gate, same reason catalogue for the phase, the same merge/split pickers, the lock and the admin reopen.
- The answer autosaves through the bilateral General info endpoint and is stored in the **same columns and tables** W1/W2 uses. Every existing reader (W1/W2 screens, exports, validation functions, merge/split catalogue) sees it with no change.
- The answer counts toward the bilateral MDS / Submit gate **only** for replicated innovations. Results that were not replicated are unchanged.

## Scope

- **Client**
  - Make `rd-annual-updating` usable outside W1/W2: an optional input-driven context (result id, type, phase year, stored `is_discontinued`, editable). When the inputs are not given it falls back to `dataControlSE.currentResult`, so W1/W2 renders exactly as today.
  - Mount it in `section-general-info`, gated on `is_replicated` + type, and wire its changes to `BilateralAutoSaveService` (`generalInfo` group).
  - Add one conditional `annual-updating` item to `BilateralMdsTrackerService.setSectionFields('general-info', …)`, only when the block renders.
- **Server**
  - Extract the discontinuation block of `saveGeneralInformation` (`:832-896`) into one private helper that both writers call. **One writer, no copy.**
  - Extend `UpdateBilateralGeneralInfoDto` with `is_discontinued`, `discontinued_options[]`, `merge_split_targets[]`. Accept them in the empty-payload guard, and write them inside the method's existing transaction, after `assertCenterWrite`.
  - Make the bilateral General info GET return `is_replicated`, `is_discontinued`, `discontinued_options` (the phase generation) and `merge_split_targets`, if it does not already (to be verified in `/akili-specify`).
- Folder `CLAUDE.md` updates (`rd-annual-updating`, `section-general-info`, `type-innovation-dev`) with re-stamped `Verified:` lines.

## Non-Goals

- No change to the W1/W2 behavior, wording or catalogue (the P2-3243 rule: earlier phases render exactly as today).
- No new reason texts and no change to `investment_discontinued_option` rows (owned by Juan David Delgado under P2-3292).
- No change to the `/api/bilateral/*` external payload contract (the endpoint is internal `api/results/bilateral/general-info`). If exposing `is_discontinued` there is wanted, that is a separate change with a change-log row.
- No server-side lock (W1/W2's lock is UI-only too; see its `CLAUDE.md`).
- The MySQL green-check functions (`validation_innovation_*_P25`) are not touched.

## Affected Users, Systems, And Specs

| Who / what | Impact |
|---|---|
| Center reporters of W3/Bilateral projects | Answer the annual question on replicated innovations |
| P&A reviewers (Nicoleta's team) | See active / discontinued status of replicated innovations |
| PRMS admins | Reopen a discontinued bilateral innovation (same escape as W1/W2, P2-2923) |
| `rd-annual-updating` (shared) | Refactored to take its context from inputs; W1/W2 specs must stay green |
| `results.service.ts` | Discontinuation block extracted; `updateBilateralGeneralInfo` extended |
| `bilateral/project-overview-metrics` | Consumer only; no change |

## Visual Reference

- Source: existing screen. The W1/W2 **Annual updating** block (`rd-annual-updating.component.html`) is the design, reused as-is.
- Location: `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/components/rd-annual-updating/`
- Notes: no new visual. Placement is the top of bilateral Section 1, above Title, the same position as in W1/W2. A mockup can be produced if the PO wants it somewhere else.

## Requirement Delta Preview

### ADDED Requirements

- A replicated bilateral Innovation Development (and Innovation Use, OQ-1) MUST show the Annual updating block in General information.
- The bilateral General info save MUST persist `is_discontinued`, the ticked reasons (+ "Other" description) and merge/split targets through the same writer as W1/W2.
- Answering the question MUST be required for Submit on a replicated innovation, and only on one.
- A non-admin MUST NOT be able to edit a stored-inactive replicated innovation from phase 2026 on. An admin MUST see "Reopen this innovation".

### MODIFIED Requirements

- `rd-annual-updating` gets its context from inputs, falling back to `DataControlService`. Rendered W1/W2 output is identical.
- `updateBilateralGeneralInfo` accepts three more optional keys. A payload with only those keys is valid.

### REMOVED Requirements

- none

## Approach Options

| # | Option | Pros | Cons |
|---|---|---|---|
| **A** | Reuse `rd-annual-updating` unchanged by writing the bilateral result into `dataControlSE.currentResult` before mounting it | Zero component change | Writes into W1/W2 global state from the bilateral screen and can leak into other screens. The component also reads `rolesSE.access.canDdit` / `isPhaseOpen`, which bilateral does not drive. Fragile, and invisible to tests. |
| **B** ✅ | **Input-driven context** on `rd-annual-updating` (fallback to `dataControlSE`) + bilateral wrapper that maps changes to autosave; server helper extracted and called by both writers | One UI, one writer, so W1/W2 and bilateral cannot drift. Existing W1/W2 specs guard against regression. | Touches a component with many documented traps (construction-time resolution, tinyint `1`, the `selectedTargets` NG0103 loop). Moving `usesStatusTriggerWording` out of construction needs care. |
| **C** | New bilateral-only component that copies the logic | Isolated from W1/W2 | Copies P2-3292 Steps 1–4, including every trap listed in the component's `CLAUDE.md`. Any later P2-3292 change must then be made twice. |

## Recommended Approach

**Option B.** It is the smallest safe path: the question, catalogue, lock and merge/split rules stay in **one** component and **one** server writer, which is how W1/W2 and bilateral stay the same over time. The risk sits in the refactor of `rd-annual-updating`. The existing W1/W2 specs cover it, including the `tinyint 1/0/null` describe and the rendered-DOM colon check. A new bilateral spec is added that feeds the context through inputs.

> **Superseded in `/akili-specify` (2026-09-29):**
> - Bilateral may not import from `pages/results/`, so the component is **relocated to `shared/`** (design DD-1).
> - "No" is committed through an explicit confirm, not autosave (requirements R-11, DD-3).
> - Admin reopen at status 4 uses a key-scoped read-only exemption (DD-5).
> - The W1/W2 method is `createResultGeneralInformation`, not `saveGeneralInformation`.
>
> The final plan is `tasks.md`.

Suggested task order for `/akili-specify`: (1) server helper extraction + regression spec on `saveGeneralInformation`; (2) DTO + bilateral writer + GET; (3) component input context, W1/W2 specs green; (4) bilateral mount + autosave + MDS item; (5) real-browser check on prtest with a replicated bilateral innovation.

## Decisions (owner, 2026-09-29)

| Question | Decision | Verified in code |
|---|---|---|
| OQ-1 — include Innovation Use (type 2)? | **Yes**: types 7 and 2, same as W1/W2 | — |
| OQ-2 — does "No" change `status_id`? | **Yes, the same as W1/W2**: "No" → `status_id = 4` (Discontinued). A discontinued result does not have to be completed or submitted. The shared helper carries the status rule for both writers. | `results.service.ts:949-956` |
| OQ-3 — status of a replicated result? | **Editing (1)**, never Pending Review | ✅ `result.repository.ts:96-98, 114, 193`: the replication query hard-codes `1 as status_id` for every copy, bilateral included, and `versioning.service.ts` sets no status afterwards. `assertCenterWrite` (`bilateral-access.service.ts:86-98`) blocks only status 5, so center reporters can write on 1 and on 4. |
| OQ-4 — can merge/split cross W1/W2 ↔ W3? | **Yes** | ✅ Already true: `getMergeSplitTargetInnovations` (`result.repository.ts:2993`) has no `source` filter and the service passes no `ownerInitiativeId` (`results.service.ts:3348-3374`), so the catalogue is every active, non-discontinued Innovation Development of the portfolio. No change needed. |

**Reopen** (P2-3292 Step 4, P2-2923): it is on the **same** result, not a new one. From phase 2026 on, once a result is stored as inactive the block locks for non-admins. An admin sees **Reopen this innovation**, which sets the answer back to "Yes" and clears the reasons. On save the server moves `4 → 1` (Editing). It exists for a result closed **by mistake**. Bilateral inherits it unchanged.

## Risks, Dependencies, And Open Questions

| ID | Item | Why it matters |
|---|---|---|
| **R-1** | ~~status side effect~~ **Resolved by OQ-2**: status 4 applies to bilateral. To check in `/akili-specify`: every bilateral surface (results list, status chip, overview counts, `submit-for-review`) must handle `status_id = 4` without errors. A discontinued result must not be offered for Submit. |
| **R-2** | ~~write gate~~ **Resolved by OQ-3**: replicated results land in Editing (1), which is writable. |
| **R-3** | `rd-annual-updating` resolves the 2026 wording **at construction** from `dataControlSE`. Inputs are not available then, so the gate must move to `ngOnInit`/`computed` without breaking the "seed before `createComponent`" spec pattern. |
| **R-4** | **MDS trap** (`type-innovation-dev/CLAUDE.md`): any item entered with `filled: false` keeps the section amber and **disables Submit**. The item must be registered only when the block renders (replicated + innovation type). |
| **R-5** | Autosave debounce (800 ms) versus the reasons list, which arrives in a later request than the body (see `rd-annual-updating` `ngOnInit` note). Nothing may be saved before the reasons are loaded, the same load-gate discipline as P2-3556/P2-3558. |
| **R-6** | ~~merge/split scope~~ **Resolved by OQ-4**: the catalogue is already portfolio-wide. |
| **OQ-5** | Is there a Jira ticket to cite in commits? (still open) |

## Success Criteria

- On prtest, a replicated bilateral Innovation Development (phase 2026) shows the block with the 2026 wording. Answering **No** + a reason autosaves, and a reload shows the same answer (radio **not blank**: the tinyint trap).
- The same result, opened in W1/W2 Result Detail (if reachable) or read from the DB, has matching `is_discontinued` / reason rows. There is a single writer.
- A non-replicated bilateral innovation: no block, and MDS percentage and Submit are unchanged.
- W1/W2 `rd-annual-updating` and `rd-general-information` Jest specs are green with no changes to their assertions.
- Answering **No** on a bilateral result sets `status_id = 4`. An admin **Reopen** + save sets it back to `1`, the same as W1/W2.
- The merge/split picker on a bilateral innovation lists both W1/W2 and W3 Innovation Developments.

## Next Step

```text
/akili-specify bilateral/replicated-innovation-annual-updating
```
