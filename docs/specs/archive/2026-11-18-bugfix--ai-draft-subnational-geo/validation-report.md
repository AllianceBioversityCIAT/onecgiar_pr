# Validation Report — AI draft promotion keeps the Sub-national scope

**Verdict: PASS with 2 WARN — archive-ready.** Every requirement, scenario and `BUT` / `AND IT MUST` clause has code and test evidence. No FAIL. The two WARN are a budget figure that the docs no longer match and one manual QA check still pending after deploy. Neither one blocks archiving.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/ai-draft-subnational-geo` |
| Ticket | INC-168504 |
| Date | 2026-11-18 |
| Code state | `qa-development-2026-ss` @ `385d46e44` + uncommitted spec diff |
| Auditor | Claude Code — `opus` (T3). The production code was written by the Implementer on `sonnet`, so author ≠ auditor holds for it. **Caveat:** this same session wrote tests h–m during `/akili-test`, so those six tests are self-audited here |
| Inputs | `proposal.md`, `requirements.md`, `design.md`, `tasks.md`, `execution.md`, `test-report.md` |

## 2. Summary

| Area | Result |
|---|---|
| Task completion | PASS |
| File existence | PASS |
| Build integrity | PASS |
| Requirement coverage | PASS |
| Code quality | PASS (6 advisory notes) |
| Design conformance | PASS |
| Cross-document figures | **WARN** — the LOC budget no longer matches the diff |
| Test evidence | PASS; **WARN** — real-DB check is manual and not yet done |
| Constitution impact | PASS — none |

## 3. Task Completion

| Task | Status | Execution evidence | Result |
|---|---|---|---|
| ADS-T-1 Regression tests | `[x]` | `execution.md`: Reviewer PASS, Leader re-run VERIFIED, a–f red and g green at `385d46e44`, P-7 settled on the QA DB | PASS |
| ADS-T-2 Normalize Sub-national geo | `[x]` | `execution.md`: Reviewer PASS (full review), Leader re-run VERIFIED, falsifier mutation red, full suite green | PASS |

## 4. File Existence

| Design §4 file | Expected | Found | Result |
|---|---|---|---|
| `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` | Changed: geo block + one private helper | 4 hunks, all between `:5648` and `:5732` (geo block and `resolveAiSubnationalAreas`) | PASS |
| `onecgiar-pr-server/src/api/bilateral/bilateral.service.spec.ts` | New describe block | `populateResultFromExtractedMds — Sub-national geo (INC-168504)` | PASS |
| Files that must stay unchanged | `lookupSubnationalAreas` (`:6847`), `handleSubnationals` (`:6794`), `handleCountries` (`:6666`), `validateGeoFocus` (`:6556`), DTOs, `bilateral-result-summaries.en.md` | No hunk touches them; `git diff --name-only` under `api/bilateral/` + the payload doc lists only the 2 files above | PASS |

## 5. Build Integrity

| Command | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | exit 0 — PASS |
| `npx eslint src/api/bilateral/bilateral.service.ts src/api/bilateral/bilateral.service.spec.ts --quiet` | exit 0 — PASS |
| `npx jest --testPathPattern=bilateral …` (from `test-report.md`, 2026-11-18, no code change since) | `Test Suites: 51 passed` · `Tests: 1806 passed` — PASS |
| Environment boot | Not run. The change is a private helper on an internal path and has no new endpoint. Real-DB behavior is covered by the manual check in §9 |

## 6. Requirement Coverage

Checked clause by clause against `requirements.md` §6 and §8.

| Requirement / clause | Owning task | Code evidence | Test | Result |
|---|---|---|---|---|
| FR-1 scenario "reported case" | T1a → T2 | Scope-5 branch calls `resolveAiSubnationalAreas`, then `handleCountries(…, areas, 5)` | a | PASS |
| FR-1 BUT must NOT log `geo_focus skipped` | T1a | Codes reach `lookupSubnationalAreas` as `{id}`, so the lookup no longer throws | a, i | PASS |
| FR-1 scenario "several countries" | T1b | Codes collected from every `countries[i]` | b, l | PASS |
| FR-2 no code resolves (none found / none sent) | T1c, c2 | `effectiveScopeId = length > 1 ? 3 : 4` when `areas` is empty | c, c2, h | PASS |
| FR-2 BUT must NOT leave scope null | T1c | `save({ geographic_scope_id: resolveScopeId(effectiveScopeId, …) })` | c, c2, h | PASS |
| FR-3 partial resolution | T1d | Resolved codes kept; one warn lists the rest | d, i | PASS |
| FR-4 code must belong to a draft country | T1e | `allowed.has(iso)` filter; code-prefix backup (DD-3) | e, j | PASS |
| FR-5 resolve before any write | T1f | Helper awaited before `handleRegions` / `handleCountries` | f | PASS |
| FR-5 AND IT MUST keep warn, no throw | T1f | Existing `try/catch` kept | f, m | PASS |
| FR-6 scope ≠ 5 and bilateral API unchanged | T1g + T2 Done | Branch guarded by `scope.id === 5 && countries?.length`; otherwise the same arguments as before | g + 1806 existing tests | PASS |
| FR-6 BUT must NOT change `lookupSubnationalAreas` or the root-level API handling | T2 Done | §4: no hunk in the shared handlers | diff check | PASS |
| NFR performance: ≤ 1 extra query | — | One `find({ code: In(...), is_active: true })`; early return when there are no codes | l, h | PASS |
| NFR observability: dropped codes in one warn with the result id | — | Warn includes `result ${result.id}` and the list of unresolved codes | i | PASS |
| ADS-AC-1 … AC-5 | — | — | see `test-report.md` §7 | PASS |

`test-report.md` records no `PRODUCT_BUG`, `FAIL`, flaky or deferred entries. Its one manual gap is carried into §9 below.

## 7. Linting & Code Quality

ESLint and `tsc` are clean. The helper is private, read-only, carries `// @akili-spec bugfix/ai-draft-subnational-geo`, and logs no PII or secrets: only the result id and ISO codes.

**4R advisory notes** (none are spec violations; carried over from the `execution.md` ADS-T-2 review plus this sweep):

| Lens | Note |
|---|---|
| Reliability | TypeScript compares codes case-sensitively, while MySQL `IN` matches case-insensitively. A lowercase code (`co-cun`) would be saved but also listed as unresolved, and a lowercase `iso_alpha_2` would drop a valid area. Fix: normalize with `toUpperCase()`. The current AI data is upper-case (P-7 sample) |
| Reliability | In a draft that mixes countries given by `iso_alpha_2` with countries given only by id or name, the codes of the id-only countries are dropped. This follows DD-3 as written |
| Resilience | Pass-through `{id}` / `{name}` entries are not checked before writing, so an invalid name still throws after countries are written. This behavior predates the fix; FR-5 only covers codes |
| Readability | Entries that are neither a string nor an object with `code` / `id` / `name` are skipped silently, without a warn |
| Readability | When no codes are sent, the warn prints an empty `[]`; wording like "no sub-national codes sent" would be clearer to whoever triages it |
| Risk | Known gap, outside this spec: `handleSubnationals` writes every resolved area to every country of the draft (requirements §3). In a multi-country Sub-national draft, each country receives the other countries' areas. This is now reachable from the AI path, where before the promotion failed first |

## 8. Design Conformance

| Design item | Implementation | Result |
|---|---|---|
| §7 step 1 (collect: strings, `{code}`, pass-through `{id}`/`{name}`, root level, de-duplicate) | `Set` of codes + `passThrough` array; root list included (test k) | PASS |
| §7 step 2 (allowed countries; empty set means no filter) | `allowed` built from `iso_alpha_2`; `!allowed.size \|\| allowed.has(iso)` | PASS |
| §7 step 3 (one `find`, `code IN`, `is_active`) | Matches (test l) | PASS |
| §7 step 4 (country filter, code-prefix backup) | `row.country_iso_alpha_2 ?? row.code?.split('-')[0]` (test j) | PASS |
| §7 step 5 (return `{ areas, unresolved }`) | Matches | PASS |
| Geo-block case table (areas present / fallback / no countries) | Matches; scope 5 without countries keeps the old path | PASS |
| DD-1 (private helper on the AI path only) | Matches | PASS |
| DD-2 (fallback to 4 or 3) | Matches | PASS |
| DD-3 (country filter) | Matches | PASS |
| DD-4 (fallback keeps the original scope object for regions) | `handleRegions(result, scope, …)` is called with the original `scope` | PASS |
| Proposal intent, scope and non-goals | Aligned; no contract, schema or migration change; no backfill (OQ-2) | PASS |

**Cross-document figure check**

| Figure | Where | Contradiction | Result |
|---|---|---|---|
| Budget "~60 prod + ~140 test" / "~200 LOC" | `design.md` §10, `tasks.md` header | Actual diff: +67/−3 prod and +330 test, about 397 LOC. `execution.md` records the user accepting a revised ~280 after T1, which the T2 diff (283) met. `/akili-test` then added 111 test lines (h–m) that no budget covers, and `design.md` / `tasks.md` still state ~200 | **WARN** — record the final figure in `/akili-archive` (Kaizen: sizing a Lite bugfix that mocks real handlers) |
| "81 / 192 PROD drafts" | `requirements.md` §9, `proposal.md` P6 | Never verified; stated by the user. No other document contradicts it | PASS (marked `UNVERIFIED` in the source) |
| Line citations (`:5649-5655`, `:6623-6643`, …) | `requirements.md` §2, `proposal.md` | Pinned to `385d46e44`; they no longer line up with the working tree, which is expected after the fix | PASS (`Verified at` is stated) |

## 9. Test Evidence Summary

| Source | Evidence | Result |
|---|---|---|
| `test-report.md` | 14 targeted tests (8 from the author, 6 added in `/akili-test`); 1806/1806 in the `bilateral` suites; a mutation check killed h, j and k | PASS |
| Accepted gap | No DB-backed test of the promote path. Manual QA check after deploy: promote `bilateral_ai_drafts.id = 1` (KH) and expect `geographic_scope_id = 5`, a KH `result_country` row, and subnational rows KH-20 / KH-6 / KH-21 / KH-2 | **WARN** — pending until deploy |

## 10. Agent Guide / Constitution Impact

No `## Constitution Impact` block in `execution.md`. No module was created or reshaped and no public surface changed; the helper is private. Nothing to sync. A CodeGraph re-index is optional (one file changed). PASS.

## 11. Remediation

| # | Finding | Severity | Recommended action |
|---|---|---|---|
| R-1 | The LOC budget in `design.md` / `tasks.md` (~200) no longer matches the final diff (~397) | WARN | Record the actual figure and the cause in `/akili-archive` (Kaizen). No code change |
| R-2 | Real-DB behavior has not been checked | WARN | Run the manual QA check in §9 after deploy |
| A-1 | Case sensitivity (advisory) | Advisory | Possible follow-up `/akili-quick` (one line, `toUpperCase()`) if the AI could ever send lowercase codes |
| A-2 | Every area written to every country in multi-country Sub-national drafts (known, outside this spec) | Advisory | Already listed as a separate ticket in requirements §3; worth prioritizing now that the AI path reaches it |

## 12. Archive Readiness Recommendation

**Ready to archive.** All tasks are `[x]`, there are no FAIL findings, and both WARN items have a defined next step that does not depend on this spec's code. Before archiving, the user should review this summary and decide whether to commit; nothing is committed yet.

```text
/akili-archive bugfix/ai-draft-subnational-geo
```
