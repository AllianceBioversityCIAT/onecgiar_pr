# Execution — Innovation Developer prefill reads a stale Lead contact person

## Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/innovation-developer-prefill-stale-lead-contact` |
| Type | Bug (Bug Mode) · Depth Lite |
| Approval Mode | `gated` — the user is asked at every task boundary |
| Branch | `JuanGuzman-io/feature-p2-3150-bilateral` |
| Baseline `HEAD` | `4c9c7f940` (pre-`T-1`) |
| Budget | 3 tasks · ~40 LOC (excl. tests) · 1 review round |
| Triad | Leader `opus` (T1) · Implementer `akili-implementer` `sonnet` (T2) · Reviewer `akili-reviewer` `opus` (T3) |

---

## Task Execution History

### `BIL-IDP-T-1` — Regression test: red before the fix

| Field | Value |
|---|---|
| Status | **PASS** |
| Date | 2026-09-18 |
| Implementer attempts | 1 |
| Review rounds | 1 (of 1 budgeted) |
| Requirements covered | `R-1` (both scenarios), `R-2` (both scenarios + reload clause), `R-3` (scenario + both clauses) |
| Design decisions exercised | `DD-1`, `DD-2`, `DD-3` |

#### Leader routing decisions

| Decision | Value | Reason |
|---|---|---|
| Skills | `tdd`, `angular-developer` | As specced, no deviation. `tdd` genuinely earns its cost here — red-before-green *is* the deliverable, not a process wrapper around it |
| Effort | `xhigh` | Above the T2 `medium` default. A regression test that goes green for the wrong reason silently voids every downstream task; the whole spec rests on case 1 being red for the right mechanism |
| Review lens mode | **Single lens-checklist Reviewer** (not parallel lens reviewers) | *Deviation, recorded.* The `xhigh` effort dial maps to parallel lens reviewers, but this diff is test-only with no security, migration, or data-loss surface of its own, and the budget allows one review round. `.agents/leader.md` → *Delegation Ceiling* ("one subagent beats several for a single modest task") binds over the table here |

#### Attempt 1

**Files changed** (tests only — production code was read-only by task scope):

- `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-innovation-dev/type-innovation-dev.component.spec.ts` — cases 1–4
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-general-info/section-general-info.component.spec.ts` — cases 5–6

**Verification command** (from `onecgiar-pr-client/`):

```bash
npx jest --silent --no-coverage --testPathPattern="section-general-info|type-innovation-dev"
```

**Result:** `Tests: 2 failed, 120 passed, 122 total` — the 2 failures are exactly cases 1 and 6, as `T-1`'s Done clause requires.

**Lint:** `npx ng lint --quiet` → `All files pass linting.`

##### Red evidence on baseline `4c9c7f940` (the `D1` gate — this is the deliverable)

Case 6 (`R-1`, General information publishes the settled contact):

```
● SectionGeneralInfoComponent › lead contact body › publishes a newly selected contact to the
  shared signal the Innovation Developer prefill reads (R-1)

    expect(received).toBe(expected) // Object.is equality

    Expected: "A. Rivera"
    Received: ""

      372 |       body.lead_contact_person_data = { display_name: 'A. Rivera', mail: 'a.rivera@cgiar.org', title: '' };
      373 |
    > 374 |       expect(creation.resultLeadContact()).toBe('A. Rivera');
          |                                            ^
```

Case 1 (`R-1` sc1, the reported failure):

```
● TypeInnovationDevComponent › loadData › BIL-IDP-T-1 — in-session Lead contact changes
  (bugfix/innovation-developer-prefill-stale-lead-contact) › R-1 sc1: prefills from a Lead contact
  person entered AFTER Type-specific has already loaded (the reported failure)

    expect(received).toBe(expected) // Object.is equality

    Expected: "A. Rivera"
    Received: undefined

      221 |         fixture.detectChanges();
      222 |
    > 223 |         expect(component.body.innovation_developers).toBe('A. Rivera');
          |                                                      ^
```

Cases 2–5 pass on baseline, as required — they guard behaviour that already works.

##### Reviewer verdict — `STATUS: PASS`

> Cases 1 and 6 are red on current HEAD for precisely the mechanisms `DD-1`/`DD-2` will change — verified by reading `build()`, `makeLeadContactBody()`, the effect registration order and the complete set of `resultLeadContact` writers, not by trusting the reported failure output. Cases 2–5 hold behaviour that already works, case 4 exercises the falsy-`null` shape distinctly, and no assertion touches rendered output (`D5`).

The Reviewer discharged each of `T-1`'s disqualifiers at source rather than from the green/red report:

| Disqualifier | Finding |
|---|---|
| Case 1 might have set the contact before the GET resolved | Void. `build()` (`type-innovation-dev.component.spec.ts:38-43`) calls `detectChanges()` → `ngOnInit` → `loadData()`, and the mock is a synchronous `of(...)`, so `body`, the prefill and `loaded.set(true)` have all run before `build()` returns. Independently pinned by pre-existing green tests at `:145-148` and `:152-157`. `Received: undefined` is the absence of re-evaluation, not an unresolved GET |
| Case 6 might read a signal it set itself | Void. `makeLeadContactBody()` (`section-general-info.component.ts:239-252`) invokes `commit()` → `updateGeneralInfoMdsFields()` from the `lead_contact_person_data` setter only; the test assigns `lead_contact_person` then `lead_contact_person_data`, mirroring `selectUser()`/`clearContact()` ordering per `DD-1`. The only production writers of `resultLeadContact` today are `bilateral-creation.service.ts:110-111` (reset) and `:170-171` (the GET) |
| Case 5 might not assert the pre-hydration window | Load-bearing. Mount effect registered at `section-general-info.component.ts:183`, hydration effect at `:196`; effects flush in registration order, so a publish above the guard at `:278` turns the post-flush assertion red — exactly `T-2`'s falsification input |
| Case 4 might duplicate case 3 | Distinct. `toBeNull()` (not `toBeFalsy()`) discriminates the stored-`null` shape from `''`/`undefined`; only the key-presence guard at `:280` keeps it null, so deleting the guard turns it red per `T-3`'s falsification input |
| A test might assert rendered output (`D5`) | Clean. Every added assertion is on `component.body.innovation_developers` or the `creationService` signals. The pre-existing CVA-value block at `:876-905` is untouched |

Both of the Implementer's declared judgment calls were adjudicated **in-spec**: asserting `resultLeadContactData` in case 6 is `design.md`'s Frontend Component Changes row verbatim; case 5's doubled assertion keeps the task's literal wording *and* the clause that carries the falsification.

##### `ADVISORY` (4R lens — recorded, non-gating, and per `/akili-execute` §2.4 these never become tasks in this spec)

| Lens | Finding |
|---|---|
| Readability | Case 1 proves "the GET already resolved" only by inheritance from the sibling test at `:145-148`. An inline `expect(component.loaded()).toBe(true)` would make the anti-disqualifier self-evidencing if `build()` ever stops flushing CD again |
| Reliability | Case 2 (`R-1` sc2) is a near-duplicate of the existing `:152-157`. Mandated by the task, so kept — but it is a lock, not new coverage; a cross-reference would stop a future cleanup deleting the wrong one |
| Risk | `a.rivera@cgiar.org` is the only real-looking corporate address in these fixtures; the file's convention is `@x.org`. Not a secret, no `.cursorrules` exposure |
| Lifecycle | `npx ng build --configuration development` (shared verification block) was not run. A no-op for this diff — no template touched, and jest type-checks the specs — but it is the only template type-check and must run before `T-3` closes. **Carried forward to `T-3`** |

#### Issues encountered

None. The Implementer explicitly checked for the `KZ-bugfix--lead-contact-person-search-1` failure class (a `tasks.md` DoD contradicting the same spec's `design.md`) and found no contradiction in this spec.

#### Forward pointers (to be copied into the owning task's brief when it is composed)

- → `T-2`: verify the publish placement **by reading it**, not only by the green. Cases 5 and 6 can both pass with the publish above the hydration guard while the stored contact is destroyed on a path the specs do not mount.
- → `T-3`: run `npx ng build --configuration development` before closing (Reviewer advisory — the only template type-check). Also grep for a second `app-type-innovation-dev` usage to close the type-7 clause by construction, and re-stamp `type-innovation-dev/CLAUDE.md` in the same commit as the behaviour change.

#### Final verification

Suite red exactly where the spec requires it to be red, green everywhere else; lint clean. `T-1`'s Done clause is satisfied: a green suite here would have meant the test does not reproduce the bug.

---

### `BIL-IDP-T-2` — Publish the settled contact

| Field | Value |
|---|---|
| Status | **`[~]` BLOCKED — escalated to the user** (budget tripwire + design-premise gap) |
| Date | 2026-09-18 |
| Implementer attempts | 1 (of 3 permitted — attempts 2 and 3 NOT consumed) |
| Review rounds | 2 of 1 budgeted → **tripwire fired** |
| Requirements | `R-1`, `R-3` (+ both clauses), `N-1`, `N-3` |
| Design | `DD-1` |
| Working tree | Attempt 1's 8-line diff left **in place, uncommitted**. No rollback — rollback is the HALT remedy at 3 failed attempts, and we are at 1 |

#### Leader routing decisions

| Decision | Value | Reason |
|---|---|---|
| Skills | `angular-developer` only | `tdd` dropped from no list (task specced `angular-developer` alone, agreed). The tests already exist from `T-1`; red-green here would be pure overhead |
| Effort | `high` (above the T2 `medium` default) | XS diff, but placement *is* the correctness argument — wrong side of the guard silently destroys stored data with the suite green |
| Review lens mode | Single Reviewer, data-loss lens **gating rather than advisory** | `R-3` is itself a data-loss requirement, so the data-loss lens is already inside this task's spec-conformance gate; escalating to parallel lens reviewers would have duplicated the gate rather than widened it |
| Leader-raised audit question | Publish sits above the dedupe early-return — does that violate `N-3`? | Not from either worker. Raised because the publish executes on every post-hydration invocation, and `updateGeneralInfoMdsFields()` is also driven by the title/description effect |

#### Attempt 1

**Files changed:** `onecgiar-pr-client/src/app/pages/bilateral/components/section-general-info/section-general-info.component.ts` (+8).

The publish was placed **below** `if (!this.leadContactHydrated) return;` — the correct side per `DD-1` — and above the `lastSyncedContactKey` dedupe:

```ts
this.creationService.resultLeadContact.set(body.lead_contact_person ?? '');
this.creationService.resultLeadContactData.set(body.lead_contact_person_data);
```

**Verification:** `T-1` cases 5 and 6 pass; cases 2–4 pass; case 1 still red (correct — that is `T-3`'s gate). `updateFieldsBatch` call count unchanged. Lint clean. Implementer `Not Done / Assumptions`: none.

##### Reviewer verdict — `STATUS: FAIL` (1 issue)

The Leader-raised `N-3` question was adjudicated **in favour of the current placement** — no change requested there:

| Question | Finding |
|---|---|
| Is `updateGeneralInfoMdsFields()` invoked per keystroke? | Yes — the constructor effect at `:183-188` reads `title()`, `description()`, `leadContactBody()`; `onTitleChange()` (`:352`) sets `title` from `ngModelChange` |
| Does the publish *notify* on those invocations? | **No.** `body` is the stable getter/setter object from `makeLeadContactBody()` (`:239-252`); `body.lead_contact_person_data` returns the captured `currentData` — the same `User` reference. `signal.set()` with an `Object.is`-equal value does not notify. A title keystroke produces two equal-value `set()` calls and **zero** downstream effect re-runs |
| Is `N-3` satisfied? | **Yes.** Moving the publish below the dedupe would also keep cases 5/6 green and would not violate `R-3`, but it buys nothing and does not avoid the real defect — the nulling keystroke *does* change the contact key |

**The defect, found on the path the specs do not mount — re-entrancy through the hydration effect:**

The publish writes into `resultLeadContact` / `resultLeadContactData`, which are the **dependencies of the hydration effect eight lines above it** (`section-general-info.component.ts:196-204`). That effect ends with an unconditional `this.leadContactBody.set(this.makeLeadContactBody(lc, lcData))` — a **new object reference** — and the template binds `[body]="leadContactBody()"` (`section-general-info.component.html:33`). Every real contact change therefore bounces back into `LeadContactPersonFieldComponent.ngOnChanges()` (`src/app/custom-fields/lead-contact-person-field/lead-contact-person-field.component.ts:117-142`), which re-initialises the field's UI state from the body.

Reproduction on the most common bilateral shape — a stored **free-text** contact (every pre-`1751462633282` result, and every W3/Bilateral-API-reported one; that field's own `CLAUDE.md` documents free text as normal data):

1. Load: `resultLeadContact = 'Arouna Dissa'`, `resultLeadContactData = null` → child `ngOnChanges` takes the `else if` branch → `searchQuery = 'Arouna Dissa'`, `isContactLocked = false` (editable).
2. Reporter types one character → `onSearchInput()` (`:158-198`) sets `searchQuery`, then nulls **both** payload keys → the `lead_contact_person_data` setter calls `commit()`.
3. Publish fires with a **changed** value → `resultLeadContact.set('')` notifies.
4. Hydration effect re-runs → `leadContactBody.set(makeLeadContactBody(null, null))` → new reference.
5. Child `ngOnChanges` → `else` branch (`:135-140`) → **`userSearchService.searchQuery = ''`**, `selectedUser = null`.
6. The input is `[(ngModel)]="userSearchService.searchQuery"` (`lead-contact-person-field.component.html:19`) → **the field blanks itself on the reporter's first keystroke**, while the debounced AD search for the discarded query still runs.

Before this diff nothing ever wrote `resultLeadContact` post-hydration, so the hydration effect never re-ran and the body was never rebuilt mid-edit. The loop converges and produces **no additional `updateFieldsBatch`** — but the reporter's in-progress entry is destroyed, and what eventually reaches the server is whatever they type into the blanked field.

**Violated rule:** `requirements.md` § `BIL-IDP-R-3` — "Making the Lead contact person observable to other sections SHALL NOT alter what is sent to the server." Also `design.md` § `DD-1`, whose safety argument assumes the publish is inert on re-entry.

**Why the jest evidence could not see it:** `section-general-info.component.spec.ts:89` calls `.overrideTemplate(SectionGeneralInfoComponent, '<div></div>')`, so the child is never mounted; and cases 5/6 never `detectChanges()` after the commit. This is a genuine blind spot in `T-1`'s gate, not an Implementer error — the Implementer satisfied every criterion the approved task named.

**Reviewer's proposed remediation:** break the re-entrancy at the hydration effect, not by moving the publish. Keep a private `lastAppliedContactKey` (set wherever `leadContactBody` is built) and skip `leadContactBody.set(...)` when the incoming `leadContactKey(lc || null, lcData ?? null)` equals it — still hydrating `leadContactHydrated` / `lastSyncedContactKey` as today, so the load path and cases 5/6 are untouched. Do **not** read `leadContactBody()` inside that effect (self-dependency). Plus a `T-1`-style regression case that needs no child mounted: hydrate `('Arouna Dissa', null)`, `detectChanges()`, capture `component.leadContactBody()`, simulate the typing commit (`body.lead_contact_person = null; body.lead_contact_person_data = null`), `detectChanges()`, assert the body is still the **same object reference** — red now, green with the guard.

##### `ADVISORY` (recorded, non-gating, never becomes a task in this spec)

| Lens | Finding |
|---|---|
| Reliability | The same rebuild sets `queryCameFromHydration = true` on the child for a name the reporter just typed (`:129`/`:133`), suppressing `onContactBlur()`'s "contact not found" warning. Harmless today, but it silently weakens that validation; the remediation removes it too |
| Risk | Rebuilding the body on every commit widens the pre-existing stale-`body` window — the child can hold reference A while `updateGeneralInfoMdsFields()` reads reference B (e.g. the `scheduleAutoClickIfSingleResult()` `setTimeout` → `selectUser()` path). Not reproduced; recorded only |

##### Everything else in the audit checklist held

- `N-1`: no `buildPayload()` or save path touched; `updateFieldsBatch` count provably unchanged (the dedupe still gates it, and the hydration re-run re-asserts the same `lastSyncedContactKey`).
- `?? ''` is the correct empty shape — `bilateral-creation.service.ts:67` declares `resultLeadContact = signal('')`, its own writers use `''` (`:110`) and `cf.lead_contact_person ?? ''` (`:170`), matching `resultLeadContact()?.trim()` in `type-innovation-dev.component.ts:281`.
- `resultLeadContactData.set(body.lead_contact_person_data)` is type-exact — `signal<User | null>(null)` (`:69`) against `LeadContactBody.lead_contact_person_data: User | null`; no coalesce needed or wanted.

#### Leader adjudication

The finding is **in scope, real, and confirmed independently at source** by the Leader before escalating (read `section-general-info.component.ts:196-204` and `lead-contact-person-field.component.ts:117-142` directly). The hydration effect does read both published signals and does rebuild `leadContactBody` unconditionally. Notably, that effect's own comment anticipates the re-run it triggers — but only for the *save* path ("has nothing to save"), not for the body rebuild.

**Two conditions stop the loop here rather than auto-retrying:**

1. **Budget tripwire.** `design.md` budgets **1 review round**; this is round 2, with `T-3` still unstarted. Per `/akili-execute` § 2.4 a tripwire is escalated, not absorbed.
2. **The remediation exceeds `DD-1` as approved.** `DD-1`'s safety argument — "the publish only ever re-writes the value hydration itself just set" — is falsified. The publish placement it prescribes is still correct, but the decision never anticipated that the publish feeds *back into* hydration. The fix adds a guard in a method (`the hydration effect`) that no approved task names as a deliverable, and adds a 7th regression case to `T-1`, which is already closed and committed. That is a design amendment, and under `gated` approval mode it is the user's call, not the Leader's.

Attempts 2 and 3 remain available; no rollback performed.

---

## Pivot Record: `BIL-IDP-T-2`

**Date:** 2026-09-18 · **Trigger:** Reviewer `FAIL` on `T-2` attempt 1 (data-loss), compounded by a budget tripwire.

### The blocker

`DD-1` prescribed publishing the Lead contact person from `updateGeneralInfoMdsFields()` — on every settled commit. Implemented, it re-entered General information's own hydration effect and **blanked the Lead contact field on the reporter's first keystroke**. Full evidence in the `T-2` entry above.

`DD-1`'s safety argument — *"the publish only ever re-writes the value hydration itself just set"* — is false once the publish is itself an input to hydration.

### What the approved spec did not know

Investigation (delegated scout, 2026-09-18) established the editor's real persistence model. The spec had assumed live reactive propagation between two sections; the form is explicit-save and event-shaped.

| Fact | Evidence |
|---|---|
| **No autosave.** `updateFieldsBatch()` / `schedulePayload()` only stage; `flush()` alone dispatches HTTP. `debounceMs` is a dead parameter | `bilateral-auto-save.service.ts:221-229`, `:146-159`, `:183-219`, `:138-142` |
| The footer **Save draft** flushes **only the open section's** endpoint keys | `bilateral-result-creator.component.ts:753-827`; `SECTION_ENDPOINT_KEYS:30-37` |
| The two fields can never share a request | `generalInfo` → `PATCH api/results/bilateral/general-info/:id`; `typeSpecific` → `PATCH api/results/summary/innovation-dev/create/result/:id` |
| **All six sections mount at page load** (`[hidden]`, not `@if`), so `GET_innovationDev` *races* General information's hydration rather than following it | `bilateral-result-creator.component.html:244-268` |
| `flush()` is `async` but awaits nothing — it resolves on dispatch, not on response | `:183-219`; completion is observed only by the 15 s poll at `:835-844` |

Full map: vault `W3/w3-bilateral-module/w3-bilateral-modelo-de-guardado-explicito.md`.

### Alternatives considered

| Option | Verdict |
|---|---|
| Guard in the hydration effect (skip `leadContactBody.set()` on unchanged key) — the Reviewer's own remediation | Rejected. Works, but modifies behaviour shared by every consumer of `leadContactBody` to fix a problem this spec introduced |
| A dedicated signal nothing else reads | Rejected. Also removes the re-entrancy, but adds a second source of truth for the same value |
| **Publish on the save event** (`manualSave$`) | **Adopted as `DD-4`.** Needs no new signal, changes no shared behaviour, and removes the re-entrancy by not entering it |

### Revised direction

`DD-4` supersedes `DD-1`. `T-2` and `T-3` are superseded by `T-4`, which merges them — the pivot coupled the publish trigger to the prefill mechanism.

No ADR is affected: this is a component-level decision, not an architecture decision recorded in the TRD.

### Spec amendments applied, with the two-direction Correction Closure sweep

| Document | Change |
|---|---|
| `design.md` | `DD-1` struck through and kept (its failure is why `DD-4` exists); `DD-4` added; executive summary and architecture diagram retargeted to the save event; component-changes table row rewritten |
| `requirements.md` | `R-1` scenario 1 amended — the trigger is the **save**, with the reason recorded inline; `D5` row now names pressing Save draft; Requirement ID Index retargeted from `T-2`/`T-3` to `T-4` |
| `tasks.md` | `T-2` marked superseded, `T-3` folded into `T-4`; `T-4` written; budget line marked exceeded |

**Forward sweep** (the superseded value at sites the pivot analysis did not cite) found two survivors, both fixed: `tasks.md` `T-1` Design line (now records that `DD-1` was executed against and later superseded) and the Requirement ID Index in `requirements.md`.

**Backward sweep** (documents citing the corrected sections) found `T-1`'s falsification clause, which was **already wrong before the pivot** — it read *"reverting **either** fix must turn **case 1** red"*, but case 1 lives in a spec where the creation service is a stub and General information is never mounted, so it is structurally sensitive to `DD-2` only. Corrected to a per-fix table, with the reason recorded. This was flagged to the user at the `T-1` gate and left pending; the pivot forced it.

`execution.md` entries are append-only history and were deliberately **not** rewritten — the `T-2` entry documents what was true when it ran.

---

### `BIL-IDP-T-4` — Publish on save, and make the prefill re-evaluable

| Field | Value |
|---|---|
| Status | **PASS** |
| Date | 2026-09-18 |
| Implementer attempts | 1 |
| Review rounds | 1 |
| Requirements | `R-1` (both scenarios + type-7 clause), `R-2` (both + reload clause), `R-3` (+ both clauses), `N-1`, `N-2`, `N-3` |
| Design | `DD-4` (supersedes `DD-1`), `DD-2`, `DD-3` |
| Supersedes | `T-2` (rejected), `T-3` (folded in) |

#### Leader routing decisions

| Decision | Value | Reason |
|---|---|---|
| Task merge | `T-2` + `T-3` → one Implementer | The pivot coupled them: the publish trigger and the prefill mechanism are now one change. Delegation Ceiling — one subagent beats several for a single coupled task |
| Skills | `angular-developer` | `tdd` not assigned; the regression cases already existed from `T-1` |
| Effort | `high` | Small diff, but the previous attempt at this exact surface produced a data-loss defect |
| Review lens mode | Single Reviewer, data-loss lens **gating** | Same reasoning as `T-2`: `R-3` is itself a data-loss requirement, so that lens is inside the spec-conformance gate |

#### Attempt 1

**Files changed:**

| File | Change |
|---|---|
| `section-general-info.component.ts` | Reverted the `DD-1` publish from `updateGeneralInfoMdsFields()`; added a `manualSave$` subscription filtered on `'general-info'` that publishes the settled contact; unsubscribed in `ngOnDestroy` |
| `type-innovation-dev.component.ts` | Constructor `effect()` on `loaded()` + `resultLeadContact()` calling the unchanged `applyInnovationDevelopersPrefill()`; removed the one-shot call from `loadData()`; docstring corrected |
| `section-general-info.component.spec.ts` | `manualSave$` added to the autosave stub; case 6 retargeted to the save event (and now asserts the commit alone publishes nothing); **new case** — a mid-typing null commit publishes nothing |
| `type-innovation-dev/CLAUDE.md` | 2026-09-18 history bullet; `Verified:` re-stamped |

**Verification** (from `onecgiar-pr-client/`):

```
npx jest --silent --no-coverage --testPathPattern="section-general-info|type-innovation-dev"
  → Test Suites: 2 passed, 2 total · Tests: 123 passed, 123 total
npx ng lint --quiet                        → All files pass linting.
npx ng build --configuration development   → completed, zero errors
```

Case 1 — the reported bug, red since `T-1` — is now **green**. The `ng build` closes the advisory carried forward from `T-1` (the only template type-check).

Type-7 clause closed by construction: grep found a single `app-type-innovation-dev` mount, `section-type-specific.component.html:21` (`@case (7)`).

##### Reviewer verdict — `STATUS: PASS`

> The publish now lives only in the `manualSave$('general-info')` handler, `updateGeneralInfoMdsFields()` no longer references `creationService` at all, and the save-time re-entry into the hydration effect is dedupe-swallowed (no extra PATCH) and re-asserts values the field already displays — so the `T-2` data-loss defect is closed without introducing a new one on the settled-save, cleared-contact or free-text shapes.

Verified at source rather than from the green:

| Check | Finding |
|---|---|
| The `T-2` defect is gone | `updateGeneralInfoMdsFields()` (`:272-306`) touches only `mdsTracker` and `autoSaveService`. A repo-wide grep returns exactly three production writers of the two signals: `bilateral-creation.service.ts:110-111` (reset), `:170-171` (GET), and the new handler at `section-general-info.component.ts:236-241`. No keystroke path reaches them |
| No NEW re-entrancy at save time | The publish re-enters hydration only when the contact actually changed (`Object.is`-equal `set()` does not notify). When it does, `lastSyncedContactKey` is assigned **before** `leadContactBody.set()` (`:204-206`), so the dedupe at `:299` swallows it — no extra `updateFieldsBatch`, `R-3` clause 2 holds. The rebuilt body re-fires the child's `ngOnChanges` with values the field already shows, on all three shapes (selected contact / free text / cleared). Ordering is safe: the flush at `bilateral-result-creator.component.ts:763-764` PATCHes **before** `manualSave$` is emitted, so the publish cannot influence the request |
| `DD-2` effect ordering | `if (this.loaded() !== true) return;` precedes any contact read, and `loaded` is set true only after `this.body = response` (`:179-181`) — the effect cannot write into a `body` the GET is about to replace, and the error path (`false`) is excluded too |
| `DD-3` guard untouched | `applyInnovationDevelopersPrefill()`'s body (`:289-298`) is **byte-identical** to baseline; only the docstring changed |
| The bare `resultLeadContact()` read | Load-bearing and correct — the prefill can early-return at the key-presence guard before reading the signal, which would silently drop the dependency |
| Signal-write safety | `this.body.innovation_developers` is a plain-object write, not a signal write; `allowSignalWrites` neither needed nor applicable on Angular 21 |
| Subscription lifecycle | Matches `section-evidence.component.ts:138-152` exactly; `ngOnInit` runs once per instance, no double-subscribe or leak |
| `N-1` / `N-2` | `buildPayload()` and `updateMds()` unchanged, no server file touched, no new save call |
| Folder doc "formatting only" claim | **Verified, not accepted on trust.** The Reviewer located the pre-`T-4` file in a sibling worktree and compared the three reflowed bullets word-for-word — textually identical, only rewrapped. Structural count 39 → 40, exactly the one new history bullet. No content loss |

##### `ADVISORY` (4R lens) — and what was done with each

| Lens | Finding | Action |
|---|---|---|
| Reliability / Risk | `DD-4`'s "settled by construction" overstates it. Save draft *can* be pressed mid-typing, and on that path the publish does carry the null and the field blanks. **Not** the `T-2` defect: the flush has already PATCHed `lead_contact_person: null` (pre-existing), no additional `updateFieldsBatch` is produced, and the blanked field is now *consistent with what was just persisted* rather than showing text that was never saved | **`design.md` `DD-4` precised** with this path recorded verbatim, and the `D5` manual check extended to cover it deliberately |
| Readability | Stale comment in `buildPayload()` (`type-innovation-dev.component.ts:306-310`) still claimed the prefill *"runs on load, not on save"* — made false by this diff | **Fixed** — it is this change's own debris, not new scope |
| Readability | `type-innovation-dev/CLAUDE.md:27` *"Prefill still runs once, on load"* superseded by the new bullet below it | **Fixed** — marked `(superseded below)`; the dated history line is otherwise left intact |

Re-verified after the three fixes: `Tests: 123 passed, 123 total`, lint clean.

#### Issues encountered

The `T-2` rejection and the pivot, recorded above. No issues in `T-4` itself.

#### Final verification

All six `T-1` regression cases green plus the new mid-typing gate; lint and template type-check clean. **One item remains open and is not automatable:** the `D5` manual browser check (below).
