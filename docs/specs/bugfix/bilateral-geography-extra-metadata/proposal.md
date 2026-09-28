# Bilateral extra geography as optional metadata

Move the extra geographic-scope question out of required bilateral reporting fields and into Full Metadata. This removes an unintended MDS submission blocker while preserving and displaying extra geography that is already recorded.

## Document Control

| Field | Value |
|---|---|
| Type | Bug |
| Spec Path | `bugfix/bilateral-geography-extra-metadata` |
| Approval Mode | gated |
| Requirement / visual reference | No Jira ticket or Figma design |
| Parent Spec | none |

## Intent

Allow bilateral results of every type to be saved and submitted for review without answering whether they have potential impact in other geographic areas. Keep the field out of the required MDS; show its saved value and related details in Full Metadata and the review drawer only when that information exists.

## Problem / Current Behavior

- The bilateral Geography form labels itself as MDS and currently renders the extra-geography question as required for innovation results; unanswered answers make `isGeographyComplete()` false and add `extra-geo-answer` to the MDS tracker ([section-geography.component.html:8-13, 121-147](../../../../onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/section-geography.component.html), [section-geography.component.ts:545-565, 599-674](../../../../onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/section-geography.component.ts)).
- The bilateral Geography editor also changes the persisted meaning of absent metadata: its autosave payload coerces `null` to `false`, and for non-innovation or global/determined focus it sends false flags and empty dependent selections ([section-geography.component.ts:234-270](../../../../onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/section-geography.component.ts)). This conflicts with preserving saved optional metadata when the editor saves main geography.
- Bilateral API creation validates the main `geo_focus` by scope and has no `has_extra_geo_scope` field in `GeoFocusDto`; the separate geographic-location update DTO declares that property optional ([create-bilateral.dto.ts:780-796, 1255-1264](../../../../onecgiar-pr-server/src/api/bilateral/dto/create-bilateral.dto.ts), [create-geographic-location.dto.ts:7-14](../../../../onecgiar-pr-server/src/api/results-framework-reporting/geographic-location/dto/create-geographic-location.dto.ts)).
- Comparable bilateral type-specific sections expose optional fields in a collapsible Full Metadata area and keep them outside the MDS tracker ([type-innovation-dev.component.html:8-30, 93-104](../../../../onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-innovation-dev/type-innovation-dev.component.html), [type-innovation-use.component.ts:183-184](../../../../onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-innovation-use/type-innovation-use.component.ts)).

## Proposed Outcome

Treat the extra geographic-impact answer and its dependent scope/region/country details as optional metadata for all bilateral result types. Remove them from MDS completeness and the Submit for Review gate. In Full Metadata and the bilateral review drawer, render the saved information only when populated; if it is absent, do not show an empty question or required indicator. Preserve existing values and do not silently convert an unanswered value to “No.”

## Scope

- Bilateral Geography editor: move extra geographic-impact fields to the existing Full Metadata presentation pattern, exclude them from MDS tracking/completeness for every result type, and preserve absent or existing extra values when autosaving main geography.
- Bilateral result review drawer: render saved extra-geography metadata conditionally and without required semantics; do not present an empty field for completion when no value is stored.
- Preserve the main geographic focus and its scope-dependent region, country, and sub-national MDS validation.
- Keep the P25 SQL function outside this client-side correction; source tracing found no bilateral application caller.

## Non-Goals

- Change requirements for the main `geo_scope_id`, `has_regions`, regions, countries, or sub-national locations.
- Change W1/W2 form behavior or API contracts, schema, or persistence semantics.
- Leave the P25 SQL function unchanged; no bilateral application caller was found during specification.
- Add a workflow for entering previously absent extra-geography metadata.

## Affected Users, Systems, And Specs

| Area | Effect |
|---|---|
| Bilateral result submitters | Can complete MDS and submit without answering the optional extra-geography question. |
| Bilateral reviewers | See saved extra-geography information when available; no blank required prompt. |
| Bilateral Angular form / review drawer | MDS tracker, Full Metadata rendering, drawer conditional rendering, save mapping. |
| Geographic-location API / database | Existing nullable field and optional update contract; no API or database changes are scoped. |
| Related history | P2-3504 introduced innovation-specific copy; P2-3620 addressed the separate main geographic-focus save guard. |

## Visual Reference

- Source: None
- Location: Existing bilateral Full Metadata pattern in `type-innovation-dev` and `type-innovation-use` components (linked above).
- Notes: Reuse established in-product presentation; no Jira ticket or Figma design is available.

## Bug Diagnosis

### Observed Symptom

The user reports that bilateral editing and review treat “Are there any regions that you wish to specify for this Output?” as required even though it is not part of the bilateral API's required geographic-focus payload. The current UI code confirms a required MDS question for Innovation Use/Development and a required-looking control in the review drawer. Reproduction against a running environment and a concrete result record: **UNVERIFIED — confirm at source before relying on it** (owner: `/akili-specify` investigator).

### Reproduction Steps

1. Open a bilateral Innovation Use or Innovation Development result with a concrete (non-Global/non-determined) main geographic scope and no saved `has_extra_geo_scope` answer. **UNVERIFIED — confirm at source before relying on it** (owner: `/akili-specify` investigator).
2. Observe the extra-geography Yes/No field marked required in Geography and the incomplete MDS state; open a bilateral review drawer with a concrete scope and observe the legacy question with required styling. The render/completeness behavior is confirmed by source citations above; runtime rendering is **UNVERIFIED — confirm at source before relying on it** (owner: `/akili-specify` investigator).
3. Compare with bilateral API creation/update contract: the extra-geography answer is not required by the DTO contract (citations above).

### Root Cause (confirmed)

The bilateral form explicitly binds `[required]="true"` to the extra-geography question, then treats a null answer as incomplete in both `isGeographyComplete()` and its MDS tracker. Separately, the review drawer renders the same optional field without a `required` binding, so `app-pr-radio-button` applies its default required state. Both the editor autosave mapper and drawer mapper coerce null to false; the editor also clears extra selections when that block is hidden by result type or main scope. These client-side paths create required UI and risk replacing or dropping saved optional metadata ([section-geography.component.ts:234-270](../../../../onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/section-geography.component.ts), [result-review-drawer.component.ts:852-864](../../../../onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.ts)).

The P25 SQL function definition separately rejects null `has_extra_geo_scope` for Innovation Use/Development with non-global/non-determined focus ([1762528725798-createValidtionP25.ts:743-748](../../../../onecgiar-pr-server/src/migrations/1762528725798-createValidtionP25.ts)). Source tracing found only the migration definition/drop and no bilateral application caller; the bilateral green-check and submit gate are frontend MDS tracking.

### Blast Radius

| Check | Recorded as | Result |
|---|---|---|
| **Already fixed?** | `git log --all --oneline -- <section-geography> <result-review-drawer>` and `git log --all --oneline --regexp-ignore-case --grep='P2-3504\|extra.geo.scope\|geographic.*metadata\|regions.*Output'` (2026-09-24, branch `performance-refactor`, HEAD `origin/performance-refactor`) | No fix for the requested behavior found. History includes P2-3504 copy/visibility work, hiding the extra-scope UI for non-innovation bilateral forms (`57c27a49b`), and P2-3620 for the distinct main-scope save guard (`15921159f`, `83bb4bb28`). These do not remove the innovation MDS requirement or conditionally render stored metadata in the review drawer. |
| **Live path?** | `BilateralResultCreatorComponent` embeds the Geography section; the section updates `BilateralMdsTrackerService`, which gates submit. The review route mounts `result-review-drawer`; its template renders the geography block and its mapper builds the data-standard payload ([section-geography/CLAUDE.md](../../../../onecgiar-pr-client/src/app/pages/bilateral/components/section-geography/CLAUDE.md), [result-review-drawer/AGENTS.md](../../../../onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/AGENTS.md), source references above). | Both affected controls are on the live editor/review paths. Runtime route reproduction remains unverified. |
| **Siblings on the same state** | Editor sibling pattern: `type-innovation-dev` / `type-innovation-use` Full Metadata toggles; geographic sibling: W1/W2 geographic-location field; review sibling: other drawer data-standard controls use explicit edit/read-only gates. | The same extra-geography state is also handled by the W1/W2 geography editor and API, so changes must remain scoped to bilateral presentation and MDS policy. The user’s stated rule is to align bilateral behavior only. |
| **Downstream consumers** | Bilateral client MDS tracker/creator submit gate; review drawer save payload; nullable `result.has_extra_geo_scope` field and optional geographic-location update DTO. | Removing the answer from the MDS tracker changes bilateral submit eligibility. Existing saved values should continue to flow to metadata display. No API or database change is indicated. |

### Fix Strategy

For `/akili-specify` (Lite), in Bug Mode, make the smallest client-side behavior change: use the established Full Metadata pattern for stored extra-geography data, remove this field and its dependent details from bilateral MDS completeness for all types, and condition the review-drawer rendering on persisted data. Preserve explicit null semantics and existing saved values. Add regression coverage for all result types, empty versus populated metadata, tracker completeness, and drawer rendering. Resolve the SQL routine linkage question before including a backend change.

## Approach Options

| Option | Trade-off |
|---|---|
| **A. Treat all extra geography as optional Full Metadata (recommended)** | Matches the requested product rule and existing bilateral pattern; touches editor and drawer behavior while preserving stored data. Requires verifying the SQL-function deployment path. |
| B. Make the current question visually optional but leave it in the MDS section | Smallest markup change, but it still asks users to complete metadata inline and weakens clarity between MDS and optional metadata. |
| C. Remove the question from bilateral UI entirely | Prevents false required prompts but hides already-recorded information from submitters/reviewers. |

## Recommended Approach

Choose Option A. Keep the optional field readable only when a saved answer or associated extra-geography values exist, and never default missing data to “No.” Leave the main geographic focus validation untouched. Specify and test editor and drawer behavior together.

## Risks, Dependencies, And Open Questions

- None for the scoped frontend correction. Bilateral green checks and the submit gate are handled by the client MDS tracker.
- No Jira ticket or Figma design is available; the proposal uses the existing Full Metadata UI as its reference.
- Existing records may have `has_extra_geo_scope = NULL`, `false`, or `true`; “populated” must preserve true/false and dependent selections without converting null to false.
- The editor and drawer currently coerce null to false in their payload mappers; preserve the absent state on save rather than implicitly answering “No.”

## Success Criteria

- No bilateral result type includes the extra-geography answer or its dependent extra scope/region/country data in MDS completeness or the Submit for Review gate.
- Full Metadata does not offer an empty extra-geography question to complete; it shows existing saved information.
- The review drawer shows existing extra-geography information without required styling and hides the field when it is absent.
- Existing main geographic-focus requirements and saved extra-geography values remain intact.
- Automated regression tests cover Innovation Use, Innovation Development, and at least one non-innovation bilateral type, plus null and populated stored data.
- Requirements, frontend design, and one focused implementation/test task are specified; no backend work is planned.

## Next Step

After proposal approval, run:

```text
/akili-specify docs/specs/bugfix/bilateral-geography-extra-metadata
```

Use Bug Mode (Lite); include a regression test for the editor tracker and review drawer. Do not implement until the detailed spec is approved.
