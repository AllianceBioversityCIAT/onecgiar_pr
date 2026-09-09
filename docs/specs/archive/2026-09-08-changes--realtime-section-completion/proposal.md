# Proposal: Real-Time Section Completion Status

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/realtime-section-completion` |
| Slug derivation | `realtime-section-completion` — derived from free-text argument describing "section incomplete should update in real time as fields are completed, not only after Save" |
| Type | **Change** |
| Approval Mode | `gated` (default — no explicit end-to-end mandate given) |
| Author context | Result Detail screen, "Section incomplete" / "Section complete" indicator (screenshot: `test 111`, General information section, Reporting 2026 phase) |
| Parent Spec | none |

## 2. Intent

Today the "Section complete / Section incomplete" indicator on a Result Detail section (bottom bar, and the matching green check in the sections rail) only updates **after the user clicks Save** and the request round-trips. The user wants it to update **live, as the mandatory fields get filled in**, without requiring a save first.

## 3. Problem / Current Behavior

The indicator the user circled (`section-bottom-bar.component.ts`) is driven by `ResultSectionsService.currentSectionIsDone()`, which reads the section's **green check** — a value that comes from `DataControlService.green_checks`, populated exclusively by `GreenChecksService.getGreenChecks()` (`GET /green-checks-by-result` / the P25 v2 equivalent).

That fetch fires in exactly two moments, both tied to persistence, not to typing:

1. On section/result load (`result-detail.component.ts`'s `getData()`).
2. After a successful `PATCH`/`POST` on a Result Detail route — a side effect wired into `GeneralInterceptorService` (`onecgiar-pr-client/src/app/shared/interceptors/general-interceptor.service.ts`), which fires only once the save request the user triggered with **Save draft** resolves.

There is a second, unrelated signal already computed live in the browser — `DataControlService.fieldFeedbackList()`, fed by a DOM scan (`someMandatoryFieldIncompleteResultDetail`) that runs continuously via `ngDoCheck`. But `section-bottom-bar.component.ts` **deliberately stopped trusting that scan as the completion authority** (see the code comment at `isComplete`, ticket P2-3542): the scan only sees the active DOM (one ToC tab, not the others) and misses whole-section business rules that have no `.mandatory` DOM marker at all (e.g. "must have at least one contributing partner", "must have at least one contributing CGIAR Center"). Before P2-3542, results existed where the DOM scan said "complete" while the server's real green check was red — the opposite failure mode from what the user is reporting, but proof that the two signals genuinely disagree and the server green check is the one thing Submit is gated on (`ResultSectionsService.submitDisabled` reads `greenChecksSE.submit`).

So the root tension is: **the only trustworthy completeness signal is server-computed, and the server only sees what was last saved.** Making the label update "in real time" while the user types therefore cannot mean "recompute the server rule client-side" without either duplicating that server logic (and risking exactly the P2-3542 regression in reverse) or teaching the server about unsaved form state.

## 4. Proposed Outcome

While a user is filling in a Result Detail section, the "Section incomplete" / "Section complete" label (and the matching rail green check) reflects the **current state of the fields on screen** shortly after they finish entering the required data — without the user having to press **Save draft** and wait for the round trip first.

## 5. Scope

- The section-level indicator in `section-bottom-bar.component.ts` (`isComplete` / `pendingLabel`) for routes with a current section (`hasCurrentSection()` true).
- The matching green-check dot per section in `result-sections-sidebar` / `ResultSectionsService.sections()`.
- The progress counter (`ResultSectionsService.progressLabel` — "N of M sections complete").
- Both P22 and P25 portfolios (the green-check payload already branches by portfolio; whatever mechanism is chosen must keep working for both endpoints).

## 6. Non-Goals

- Changing what counts as "complete" for a section (the mandatory-field/business rules themselves are out of scope — this is about **when** the UI learns the answer, not **what** the answer is).
- Removing or weakening the server as the authority gating **Submit** (`greenChecksSE.submit` stays server-sourced and remains the Submit/AI-review gate regardless of how the section label is refreshed).
- Reworking the DOM-scan-based `fieldFeedbackList` ("N fields missing") naming mechanism — it already updates live and is unaffected by this change; only the "if it's complete" decision is in scope.
- IPSR and the result creator's own use of `section-bottom-bar` (they already fall back to the DOM-scan path, `hasCurrentSection()` is false there, and this proposal does not touch that fallback).

## 7. Affected Users, Systems, And Specs

- **Users:** result submitters filling out Result Detail sections (all portfolios).
- **Client code:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/section-bottom-bar/`, `.../components/result-sections-sidebar/result-sections.service.ts`, `onecgiar-pr-client/src/app/shared/services/global/green-checks.service.ts`, `onecgiar-pr-client/src/app/shared/interceptors/general-interceptor.service.ts` (green-checks refresh trigger).
- **Server:** no proposed change to the green-check computation itself; only how/when the client asks for it (Approach Option B, if selected, would add a lightweight autosave call path — see below).
- **Related specs:** none found under `docs/specs/` for this area; the closest prior art is the P2-3542 fix embedded directly in `section-bottom-bar.component.ts` (no spec file, applied as a quick/direct fix per its code comment).

## 8. Visual Reference

```markdown
## Visual Reference

- Source: None
- Location: n/a
- Notes: No new UI is introduced — the existing "Section complete" / "Section incomplete" pill and rail dot keep their current look (see `result-sections-sidebar` and `section-bottom-bar` component CLAUDE.md files for the exact tokens). This is a data-freshness change, not a visual one.
```

## 9. Requirement Delta Preview

### ADDED Requirements

- The section completion indicator (bottom bar pill + rail green check + progress counter) MUST refresh automatically, without requiring the user to click Save draft first, once the user has finished editing the mandatory fields of the open section (debounced — not on every keystroke).

### MODIFIED Requirements

- `GreenChecksService.getGreenChecks()` is currently invoked only from result/section load and from the interceptor's post-PATCH/POST side effect. It gains a third trigger tied to field activity (exact mechanism per the chosen approach below).

### REMOVED Requirements

- None.

## 10. Approach Options

### Option A — Debounced silent autosave + existing green-checks refresh (recommended)

When the user stops typing in a mandatory field for ~1–1.5s, silently fire the section's existing **Save draft** request in the background (same payload the explicit Save button sends), then let the interceptor's existing post-PATCH/POST green-checks refresh do its job exactly as it does today.

- **Pros:** Zero duplication of completeness rules — the server stays the single authority, so the P2-3542 guarantee (rail never says "complete" when the server disagrees) is preserved by construction. Reuses 100% of the existing green-checks plumbing; only the *trigger* is new.
- **Cons:** Turns "Save draft" into an implicit, continuous action — needs a light debounce/dedupe strategy (per-section, cancel-in-flight-on-new-edit) so it doesn't spam the API, and needs a subtle UI treatment so users aren't confused about when their data was persisted (e.g. keep the explicit Save button, but no longer treat it as the only persistence trigger). Slight increase in write traffic.

### Option B — Duplicate the completeness rules on the client

Re-implement each section's full mandatory-field/business-rule logic in Angular (extending the existing DOM-scan) so it can render "complete" instantly, purely from form state, with no request at all.

- **Pros:** Instant, no network round trip, no extra writes.
- **Cons:** This is the exact failure mode P2-3542 fixed in the other direction — two independent implementations of "is this section done" WILL drift over time (new business rules get added server-side and forgotten client-side, or vice versa). Given the DOM-scan already missed rules like "must have a contributing CGIAR Center", this is a high-risk path for reintroducing that class of bug. Not recommended.

### Option C — Poll the green-checks endpoint on a timer while a section is open

Keep saves exactly as they are (only on explicit Save), but re-fetch `GET_greenChecksByResultId` every N seconds while a Result Detail section is open.

- **Pros:** No new write traffic, minimal client logic.
- **Cons:** Does not actually solve the user's problem — the server has nothing new to report until the data is saved, so polling would just repeat the same stale "incomplete" answer. This only helps if combined with autosave (i.e., degenerates into Option A plus polling overhead).

### Recommendation

**Option A.** It is the only option that gives the user what they asked for (a label that updates as they finish filling fields, without an explicit Save click) while keeping the single source of truth the P2-3542 fix established. The main design work for `/akili-specify` is getting the debounce/dedupe and the "still saving…" vs "section complete" UI states right per section type.

## 11. Recommended Approach

Proceed with **Option A**: introduce a debounced, per-section silent autosave (reusing each section's existing save payload/endpoint) that is triggered by field changes once required fields look filled at the DOM level (as a cheap pre-filter to avoid firing on every partial edit), and let the existing green-checks refresh (already wired into the interceptor) update the indicator once the autosave's PATCH/POST resolves. `/akili-specify` should define, per section:

- The debounce window and cancel/coalesce rule (only one in-flight autosave per section; a new edit cancels/supersedes a pending one).
- Whether autosave applies to every Result Detail section uniformly or is opted in per section (some sections may have side effects on save — e.g. AI assistant note in the screenshot mentions AI Review becomes enabled once all sections are complete, so premature partial autosaves must not have unwanted side effects).
- What the bottom bar shows while an autosave is in flight (avoid it visually colliding with the existing `saveButtonSE.isSaving()` state already read in `onClickSave`).

## 12. Risks, Dependencies, And Open Questions

- **Risk — implicit writes:** autosaving without an explicit user action changes the persistence model for every Result Detail section; needs sign-off that partial/incomplete data being written mid-edit is acceptable (it already is written today via the explicit "Save draft", so this is a frequency change, not a new capability, but it is still worth confirming with the product owner).
- **Risk — request volume:** debounce/dedupe must be tuned so a large section (many fields) doesn't fire an autosave per field; needs to autosave once per "pause in typing", not per field blur.
- **Open question:** should autosave be scoped to *all* Result Detail sections, or only sections where completeness commonly changes without the user reaching the explicit Save (this needs product input — `/akili-specify` should confirm scope with the user before generating tasks).
- **Open question:** does any section's save endpoint have a side effect that is undesirable to trigger silently (e.g. a notification, a socket broadcast)? Needs a per-section audit during `/akili-specify`.
- **Dependency:** none on other in-flight specs.

## 13. Success Criteria

- After a user finishes filling in the last missing mandatory field of a Result Detail section and pauses, the section's bottom-bar pill and the rail's green check switch to "complete" within the debounce window, without the user pressing Save draft.
- Submit and AI review remain gated by the server-computed green check exactly as today (no regression of P2-3542's guarantee).
- No section produces a false "complete" reading that a subsequent explicit save then reverts (i.e., the autosave payload matches what an explicit save would have sent — no shortcut validation).

## 14. Next Step

```text
/akili-specify changes/realtime-section-completion
```
