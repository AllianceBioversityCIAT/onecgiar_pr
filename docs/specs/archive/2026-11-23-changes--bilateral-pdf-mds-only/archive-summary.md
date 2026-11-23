# Archive Summary — Bilateral (W3) result PDF shows MDS data only (BPM)

> **Outcome:** The bilateral result PDF (`alliance-ibd-pdf-viewer`, template `results_bilaterals_p25`) now prints only MDS data for Innovation Use, Innovation Development and Capacity Sharing, and drops the non-MDS common blocks. W1/W2 (`results_p25`) and IPSR renders are byte-identical (masked) before and after. pdf-viewer PRs #7 and #8 merged to `main`, in PROD and verified 2026-11-13 per the owner's records.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/bilateral-pdf-mds-only` (BPM) |
| Ticket | INC-168048 (Nicoleta Trifa, 2026-11-10) |
| Owner | Santiago Sanchez |
| Archived on branch | `qa-development-2026-ss` (spec branch; apply-capable = `staging`) |

## 2. Original Spec Path

`docs/specs/changes/bilateral-pdf-mds-only/`

## 3. Archive Date

2026-11-23

## 4. Final Status

**Done — 3/3 tasks PASS.** T-1 needed 2 attempts (Reviewer FAIL on build tokens in the baseline diff). Review rounds 4 vs budget 3, accepted by the user at the T-1 gate. One post-PR fix for the Sonar duplication gate (`dfa8180`).

## 5. Requirements Delivered

| Req | Delivered by |
|---|---|
| BPM-R-1..R-3 | T-2 optional `mdsOnly` on the Innovation Use, Innovation Development and Capacity Sharing sections, passed by the bilateral template for result types 2, 5, 7 |
| BPM-R-4 | T-3 removed Short title, Impact Areas targeted, non-KP partners, Bundled innovations table and "Impact Area related" tags |
| BPM-R-5, R-6 | T-1 baseline plus T-2 diffs: W1/W2, IPSR, Policy and KP unchanged |
| BPM-NFR-2, NFR-3 | tsc, eslint and build clean; local print-preview and DOM check, then production look at result 27926 |

## 6. Files Changed Summary

pdf-viewer `app/templates/reportingtool/`: `shared/components/innovation-use.tsx`, `innovation-development.tsx`, `capacity-sharing.tsx`, `results_bilaterals_p25/template.tsx`, `components/common-sections.tsx`. Commit `827f180` (5 files), Sonar fix `dfa8180`, PR #7 to `staging`, later merged to `main` (with #8). In onecgiar_pr: `fixtures/` harness and inputs (`render.sh`, `posix-relative.cjs`, 6 JSON fixtures), `fixtures/out/` scratch, never committed.

## 7. Test Evidence Summary

No `test-report.md`. Rendered-HTML harness (`next build` + `next start`, masks for build tokens): two-build masked `diff -r` empty; 21 baselines; label greps per fixture; 8 W1/W2 and IPSR files `cmp`-identical; Policy and KP identical; 6 falsifiers executed and red, then reverted; `tsc`, eslint and build exit 0; Sonar fix re-verified with 21 files and 0 diffs.

## 8. Validation Summary

No `validation-report.md`. Local print preview and DOM check on 4 fixtures PASS (2026-11-12). Result 27926 verified in production 2026-11-13 per the owner's records.

## 9. Accepted Warnings Or Follow-Ups

- [ ] Reply to Nicoleta in INC-168048 (per the owner's records, a draft or send status is not in `execution.md`).
- [ ] OQ-1: ask Nicoleta whether to add MDS fields the PDF does not print today (innovation-use investment by W3/bilateral projects, current-use update). OQ-2: KP partners kept; confirm if she flags them.
- [ ] Product call: in `mdsOnly`, an Innovation Development result with only nature and developers and no `url_readiness` prints the "readiness not provided" placeholder image.
- [ ] Optional readability: consolidate `has*` constants and inline `!mdsOnly &&` in `innovation-development.tsx`.
- [ ] `fixtures/out/` (including `fals1..3`) is scratch: never commit; delete or ignore locally.
- [ ] Real Gotenberg pagination is not reproducible locally; seen only in production.

## 10. Historical Notes

- `next dev` is unusable on Windows for this app (`path.relative()` builds backslash import paths and Turbopack wedges), so the harness uses `next build` + `next start` with a `posix-relative.cjs` preload.
- Spec wording was edited at execute time with the user's approval (BPM-R-5 mask list, T-2 labels, T-3 `>Partners<`, rollout changed to local print check because `main` = production, source Cristian Gamboa).
- The Sonar duplication failure came from the bilateral `common-sections.tsx` being a pre-existing copy of the `results_p25` sections.

## 11. Diagrams

None.
