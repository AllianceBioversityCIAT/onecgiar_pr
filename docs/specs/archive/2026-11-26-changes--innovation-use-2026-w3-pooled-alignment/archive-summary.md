# Archive Summary — Innovation Use 2026: W3/Bilateral aligned with the pooled form

**Outcome: delivered and verified on PRTest.** All five requirements are met, with 0 FAIL. Nicoleta's acceptance on SR-169264 is pending outside the repo.

## 1. Document Control

| Field | Value |
|---|---|
| Spec ID prefix | `IWA` |
| Ticket | SR/INC-169264 (Nicoleta Trifa, PRTest feedback 2026-11-26) |
| Depth · Approval | Lite · gated |
| Branch | `qa-development-2026-ss` → merged to `performance-refactor` `5d7089975` |
| Archived by | `/akili-archive`, Claude Opus 5.5 |

## 2. Original Spec Path

`docs/specs/changes/innovation-use-2026-w3-pooled-alignment/`

## 3. Archive Date

2026-11-26

## 4. Final Status

| Item | Status |
|---|---|
| Tasks | 3/3 `[x]` (T-1 layout, T-2 Farmers copy, T-3 PRTest check) |
| Validation | PASS, archive-ready (0 FAIL) |
| PRTest | PASS at `5d7089975` (W3 8427 2026 and 2025, W1/W2 6433) |
| Stakeholder acceptance | Reply drafted for Santiago to send on SR-169264; Nicoleta's confirmation pending |

## 5. Requirements Delivered

| ID | What users see (2026 W3 centre editor) | Evidence |
|---|---|---|
| IWA-R-1 | Organizations in the main block, between Actors and Other measures; optional; never rendered twice; 2025 unchanged | Author tests 1–3, 7 · Tester A–C · PRTest |
| IWA-R-2 | No "Addressing demands" on 2026 cards; stored value still sent back | Author tests 4–5 · PRTest |
| IWA-R-3 | "Add actor" / "Add organization" / "Add other"; 2025 keeps "Add another …" | Author test 6 · PRTest |
| IWA-R-4 | Farmers descriptions without "climate advisories" and "actively used a digital tool or service" (pooled and W3, one constant) | T-2 assertions · Tester D · PRTest 6433 |
| IWA-R-5 | `/api/bilateral/*` unchanged | Empty server diff · Tester E |

## 6. Files Changed Summary

| Commit | Files |
|---|---|
| `63c79f70e` (T-1) | `type-innovation-use.component.html`, `.spec.ts`, folder `CLAUDE.md` (+180/−32) |
| `e5654d462` (T-2) | `farmer-follow-up.ts`, `innovation-use-form.component.spec.ts`, folder `CLAUDE.md` (+14/−6) |
| `2518e3eb9` (test/validate) | `type-innovation-use.pooled-alignment.spec.ts` (Tester suite), HTML comment move, test and validation reports |
| `5d7089975` | Merge into `performance-refactor` (one doc conflict in `innovation-use-form/CLAUDE.md`, resolved by keeping both "Verified" entries) |

Client only. No server, schema, migration or API change.

## 7. Test Evidence Summary

| Suite | Result |
|---|---|
| W3 + pooled folders | 483/483 on the branch; 492/492 on the `performance-refactor` merge |
| Full client | 15,498/15,503. The 5 failures are outside this spec and depend on the local `environment.ts` (`qaUrl: ''`) |
| Build · lint | `ng build` exit 0 · `ng lint` clean |
| Falsifier probes | 4 during execute (Leader) + 1 during test (Tester); all bite |

## 8. Validation Summary

0 FAIL. Initial WARNs (T-3 open, tile gap G-1, visual look, out-of-spec suites) are closed by the PRTest check or accepted below.

## 9. Accepted Warnings Or Follow-Ups

| # | Item | Owner / where |
|---|---|---|
| F-1 | Tile update after typing into a **new** organization row, and the W3 rendering of the nature copy, were not checked live: 8427 has no rows, and adding one autosaves on a shared test result. Covered by jest (Tester A/D) and by the shared constant on 6433 | Accepted |
| F-2 | 3 client suites fail with the local `environment.ts` (`general-interceptor`, `impact-level-info`, `quality-assurance`) | Separate quick fix or spec |
| F-3 | `akili doctor --agents`: `leader.md` outdated, `tester.md` custom-edited | Pending item for `staging` (kaizen entry) |
| F-4 | Nicoleta's acceptance on SR-169264 | Santiago |

## 10. Historical Notes

- **P-7 refuted at T-3.** Result-detail renders the pooled `innovation-use-form` for W3 results; only the centre editor renders `type-innovation-use`. No impact here, because result-detail already had the pooled layout. Corrected in `requirements.md` §1 and `design.md` §11.
- **P-8 settled.** Pooled 6433 renders the Farmers descriptions, so the removed examples were visible on W1/W2 too.
- **T-2 spec tension.** A "0 grep hits" check conflicted with a required "does not contain" assertion; this was amended at the gate.
- LOC budget overrun (+194/−38 vs ~180) was accepted at the T-1 gate.

## 11. Diagrams

The spec has one inline Mermaid diagram (`design.md` §3) and no `diagrams/` folder. No baseline diagram slot became stale.
