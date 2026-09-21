# Design — Innovation Developer prefill reads a stale Lead contact person

## Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/innovation-developer-prefill-stale-lead-contact` |
| Type | Bug (Bug Mode) · Depth Lite |
| Requirements | `./requirements.md` (`BIL-IDP-R-1..3`, `N-1..3`) |
| Layer | Client only — `onecgiar-pr-client/src/app/pages/bilateral/` |
| Server | Untouched |
| Correction | The proposal's `D1` said both affected folders carry a `CLAUDE.md`. Verified: only `type-innovation-dev/` does. `section-general-info/` has none, so no folder doc is created for it |

## Executive Summary

Two small changes that only work as a pair: General information publishes the settled contact **when the reporter saves that section**, and the prefill becomes re-evaluable while it is still eligible. The eligibility rule itself does not change.

> **Pivot, 2026-09-18.** `DD-1` (publish on every contact commit) was implemented, rejected at review for blanking the contact field mid-typing, and superseded by `DD-4`. The trigger moved from the commit to the save event. See `./execution.md` → `## Pivot Record: BIL-IDP-T-2`.

## Architecture Overview

```
section-general-info                      BilateralCreationService         type-innovation-dev
  manualSave$ === 'general-info'  ──DD-4──▶  resultLeadContact  ──DD-2──▶  applyInnovationDevelopersPrefill()
  (the footer's Save draft)                  (signal)                      (effect, while key absent)
```

Today the left arrow does not exist (only the result GET writes the signal) and the right arrow fires once from `ngOnInit`.

The left arrow is a **discrete save event**, not a live commit — that is the whole of the pivot. Both sections are mounted from page load (`[hidden]`, not `@if`), so the prefilled value is visible without any navigation.

## Design Decisions

### `DD-1` — ~~Publish from `updateGeneralInfoMdsFields()`, after the hydration guard~~ — **SUPERSEDED by `DD-4`, 2026-09-18**

`makeLeadContactBody()` documents why this method is the commit point: `selectUser()` / `clearContact()` always assign `lead_contact_person` before `lead_contact_person_data`, so the `lead_contact_person_data` setter is the one place both values are guaranteed current. Publishing there satisfies `N-3` for free — it is a settled contact, not a keystroke.

The publish goes **after** the `if (!this.leadContactHydrated) return;` guard, for the reason that guard already exists: the effect that calls this method runs once on mount, before hydration, with `leadContactBody` still `(null, null)`. Publishing above the guard would overwrite the loaded contact with `''` and break `R-3`.

Rejected: a new `effect` watching `leadContactBody()`. It would fire pre-hydration too, and re-derive a guard that is already written and already tested.

### `DD-4` — Publish on the **save event**, not on every commit (supersedes `DD-1`)

`DD-1` was implemented and **rejected at review**. It is kept above, struck through, because its failure is the reason this decision exists.

**Why `DD-1` failed.** `resultLeadContact` / `resultLeadContactData` are the dependencies of the hydration effect at `section-general-info.component.ts:196-204`, which ends with an unconditional `leadContactBody.set(makeLeadContactBody(...))` — a *new object*. The template binds `[body]="leadContactBody()"`, so the new reference re-fires `LeadContactPersonFieldComponent.ngOnChanges()` (`lead-contact-person-field.component.ts:117-142`). `onSearchInput()` nulls **both** payload keys on every keystroke, so the reporter's first keystroke published `''`, rebuilt the body, and the child's `else` branch set `userSearchService.searchQuery = ''` — **blanking the field mid-typing**. `DD-1`'s stated premise ("the publish only ever re-writes the value hydration itself just set") is false once the publish is itself an input to hydration.

**What the original design did not know.** The editor's real persistence model, established by investigation on 2026-09-18 (vault: `W3/w3-bilateral-module/w3-bilateral-modelo-de-guardado-explicito.md`):

| Fact | Evidence |
|---|---|
| There is **no autosave**. `updateFieldsBatch()` and `schedulePayload()` only stage; `flush()` alone dispatches HTTP | `bilateral-auto-save.service.ts:221-229`, `:146-159`, `:183-219` |
| The footer **Save draft** flushes **only the open section's** endpoint keys | `bilateral-result-creator.component.ts:753-827`, `SECTION_ENDPOINT_KEYS:30-37` |
| The two fields can never share a request — different `EndpointKey`, different URL | `generalInfo` → `PATCH api/results/bilateral/general-info/:id`; `typeSpecific` → `PATCH api/results/summary/innovation-dev/create/result/:id` |
| **All six sections mount at page load** (`[hidden]`, not `@if`), so `GET_innovationDev` *races* General information's hydration rather than following it | `bilateral-result-creator.component.html:244-268` |

The approved design assumed live reactive propagation between two sections. The form is explicit-save and event-shaped, which is both simpler and sufficient.

**The decision.** General information publishes the settled contact when the reporter **saves that section**, via the existing `manualSave$` channel — the same side channel Evidence already consumes (`section-evidence.component.ts:142-146`). `updateGeneralInfoMdsFields()` returns to its pre-spec state.

A save carries whatever the field has settled on, so the *commit-driven* mid-typing publish that destroyed the field is gone.

**Precision, added at review.** "Settled by construction" overstates it. Save draft can be pressed while the search is mid-typing — `body` is `(null, null)` and the typed query lives only in `userSearchService.searchQuery`. On that path the publish *does* carry the null, the hydration effect rebuilds `leadContactBody`, and the field blanks. That is **not** the `T-2` defect and is not gated on: the flush at `bilateral-result-creator.component.ts:763` has already PATCHed `lead_contact_person: null` (pre-existing behaviour, flagged as a trap in that field's own `CLAUDE.md`), it produces no additional `updateFieldsBatch`, and the blanked field is now *consistent with what was just persisted* rather than showing text that was never saved. The `D5` manual check covers this path deliberately. The re-entrancy is removed by *not entering it*, rather than by adding a guard to the hydration effect — which was the alternative remediation, and which would have changed behaviour shared by every consumer of `leadContactBody`.

Rejected alternatives:

- *A guard in the hydration effect* (skip `leadContactBody.set()` when the contact key is unchanged). Works, but modifies shared behaviour to fix a problem this spec introduced.
- *A dedicated signal nothing else reads.* Also works and also removes the re-entrancy, but adds a second source of truth for the same value. `DD-4` needs no new signal.

**What this costs.** The prefilled value lands in Innovation development's in-memory `body`, so the reporter sees it (the section is already mounted). Persisting it still requires Save draft on Type-specific — which is how every other field in this form behaves, so it is consistent rather than surprising.

### `DD-2` — Re-evaluable prefill, gated on eligibility

Replace the single `ngOnInit`-path call with an `effect()` that reads `loaded()` and `resultLeadContact()` and calls the existing `applyInnovationDevelopersPrefill()`. The `loaded()` read is what keeps it from writing into a `body` the GET is about to replace.

`body` is a plain object on a `CheckAlways` component, so a late write is picked up by the ambient change-detection cycle — no `ChangeDetectorRef` plumbing. This is also why `D5` in the requirements has no automated gate.

**Step 2.3 reversion challenge.** `DD-2` reverts a property `T-12` deliberately established: *"Prefill still runs once, on load."* Challenge — **what does making it reactive break?**

> Nothing the guard does not already prevent. The property `T-12` was protecting is not "runs once", it is "never re-fills a value the reporter owns", and the mechanism delivering that is the **key-presence guard**, not the single call site — clearing the field writes the key, so a cleared value cannot revive however many times the effect runs. What genuinely changes: while the key is absent, the field now follows successive contact changes instead of freezing on the first one. That is the promise General information already prints on screen, so it is the correct behaviour, and it is recorded here rather than discovered later.

Run inline rather than delegated: the reverted property is one clause, its protecting mechanism was verified this session, and the Delegation Ceiling does not pay for a spawn to ask one question with a known answer. Recorded so the call is auditable.

### `DD-3` — The key-presence guard is kept, and now has its evidence

`if ('innovation_developers' in this.body) return;` stays exactly as is. The proposal flagged as an open question (`R2`) whether `[(ngModel)]` could create the key on init and silently close the guard. **Verified, it cannot:** `pr-textarea.writeValue()` only assigns the internal `_value` signal; the write-back to the model runs through the `value` setter, which is driven by template input. Reading the bound property never assigns it.

## Frontend Component Changes

| File | Change | Requirement |
|---|---|---|
| `section-general-info.component.ts` | Publish `resultLeadContact` (and `resultLeadContactData`) from a `manualSave$` subscription filtered on `'general-info'`; `updateGeneralInfoMdsFields()` reverts to its pre-spec state | `R-1`, `R-3`, `N-3` (`DD-4`) |
| `type-innovation-dev.component.ts` | `ngOnInit`-path call → `effect()` on `loaded()` + `resultLeadContact()`; guard body unchanged | `R-1`, `R-2` |
| `type-innovation-dev/CLAUDE.md` | Add the in-session behaviour to the "Innovation developers" history; re-stamp `Verified:` | — |

Out of scope, stated so an implementer does not drift into it: `buildPayload()` (`N-1`), `updateMds()` (`N-2`), the server, and W1/W2.

## Budget

| Metric | Expected |
|---|---|
| Tasks | 3 |
| LOC | ~40 (excluding tests) |
| Review rounds | 1 |

Exceeding any of these is a tripwire for `/akili-execute` to stop and escalate, not a cap on quality.
