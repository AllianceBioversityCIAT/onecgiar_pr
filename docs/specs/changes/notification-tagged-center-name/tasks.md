# Tasks — Name the tagged Center in the project-tagged notification

## Document Control

| Field | Value |
|---|---|
| Spec | `changes/notification-tagged-center-name` · Depth **Lite** |
| Requirements / Design | `requirements.md` · `design.md` |
| Estimate | 2 tasks · ~50 LOC · 1 PR (server + spec text) · budget in `design.md` §8 |

## Dependency graph

`T1 → T2` (T2 documents what T1 ships).

---

## T1 — Add owner Center acronym to the project label (tests first)

| Field | Value |
|---|---|
| Status | [x] done |
| Size | S |
| Depends on | none |
| Requirements | NTC-R-1, NTC-R-2, NTC-R-3, NTC-NFR-1, NTC-NFR-2 · S1, S2, S3, S5 (S4 inherited) |
| Design | §4.1, §4.2, §4.3 · NTC-DD-1, DD-2 |
| Skills | `nestjs-expert`, `tdd` |

**Scope** (only `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts` and its `.spec.ts`)
1. Red first: update the exact-string assertion (~spec line 395) to `…P-CIP of your center (CIP). Click…`, tighten line ~539 to include `(CIP)`, and add two cases — **S1** (institution acronym `ICRISAT` differs from code, so a code/acronym mix-up fails) and **S2** (no institution → code; assert the text never contains `()`). Run them and confirm they fail on current code.
2. Green: make `loadCenterIndex()` request the institution relation, and build the project label with the acronym-or-code.

**Clause ownership**

| Clause | Owner |
|---|---|
| NTC-R-1 / S1 | new S1 test |
| NTC-R-2 / S2, "MUST NOT render `()`" | new S2 test |
| S1 "BUT must NOT name other Centers" | S1 test: the text contains exactly one parenthesis group |
| S3 | existing AC37 test (~509), tightened |
| S4 | inherited from BCT-R-9 dedup; existing AC32 test stays green. No new code, so no new test |
| S5 / NTC-R-3 | existing Center-tagged and degraded-lead-in exact strings (~453, ~472) stay green untouched |
| NTC-NFR-1 | existing `centerRepo.find` called-once assertion (~171, ~203) stays green |
| NTC-NFR-2 | no new log statements; a review check |

**Verification** (scoped, per the no-full-suite rule)
- `npx jest --silent --reporters=summary --forceExit --testPathPattern result-tagged-notification` from `onecgiar-pr-server`
- `npx eslint src/api/notification/services/result-tagged-notification.service.ts --quiet`

**Would fail if:** the label omits the acronym (S1), prints `()` (S2), uses the code when an acronym exists (S1 fixture has code ≠ acronym), or adds a second `centerRepo.find` call.

**Cannot prove:** that real `clarisa_center` rows are linked to an institution with an acronym. Mocks supply it. This is the accepted gap in requirements §5. Substitute: check one real Center at the HITL pause, or read the label on the next QA notification for a project of a non-lead Center.

**Done when:** the new tests were red before the change and are green after, the touched spec file is fully green, lint is clean, and no other text changed.

---

## T2 — Amend the tagging spec text

| Field | Value |
|---|---|
| Status | [x] done |
| Size | XS |
| Depends on | T1 |
| Requirements | NTC-R-1, NTC-R-3 (documentation of BCT-R-7) |
| Design | §7 |
| Skills | `cognitive-doc-design` |

**Scope** (docs only, in `docs/specs/notifications/bilateral-contributor-tagging/`)
- `requirements.md`: BCT-R-7 text and line ~157 gain `(<owner Center acronym>)`, plus a pointer to `changes/notification-tagged-center-name`.
- `proposal.md` D-4 / row 7, `design.md` §5.3 label, `tasks.md` (~line 207) assertion: same amendment.

**Verification**
- Correction sweep: `grep -rn "of your center" docs/specs/notifications/bilateral-contributor-tagging` and update or record as intentionally kept every hit. Then grep the references to BCT-R-7 and re-read what each states.
- Would fail if: any file still shows the old text without the acronym.

**Cannot prove:** that prose matches runtime. That is T1's exact-string tests.

**Done when:** all hits in that folder agree with NTC-R-1.

---

## Rollout

Merge with the server change. No env, migration or client step. Existing notifications keep the old text.
