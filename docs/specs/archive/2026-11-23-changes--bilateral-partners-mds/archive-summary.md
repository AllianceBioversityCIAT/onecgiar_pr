# Archive Summary — Bilateral External partners back in the MDS (BPX)

> **Outcome:** External partners is an MDS field of bilateral results again. Non-KP results must answer it (at least one partner, or "no external partners") before submit, on the form and on the server (`assertSubmittable`). KP, read-only results and `POST /api/bilateral/create` keep the optional rule. Non-KP partners print again in the MDS-only bilateral PDF. Verified on PRTest by the user 2026-11-18; in PROD (origin/master).

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/bilateral-partners-mds` (BPX) |
| Ticket | none (TBD; source: Nicoleta Trifa email 2026-11-16 point 2; mandatory confirmed by Angel Jarrin) |
| Owner | Santiago Sanchez |
| Archived on branch | `qa-development-2026-ss` (spec branch; apply-capable = `staging`) |

## 2. Original Spec Path

`docs/specs/changes/bilateral-partners-mds/`

## 3. Archive Date

2026-11-23

## 4. Final Status

**Done — 4/4 tasks PASS** (BPX-T-1 server, T-2 client, T-3 PDF, T-4 docs). T-4 needed 2 attempts; the T-2 folder-guide follow-up needed 2 attempts (Reviewer FAIL on two false current-rule sentences). Budget: LOC about 690 against about 380, accepted by the user. Supersedes P2-3821.

## 5. Requirements Delivered

| Req | Delivered by |
|---|---|
| BPX-R-1..R-4, R-6, R-7 | T-2 partners block in Block 1, `external-partners` tracker item for editable non-KP, KP and read-only exempt |
| BPX-R-5, R-10 | T-1 check in `assertSubmittable`; `create` DTO untouched |
| BPX-R-8 | T-3 non-KP partners in the MDS-only PDF |
| BPX-R-9 | T-4 supersession notes in `bilateral/contributors-partners-optional`, stale code comments and the folder guide |

## 6. Files Changed Summary

- Server: `bilateral-center.service.ts` (+26) and its spec (+119).
- Client: `section-contributors/` component ts/html, 2 specs, folder `CLAUDE.md`.
- PDF viewer (separate repo `alliance-ibd-pdf-viewer`): `results_bilaterals_p25/components/common-sections.tsx` (+8/-5), commit `74fe0ed` on `fix/bilateral-pdf-non-kp-partners`.
- Docs: `bilateral/contributors-partners-optional` notes, `bilateral-pdf-mds-only/requirements.md`.

## 7. Test Evidence Summary

No `test-report.md`. Per task in `execution.md`: red runs and mutations (T-1 3 red, T-2 red), then server spec 253 passed, folder suite 252 passed, `npx jest src/api/bilateral` 47 suites / 1665 tests passed, server and client lint exit 0, `ng build` 0. Client full run showed 92 failures in 6 unrelated suites (shell-topbar, interceptor, QA and others), not proven pre-existing. Full server suite not run.

## 8. Validation Summary

No `validation-report.md`. PRTest HITL (BPX-TEST-6) passed per the user 2026-11-18. Not run: direct server 400 call (covered by T-1 unit tests and the Submit block).

## 9. Accepted Warnings Or Follow-Ups

- [ ] Support heads-up: existing Editing/Draft/Rejected non-KP results with no partner answer are now refused at submit (by design, section 11).
- [ ] Reviewer advisories: flag test does not assert `count` not called; role mocks read `FindOperator._value`; hard-coded `border-[#ECEFF1]`; curly vs straight quotes in the hint; hint lacks `aria-describedby`; `isKnowledgeProduct?.()` optional call makes KP required if a host lacks it.
- [ ] T-3 PDF: fixture has no `kp_partner_data`, so KP-only and mixed lists were not rendered. `execution.md` records the pdf-viewer PR as not yet opened; per the owner's records the pdf-viewer change is merged to `main`.
- [ ] `section-contributors/CLAUDE.md` is 357 lines vs a 120-line cap (pre-existing); test counts in it not recounted.
- [ ] Full server suite and the 6 unrelated client failures not baselined at `548d9bf29`.
- [ ] `akili doctor --agents --fix` on `staging` (`leader.md` persona drift).
- [ ] Guide-sync for `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` section 4 (kaizen entry P1).

## 10. Historical Notes

- A user time box of about 20 minutes led the Leader to checkpoint T-1 and T-2 instead of waiting on stalled full-suite runs; gates were re-run inline in the foreground.
- Orphaned Jest processes from stopped Implementers were killed by the user; background full runs were reaped for low memory.
- The `section-contributors/CLAUDE.md` rewrite was approved in session and is done; the earlier open decision is closed.
- Direct merge of `qa-development-2026-ss` to `staging` (6 commits) was requested by the user, no PR.

## 11. Diagrams

None.
