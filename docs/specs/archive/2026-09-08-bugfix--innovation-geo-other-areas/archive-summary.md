# Archive Summary — Innovation Geo Focus, "other geographic areas" question

## 1. Document Control

| Field | Value |
|---|---|
| Module code | `GEO` |
| Original spec path | `docs/specs/bugfix/innovation-geo-other-areas/` |
| Type | Bug · Depth: Lite |
| Archive date | 2026-09-08 |
| Branch | `qa-development-2026-ss` (spec branch — default is `master`) |
| Final status | **Shipped** — commit `[SPEC:bugfix/innovation-geo-other-areas] 🔧 fix(rd-geographic-location): stop coercing unanswered other-geo-areas answer to No`. Single task, PASS on attempt 2 (attempt 1 Reviewer FAIL). |

## 2. Requirements Delivered

| ID | Statement | Delivered by |
|---|---|---|
| `GEO-R-1` | Unanswered (`null`) server value renders with no radio selected | `GEO-T-1` attempt 2 |
| `GEO-R-2` | A genuine `true`/`false` prior answer still renders selected (no regression) | `GEO-T-1` attempt 2 |
| `GEO-R-3` | An unanswered question counts toward the "fields missing" list | `GEO-T-1` attempt 2 |
| `GEO-R-10` (SHOULD) | Reused the existing null-vs-boolean pattern rather than a new local convention | `GEO-T-1` attempt 2 |

`GEO-AC-1..3` all satisfied. `has_extra_geo_scope`'s Global/"to be determined" visibility gate confirmed intentional and untouched (out of scope by design).

## 3. Files Changed Summary (from `execution.md`)

| File | Nature |
|---|---|
| `rd-geographic-location.component.ts` | removed `Boolean()` coercion in `fillExtraGeographicLocationBody()`; added a real predicate member `hasExtraGeoScopeAnswered()` (attempt 2, replacing an inline template expression) |
| `rd-geographic-location.component.html` | `[isComplete]` now binds to `hasExtraGeoScopeAnswered()` instead of an inline `!= null` expression |
| `models/extraGeographicLocationBody.ts` | `has_extra_geo_scope` type widened `boolean` → `boolean \| null` |
| `rd-geographic-location.component.spec.ts` | regression tests added/corrected across both attempts (see §7) |
| `rd-geographic-location/CLAUDE.md` | attempt 1 touched it, then **reverted** in attempt 2 per shared-file write discipline (spec branch) — the accurate content is recorded as a pending item instead (see Kaizen entry) |

No server/DTO/migration change — `has_extra_geo_scope` already round-tripped `null`/`true`/`false` correctly; this was a pure client read-path fix.

## 4. Test Evidence Summary

No separate `test-report.md` — evidence embedded in `execution.md`.

| Check | Result |
|---|---|
| `npx jest --testPathPattern="rd-geographic-location" --no-coverage` | 31/31 passed (both attempts) |
| `npx ng lint --quiet` | clean, both attempts |
| `ng build --configuration development` | clean — closes attempt-1's advisory about the widened `boolean \| null` type causing a narrowing error at the `onSaveSection()` PATCH call site; none found |
| Manual browser check (`GEO-TEST-4`) | **accepted gap, not automated** — jsdom cannot observe real radio-selection rendering (documented project trap, `onecgiar-pr-client/CLAUDE.md` §9). Recorded as outstanding, to be done at PR review, per the spec's own design (not a blocker). |

## 5. Validation Summary

No separate `validation-report.md`. Reviewer verdict: **FAIL** on attempt 1, **PASS** on attempt 2. Attempt 1's two findings were both genuine, precise catches (see §7) — not stylistic nitpicks. Attempt 2's PASS re-audited the full spec (`GEO-R-1/2/3/10`, `GEO-AC-1..3`, both NFRs) from scratch rather than incrementally.

## 6. Accepted Warnings / Follow-Ups

- **Manual browser confirmation (`GEO-TEST-4`) still outstanding** — explicitly accepted as a non-automatable gap per `requirements.md` §11 and `design.md`; to be done at PR review, not blocking this archive.
- **`rd-geographic-location/CLAUDE.md` update is pending, not applied** — attempt 1 drafted the correct re-stamp + resolved bug-trap bullet, but it was reverted in attempt 2 because `tasks.md` never listed the file as a `GEO-T-1` deliverable (shared-file write discipline on a spec branch). The accurate content already exists (attempt 1's diff) and is captured verbatim as a pending item in the Kaizen entry for the default-branch apply pass.
- **Minor, non-gating (attempt 2 Reviewer ADVISORY):** `hasExtraGeoScopeAnswered` is a plain arrow-function property rather than a `computed()` signal, unlike other computed fields in the same class — negligible cost, optional cleanup only, not actioned.

## 7. Historical Notes

- **Attempt 1's Reviewer FAIL is the interesting part of this spec.** Two independent, real findings:
  1. The new `[isComplete]` regression test re-declared its own local `isComplete = (value) => value != null` lambda inside the spec file — testing JavaScript's `!=` operator in isolation, completely disconnected from the actual template binding. Reverting the HTML fix would have left those 4 tests green, so they proved nothing about the actual defect. This is a specific, dangerous flavor of test antipattern: a regression test whose assertion target quietly diverges from the production code path it's meant to guard.
  2. The diff touched `rd-geographic-location/CLAUDE.md` (a `Verified:` re-stamp + a genuinely-correct bug-note rewrite) without `tasks.md` listing that file as a `GEO-T-1` deliverable — caught against the root `CLAUDE.md`'s shared-file write discipline rule for spec branches.
  - Attempt 2 fixed both: extracted a real component member (`hasExtraGeoScopeAnswered()`) and bound the template to it directly (so the test now exercises the actual code path), and reverted the out-of-scope `CLAUDE.md` edit, recording its (correct) content as a pending item instead of landing it out-of-process.
  - See the Kaizen entry (`docs/specs/kaizen/bugfix--innovation-geo-other-areas.md`) for the standardization lesson this produced.
