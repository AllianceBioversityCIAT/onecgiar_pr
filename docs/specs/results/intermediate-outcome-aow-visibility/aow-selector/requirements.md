# Module Spec — `requirements.md`

**Depth: Standard.** New capability (not a bugfix): a server field + two client creation surfaces. Full requirements, scenarios, and NFRs per `docs/specs/general-setup/requirements.md`; `software-architect` pass deferred to `design.md` to settle the data-model shape.

## 1. Module / Feature

- **Module:** `results`
- **Sub-feature:** `intermediate-outcome-aow-visibility/aow-selector`
- **Owner:** santiago.sanchez@cgiar.org
- **Status:** draft
- **Ticket(s):** none (chat-originated; see `proposal.md`)

## 2. Context

Intermediate Outcomes are modeled as a program-level bucket with **no `wp_id`** (`aow-bilateral.repository.ts` `findIntermediateOutcomes` filters `AND tr.wp_id IS NULL`) — structurally, there is no work package to join on, so these ToC nodes cannot resolve to a single Area of Work. `dashboard-lab.component.ts`'s `reportingGroups()` reflects this: Intermediate/2030 Outcomes render as **program-level sibling cards**, never nested under an AoW card (comment ~line 1463: *"the design reference nests Intermediate/2030 under each AoW as HLO-level children — that is a known bug the owner rejected"*). The sibling spec `target-tooltip` makes this fact **visible** (a hover tooltip). This spec makes it **actionable**: when a submitter reports a result against an Intermediate Outcome indicator, they pick which AoW their specific contribution counts toward, and that choice is persisted.

Maps to `docs/prd.md` **G2** (data quality) and **US-S1/US-S2** (result submitter capturing a typed result with the right ToC alignment) — no existing PRD story names AoW attribution specifically; this spec adds that granularity. No `docs/ux-ui/design.md` screen documents the Reporting tab's creation surfaces yet; §10 (Accessibility) and the PrimeNG/`app-pr-select` component convention apply to the new dropdown.

Touches (confirmed by code research, see `design.md` for file-level detail):
- Client: `lab-report-form.component.{ts,html}`, `create-result-payload.util.ts`, `aow-hlo-create-modal.component.ts`, `dashboard-lab.component.ts`.
- Server: `results-framework-reporting.controller.ts` (`POST /api/results-framework-reporting/create`), `create-results-framework.dto.ts`, `link-framework-result-toc.service.ts`, `results-toc-result.entity.ts`.

## 3. In Scope / Out of Scope

### In scope

- An AoW `app-pr-select` (single-select) shown on the result-creation surface **only** when the indicator being reported is an Intermediate Outcome (program-level bucket, no `wp_id`).
- The selected AoW included in the create-result payload and persisted on the result's ToC link.
- Both creation surfaces: `lab-report-form` (primary, Reporting tab) **and** `aow-hlo-create-modal` (legacy, confirmed still reachable from six `entity-aow` entry points — not dead code).
- A required-field gate: `lab-report-form`'s `missingFields()`/`canSave()` (and the modal's equivalent) MUST block save until an AoW is chosen, for Intermediate Outcome reports only.

### Out of scope

- Changing HLO or 2030 Outcome attribution — unaffected, unambiguous today (`AOWSEL-R-2`).
- Retrofitting AoW attribution onto already-reported Intermediate Outcome results (forward-looking only).
- Changing `reporting-aow-table`'s progress-bar math (`ratioOf`, `figure` — flagged "don't touch" in that component's own `CLAUDE.md`; tracked separately as P2-3405).
- A new "AoWs valid for this ToC node" backend endpoint — code research found no evidence Intermediate Outcomes are constrained to a subset of AoWs (`findIntermediateOutcomes` selects program-wide; `findWorkPackagesByProgram` already returns the full program AoW list and already backs `GET_ClarisaGlobalUnits`, which both creation surfaces already have loaded). If a future BA review finds a real subset constraint, that is a new spec, not a gap here.
- Multi-AoW attribution per single result — this spec ships single-select (see `AOWSEL-OQ-1` resolution below); a later request for multi-select is new scope.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | When reporting against an Intermediate Outcome, must pick one AoW before the result can be created; the choice is visible on the created result. |
| PMU lead | Can eventually see per-AoW attribution of Intermediate Outcome contributions (reporting/consumption of the new field is out of scope for this spec — capture only). |

## 5. User Stories

- **`AOWSEL-US-1`** — As a result submitter, I want to pick which Area of Work my contribution to an Intermediate Outcome counts toward, so that PMU can eventually see per-AoW attribution instead of an unattributed program-wide bucket. *(Refines US-S1, US-S2.)*
- **`AOWSEL-US-2`** — As a result submitter using the legacy `entity-aow` creation modal, I want the same AoW choice available, so that the two creation surfaces behave consistently and I'm not silently missing attribution depending on which entry point I used.

## 6. Functional Requirements

### Required (MUST)

- **`AOWSEL-R-1`** When the indicator being reported is an Intermediate Outcome (its ToC node has no `wp_id` / it was sourced from the program-level bucket, not a per-AoW query), `lab-report-form` MUST render an AoW `app-pr-select` populated from the program's Area-of-Work list already loaded by the parent (`dashboard-lab.component.ts`'s `aows()`, the same source backing `entityAows`/`plannedFilteredAows()` — no new endpoint).
- **`AOWSEL-R-2`** When the indicator being reported is an HLO or 2030 Outcome, `lab-report-form` MUST NOT render the AoW selector (unchanged behavior).
- **`AOWSEL-R-3`** The selected AoW MUST be included in the payload built by `buildCreateResultPayload` (`create-result-payload.util.ts`) as a new field, and MUST be accepted by `CreateResultsFrameworkResultDto` and persisted onto the created/updated `results_toc_result` row by `link-framework-result-toc.service.ts`.
- **`AOWSEL-R-4`** `lab-report-form`'s `missingFields()` MUST list the AoW selector when it applies (Intermediate Outcome indicator) and no AoW is yet selected; `canSave()` MUST stay `false` until it is resolved — mirroring the existing pattern for "Indicator category", "Result title", etc.
- **`AOWSEL-R-5`** `aow-hlo-create-modal` MUST offer the same AoW selection for Intermediate Outcome reports, gated and validated the same way, and MUST include the selected value in its own (currently inline) create payload using the same field name/shape as `AOWSEL-R-3`.
- **`AOWSEL-R-6`** The AoW selector's option list MUST come from the program's existing AoW catalog (`Unit[]`: `id`, `code`, `name`, `composeCode`) already fetched via `GET_ClarisaGlobalUnits` — no new "AoWs for this ToC node" endpoint is introduced (see Scope).

### Should (SHOULD)

- **`AOWSEL-R-10`** The dropdown label/placeholder text SHOULD go through `src/app/internationalization/` per client convention, consistent with other `lab-report-form` fields (they are already i18n'd — unlike the sibling `target-tooltip` spec's plain-string exception).

### Could / Nice-to-have (MAY)

- **`AOWSEL-R-20`** The created result's confirmation state MAY surface the chosen AoW back to the user (e.g., in a success toast or the result summary) — no requirement to build a dedicated display surface for it in this spec.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Security** | `POST /api/results-framework-reporting/create` stays JWT-gated (inherited from `JwtMiddleware` on `/api/*`, unchanged by this spec); the new DTO field goes through `class-validator` like every other field on `CreateResultsFrameworkResultDto`. |
| **Backwards compatibility** | New field is additive on the create DTO; omitting it (HLO/2030 Outcome reports) MUST NOT change existing behavior or fail validation. No `/api/bilateral/*` or `/api/platform-report/*` payload is touched (confirmed by code research — out of `AC-4`'s scope). |
| **Data integrity** | The stored AoW identity MUST belong to the same program (`initiative`/`toc_result_id`'s program) as the result being created — server-side validation, not client-trust-only (`AC-3`, defense in depth). |
| **Accessibility** | New `app-pr-select` follows the same PrimeNG dropdown pattern already used for "Indicator category" in the same form — no new a11y pattern introduced; keyboard/focus behavior inherits from the existing component. |
| **Internationalization** | New strings go through `src/app/internationalization/` (see `AOWSEL-R-10`). |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `AOWSEL-AC-1` | The `lab-report-form` aside is opened for an Intermediate Outcome indicator | The form renders | An AoW `app-pr-select` is visible, populated with the program's AoW list, and appears in `missingFields()` until a value is chosen |
| `AOWSEL-AC-2` | The `lab-report-form` aside is opened for an HLO or 2030 Outcome indicator | The form renders | No AoW selector appears; `missingFields()`/`canSave()` behavior is unchanged from today |
| `AOWSEL-AC-3` | An Intermediate Outcome report with an AoW selected | The submitter clicks Create | `POST /api/results-framework-reporting/create` payload includes the selected AoW; the created `results_toc_result` row persists it |
| `AOWSEL-AC-4` | An Intermediate Outcome report with no AoW selected | The submitter attempts to click Create | `canSave()` is `false`; the button stays disabled (client) AND, if bypassed, the server rejects a missing-AoW payload for an Intermediate Outcome `toc_result_id` (server, defense in depth) |
| `AOWSEL-AC-5` | The legacy `aow-hlo-create-modal` is opened for an Intermediate Outcome indicator (one of its six active `entity-aow` entry points) | The modal renders | The same AoW selector appears and gates its own create action, consistent with `lab-report-form` |
| `AOWSEL-AC-6` | A submitter selects an AoW code from a different program than the ToC node being reported against (tampered/stale client state) | The create request reaches the server | The server rejects it (400) rather than persisting a cross-program AoW value |

### Defect classes this spec can produce, and their gate

| Defect class | Caught by |
|---|---|
| Selector shown/hidden on the wrong indicator type (HLO/2030 leaks the selector, or Intermediate Outcome is missing it) | Jest: component test asserting `isIntermediateOutcome` input drives selector visibility (exact boolean, not truthy) |
| Selected AoW dropped somewhere in the payload chain (util → DTO → entity) | Jest: `create-result-payload.util.spec.ts` asserts the field is present in the built payload; server DTO validation test; a repository/service test asserting the persisted `results_toc_result` row carries the value |
| `missingFields()`/`canSave()` silently ignores the new required field (the exact risk the proposal calls out) | Jest: `canSave()` returns `false` with an Intermediate Outcome indicator and no AoW selected, `true` once selected |
| Cross-program AoW value accepted (data integrity) | Server integration test: POST with an AoW code from a different program's catalog is rejected |
| Selector visually broken / not actually reachable in a real browser (PrimeNG rendering, dropdown open/close) | **jsdom cannot evaluate real rendering.** Substituted with a mandatory manual browser check on both creation surfaces at task done-criteria (same substitution pattern as `target-tooltip/requirements.md`), recorded as an accepted, explicitly substituted risk rather than an automated gate. |

## 9. Dependencies & Assumptions

### Upstream dependencies

- `dashboard-lab.component.ts`'s `aows()`/`loadAows()` (via `GET_ClarisaGlobalUnits`) — the AoW catalog source, already fetched for both creation surfaces (`entityAowService.entityAows` for the legacy modal).
- `link-framework-result-toc.service.ts` and `results_toc_result` — the write path and storage row this spec extends.
- No new CLARISA endpoint, no new RMQ/notification path.

### Downstream consumers

- None yet — this spec captures the field; consuming it in Reporting-tab progress bars or PMU views is explicitly out of scope (`AOWSEL-R-20` is the only optional display surface, and even that is not required).

### Assumptions

- **`AOWSEL-A-1`** "Valid AoWs for an Intermediate Outcome" == "the program's full AoW list" (Option A from `proposal.md` §10). Code research found no evidence of a narrower constraint; if a BA review later finds one, that's new scope, not a gap here.
- **`AOWSEL-A-2`** Single-select is sufficient (see `AOWSEL-OQ-1` resolution) — one reported result counts toward exactly one AoW.
- **`AOWSEL-A-3`** `lab-report-form` currently receives no signal distinguishing Intermediate Outcome from HLO/2030 Outcome (confirmed: `dashboard-lab.component.ts`'s `kind: 'aow' | 'intermediate'` never reaches the aside's inputs today). This spec requires threading a new boolean input down from the parent — a client-side wiring gap, not just a template addition; sized into the `design.md` budget.

## 10. Open Questions

- **`AOWSEL-OQ-1` — RESOLVED for this spec.** Single- vs multi-select AoW attribution was an open product question in `proposal.md`. Given `proposal.md §4` explicitly proposes "a dropdown, `app-pr-select`" (PrimeNG's standard single-select component in this codebase; multi-select uses the distinct `app-pr-multi-select` component per `lab-report-form`'s own contributing-centers/science-programs fields), this spec proceeds with **single-select**. If product later confirms a result can genuinely count toward more than one AoW, that is a follow-up spec swapping `app-pr-select` for `app-pr-multi-select` and changing the storage column to a join table — not a small patch, flagged in `design.md` Open Gaps.
- **`AOWSEL-OQ-2`** — Storage identity shape (`composeCode` like `SP02-AOW01` vs bare `code` like `AOW01` vs numeric `wp.toc_id`) is decided in `design.md` (architecturally significant — data model + migration). Default direction: store `composeCode` (already unique across programs, already the client's `Unit.composeCode` field, already matches `wp.wp_official_code`'s format used server-side) unless `design.md`'s `software-architect` pass finds a reason to prefer the numeric `wp.toc_id`.
- **`AOWSEL-OQ-3`** — Whether the AoW selector is a hard-required field (blocks save, per `AOWSEL-R-4`) or an optional/skippable one. This spec defaults to **required** (matches the proposal's framing: "let them pick... instead of the system leaving that attribution implicit"), pending explicit product override.

## 11. Out-of-Band Notes

None — no shared-file lifecycle writes in this phase; ordinary spec-branch work only.

## Required cross-references

- `docs/prd.md` — G2 (data quality), US-S1/US-S2, AC-3 (authorization — server-side validation), AC-4 (bilateral/platform-report additive-only, confirmed not touched).
- `docs/ux-ui/design.md` §10 (Accessibility) — inherited PrimeNG dropdown pattern.
- `docs/trd/trd.md` — §2 (Results Framework Reporting module), §3 (Data Model, `results_toc_result`), §4 (API surface, `/api/results-framework-reporting/create`), §5 W1 (result lifecycle — this write happens pre-submission, at Editing-status creation time).
- Sibling: `docs/specs/results/intermediate-outcome-aow-visibility/target-tooltip/` (independent, no shared files; ships in either order per `family.md`).
- `docs/specs/results/intermediate-outcome-aow-visibility/aow-selector/proposal.md` — source intent; this document resolves its Open Questions §11 and Requirement Delta Preview §9.
