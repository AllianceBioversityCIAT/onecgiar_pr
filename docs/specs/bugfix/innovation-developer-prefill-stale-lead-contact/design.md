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

Two one-line-scale changes that only work as a pair: General information publishes the settled contact to the signal the prefill reads, and the prefill becomes re-evaluable while it is still eligible. The eligibility rule itself does not change.

## Architecture Overview

```
section-general-info                     BilateralCreationService          type-innovation-dev
  updateGeneralInfoMdsFields()  ──DD-1──▶  resultLeadContact  ──DD-2──▶  applyInnovationDevelopersPrefill()
  (after the hydration guard)              (signal)                       (effect, while key absent)
```

Today the left arrow does not exist (only the result GET writes the signal) and the right arrow fires once from `ngOnInit`.

## Design Decisions

### `DD-1` — Publish from `updateGeneralInfoMdsFields()`, after the hydration guard

`makeLeadContactBody()` documents why this method is the commit point: `selectUser()` / `clearContact()` always assign `lead_contact_person` before `lead_contact_person_data`, so the `lead_contact_person_data` setter is the one place both values are guaranteed current. Publishing there satisfies `N-3` for free — it is a settled contact, not a keystroke.

The publish goes **after** the `if (!this.leadContactHydrated) return;` guard, for the reason that guard already exists: the effect that calls this method runs once on mount, before hydration, with `leadContactBody` still `(null, null)`. Publishing above the guard would overwrite the loaded contact with `''` and break `R-3`.

Rejected: a new `effect` watching `leadContactBody()`. It would fire pre-hydration too, and re-derive a guard that is already written and already tested.

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
| `section-general-info.component.ts` | Publish `resultLeadContact` (and `resultLeadContactData`) inside `updateGeneralInfoMdsFields()`, below the hydration guard | `R-1`, `R-3`, `N-3` |
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
