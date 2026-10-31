# Tasks — W3/bilateral projects by program (`bugfix/w3-projects-by-program`)

## 1. Scope

| Field | Value |
|---|---|
| Depth / mode | Lite · Bug Mode |
| Requirements / design | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) |
| Code tasks for `/akili-execute` | **WPP-T-1** (server), **WPP-T-2** (client) — independent, can run in parallel (tests NOT in parallel, see pre-flight) |
| Manual task | **WPP-T-3** PRTest verification (Santiago) |
| Approval Mode | `gated` |

## 2. Pre-flight

- [ ] Branch is not `master`.
- [ ] **One test run at a time on the machine, always `--maxWorkers=2`**, scoped with a path pattern (global rule). Lint only touched files.
- [ ] No DB connection from agents; no data written.

## 3. Task list

### `WPP-T-1` — Server: merge CLARISA-approved projects into by-program (regression test first)

- **Status:** `[x]` (2026-10-30 — Reviewer PASS, attempt 2; evidence in `execution.md`. Commit pending the user's go-ahead.)
- **Implements:** WPP-R-1 (S-1.1…S-1.5), WPP-NFR-1, WPP-NFR-2
- **Files:** `clarisa-projects.repository.ts` (+ spec), `results-framework-reporting.service.ts`, `results-framework-reporting.service.spec.ts`
- **Design refs:** §6, §7, WPP-DD-1/2/3
- **Depends on:** — · **Estimate:** S/M (~110 LOC) · **Review:** `full`
- **Skills:** `tdd`, `nestjs-expert`
- **Test cases** (service spec, inside `getBilateralProjectsByScienceProgram (P2-3001)`; mock `findApprovedProjectsByProgramCode` and the version lookup):
  1. **S-1.1 (regression):** ToC `[]`, CLARISA `[{project_id: 10}, {project_id: 11}]` → response has ids `[10, 11]`. **Red on current code** (returns `[]`).
  2. **S-1.2:** ToC `[{project_id: 11}, {project_id: 12}]`, CLARISA `[{project_id: 10}, {project_id: 11}]` → ids exactly `[11, 12, 10]`.
  3. **S-1.3:** ToC `[{project_id: 12}]`, CLARISA `[]` → `[12]`.
  4. **WPP-DD-3:** version year unresolved → CLARISA method not called, ToC rows returned.
  5. **S-1.5:** existing missing-programId (400) and unknown-program (404) cases still pass; the existing "empty array" case is updated so both sources are empty.
  6. Repository spec (**S-1.4 / NFR-2**): the query receives `[programCode, [...APPROVED_MAPPING_STATUSES], phaseYear]` as bound params and its SQL contains `allocation > 0`, `cp.phase = ?`, the `is_active` filter and no interpolated program code.
- **Verification:**
  - `cd onecgiar-pr-server && npx jest src/api/results-framework-reporting/results-framework-reporting.service.spec.ts src/clarisa/clarisa-projects --maxWorkers=2 --silent --reporters=summary --forceExit -t "P2-3001|findApprovedProjectsByProgramCode"`
  - **Red evidence:** case 1 fails before the service change (`[]` received). **Falsifier:** if case 1 passes before the fix, the mock is not reaching the service — the evidence is void, fix the test first. Case 2 fails if order or dedupe is wrong.
  - **Disqualifier:** a presence-only SQL assertion does not prove the filter works on data — that is covered only by WPP-T-3.
  - `npx eslint <touched files> --quiet`
- **Done:** tests red→green; lint clean; Swagger description updated; no migration.

### `WPP-T-2` — Client: Centers error + Retry, and banner waits for "Yes"

- **Status:** `[x]` (2026-10-30 — Reviewer PASS, attempt 1; evidence in `execution.md`. Commit pending the user's go-ahead.)
- **Implements:** WPP-R-2 (S-2.1), WPP-R-3 (S-3.1, S-3.2)
- **Files:** `rd-contributors-and-partners.component.{ts,html}`, `rd-contributors-and-partners.zoneless.spec.ts`, folder `CLAUDE.md` (+ `Verified:` stamp)
- **Design refs:** §8, WPP-DD-5
- **Depends on:** — · **Estimate:** S (~70 LOC) · **Review:** `light`
- **Skills:** `angular-developer`, `spartan` (reuse existing `app-alert-status` / button primitive; no new component)
- **Test cases** (real template, zoneless spec):
  1. **S-2.1:** `getData` rejects → error text + Retry visible; Retry calls `getData` again; when it resolves with centres, error gone. While `getData` is pending → no error. Catalogue already loaded → no error.
  2. **S-3.1:** `planned_result = null`, no reference centres → note text absent; the `Contributing CGIAR Centers` dropdown and its mandatory marker still present.
  3. **S-3.2:** `planned_result = true`, no reference centres → note present.
- **Verification:**
  - `cd onecgiar-pr-client && npm run test:local -- --testPathPattern="rd-contributors-and-partners.zoneless"` (or `npx jest … --maxWorkers=2`).
  - Before pushing: `npx jest --findRelatedTests <changed files> --maxWorkers=2` (team rule).
  - **Falsifier:** case 2 fails on current code (note rendered when unanswered). If it passes before the change, the fixture's `planned_result` is not reaching the template.
  - `npx eslint <touched files> --quiet`
- **Done:** tests green; lint clean; folder `CLAUDE.md` updated in the same commit.

### `WPP-T-3` — Manual verification on PRTest (Santiago)

- **Status:** `[ ]` · **Depends on:** WPP-T-1, WPP-T-2 deployed to PRTest (performance-refactor)
- **Implements:** WPP-R-1 (real data), WPP-R-2, WPP-R-3, WPP-NFR-3
- **Checks (read-only, no Save):**
  1. `by-program?programId=SP09` count ≥ Portfolio Overview `mapped` for SP09 and the ids include every ToC-linked one.
  2. A Program that already listed ToC projects lists all of them.
  3. On an SP09 2026 result the picker opens, type-ahead and Center pills work with the long list.
  4. Block `clarisa/centers/get/all` in DevTools → error + Retry; unblock + Retry → centres load.
  5. ToC KPI question unanswered → no "No CGIAR Centers related…" note.
- **Disqualifier:** if PRTest's CLARISA mappings differ from prod, record the PRTest number and re-check #1 in prod after release.

## 4. Traceability

| Clause | Task |
|---|---|
| S-1.1, S-1.2, S-1.3, S-1.5, NFR-1 | WPP-T-1 (cases 1–5) |
| S-1.4, NFR-2 | WPP-T-1 (case 6) + WPP-T-3 #1 |
| S-2.1 incl. BUT (no error while pending/loaded) | WPP-T-2 case 1 + WPP-T-3 #4 |
| S-3.1 incl. AND (dropdown stays) | WPP-T-2 case 2 + WPP-T-3 #5 |
| S-3.2 | WPP-T-2 case 3 |
| NFR-3 | WPP-T-3 #1 |

## 5. PR / commit

~180 LOC → single PR. Commits only on the user's go-ahead, no apostrophes in subject, e.g. `🔧 fix(results-framework-reporting) P2-4042: list CLARISA approved projects in the bilateral projects by program dropdown`.
