# Module Spec — Real-Time Section Completion

> Depth: **Standard**. This is a client-only change but it alters the persistence model (implicit background saves) across every Result Detail section for both portfolios (P22/P25), so it warrants full requirements/design/tasks rather than Lite.

## 1. Module / Feature

- **Module:** `results` (client) — Result Detail
- **Sub-feature:** `realtime-section-completion`
- **Owner:** Frontend (onecgiar-pr-client)
- **Status:** draft
- **Ticket(s):** none yet (raised from user request, no Jira ticket provided)

---

## 2. Context

Result Detail's section indicator ("Section complete" / "Section incomplete" pill in `section-bottom-bar`, and the matching green check in `result-sections-sidebar`) is driven entirely by a server-computed value (`green_checks`) that is only refreshed on section load and after an explicit **Save draft** round-trips. A user who finishes filling in every mandatory field sees "Section incomplete" until they manually save — the screenshot in the originating request shows exactly this on a freshly-completed "General information" section.

This touches the Result Detail flow described in `docs/ux-ui/design.md` §"Result Detail" (line 171: "section menu with completion indicators, progress bar, and submit triggers") and the PRD's `US-S1` (typed result capture) and, directly, `US-S5`: *"As a result submitter, I want autosave / explicit save with clear error messages so that I never lose entered work to a network error."* `US-S5` already anticipates autosave as a product direction — this spec is the first concrete implementation of it, scoped narrowly to feeding the completion indicator.

See `docs/specs/changes/realtime-section-completion/proposal.md` for the root-cause investigation and the rejected alternatives (full client-side rule duplication, polling without autosave).

---

## 3. In Scope / Out of Scope

### In scope

- Debounced, silent background save of the currently open Result Detail section once the user pauses editing — **P25 only** (rescoped 2026-09-08, see `execution.md`'s second Pivot Record: the P22-exclusive `rd-theory-of-change` section carries the same unavoidable email + socket + reload/confirm-dialog side effect that got the P25-exclusive `rd-contributors-and-partners` excluded, and unlike that section it also pops a blocking confirm dialog / reloads the page, so excluding it alone left P22 no better off; the user chose to scope autosave to P25 entirely rather than special-case P22 section-by-section).
- Refreshing the section's green check (and the rail's progress counter) once that background save resolves, reusing the existing `GreenChecksService` / interceptor mechanism.
- Visual state for "saving in the background" on the bottom bar, distinguishable from the existing explicit-save spinner and from "Section complete/incomplete".
- Coalescing/cancellation so only one background save is in flight per section at a time.

### Out of scope

- **P22 results entirely** (rescoped 2026-09-08 — see above). Autosave never fires while the open result's portfolio is P22, on any section, including ones that also render for P25 (`rd-general-information`, `rd-geographic-location`, `rd-evidences`, the five `rd-result-types-pages/*`). The P22-exclusive `rd-theory-of-change`/`rd-partners` sections are therefore untouched by this spec entirely — no code change to either file.
- Changing what makes a section "complete" (the mandatory-field / business-rule logic itself, server- or client-side).
- Removing or weakening the server as the Submit/AI-review gate (`GreenChecksService.submit` stays authoritative).
- Applying this to IPSR or the result creator (they use `section-bottom-bar` outside `hasCurrentSection()` and fall back to the DOM-scan path — untouched here).
- A visible/manual "Autosave: on/off" user preference (not requested; may be a future OQ).
- Any server-side change to the green-check computation itself.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Sees the section indicator update shortly after finishing required fields, without pressing Save draft first. Data is now also persisted more frequently in the background. |
| QA reviewer | No change — they don't edit Editing-status sections. |
| PMU lead | No change. |
| Platform admin | No change. |
| Bilateral consumer (downstream) | No change — no payload shape changes. |

---

## 5. User Stories

- **`RSC-US-1`** — As a result submitter, I want the section indicator to say "Section complete" as soon as I've filled in the required fields, so that I don't have to click Save draft just to check my progress. *(Refines `US-S5`.)*
- **`RSC-US-2`** — As a result submitter, I want to always be able to tell whether my edits are saved, unsaved-but-queued, or currently saving in the background, so that I trust the app isn't silently losing my work. *(Refines `US-S5`.)*

---

## 6. Functional Requirements

### Required (MUST)

- **`RSC-R-1`** When the user stops editing a mandatory field in the currently open Result Detail section for `RSC-R-1-DEBOUNCE` (see NFR) without further edits, the system MUST silently submit that section's existing save payload (the same one **Save draft** would send) in the background.
- **`RSC-R-2`** When a background save (`RSC-R-1`) succeeds, the system MUST refresh the section's green check and the rail's progress counter using the existing `GreenChecksService` refresh path, with no additional user action required.
- **`RSC-R-3`** The system MUST allow at most one in-flight background save per section at a time. A new edit that arrives while a background save is in flight MUST NOT be dropped — it MUST be captured and trigger a follow-up background save once the in-flight one resolves.
- **`RSC-R-4`** The system MUST NOT trigger a background save while the user has not changed any mandatory field since the section was opened or since the last save (explicit or background) succeeded.
- **`RSC-R-5`** When a background save fails, the system MUST NOT show "Section complete" and MUST surface the failure without discarding the user's in-editor input, exactly as an explicit Save draft failure does today.
- **`RSC-R-6`** The explicit **Save draft** button MUST keep working exactly as today (same payload, same click-triggered behavior) — this feature adds a second save trigger, it does not replace or hide the first one.
- **`RSC-R-7`** Read-only users (`RolesService.readOnly` and no `editable` escape hatch) MUST NOT trigger a background save — mirrors the existing guard on the explicit Save button (`onClickSave`'s `canSave` check).

### Should (SHOULD)

- **`RSC-R-10`** The bottom bar SHOULD show a distinct, low-emphasis "Saving…" affordance while a background save is in flight, distinguishable from the existing `saveButtonSE.isSaving()` explicit-save state, so the user isn't confused about which action triggered the request.
- **`RSC-R-11`** The background save SHOULD be scoped per-section (navigating away from a section with a pending debounce SHOULD flush or cancel it consistently — not silently drop unsaved edits) — see `RSC-OQ-1`.

### Could / Nice-to-have (MAY)

- **`RSC-R-20`** The system MAY expose a lightweight "last saved" timestamp/tooltip near the bottom bar when a background save completes, reusing existing i18n copy patterns.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Background save MUST debounce at **`RSC-R-1-DEBOUNCE` = 1.5s** of no mandatory-field edits before firing — tunable per section if a section proves noisier, but the default MUST NOT fire more than once per 1.5s of continuous editing. |
| **Throughput** | Background saves MUST NOT exceed the request volume of a user manually clicking Save every 1.5s in the worst case (i.e., no per-keystroke or per-field-blur firing). |
| **Availability** | Inherits the existing Result Detail save endpoints' availability — no new endpoint is introduced. |
| **Security** | No new endpoint, no new auth surface — background save reuses the exact request the explicit Save button already issues, so it inherits the same JWT + role checks server-side. |
| **Privacy** | No change — no new fields are transmitted. |
| **Backwards compatibility** | Additive only. Explicit Save keeps working unmodified (`RSC-R-6`). No API contract change. |
| **Accessibility** | The new "Saving…" affordance MUST be announced to assistive tech consistently with the existing save-state announcements in the bottom bar (no silent state change for screen-reader users). |
| **Internationalization** | Any new copy ("Saving…", failure message if distinct from today's) MUST go through `src/app/internationalization/`. |
| **Observability** | Background save failures MUST be logged the same way explicit-save failures are today (no new logging pipeline needed, but do not silently swallow errors — `RSC-R-5`). |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `RSC-AC-1` | A Result Detail section open with one remaining empty mandatory field, bottom bar showing "Section incomplete" | The user fills in that field and pauses for the debounce window | The section's bottom-bar pill and rail green check switch to "Section complete" without the user clicking Save draft |
| `RSC-AC-2` | A section already showing "Section complete" (all mandatory fields filled) | The user edits a mandatory field to an empty/invalid value and pauses | The background save fires, the server reports incomplete, and the indicator switches back to "Section incomplete" |
| `RSC-AC-3` | A background save is in flight for a section | The user makes another edit before it resolves | No second request fires concurrently; a follow-up request fires only after the in-flight one resolves, carrying the newest edit |
| `RSC-AC-4` | A background save request fails (network/server error) | The failure response arrives | The indicator does NOT flip to "Section complete"; the user's in-editor values are untouched; the failure is surfaced the same way an explicit Save draft failure is today |
| `RSC-AC-5` | A read-only user (no edit permission) viewing a section | Time passes / the read-only view re-renders | No background save request is ever issued |
| `RSC-AC-6` | Any Result Detail section | The user clicks **Save draft** explicitly | Behavior is unchanged from today — same payload, same response handling, unaffected by whether a background save recently ran |

Cross-cutting project ACs that already apply (do NOT restate, do refer): `AC-1` (typed result integrity), `AC-9` (security and secrets — no new surface, but background save must not log tokens per `.cursorrules`).

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- Each Result Detail section's own existing save method/endpoint (no two sections necessarily share one — this spec's design must confirm the save entry point per section type).
- `GreenChecksService` / `GeneralInterceptorService`'s existing post-PATCH/POST refresh side effect — reused as-is.
- `RolesService.readOnly` — reused as-is for the write-lock guard.

### Downstream consumers

- None outside the client — no bilateral/platform-report payload is touched.

### Assumptions

- The green-check computation itself already reflects whatever the last saved state was, correctly, per section and per portfolio (out of scope to re-verify here — this spec only changes *when* a save/refresh happens, not what it computes).
- Each section's current Save draft payload already contains everything needed to answer "is this section complete" server-side (true today for the explicit save path, so it holds for a background save issuing the identical payload).

---

## 10. Open Questions

- `RSC-OQ-1` — When the user navigates away from a section with a pending (not-yet-fired) debounce, should the system flush the save immediately, or let the existing explicit "confirm before leaving with unsaved changes" behavior (if any) handle it? Needs product confirmation before `tasks.md` is finalized for the navigation-guard task.
- `RSC-OQ-2` — Should the debounce/background-save mechanism apply uniformly to every current and future Result Detail section, or should the design provide an explicit per-section opt-out (e.g., a section whose save endpoint has a non-idempotent side effect like sending a notification)? `design.md` must audit each section's save side effects before deciding.
- `RSC-OQ-3` — Is a distinct "Saving…" bottom-bar state (`RSC-R-10`) required for this iteration, or can it ship without one (silent background save, indicator just updates)? Affects whether a design/token decision is needed from `docs/ux-ui/design.md` §12 process.

---

## 11. Out-of-Band Notes

None — single-spec change, no family/manifest.

---

## Required cross-references

- `docs/prd.md` — `US-S5` (autosave), `US-S1` (typed result capture).
- `docs/ux-ui/design.md` — Result Detail screen description (line ~171: `app-result-sections-sidebar` completion indicators).
- `docs/trd/trd.md` — not yet consulted for a dedicated Result Detail save/green-check ADR; `design.md` should confirm none exists before introducing `RSC-DD-*` entries.
- `docs/specs/changes/realtime-section-completion/proposal.md` — root cause and rejected alternatives.
