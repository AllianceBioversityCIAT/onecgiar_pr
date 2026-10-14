# Archive Summary — KP browse: strict bilateral project filter (`KPSF`)

**Outcome:** delivered. Bilateral KP browse now splits results into "KPs linked to the project" (strict, server-side rule on each repository's project field) and "Other KPs potentially related" (proxy). All 5 tasks passed review, and the INC-165339 case (`T-PJ-003942` → `10568/182744`) was verified live and in the browser.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/kp-project-strict-filter` |
| Ticket(s) | INC-165339, INC-165002 |
| Branch | `qa-development-2026-ss` |
| Archived by | `/akili-archive` (Claude Code) |

## 2. Original Spec Path

`docs/specs/changes/kp-project-strict-filter/`

## 3. Archive Date

2026-10-14

## 4. Final Status

| Item | Status |
|---|---|
| Tasks | 5/5 `[x]` |
| Reviewer verdicts | All PASS. T-4 and T-5 passed on attempt 2; the others on attempt 1 |
| HALT / Pivot / FATAL_FAIL | None |
| Budget | ~700 LOC raised by the user to ~2,000 after T-2. Overrun = test volume |
| `test-report.md` | **Absent, accepted.** The user asked to archive immediately; evidence is in §7 |
| `validation-report.md` | **Absent, accepted.** Same reason; Reviewer gates plus live and browser acceptance in §8 |

## 5. Requirements Delivered

| ID | Delivered by | Evidence |
|---|---|---|
| KPSF-R-1 upstream filter, per-host field | T-2, T-5 | CGSpace linked = 1 (`10568/182744`); MEL/WorldFish use `cg.contributor.project` |
| KPSF-R-2 tolerant deterministic rule | T-1 | 28 fixture cases, real labels |
| KPSF-R-3 two sections, no duplicates | T-2 (`AND NOT`), T-4 | 1 + 80 = 81 and 1 + 3345 = 3346, live |
| KPSF-R-4 per-section counts and paging | T-3, T-4, T-5 | Screenshot: 1 / 80 with Case Study |
| KPSF-R-5 empty linked section | T-4 | Component spec |
| KPSF-R-6 linked badge only in section 1; client fuzzy matcher removed | T-3, T-4 | Specs + grep (0 hits) |
| KPSF-R-7 MEL/WorldFish labels in `projects[]` | T-2 | Mapper spec |
| KPSF-R-8 AND with existing filters | T-2, T-3 | Specs |
| KPSF-R-9 safe query, not-applicable path | T-1, T-2, T-4, T-5 | Hostile-title clause test; 18/18 HTTP 200 live |
| KPSF-R-10 non-bilateral browse unchanged | T-2, T-3 | Pre-change `translateParams` snapshot; no `project*` params |
| KPSF-R-11 facet and stale copy removed | T-2, T-4 | Specs + grep |
| KPSF-R-12 tagging-rule info line | T-4 | Visible in screenshots |
| KPSF-R-13 end-to-end IITA case | T-5 | Screenshots 1–4 (no filter, Case Study, select → create form) |

## 6. Files Changed Summary

| Area | Files |
|---|---|
| Server (new) | `cgspace-discovery/project-match.ts`, `project-match.spec.ts`, `repositories.config.spec.ts` |
| Server (modified) | `repositories.config.ts`, `dto/cgspace-search-query.dto.ts` (+ spec), `dto/cgspace-item.dto.ts`, `cgspace-discovery.service.ts` (+ spec), `cgspace-discovery.mapper.ts` (+ spec), `results-knowledge-products.controller.ts` (Swagger only) |
| Client (modified) | `kp-cgspace-browse.component.{ts,html,spec.ts}` |
| Untouched | `/api/bilateral/*`, `results-api.service.ts`, bilateral consumers, migrations |

Server paths are relative to `onecgiar-pr-server/src/api/results/results-knowledge-products/`.

## 7. Test Evidence Summary

| Suite | Result |
|---|---|
| Server `project-match` | 28/28 (red → green) |
| Server `cgspace-discovery\|cgspace-search-query\|controller\|project-match` | 171/171 (red: 4 failed → green) |
| Client `kp-cgspace-browse` | 96/96 (T-3 red 15 failed; T-4 a2 red 1 failed → green) |
| Lint | Clean on every touched file (client needs `ESLINT_USE_FLAT_CONFIG=false`) |
| Not run | `ng build`, Cypress CT `kp-cgspace-browse.cy.ts`, full suites (low RAM / disk) |

## 8. Validation Summary

- **Live smoke (T-5):** generated queries on CGSpace, MELSpace and WorldFish. 18/18 HTTP 200, and linked + related = unconstrained on every host.
- **Browser acceptance (user, local stack):**
  - 182744 is in section 1 with all 4 labels.
  - Section 2 reads 3345 with no filter, and 80 with Case Study.
  - "Use this item" leads to the unchanged create form.
  - No write action was performed.
- **Coverage limit:** the browser check covered CGSpace only, because the local `.env` lacks the MEL/WorldFish discovery URLs. The live smoke covered all 3 hosts.

## 9. Accepted Warnings Or Follow-Ups

1. **Deploy order:** server before or with the client. A new client on an old server gets HTTP 400, and `linkedApplied` falls back to `true` on a missing echo. Confirm `MELSPACE_DISCOVERY_URL` and `WORLDFISH_DISCOVERY_URL` on PRTest and prod.
2. **Matching label first:** the linked card shows every label but not the matching one first (the CIMMYT label appears before the IITA one). Follow-up: the server orders the matching labels first, or exposes `matchedProjects[]`.
3. **Residual risk:** multi-valued fields match the word group at item level, not per label (T-1 advisory). Accepted.
4. **Advisories:** a11y and i18n polish (aria-label on span, extra tab stops, `focus:outline-none`, inline copy); dead `projectSummary` / `projectDescription` inputs; "did not respond" shown for unconfigured repositories (pre-existing KPM copy).
5. **Tooling:** `npm run test:local` is broken on Windows (`spawnSync npx`). Cypress CT not run.
6. **Rollout:** re-run the live smoke on PRTest after deploy. Send Theresa the tagging rule (CLARISA title, prefix allowed, or PJ code). KPSF-OQ-5 (program keyword approximation) is a separate spec.
7. **TRD:** update W9, recorded as a pending item in the kaizen entry.

## 10. Historical Notes

- **Agreement:** from the 2026-10-14 meeting with Nicoleta (two sections plus a proxy note). Ángel writes the matching user story.
- **User decision:** a project-scoped bilateral browse auto-searches on open (R-13).
- **OQ-6 resolved:** other-center KPs appear only in section 2 with the proxy marker, because the bilateral browse has no center constraint.
- **Environment:** drive C: ran out of space mid-run, so Jest/eslint caches were moved to `D:\kpsf-tmp`.
