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
