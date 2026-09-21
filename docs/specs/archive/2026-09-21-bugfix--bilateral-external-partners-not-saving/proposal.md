# Proposal — External Partners selection silently discarded (Bilateral, Section 3)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/bilateral-external-partners-not-saving` |
| Type | Bug |
| Approval Mode | gated |
| Author | santiago.sanchez@cgiar.org (reported by user) |
| Date | 2026-09-21 |
| Related component | `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/` |
| Related doc | `section-contributors/CLAUDE.md` (documents the exact invariant this bug violates) |

## 2. Intent

Fix the bilateral result creator's "Partners & partnerships" step (Section 3 of 6) so that ticking an external partner (e.g. FAO) actually satisfies the "External partners" requirement and lets the section be marked complete / saved.

## 3. Problem / Current Behavior

User report: in the bilateral result wizard, Section 3 ("Partners & partnerships"), searching "fao" and checking an FAO project in the External partners multi-select shows the option visually checked, but:
- The inline validation still shows: *"Add at least one external partner, or tick 'This result has no external partners'."*
- Clicking **Save draft** shows a blocking dialog: *"Nothing to save yet — Still missing: External partners"*.

The section can never be marked complete despite an apparently successful selection.

## 4. Bug Diagnosis

### Observed Symptom

Selecting a partner in the "External partners" `app-pr-multi-select` inside `section-contributors.component.html` does not clear the `external-partners` mandatory-field state, and Save draft refuses to proceed.

### Reproduction Steps

1. Open an existing bilateral result in Editing state.
2. Go to Section 3 ("Partners & partnerships").
3. In "External partners", search "fao" and check one of the listed FAO projects.
4. Observe: red inline text "Add at least one external partner…" stays visible.
5. Click **Save draft**.
6. Observe: modal "Nothing to save yet — Still missing: External partners."

### Root Cause (confirmed via code trace, `section-contributors.component.ts`)

The `external-partners` MDS-tracker item is intentionally gated on **two** conditions (`updateContributorsMds()`, line ~495):

```ts
filled: this.partnersHydrated() && this.externalPartnersSatisfied()
```

`partnersHydrated` is a one-shot signal set **only** inside `loadExternalPartnersState()`, which itself only runs from the `hydrateWhenReady` effect (lines 263–279) once `centersReady()` AND `projectsReady()` are both `true`. Symmetrically, `buildContributorsPayload()` (line ~437) only puts the `institutions` / `no_external_partners` / `is_lead_by_partner` keys on the PATCH payload **when `partnersHydrated()` is true** — this is a deliberate P2-3443 safeguard against overwriting previously-saved partners with an empty array before the stored block has loaded.

The consequence: if the `centersReady` / `projectsReady` chain never resolves for this session (e.g. `CentersService.getData()` silently failing — its `.catch(() => {})` in `loadCenters()` swallows the error and never emits on `loadedCenters`, so `centersReady` is never set), the `hydrateWhenReady` effect never fires, `loadExternalPartnersState()` is never called, and `partnersHydrated()` stays `false` forever:

- The user CAN still search and check a partner — `pr-multi-select`'s own selection logic (`onSelectOption`) is entirely independent of `partnersHydrated`, so the checkbox turns blue and `onPartnersModelChange` does update `selectedPartnerInstitutionIds`.
- But `updateContributorsMds()` keeps reporting `external-partners: filled = false` (by design — the component's own docstring at line ~489 calls this an explicit invariant: *"a field is never reported as satisfied while the payload is throwing its keys away"*).
- Every subsequent PATCH omits the `institutions` key entirely, so nothing is ever persisted.
- **No error banner shows**, because `partnersLoadFailed` (which does render a "Retry loading partners" banner, lines 148–163) is only set when `loadExternalPartnersState()`'s own GET call fails — it is never set when the *effect itself* never runs. This is the actual defect: the centers/projects hydration chain has no failure surface at all, unlike the partners GET which at least has a retry affordance.

This matches a documented trap in the component's own `CLAUDE.md` ("El efecto de hidratación NO se reintenta solo… Sin un error visible la sección se convirtió en un agujero negro"), but that note covers the case where the *partners GET itself* fails (which does show Retry). It does not cover the case diagnosed here — the *upstream* `centersReady`/`projectsReady` gate never resolving, which silently blocks hydration with zero user-facing signal.

A secondary, narrower possibility worth ruling out in Specify: `loadExternalPartnersState()` also no-ops if `currentResultId()` is falsy at the time the effect runs — same silent-forever failure mode, different origin.

### Impact & Scope

- Blocks Save draft / Submit for review for any bilateral result whose centers or projects catalogue call is slow, blocked, or errors out after the initial page load — the user has no way to recover except a full page reload (which may or may not re-trigger the catalogue calls successfully).
- Affects only `pages/bilateral/components/section-contributors/` — the classic (P22/P25 non-bilateral) contributors flow (`rd-contributors-and-partners`) does not share this hydration effect.
- No data-loss risk: the omit-the-key safeguard that causes this bug is itself protecting against a worse bug (P2-3443, silently wiping stored partners). The fix must preserve that protection.

### Fix Strategy

Not cosmetic — this requires touching effect/signal logic (`hydrateWhenReady`, `loadCenters`, `loadProjects`) and adding a genuine failure surface, which is exactly the class of change `/akili-quick` excludes. Recommended path: `/akili-specify bugfix/bilateral-external-partners-not-saving` in **Bug Mode**, which will define:

1. A regression test that simulates `CentersService.getData()` (or the projects GET) failing/hanging, and asserts the user still sees a visible, actionable error state (mirroring the existing `partnersLoadFailed` → Retry banner pattern) instead of a silently-stuck, unexplained validation error.
2. The mandatory regression test (red before fix, green after) per the Bug Mode requirement.

## 5. Scope

- `section-contributors.component.ts` — `loadCenters()`, `loadProjects()`, `hydrateWhenReady` effect: add an observable failure/stuck state, analogous to `partnersLoadFailed`.
- `section-contributors.component.html` — surface that failure state to the user (reuse the existing `app-alert-status` + Retry pattern already used for the partners GET failure, lines 148–163).
- `section-contributors.component.spec.ts` — new regression test(s) for the stuck-hydration path.

## 6. Non-Goals

- No change to the `partnersHydrated` gating invariant itself (it exists to prevent data loss — P2-3443 — and must stay).
- No change to `rd-contributors-and-partners` (classic P22/P25 flow) — out of scope, not reported as affected.
- No change to server-side validation (`validation_partners_P25`).

## 7. Affected Users, Systems, And Specs

- **Users:** center users editing bilateral results in Editing state, Section "Partners & partnerships".
- **Systems:** `onecgiar-pr-client` only (frontend hydration bug; no backend contract change).
- **Related specs:** none found under `docs/specs/` for `section-contributors` beyond its own `CLAUDE.md`; P2-3443 (external partners persistence) and P2-3368 (section origin) are the relevant prior tickets referenced in-code.

## 8. Visual Reference

- Source: User-supplied screenshots (2), showing the External partners dropdown with FAO checked, and the "Nothing to save yet — Still missing: External partners" blocking dialog.
- Location: attached to the originating chat message (not persisted under `docs/specs/` — purely evidentiary, no new UI is being designed).
- Notes: no new screens/flows; the fix is a failure-state addition to an existing screen using an already-established visual pattern (`app-alert-status` + Retry button).

## 9. Approach Options

**Option A (recommended) — Mirror the existing `partnersLoadFailed` pattern for the centers/projects hydration gate.**
Add a `contributorsHydrationStuck` (or reuse/extend the existing `centersReady`/`projectsReady` signals with an error signal from `CentersService`/`GET_ClarisaProjects` error handlers) that flips a visible alert + Retry, exactly like the partners-GET failure banner. Smallest, most consistent-with-existing-code option.

**Option B — Add a timeout-based fallback.**
If `centersReady`/`projectsReady` don't resolve within N seconds, surface a generic "taking longer than expected" banner. More complex, introduces a magic timeout, doesn't address the root cause (silent catch), only the symptom.

**Option C — Make `CentersService.getData()` fail loudly instead of `.catch(() => {})`.**
Touches a shared service (`CentersService`) used across the whole app (see its own doc note: "Fetched once at bootstrap… P2-3554"), so blast radius is much larger and requires broader regression coverage. Risk of destabilizing other consumers.

**Recommendation:** Option A — smallest safe path, reuses an established, already-reviewed UI pattern in the same component, and does not touch the shared `CentersService`.

## 10. Risks, Dependencies, And Open Questions

- **Open question:** is the actual failing link `CentersService.getData()`, `GET_ClarisaProjects()`, or `currentResultId()` timing? The diagnosis above traces all three plausible chains from the code; `/akili-specify` should start with a live-session check (`window.ng.getComponent(...).centersReady()` / `.projectsReady()` / `.partnersHydrated()` in the browser console per the client `CLAUDE.md` §9 "Verifying in a REAL browser") on the user's actual affected result, to confirm which gate is actually stuck before writing the fix.
- **Risk:** touching `hydrateWhenReady` risks re-introducing the P2-3443 data-loss bug it was built to prevent (empty payload wiping stored partners) — the regression test must assert both the new failure banner AND that no premature PATCH with an empty `institutions: []` is sent.
- **Dependency:** none on other in-flight specs.

## 11. Success Criteria

- Selecting a valid external partner and clicking Save draft succeeds (PATCH includes `institutions`) whenever the centers/projects catalogues load successfully (no regression to the happy path).
- When the centers/projects hydration chain fails or stalls, the user sees a visible, actionable error (not a silent, unexplained "field missing") with a way to retry.
- New regression test (red before fix, green after) covering the stuck-hydration path.
- No change to `partnersHydrated`'s data-loss-prevention behavior.

## 12. Next Step

```text
/akili-specify bugfix/bilateral-external-partners-not-saving
```

Run in **Bug Mode**: convert the confirmed root cause above into a fix plan and a mandatory regression test.
