# Archive Summary — KP Project Match (`cg.identifier.project`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/kp-project-match` |
| Archive date | 2026-09-18 |
| Branch at archive | `qa-development-2026` |
| Default branch pin | `master` |
| Archive run | 1 |

## 2. Original Spec Path

`docs/specs/changes/kp-project-match/`

## 3. Final Status

**Shipped** — KPPJ-T-1..3 PASS (one attempt each). Post-spec QA session added bilateral UX polish, BMT multi-field match, optional strict project-tag filter (MEL/WorldFish only), and a CGSpace facet correction.

## 4. Requirements Delivered

| ID | Delivered |
|---|---|
| KPPJ-R-1 | `projects[]` from `cg.identifier.project` on discovery DTO |
| KPPJ-R-2 | Union/dedup `projects[]` on multi-repo merge |
| KPPJ-R-3–R-8 | Client fuzzy project match, badge, counter, toggle, combined sort with SP |
| KPPJ-R-9 | Bilateral drawer → form → browse context wiring |
| **Extensions (QA, not in original AC)** | BMT fields (summary, description, lead center) for match; drawer project subtitle; responsive filter row; Info notice when search hits exist but no project tags; `Filter by project tag` strict Solr filter (opt-in, OFF by default); CGSpace skips unsupported `f.project` facet |

## 5. Files Changed Summary

**Core spec (committed `601b04dbf` + follow-up uncommitted on branch):**

| Area | Files |
|---|---|
| Server | `cgspace-item.dto.ts`, `cgspace-discovery.mapper.ts`, `merge.ts`, `*.spec.ts`, `cgspace-search-query.dto.ts`, `repositories.config.ts`, `cgspace-discovery.service.ts`, `results-knowledge-products.controller.ts` |
| Client browse | `kp-cgspace-browse.component.{ts,html,scss,spec.ts}` |
| Bilateral | `bilateral-manual-create-flow.service.{ts,spec.ts}`, `bilateral-manual-create-form.{ts,html,spec.ts}`, `bilateral-manual-create-drawer-host.component.html`, `bilateral-create-drawer.component.{ts,html,scss,spec.ts}` |

## 6. Test Evidence Summary

| Suite | Result | Pattern |
|---|---|---|
| Server mapper + merge | 38 passed | `cgspace-discovery.mapper.spec\|merge.spec` |
| Server discovery service | 32 passed | `cgspace-discovery.service.spec` |
| KP browse | 81 passed | `kp-cgspace-browse.component.spec` |
| Bilateral form | 22+ passed | `bilateral-manual-create-form.component.spec` |
| Flow + drawer | 19 passed | `bilateral-manual-create-flow.service.spec\|bilateral-create-drawer.component.spec` |

No `test-report.md` or `validation-report.md` — evidence accepted from `execution.md` and scoped Jest runs above.

## 7. Validation Summary

- All `[x]` tasks in `tasks.md`; execution status `complete`.
- No Reviewer FAIL rework on KPPJ-T-1..3.
- Manual staging checks for badge contrast and end-to-end bilateral browse remain **unchecked** in rollout §7 (accepted follow-up).

## 8. Accepted Warnings Or Follow-Ups

- Manual bilateral drawer smoke on a project with known `cg.identifier.project` tags (e.g. FertilizeRight / IRRI tag).
- Programme Results browse regression spot-check (SP match unchanged).
- Commit remaining branch diff if not yet merged.
- Apply kaizen pending items on `master` (facet audit rule, TRD note on CGSpace project facet absence).

## 9. Historical Notes

- Repository project tags rarely equal Bilateral Mapping Tool `code - title`; strict `Filter by project tag` stays **OFF** by default.
- CGSpace Discovery API (2026-09 live audit) exposes **no** `project` facet — strict filter applies to MELSpace and WorldFish only; CGSpace uses client-side project highlight only.
- User-facing copy uses **Bilateral Mapping Tool** instead of CLARISA for project field labels.
