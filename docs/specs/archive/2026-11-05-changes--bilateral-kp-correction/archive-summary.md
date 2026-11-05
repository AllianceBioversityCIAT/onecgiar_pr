# Archive Summary — changes/bilateral-kp-correction

**Outcome:** shipped. A reporting platform corrects a current-phase Knowledge Product in Rejected or Editing through `POST /api/bilateral/create` with `data.result_code`. Payload-owned data is rewritten, and DSpace-owned data is re-read from CGSpace. Merged to `performance-refactor` (`3d2096eae`), verified on PRTest by the user, and the Jira ticket P2-4065 is Ready For UAT.

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/bilateral-kp-correction/` |
| Archive Path | `docs/specs/archive/2026-11-05-changes--bilateral-kp-correction/` |
| Archive Date | 2026-11-05 |
| Jira | P2-4065 (Ready For UAT) |
| Branch | `JuanGuzman-io/fix-p2-4065-kp` |
| Final Status | **Delivered** — 7/7 tasks `[x]`, every task PASS on attempt 1 |

## Requirements Delivered

| Requirement | Delivered by |
|---|---|
| KPC-R-1 Allowed statuses (KP: 7, 1; others: 7) | T-3 (rule + lock re-read), T-5 (resolver) |
| KPC-R-2 Same record, no second result | T-4 |
| KPC-R-3 Ownership 403, same type 409 | T-5 |
| KPC-R-4 Payload-owned replace, MQAP partners kept | T-2, T-4 |
| KPC-R-5 DSpace values stored, payload title ignored | T-1, T-4 |
| KPC-R-6 Handle rule (400 / 409) | T-3 |
| KPC-R-7 Status table incl. `keep_editing` | T-4 |
| KPC-R-8 422 passthrough / 502, nothing written | T-1, T-3 |
| KPC-R-9 Preflight rules (no geo / title check) | T-3 |
| KPC-R-10 Refusals before writes; atomic status | T-3, T-4 |
| KPC-R-11 `RESUBMIT` history row | T-4 |
| KPC-R-12 Carry-forward still closed for KPs | T-5 |
| KPC-R-13 Non-KP behaviour unchanged | T-3, T-5 |
| KPC-R-14 Contract doc | T-6 |
| KPC-R-15 Log line without payload | T-5 |

## Files Changed Summary

| Area | Files | Commits |
|---|---|---|
| Institutions repository | `result_by_intitutions.repository.ts` (+spec): keep-list on `updateInstitutions`, `getMqapLinkedPartnerRowIds` | `45b88d3ee` |
| KP service | `results-knowledge-products.service.ts` (+spec): `syncAgain` split into `fetchDspaceMetadata` / `applyDspaceMetadata` | `1552afc09` |
| Resubmission pipeline | `bilateral-resubmission.service.ts` (+spec): status rule, lock re-read, KP preflight, KP reset/writers, CAS by source status | `3b2c330bb`, `9033e6899` |
| Bilateral service | `bilateral.service.ts` (+spec): KP port, KP writers, resolver guard lifted | `3b2c330bb`, `9033e6899`, `cef0f4ffe` |
| Contract | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`, two KPC-DD-2 comments | `7cbd15639` |

Size: production ≈ +752 / −275, tests ≈ +1 450, doc +54 / −9. The budget was re-baselined at the T-3 gate.

## Test Evidence Summary

- Per task: falsifiers were executed against the post-change code, each red observed and quoted in `execution.md`. A non-author re-ran the evidence each time (VERIFIED ×7).
- Merged tree before push: `tsc --noEmit` exit 0; scoped jest (`bilateral|results-knowledge-products|result_by_intitutions`) passed **61 suites / 2143 tests**.
- Live: the user ran the PRTest checks, result "todo OK" (KPC-T-7).
- `test-report.md`: **absent, accepted by the user** at archive.

## Validation Summary

- `validation-report.md`: **absent, accepted by the user** at archive (no `/akili-validate` run).
- Independent Reviewer on every task: 4 full, 1 lenses, 2 checklist. All PASS; no blocking finding.

## Accepted Warnings Or Follow-Ups

| Item | Disposition |
|---|---|
| KP kept in Editing with a changed primary releases contributor drafts (`releaseContributors: true`) | Accepted as-is ("as today"); noted in Jira |
| CGSpace apply may add `from_cgspace` contributing centres beyond the payload | Accepted (DSpace-derived, R-5) |
| Payload partner equal to a kept MQAP institution leaves two active PARTNER rows | Accepted; PRTest run OK |
| P-11 edge: DSpace 7 `items/<uuid>` handle could give a false 409 | Covered by the user's PRTest run; no failure reported |
| Missing stored handle → 409 with a malformed message | Closed: a KP cannot exist without a handle (user, 2026-11-05) |
| Lost-CAS message says "cannot be resubmitted" for KPs too | Advisory, not changed |
| `KPC-R-15` log carries the HTTP code, not the result status name | Advisory (SHOULD), inherited RSB-R-21 format |
| No test sends the `hdl.handle.net` / bare handle forms through the real normaliser | Advisory test gap |
| Contract `:626` lists the evidence link under "Re-read from CGSpace"; the implementation keeps it as stored | Advisory doc wording |
| Fetcher AC 1–2 and Fetcher guides (AC 9) | Out of scope: Fetcher repository |

## Historical Notes

- HITL (T-1): the owner confirmed the correction skips the in-app admin-only Journal Article gate, because the senders are mostly external users. The "sync again" button keeps the gate.
- P-12 was settled empirically on a session-scoped temp table: mysql2 `FOUND_ROWS` gives affected = 1 for a 1→1 CAS. The non-KP CAS is unchanged.
- The budget tripwire fired at the T-3 gate. ~190 lines of `syncAgain` were moved verbatim and counted twice, and per-falsifier tests ran about 2× the estimate. The user accepted a re-baseline of ~750 prod / ~1 400 test.

## Diagrams

The spec has no `diagrams/` folder or diagram slot; no baseline diagram was made stale.
