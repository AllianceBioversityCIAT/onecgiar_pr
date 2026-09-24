## Why

`bilateral-contributors-linked-bundled` (commit `b7195d72e`, merged into `performance-refactor` on 2026-09-24, Jira **P2-3823** under P2-3704, requirement P2-3368 AC10–AC14) made the linked/bundled answer of the bilateral **Contributors & Partners** section persist. An adversarial second pass over that diff (two independent read-only reviews — server and client — each finding re-opened in code) found no defect in the narrow write protocol itself, but **four ways the delivered field can silently lose or corrupt stored links** and two smaller gaps. None of them is caught by the current specs, and every one of them would reach reporters through prtest → staging → master.

The field is not yet on Cami's desk (`P2-3823` is `In Progress`, on-screen verification pending). This change closes the holes **before** it goes to UAT, so what she tests is what ships.

## What Changes

**Client** (`pages/bilateral/components/section-contributors/*`, plus one shared primitive):

- **C1 — The picker must never drop stored ids it cannot show.** `app-pr-multi-select.writeValue` maps ids to catalogue options and `.filter(Boolean)`s the misses (`pr-multi-select.component.ts:295-300`); the next `ngModelChange` therefore emits a *shortened* list and the server deactivates the missing rows. Two real triggers: (a) a stored link whose target is not in the catalogue (`getResultsForInnovUse` only returns `status_id IN (2,6)`); (b) the catalogue (`InnovationUseResultsService.resultsList`, a plain array filled in a root-service constructor) arriving after the picker rendered — the picker is never re-mapped. Fix in the section: keep `selectedLinkedResultIds` as the source of truth and, on every picker change, **union the picker's ids with the stored ids the catalogue does not contain**. The read-only view (AC14) gets the same protection by rendering stored-but-unknown ids as `Result #<id>` chips instead of nothing.
- **C2 — The linked keys travel only when the question itself changed.** Today, once hydrated, `buildContributorsPayload()` attaches `has_innovation_link` + the full `linked_results` list to **every** autosave (centres, projects, partners). Each of those PATCHes re-runs `replaceLinkedResultsByOrigin` with this tab's snapshot, so a link added from another tab/user/section is deactivated by an unrelated centre change. Fix: the two question handlers (`onHasLinkedResultChange`, `onLinkedResultsModelChange`) are the only callers that include the keys; the "Yes" click sends the flag **without** `linked_results` (server contract: omitted list with Yes = "flag changed, list did not"), so the first Yes never wipes rows that exist.
- **C3 — No click before hydration.** The Yes/No radio is disabled until `linkedHydrated()` (today only `readOnly()` disables it), so a click made while the detail GET is in flight is not overwritten by the hydration a second later.
- **C4 — AC13 counter is honest.** `hiddenFieldsWithValues()` counts the question only when `linkedHydrated()` is true; after a failed detail read the footer must not promise "1 hidden field … will be saved" for keys the PATCH will not carry.

**Server** (`api/bilateral/services/bilateral-center.service.ts`, `dto/save-bilateral-contributors.dto.ts`):

- **S1 — Strict input normalisation.** The repo has no global `ValidationPipe` (`@Body()` without pipe in `bilateral-center.controller.ts:206-211`), so `@IsBoolean`/`@IsNumber` never run. `has_innovation_link: "false"` becomes `Boolean("false") === true` (a hand-made payload turns No into Yes); `linked_results: null` passes the `!== undefined` guard and is written as `[]` (wipes every id row). Fix: accept only a real boolean (anything else = key absent) and only an array of positive integers (anything else = key absent).
- **S2 — Same hygiene as the classic writer.** Mirror `ContributorsPartnersService.filterActiveLinkedResults` (`contributors-partners.service.ts:755-769`): drop ids whose `result.is_active = 0`, and drop the result's own id (self-link). Today both are written as-is.
- **S3 — Truthful comments and spec.** The delivered comments (`bilateral-center.service.ts:1529-1537`, DTO `:169`) and the spec scenario *"Rows of other sections survive a retraction"* claim the narrow writer spares P22 "Links to results" rows. It spares only `legacy_link` rows (`linked_results_id IS NULL`); P22 rows carry a real id and **are** deactivated on retraction or replaced on selection — exactly the P2-3424 contract Innovation Use already accepted. The bilateral editor has no P22 section, so the exposure is a bilateral result opened through the classic W1/W2 editor (Santiago's finding 1 in the same thread). The spec is corrected; behaviour is not changed.

**Tests** — one failing-first test per hole above (client: C1 catalogue miss, C1 late catalogue, C2 centre autosave carries no linked keys, C3 radio disabled pre-hydration, C4 counter after failed read, AC14 chips with stored-but-unknown ids, radio disabled read-only; server: S1 string flag, S1 null list, S2 inactive id, S2 self id).

**Out of scope (documented, not built)**: a transaction around the three-step write (existing pattern of every block in `saveContributors`); copying `has_innovation_link` on phase replication (`result.repository.ts:~147-215` does not copy it for W1/W2 either — pre-existing, belongs to the replication owner); the duplicated P22 innovation rows in the catalogue `UNION ALL` (pre-existing).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `bilateral-linked-bundled-result`: the keys travel only on a question change; the picker cannot drop stored ids; input is normalised server-side; inactive and self ids are filtered; the "rows of other sections" scenario is corrected to what the writer really does.

## Impact

- **Client**: `section-contributors.component.{ts,html,spec.ts}`, `section-contributors.readonly.spec.ts`, folder `CLAUDE.md`. `pr-multi-select` is **not** modified (shared by ~40 callers; the union is done by the caller).
- **Server**: `bilateral-center.service.ts` (+ spec), `save-bilateral-contributors.dto.ts` (comment only). No new injection: `ResultRepository` is already available. No migration.
- **Jira**: P2-3823 (this subtask) — the "Built" checklist and the warning panel are updated when this lands; P2-3368 AC10–AC14 unchanged.
- **Related open work**: P2-3640 (Juan David) touches the catalogue of this same picker in W3/Bilateral — the C1 union makes the section robust to whatever that catalogue becomes.
