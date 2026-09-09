# Module Spec — Real-Time Section Completion — Design

Linked: `docs/specs/changes/realtime-section-completion/requirements.md`, `proposal.md`.

---

## 1. Summary

Add a debounced, silent autosave trigger **inside `SectionBottomBarComponent`** that reuses each section's existing `(clickSave)` handler — the exact same request an explicit "Save draft" click sends — so the server-computed green check refreshes without the user pressing Save. No new endpoint; no per-section code changes for 10 of the 11 `rd-*` sections (see `RSC-DD-3`'s amendment — `rd-contributors-and-partners` needs a resolved exception before this holds uniformly). No duplication of completeness rules on the client. The accepted trade-off: persistence now happens more often and implicitly, gated behind the same guards (`readOnly`, `disabled`, `isSaving`) the explicit button already respects.

**Rescoped to P25 only (2026-09-08 — see `RSC-DD-5`).** `RSC-DD-3`'s per-section exclusion mechanism (`autosaveDisabled`) solved `rd-contributors-and-partners`, but the P22-exclusive `rd-theory-of-change` was found to carry the identical email/socket side effect plus a page reload and a blocking confirm dialog — a second exclusion candidate that, unlike the first, also breaks mid-edit UX outright. Rather than special-case P22 section-by-section, the user chose to scope autosave to P25 entirely: a runtime `FieldsManagerService.isP25()` check gates every fire, so `rd-general-information`/`rd-geographic-location`/`rd-evidences`/the five `rd-result-types-pages/*` (all portfolio-agnostic in routing) keep their code unmodified but simply never fire for a P22 result, and the P22-exclusive `rd-theory-of-change`/`rd-partners` are untouched entirely since they never render in a P25 session.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/section-bottom-bar/` (all the new logic), `.../components/result-sections-sidebar/result-sections.service.ts` (no change — it already reacts to `green_checks` via `greenChecksString()`), `onecgiar-pr-client/src/app/shared/services/data-control.service.ts` (read-only — reuses `fieldFeedbackList`/DOM markers already there).
- **No server module touched.** Autosave reuses whatever endpoint each section's own `onSaveSection()`-style handler already calls; the interceptor's existing green-checks refresh (`GeneralInterceptorService`, unchanged) does the rest.
- **No external integration touched.**

### 2.2 Sequence / interaction diagram

```
[User edits a .mandatory field inside .section_container]
  └── SectionBottomBarComponent's delegated input/change listener fires
        ├── marks `dirty = true`
        └── (re)starts a 1.5s debounce timer
              └── on timer fire, if dirty && canSave && !isSaving():
                    └── onClickSave()  ← SAME method the explicit button calls
                          └── clickSave.emit()
                                └── section's own (clickSave) handler
                                      └── existing PATCH/POST save request
                                            └── GeneralInterceptorService (unchanged)
                                                  └── on success, if on a result-detail route:
                                                        └── GreenChecksService.getGreenChecks() (unchanged)
                                                              └── DataControlService.green_checks updated
                                                                    └── ResultSectionsService.sections() recomputes (unchanged)
                                                                          └── bottom bar `isComplete()` / rail green check update
              └── if a new qualifying edit arrives while isSaving() is true:
                    └── set `pendingWhileSaving = true` instead of firing
                          └── an effect watching `saveButtonSE.isSaving()` transition true→false
                                └── if pendingWhileSaving, immediately re-trigger the same flow (coalesced, not per-edit)
```

Explicit **Save draft** click flow is unchanged — it still calls `onClickSave()` directly and clears `dirty`/`pendingWhileSaving` on success, same as an autosave-triggered save would.

---

## 3. Data Model Changes

None. No entity, no migration, no CLARISA implication. This is a client-only trigger-timing change reusing existing save endpoints and existing `green_checks` payload shape.

---

## 4. API Surface

No new or changed endpoint. Autosave issues the **identical** request each section's `(clickSave)` handler already issues today — same DTO, same auth (JWT via the interceptor's `auth` header), same role checks server-side. Nothing here requires a bilateral/platform-report change log entry.

---

## 5. Server Workflow / Business Rules

Unchanged. Cites `docs/trd/trd.md` W1 (Result lifecycle) only insofar as autosave writes land in the same `status_id=1` (Editing) row an explicit save would — no new transition, no new validation path. Server-side pre-submit validation (`AC-6`) is untouched; this spec only changes how often the client asks the client-visible "is it complete" question to be answered.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No routing change. No new module. All work is inside the existing `SectionBottomBarComponent` (standalone, already used by every `rd-*` section, IPSR, and the result creator).

### 6.2 Components & services

**`SectionBottomBarComponent`** (`section-bottom-bar.component.ts`) gains:

- A `dirty` boolean (plain field, not a signal — mirrors the existing `[disabled]` "plain property that changes without a signal" pattern already used here; see `RSC-DD-2`).
- A `pendingWhileSaving` boolean, same rationale.
- A debounce mechanism: an RxJS `Subject<void>` fed by a native DOM `input`/`change` listener, piped through `debounceTime(1500)`, unsubscribed in `ngOnDestroy` (mirrors the existing `teleport` effect's cleanup discipline in this file).
- The `.section_container` ancestor is resolved in **`ngOnInit`, not `ngAfterViewInit`** — implementation finding (attempt 1 Reviewer FAIL): the component's own `teleport` effect relocates the host out of `.section_container` before `ngAfterViewInit` runs, so the lookup must happen earlier, in the parent's pre-order hooks. The listener itself is then attached in `ngAfterViewInit` (alongside the existing slot-sync lookup) whenever that lookup succeeded — `SectionBottomBarComponent` in fact never mounts on IPSR / the result creator (they use `app-save-button`), so no host-based exclusion is needed there; IPSR is a non-issue by construction, not by a runtime check.
- **Applicability (`hasCurrentSection()` and, as of the P25 rescope, `FieldsManagerService.isP25()`) is checked at FIRE time, inside `fireAutosave()`, not at attach time** — implementation finding (attempt 2 Reviewer FAIL): `hasCurrentSection()` is a one-shot-stale read at `ngOnInit` time (false while the result is still loading), so gating attachment on it silently disabled autosave on whichever section the user opens first. Checking both flags at fire time instead means a landing section "self-heals" once the result loads (the listener is already attached and waiting), while a genuinely inapplicable case (P22, or — hypothetically — a non-result-detail host) stays permanently inert with no special-casing needed.
- The listener filters events to `event.target.closest('.mandatory')` truthy — the same class marker `someMandatoryFieldIncompleteResultDetail`'s DOM scan already keys on (`.pr-field.mandatory` / `.pr-input.mandatory`), so "did a mandatory field change" reuses an existing, already-correct selector instead of inventing a second definition of "mandatory."
- An `effect()` (co-located with the existing `teleport` effect) that watches `saveButtonSE.isSaving()`; on a `true → false` transition, if `pendingWhileSaving`, it clears the flag and re-invokes the same autosave path once (not from inside the effect's reactive read — scheduled via `queueMicrotask`/`setTimeout(0)` to avoid writing into a signal during its own effect's read cycle, mirroring Angular's effect-write guidance).
- `onClickSave()` itself is **not renamed or restructured** — both the explicit click and the autosave debounce call the exact same method, so `canSave`, `disabled`, and `isSaving()` guards apply uniformly (`RSC-R-7` and `RSC-R-5`'s "same failure handling as explicit save" fall out of this for free).
- `dirty` is set `false` whenever `onClickSave()` actually proceeds past its guards (i.e., a save attempt is in flight) — not only on success — so a failed autosave does not spin forever retrying the exact same debounce; a **new** edit after the failure sets `dirty = true` again and restarts the timer, which is consistent with `RSC-AC-4` ("the user's in-editor values are untouched" — nothing here touches the fields, only the trigger bookkeeping).

**No other component changes.** The 11 `rd-*` section components, `ResultSectionsService`, `GreenChecksService`, and `GeneralInterceptorService` are consumed exactly as they exist today.

### 6.3 Design system usage

No new visual element. The existing `saveButtonSE.isSaving()`-driven `{{ saveButtonSE.isSaving() ? 'Saving…' : text }}` label (section-bottom-bar.component.html:107) already renders during an autosave-triggered save, because autosave calls the identical `onClickSave()` path — this satisfies the intent of `RSC-R-10` without a new token or component (see `RSC-DD-1`). i18n: no new strings are introduced (the existing "Saving…" / `text` strings are reused verbatim).

### 6.4 Real-time / notification UX

No socket/Pusher event is added. No user notification setting is touched.

---

## 7. Security & Authorization

- No new endpoint, so no new JWT/role surface. Autosave inherits the auth the explicit save already requires.
- `RSC-R-7` (no autosave for read-only users) is enforced by reusing `onClickSave()`'s existing `canSave` check (`!rolesSE.readOnly || editable`) — no new guard code, just a new caller of the same guarded method.
- No token, webhook URL, or credential is logged by this change (`.cursorrules`) — autosave failures log through the same path an explicit-save failure already logs through.

---

## 8. Performance & Capacity

- Debounce window (**1.5s**, `RSC-R-1-DEBOUNCE`) caps autosave frequency to at most one request per 1.5s of continuous mandatory-field editing per section — no worse than a user manually re-clicking Save every 1.5s, and in practice far less frequent since most edits pause for longer.
- No new bundle dependency (RxJS `Subject`/`debounceTime` are already used elsewhere in the client).
- No Lambda cold-start impact (client-only change).

---

## 9. Observability

- No new structured log added. Autosave failures surface through whatever error path each section's existing `(clickSave)` handler already uses (toast/alert), so failure visibility is unchanged in kind, only in trigger source.
- No DynamoDB log usage change.

---

## 10. Testing Plan (forward-looking)

- **Unit (Jest):** `section-bottom-bar.component.spec.ts` gains cases for: debounce firing after 1.5s of a qualifying `.mandatory` DOM event with no further edits; no firing when the mutated element is outside `.mandatory`; no firing while `saveButtonSE.isSaving()` is `true` (coalesce instead); the coalesced re-fire once `isSaving()` flips back to `false`; no listener attached at all when `hasCurrentSection()` is `false`; no firing when `!canSave`.
- **Manual QA:** open a Result Detail section with one missing mandatory field, fill it, wait ~1.5s without clicking Save draft, confirm the bottom-bar pill and the rail's green check flip to "Section complete" (`RSC-AC-1`); then clear the field again and confirm it flips back (`RSC-AC-2`).
- Coverage: this is entirely inside `SectionBottomBarComponent`, which is already unit-tested (not one of the `custom-fields`/`rd-contributors-and-partners` exclusions) — new tests count toward the existing client threshold, no new exclusion needed.

---

## 11. Backwards Compatibility & Migration Plan

- Fully additive; no API contract change; no feature flag was originally planned (behavior was meant to apply uniformly per `RSC-OQ-2`'s resolution — see `RSC-DD-3`), but `RSC-DD-3`'s own audit (`RSC-T-3`) found an exception (`rd-contributors-and-partners`) — a per-section opt-out flag is the leading candidate pending the pivot decision recorded in `execution.md`.
- No data backfill.
- Rollback is a plain revert of the `section-bottom-bar.component.ts`/`.html`/`.spec.ts` diff — no migration, no downstream notification needed (bilateral/platform-report untouched).

---

## 12. Design Decisions (ADRs)

### `RSC-DD-1` — Reuse the existing `isSaving()` spinner instead of a new "background saving" state

- **Context:** `RSC-R-10` (SHOULD) asks for a visual affordance distinguishable from the explicit-save spinner while an autosave is in flight.
- **Decision:** Do not add a new visual state. Autosave calls the identical `onClickSave()` path, so the existing `saveButtonSE.isSaving()` → `"Saving…"` label already renders during an autosave, giving the user the same "something is happening" signal they'd get from clicking Save themselves.
- **Alternatives considered:** (1) A separate `autosaving` signal with its own subtle indicator (e.g., a small dot near the pill) — rejected for v1: adds a new token/i18n surface for a `SHOULD` requirement, and risks visually implying autosave is a *different, lesser* guarantee than an explicit save, when it is the same request. (2) No indicator at all — rejected because it would fail `RSC-R-10`'s intent of never leaving the user wondering if something is happening.
- **Consequences:** A user who never clicks Save may occasionally see "Saving…" flash without having clicked anything — acceptable, and arguably reassuring (it shows the app is keeping up). If user feedback later asks for a distinct autosave affordance, it is an additive follow-up, not a rework.

### `RSC-DD-2` — `dirty` / `pendingWhileSaving` as plain fields, not signals

- **Context:** The component already documents a hard rule (comment on `disabled`/`editable` inputs) that plain, non-signal properties are used deliberately where Angular's `@Input()` re-binding, not a signal write, is the source of truth — because registering them as signals once would freeze them.
- **Decision:** `dirty` and `pendingWhileSaving` follow the same pattern: internal bookkeeping mutated imperatively inside event handlers/effects, never read reactively by the template (only `isComplete()`/`isSaving()` — already signals — drive the UI).
- **Alternatives considered:** A `WritableSignal<boolean>` for `dirty` — rejected as unnecessary reactivity for a value nothing in the template binds to; would only add signal-write noise inside a debounce callback.
- **Consequences:** None of this state survives a change-detection cycle inspection via signals debugging tools, but that was never a requirement here.

### `RSC-DD-3` — Uniform rollout across all 11 sections, no per-section opt-out (resolves `RSC-OQ-2`)

- **Context:** `RSC-OQ-2` asked whether any section's save endpoint has a side effect (notification, socket) that makes silent, frequent autosave undesirable.

- **RSC-T-3 audit (2026-09-08) — supersedes the earlier "12 sections, no exception" claim below.** Every `rd-*` component under `pages/results/pages/result-detail/pages/` was opened (its `onSaveSection()` handler plus one layer of service call — the DTO passed to the `ApiService`/`ResultsApiService` method, and, for the two flagged sections, one more layer into the server-side service that method calls) and cross-checked against which components actually render `<app-section-bottom-bar (clickSave)="onSaveSection()">` (the mechanism this spec's autosave lives inside — `hasCurrentSection()` gates whether the debounce listener attaches at all, per §6.2).

  **Resolved count: 11 sections render `SectionBottomBarComponent`, not 12.** The prose this DD previously listed 7 named `rd-*` sections + "the five `rd-result-types-pages/*`" = 12, and that 12 included `rd-links-to-results`. It shouldn't have: `rd-links-to-results.component.html` wraps `<app-links-to-results-global>`, whose own template drives an `<app-save-button [disabled]="validateCGSpaceLinks" (clickSave)="onSaveSection()">` directly — **not** `<app-section-bottom-bar>`. `rd-links-to-results` is P22-only, has no autosave debounce listener under this design, and is out of scope for `RSC-T-1`'s implementation entirely (its bottom bar is a different component). The "11 `rd-*` sections" figure used elsewhere in this design/`tasks.md` was the correct one; this DD's "12" was the error, caused by conflating "section reachable from `resultDetailRouting`" with "section that renders `SectionBottomBarComponent`". The actual 11, confirmed by grepping every `*.component.html` under `result-detail/pages/` for `app-section-bottom-bar`:
  `rd-general-information`, `rd-theory-of-change` (P22 only), `rd-partners` (P22 only), `rd-contributors-and-partners` (P25 only), `rd-geographic-location`, `rd-evidences`, and the five `rd-result-types-pages/*` (`cap-dev-info`, `innovation-dev-info`, `innovation-use-info`, `knowledge-product-info`, `policy-change-info`). `rd-partners`/`rd-contributors-and-partners` and (separately) `rd-theory-of-change`/`rd-links-to-results` are portfolio-exclusive pairs — P22 and P25 never both render for the same result — which is likely also where a prior "11 slots" count came from by a different, coincidentally-matching route (counting logical slots rather than components); the component-level count that matters for `SectionBottomBarComponent` coverage is the 11 above.

  **🛑 Exception found — this DD's "no side effect" claim was wrong for two of the 11 sections.** `rd-theory-of-change.component.ts` (`onSaveSection()`, P22) and `rd-contributors-and-partners.component.ts` (`onSaveSection()`, P25) both build a payload containing `email_template: 'email_template_contribution'` and send it via `POST_toc` / `PATCH_ContributorsPartners` respectively (`ResultsApiService`, plain HTTP calls). Server-side, `results-toc-results.service.ts`'s ToC-mapping handler (reached from both endpoints — `contributors-partners.service.ts` delegates its ToC-shaped fields, `email_template` included, to `updateTocMappingV2`, which is the P25 entry into the same code path `POST_toc` reaches on P22) computes `pendingIds` (contributing initiatives newly added to the pending/invited list) and, **whenever `pendingIds.length > 0`, calls `ShareResultRequestService.resultRequest(...)`**, which both **sends an email** (`EmailNotificationManagementService.sendEmail`, Handlebars-templated) and **pushes a socket notification** (`SocketManagementService.sendNotificationToUsers`) to the newly-pending initiatives' users. This is a real notification/socket side effect beyond green-checks refresh, and it is reachable from ordinary section editing, not an edge case: adding a contributing initiative and saving — the exact action a mandatory-field autosave would fire on — populates `pendingIds`.
  - `rd-theory-of-change` is P22-only. `rd-contributors-and-partners` is P25-only and unconditionally renders `SectionBottomBarComponent` — **this is the one that matters for autosave**, since it is squarely in `RSC-T-1`'s implementation surface.
  - Separately (not an email/socket side effect, but relevant to the same "is silent autosave safe here" question `RSC-OQ-2` asks): `rd-theory-of-change.onSaveSection()` pops a **blocking confirm dialog** ("Change in primary submitter…") before saving when the selected primary initiative differs from the stored one, and on success **calls `location.reload()`** when the primary initiative actually changed. `rd-general-information.onSaveSection()` similarly pops a blocking confirm modal (`saveConfirmationModal`) on P25 when `is_discontinued` options are set. A silent 1.5s-debounce autosave firing either of these mid-edit — surfacing a confirm dialog, or reloading the whole page — would be a materially worse UX regression than "an extra PATCH request," independent of whether it also sends an email.
  - The other 9 sections (`rd-general-information`'s own PATCH, `rd-partners`, `rd-geographic-location`, `rd-evidences`, and all five `rd-result-types-pages/*`) call plain `PATCH_*` methods on `ResultsApiService` (`PATCH_generalInformation`, `PATCH_partnersSection`, `PATCH_geographicSectionp25`, `PATCH_knowledgeProductSection`, `PATCH_capacityDevelopent`, `PATCH_policyChanges`, `PATCH_innovationUse(P25)`, `PATCH_innovationDev(P25)`) — each is a bare `this.http.patch(...).pipe(this.saveButtonSE.isSavingPipe())` with no email/socket/notification call in the method body. `rd-evidences.onSaveSection()` shows a **local, client-only toast** (`this.api.alertsFe.show(...)`) when a SharePoint upload fails — this is UI feedback on the same request, not a server-initiated notification to another user, and doesn't change the audit's conclusion for that section.

- **Decision (amended, finalized 2026-09-08 — user confirmed via `/akili-execute` Pivot):** The "uniform rollout, no per-section opt-out" decision does **not** hold as originally stated for `rd-contributors-and-partners` (and would not hold for `rd-theory-of-change` either, if P22 were in scope for a future autosave rollout). **Resolution: option (a) — exclude `rd-contributors-and-partners` from the debounced-autosave listener.** `SectionBottomBarComponent` gains an `@Input() autosaveDisabled = false` (mirrors the existing `editable`/`disabled` input pattern), set to `true` only on `rd-contributors-and-partners.component.html`'s `<app-section-bottom-bar>` usage; `ngAfterViewInit` skips attaching the listener when it is `true`. Explicit **Save draft** is completely unaffected on this section — only the silent background trigger is suppressed. This is now the one per-section opt-out this design otherwise argues against, scoped to exactly one section, and is expected to be revisited only if a future section needs the same exception. The other 10 sections' "no opt-out needed" conclusion stands unchanged.
- **What this audit does not prove:** each finding above is based on the handler's own body plus **one layer** of service call (the `ResultsApiService`/`ApiService` method it invokes, and — only for the two flagged sections — one further layer into the server-side service that endpoint reaches). It does not trace transitively through every downstream repository/service call multiple layers deep, and does not execute the code paths against real data. A side effect buried deeper in a call chain (e.g., inside a repository method invoked by one of the "clean" `PATCH_*` handlers) would not have been caught. This mirrors the scope boundary already stated in `tasks.md` for `RSC-T-3`.
- **Alternatives considered:** A per-section `autosave: boolean` flag on `resultDetailRouting` entries — rejected as unneeded complexity for a uniform behavior; can be added later if a future section genuinely needs an exception (e.g., a section whose save is known to be expensive or side-effecting), without touching this design's core mechanism. This flag is now the leading candidate for handling `rd-contributors-and-partners` specifically, pending the re-evaluation above.
- **Consequences:** `RSC-T-1` cannot proceed as "uniform, no exceptions" without a decision on `rd-contributors-and-partners`. If a future section's save also gains a side effect, this design's uniform application would need revisiting again — flagged in §13 Open Gaps (also updated).

### `RSC-DD-4` — Flush-on-navigate, not a confirm dialog (resolves `RSC-OQ-1`)

- **Context:** `RSC-OQ-1` asked what happens to a pending (not-yet-fired) debounce when the user navigates away from the section.
- **Decision:** On `ngOnDestroy`, if `dirty` is `true` and `canSave` holds, call `onClickSave()` synchronously (best-effort — fire-and-forget, matching how the existing `ngOnDestroy` already does best-effort cleanup: `slotSE.syncSlot.set(null)`, `hostRef.nativeElement.remove()`). No new confirm-before-leaving dialog is introduced — none exists today for the explicit Save button either, so this does not regress an existing guarantee, only adds one (an in-flight edit is no longer silently lost to a route change within the debounce window).
- **Alternatives considered:** A `canDeactivate` guard prompting "You have unsaved changes" — rejected as a much larger UX surface (new guard, new dialog, new copy) to solve a problem the flush already solves without a prompt; also inconsistent with today's baseline where navigating away mid-edit without clicking Save already discards unsaved input, so the flush is a strict improvement, not a parity requirement.
- **Consequences:** A save fired from `ngOnDestroy` may fail after the component is gone (no error UI to show); this is accepted as best-effort, no worse than today's baseline of not saving at all.

### `RSC-DD-5` — Rescope autosave to P25 only, not per-section exclusion for P22 (second pivot, 2026-09-08)

- **Context:** `RSC-DD-3`'s `autosaveDisabled` exclusion mechanism correctly solved `rd-contributors-and-partners` (P25). During `RSC-T-1`'s attempt 3 review, the Reviewer found that `rd-theory-of-change` (P22-exclusive) carries the **identical** email + socket side effect (`email_template: 'email_template_contribution'` → `ShareResultRequestService.resultRequest`), which `RSC-DD-3`'s own audit had already documented but not excluded — plus, unique to this section, a blocking "Change in primary submitter" confirm dialog and a `location.reload()` on success. `RSC-DD-3`'s Decision text had treated `rd-theory-of-change` as hypothetically out of scope ("if P22 were in scope for a future autosave rollout"), but `requirements.md` §3 (pre-rescope) explicitly put both portfolios in scope, so the section was never actually excluded — attempt 3 correctly implemented the (incomplete) design and was FAILed for shipping the harmful gap.
- **Decision:** Rather than add a second, narrower per-section exclusion (mirroring `autosaveDisabled` onto `rd-theory-of-change`), the user chose to **rescope autosave to the P25 portfolio only**, full stop. `requirements.md` §3 In Scope / Out of Scope amended accordingly. Mechanically: `SectionBottomBarComponent`'s `fireAutosave()` gains `FieldsManagerService.isP25()` as an additional fire-time guard (alongside the existing `hasCurrentSection()` guard from the `RSC-T-1` attempt-2/3 fix) — checked at fire time, not attach time, for the same self-healing reason `hasCurrentSection()` already is. This has three consequences: (1) `rd-theory-of-change` and `rd-partners` (both P22-exclusive) are excluded automatically and need **zero code change** — they simply never render in a P25 session; (2) `rd-contributors-and-partners`'s `autosaveDisabled` exclusion (`RSC-DD-3`) is **kept, not removed** — it is P25-exclusive and still needs its own opt-out regardless of the portfolio gate, since the portfolio gate alone would not have excluded it; (3) the five portfolio-agnostic sections (`rd-general-information`, `rd-geographic-location`, `rd-evidences`, the five `rd-result-types-pages/*`) keep their `.html`/`.ts` files completely untouched — the `isP25()` gate lives once, in `SectionBottomBarComponent`, not per section.
- **Alternatives considered:** (a) Mirror `autosaveDisabled` onto `rd-theory-of-change` too, keeping autosave uniform-by-default across both portfolios with two named exceptions — rejected: two exceptions found in three FAIL cycles suggested the "no side effect" assumption was systematically weaker for P22 than for P25 (both flagged sections are P22 or, in `rd-contributors-and-partners`'s case, the direct P25 counterpart of a P22 ToC-mapping code path), and the user preferred a clean portfolio boundary over an accumulating per-section exception list. (b) Audit the remaining P22-reachable path (`rd-links-to-results`, out of `SectionBottomBarComponent`'s scope entirely per `RSC-DD-3`) for a third exception before deciding — rejected as unnecessary once P22 is out of scope wholesale.
- **Consequences:** `RSC-US-1`/`RSC-US-2` and every `RSC-AC-*` now implicitly read "for a P25 result" — no acceptance criterion text changes (they were already written per-section, not per-portfolio), but `RSC-T-4`'s manual QA must exercise a P25 result and separately confirm zero autosave activity on a P22 result (added to `tasks.md`). If P22 autosave is wanted later, it is a new spec re-opening this decision, not a follow-up task under this one — matches `RSC-R-20`'s existing "explicitly deferred" precedent in §14 Open Gaps.

---

## 13. Budget (Step 2.4)

- **Expected tasks:** 4 (implementation + unit tests in `section-bottom-bar.component.ts`/`.spec.ts`; a short audit note recording `RSC-DD-3`'s section-by-section check; manual QA pass; docs update to the `result-detail`/`section-bottom-bar` `CLAUDE.md` folder notes per the repo's folder-doc convention).
- **Expected LOC:** ~120–180 (mostly `section-bottom-bar.component.ts` + its spec; no `.html` change beyond none needed since `RSC-DD-1` reuses the existing template).
- **Expected review rounds:** 1–2 (single component, well-isolated; the coalescing/effect-timing logic is the one area likely to need a review round).

This sits comfortably inside **Standard** depth — no split, no downgrade to Lite (the coalescing + flush-on-destroy logic is more than a one-line tweak, and it touches a shared component used by every section).

Reversion challenge (Step 2.3): **not applicable** — no DD above removes, disables, or inverts existing behavior; all four are additive or resolve an open question with a net-new capability.

---

## 14. Open Gaps & Follow-ups

- **🛑 Blocking, found by `RSC-T-3` (2026-09-08):** `rd-contributors-and-partners` (P25) sends `email_template: 'email_template_contribution'` on save, which server-side can trigger an email + socket notification to newly-pending contributing initiatives' users whenever a contribution is pending — a real side effect beyond green-checks refresh. `RSC-T-1`'s scope MUST be re-evaluated for this section (exclude it from the autosave listener, or get explicit product sign-off) before merge. See the amended `RSC-DD-3` above for the full trace.
- If a future Result Detail section's save gains a side effect (notification, socket emit), revisit `RSC-DD-3`'s "no opt-out" decision and consider a per-section flag.
- `RSC-R-20` (last-saved timestamp) is explicitly deferred — not included in this iteration's tasks.
- No feature flag was introduced; if product wants a kill switch post-rollout, that is a follow-up, not a blocker for this spec.

---

## Required cross-references

- `docs/specs/changes/realtime-section-completion/requirements.md` (same folder).
- `docs/prd.md` `US-S5`; `docs/ux-ui/design.md` Result Detail section (`app-result-sections-sidebar` completion indicators); `docs/trd/trd.md` W1 (Result lifecycle) — cited for context only, unchanged.
