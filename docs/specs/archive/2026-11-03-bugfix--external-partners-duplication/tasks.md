# Module Spec — Tasks: External Partners Duplication (bugfix)

Linked spec: `docs/specs/bugfix/external-partners-duplication/requirements.md` + `design.md`.

## 1. Scope of this task list

- **Module / feature:** `results` (server: `results_by_institutions`) / `results` client (`rd-contributors-and-partners`, shared with IPSR)
- **Linked spec:** `requirements.md` + `design.md` (this folder)
- **Sprint / target phase:** none set
- **Owner / driver:** santiago.sanchez@cgiar.org
- **Status:** not-started

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [ ] Open questions `EPD-OQ-1` / `EPD-OQ-2` — deliberately **not** required closed before `EPD-T-2..T-5` start (see `design.md` §1A, `EPD-P-5`/`EPD-P-6` "if false" columns); `EPD-T-1` runs to close them but does not gate the fix tasks.
- [x] No conflicting in-flight spec touching `results_by_institutions.service.ts` or `rd-contributors-and-partners.service.ts` (checked `docs/specs/` at proposal time).
- [x] No migration in scope — `migration:check` unaffected.

---

## 3. Task list

### `EPD-T-1` — Investigate live duplicate rows and W1/W2 parity

- **Type:** `docs`
- **Description:** Close `EPD-OQ-1` and `EPD-OQ-2`. (a) With DB access (prtest/staging), query `results_by_institution` for result 9657 (and any other result with an "External Partners (N)" count that looks doubled) filtered by `result_id`, grouped by `institutions_id, institution_roles_id` having `count(*) > 1` among active rows — confirm or refute that duplicate rows exist today. (b) Manually reproduce the same steps on a W1/W2 (non-IPSR) result on a 2026 phase to confirm or refute that the identical duplication renders there too. Record both findings in this file's §7 Cleanup notes (or a short addendum) — do not silently drop either question.
- **Implements:** `EPD-OQ-1`, `EPD-OQ-2` (investigation, not a functional requirement)
- **Files (expected):** none (read-only investigation); optionally a throwaway SQL/script, not committed.
- **Depends on:** —
- **Blocks:** `EPD-T-6` (follow-up filing depends on this finding)
- **Estimate:** S
- **Review:** `skip-eligible` (no code diff to review; findings are recorded, not implemented)
- **Verification:**
  - **Falsifier:** a `SELECT ... GROUP BY institutions_id, institution_roles_id HAVING COUNT(*) > 1` against `results_by_institution WHERE result_id = 9657 AND is_active = 1` returns 0 rows (root cause was already cleaned up by the user's manual duplicate-removal) vs. returns 1+ rows (duplicates persisted despite the UI looking clean).
  - **Red run:** n/a (no test gate — this is a data/manual investigation, not a code change).
  - **Disqualifier:** if DB access is not available to whoever executes this task, mark the finding `unverified` explicitly rather than guessing from the UI state alone — the UI can look clean while stale rows remain `is_active = false` or vice versa.
  - **Consumers:** none (no shared symbol changed).
- **Definition of done:**
  - [x] Finding for `EPD-OQ-1` recorded (confirmed / refuted / unverified, with the query or steps used).
  - [ ] Finding for `EPD-OQ-2` recorded (confirmed / refuted / unverified, with the steps used).
  - [x] If `EPD-OQ-1` is confirmed, a follow-up cleanup-migration spec is filed (or explicitly deferred with a reason) in `EPD-T-6`. (N/A — refuted, no follow-up needed.)

---

### `EPD-T-2` — Client: never let an institution exist in both External Partner buckets [x]

- **Type:** `client` + `tests`
- **Description:** Implement `EPD-DD-1`. Add a single exclusion helper on `RdContributorsAndPartnersService` and use it in `applyTocMappingOnLoad()` (drop from the "other" bucket any `institutions_id` already resolved into the "toc" bucket) and in both selection handlers reachable from `normal-selector.component.ts` (the ToC-bucket picker and the "Other(s)" picker), so picking an institution already present in the sibling bucket is a no-op instead of a second entry.
- **Implements:** `EPD-R-1`, `EPD-R-2`, `EPD-AC-1`, `EPD-AC-2`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.ts`, `.../components/multiple-wps/components/normal-selector/normal-selector.component.ts`
- **Depends on:** —
- **Blocks:** `EPD-T-5`
- **Estimate:** M
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** a fixture GET response with the same `institutions_id` present twice (once `from_toc: true`, once `from_toc: false`) must, after `applyTocMappingOnLoad()`, leave that id in exactly one of `partnersBody.institutions` / `otherPartnersSelected` — finding it in both, or in neither, fails the test.
  - **Red run:** `npx jest --testPathPattern rd-contributors-and-partners.service.spec` (new describe block; fails before the fix — the current code renders the id in both buckets — and passes after).
  - **Disqualifier:** if the exclusion rule would also strip a *legitimately* different institution sharing no `institutions_id` collision, the implementation is wrong — re-check the key used is `institutions_id`, never array index or object reference.
  - **Consumers:** `applyTocMappingOnLoad()` is called from this service's own load flow only (`getSectionInformation`); the two selection handlers are called from `normal-selector.component.ts`'s `(selectOptionEvent)` bindings in both `rd-contributors-and-partners.component.html` and (via `variant="ipsr"`) `ipsr-contributors.component.html:284` — both consumers must be exercised by `EPD-T-5`.
- **Definition of done:**
  - [ ] Code merged via the project commit convention. (staged, not yet committed — pending user go-ahead)
  - [x] Lint clean (`npx ng lint --quiet`).
  - [x] Regression test added and green; client coverage thresholds (50/60/60/60) still met.
  - [x] No i18n string added (no new user-facing copy in this task).

---

### `EPD-T-3` — Server: dedupe incoming institutions before create/reactivate logic [x]

- **Type:** `server` + `tests`
- **Description:** Implement `EPD-DD-2`. Add a private `dedupeIncomingInstitutions(institutions)` on `ResultsByInstitutionsService`, called at the top of `savePartnersInstitutionsByResultV2` before `oldPartners` is computed. Collapses duplicate `institutions_id` entries per the merge rule in `design.md` §5 (prefer the entry with a defined `id`; union `delivery`; prefer `from_toc: true` when any duplicate has it).
- **Implements:** `EPD-R-3`, `EPD-AC-3`
- **Files (expected):** `onecgiar-pr-server/src/api/results/results_by_institutions/results_by_institutions.service.ts`
- **Depends on:** —
- **Blocks:** `EPD-T-4`, `EPD-T-5`
- **Estimate:** M
- **Review:** `full` (shared method, affects every caller of `savePartnersInstitutionsByResultV2` — Innovation Package/IPSR, Knowledge Product additional partners, and every other result type)
- **Falsifier:** an `institutions` array with two entries for the same `institutions_id` — one carrying an existing row's `id` and `delivery: [1]`, the other with no `id` and `delivery: [3]` — must, after `savePartnersInstitutionsByResultV2` runs, leave exactly one active `results_by_institution` row for that `institutions_id`, with `delivery` containing both `1` and `3`. Finding two rows, or a `delivery` missing either value, fails.
- **Red run:** `npx jest --testPathPattern results_by_institutions.service.spec` (new describe block; fails before the fix on the row-count assertion, passes after).
- **Disqualifier:** if the dedupe changes behavior for a payload that has NO duplicates (i.e., it reorders or drops a legitimate single entry), abandon and re-specify the merge rule — it must be a no-op on already-clean input.
- **Consumers:** every caller of `savePartnersInstitutionsByResultV2` (`ContributorsPartnersService.updatePartnersV2`, reached from both W1/W2 and IPSR Contributors & Partners saves, and the Knowledge Product "Additional partners" path via the same method with `isKnowledgeProduct = true`) — all must be covered or explicitly re-verified not to regress in this task's tests.
- **Definition of done:**
  - [ ] Code merged via the project commit convention. (staged, not yet committed — pending user go-ahead)
  - [x] Lint clean (`npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`).
  - [x] Regression test added and green; server coverage thresholds (5/20/35/40) still met.
  - [x] Existing `results_by_institutions.service.spec.ts` suite still green (no regression on non-duplicate payloads, including the Knowledge Product branch).

---

### `EPD-T-4` — Server: translate a DB constraint failure into a plain message [x]

- **Type:** `server` + `tests`
- **Description:** Implement `EPD-DD-3`. In `savePartnersInstitutionsByResultV2`'s `catch (error)` block, detect a `QueryFailedError`-shaped driver error matching a known constraint class (MySQL `errno 1048` NOT NULL, and FK violation errnos), log the raw error server-side, and `throwServiceError` a plain-language message instead of falling through to `returnErrorRes({ error, debug: true })`.
- **Implements:** `EPD-R-4`, `EPD-R-10`, `EPD-AC-4`
- **Files (expected):** `onecgiar-pr-server/src/api/results/results_by_institutions/results_by_institutions.service.ts`
- **Depends on:** `EPD-T-3` (touches the same catch block; sequencing avoids a merge conflict, not a functional dependency)
- **Blocks:** `EPD-T-5`
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** mocking the transaction body to throw an error with `driverError.errno === 1048` must produce a response whose `message` does NOT contain the substring `Column` or `cannot be null`, and whose `status` is `400`; a `Logger.error` call must have fired with the original message.
  - **Red run:** `npx jest --testPathPattern results_by_institutions.service.spec` (new describe block; fails before the fix — the raw message reaches the response — and passes after).
  - **Disqualifier:** if the translation also swallows an unrelated, already-specific error (e.g. `Result Not Found`, `User Not Found`), the allowlist match is too broad — narrow it to the specific error class/code, not a generic `catch`.
  - **Consumers:** none beyond the same method's callers already covered by `EPD-T-3`.
- **Definition of done:**
  - [ ] Code merged via the project commit convention. (staged, not yet committed — pending user go-ahead)
  - [x] Lint clean.
  - [x] Regression test added and green.
  - [x] No secret/token/payload dump added to the new log line (`.cursorrules`).

---

### `EPD-T-5` — End-to-end regression: original repro shape [x]

- **Type:** `tests`
- **Description:** Add one test (client or server integration-style, whichever is cheaper to assemble) that encodes the exact original repro: 6 institutions each present twice (once from the ToC bucket, once from "Other(s)"), loaded then saved — asserting the section renders 6 chips (not 12) and the save succeeds without a constraint error. This is the mandatory Bug Mode regression test tying the fix to the reported symptom, distinct from the narrower unit tests in `EPD-T-2`/`EPD-T-3`/`EPD-T-4`.
- **Implements:** `EPD-AC-5`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.spec.ts` (or a new `.spec.ts` if the existing file is already large) and/or `onecgiar-pr-server/src/api/results/results_by_institutions/results_by_institutions.service.spec.ts`
- **Depends on:** `EPD-T-2`, `EPD-T-3`, `EPD-T-4`
- **Blocks:** —
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** running this test against the pre-fix code (stash `EPD-T-2`/`T-3`/`T-4`'s changes) must fail (12 rendered or a thrown constraint error); running it after must pass.
  - **Red run:** `npx jest --testPathPattern rd-contributors-and-partners.service.spec` and/or `npx jest --testPathPattern results_by_institutions.service.spec`.
  - **Disqualifier:** if this test cannot be made to fail on pre-fix code (e.g., because the fixture doesn't actually reproduce the duplication), it is not a valid regression test — fix the fixture, not the assertion.
  - **Consumers:** none (test-only).
- **Definition of done:**
  - [x] Test added, demonstrably red before the fixes and green after. Attempt 1 covered the load/save paths (client `applyTocMappingOnLoad`, server `savePartnersInstitutionsByResultV2`); Reviewer FAIL flagged missing selection-handler/IPSR consumer coverage. Attempt 2 (PASS) added a describe block in `normal-selector.component.spec.ts` driving both `onPartnerSelect`/`onOtherPartnerSelect` under both the plain and `variant="ipsr"` hosts, using the real `RdContributorsAndPartnersService`. Full red→green proof recorded in `execution.md`.
  - [x] Coverage thresholds still met on both packages (client `rd-contributors-and-partners/` folder excluded from `collectCoverageFrom`; server thresholds unaffected — tests only, no production code changed in this task).

---

### `EPD-T-6` — File cleanup follow-up (conditional on `EPD-T-1`) [x]

- **Type:** `docs`
- **Description:** If `EPD-T-1` confirmed live duplicate `results_by_institution` rows exist (`EPD-OQ-1` = confirmed), open a new `bugfix/<name>` or `changes/<name>` spec for the data-cleanup migration, linking back to this spec. If refuted or unverified, record that explicitly here and close `EPD-OQ-1` as "no cleanup needed" or "deferred, needs DB access" — do not leave it silently unresolved.
- **Implements:** follow-up to `EPD-OQ-1`
- **Files (expected):** a new `docs/specs/<path>/proposal.md` (only if confirmed) — otherwise a one-line update to this file's §7.
- **Depends on:** `EPD-T-1`
- **Blocks:** —
- **Estimate:** S
- **Review:** `skip-eligible`
- **Verification:**
  - **Falsifier:** n/a — this is a filing/closure task.
  - **Red run:** n/a (no test gate).
  - **Disqualifier:** none.
  - **Consumers:** none.
- **Definition of done:**
  - [x] `EPD-OQ-1` has a recorded, non-silent resolution: **refuted** (see `EPD-T-1` finding, 2026-09-28 — 0 duplicate rows for result_id 12125). No cleanup migration spec filed; none needed.

---

## 4. Dependency graph

```
EPD-T-1 (investigation, informational only)
   └── EPD-T-6 (conditional follow-up filing)

EPD-T-2 (client dedup)
   └── EPD-T-5 (end-to-end regression)

EPD-T-3 (server dedup)
   └── EPD-T-4 (server error translation — same file, sequenced)
         └── EPD-T-5 (end-to-end regression)
```

`EPD-T-1` and `EPD-T-2`/`EPD-T-3` are parallel-safe (no shared files, no shared dependency). `EPD-T-4` should follow `EPD-T-3` to avoid a merge conflict in the same catch block, not because of a functional dependency.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `EPD-TEST-1` | unit (client) | `EPD-R-1`, `EPD-R-2`, `EPD-AC-1`, `EPD-AC-2` | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.spec.ts` |
| `EPD-TEST-2` | unit (server) | `EPD-R-3`, `EPD-AC-3` | `onecgiar-pr-server/src/api/results/results_by_institutions/results_by_institutions.service.spec.ts` |
| `EPD-TEST-3` | unit (server) | `EPD-R-4`, `EPD-R-10`, `EPD-AC-4` | `onecgiar-pr-server/src/api/results/results_by_institutions/results_by_institutions.service.spec.ts` |
| `EPD-TEST-4` | unit (client and/or server, end-to-end shape) | `EPD-AC-5` | Per `EPD-T-5`'s Files (expected) |

Server coverage MUST stay above 5/20/35/40; client MUST stay above 50/60/60/60.

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention (`<emoji> <type>(<scope>) [ticket]: <description>`).
- [ ] CI green (lint, tests, build, `migration:check:ci` — no migration expected but the check must still pass).
- [ ] Manual QA on prtest: re-open IPSR result 9657 (or an equivalent test result), confirm no duplication renders and Save succeeds.
- [ ] If `EPD-T-1` confirms W1/W2 also reproduced, manually re-verify there too post-fix.
- [ ] No bilateral/platform-report change log entry needed (not touched).

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and manually verified on prtest.
- [ ] `EPD-T-1` findings recorded here:
  - `EPD-OQ-1` (live duplicate rows for result 9657 or others): **refuted** — `SELECT institutions_id, institution_roles_id, COUNT(*) FROM results_by_institution WHERE result_id = 12125 AND is_active = 1 GROUP BY institutions_id, institution_roles_id HAVING COUNT(*) > 1` (result_id 12125 is the internal id for display code "9657") returned 0 rows on 2026-09-28. No active duplicate rows exist for this result today (likely already manually cleaned up, per `design.md` `EPD-P-5`'s "assumed" status). No cleanup migration needed.
  - `EPD-OQ-2` (W1/W2 parity): _pending investigation_ — not yet manually tested on a non-IPSR W1/W2 result.
- [ ] If a cleanup migration was filed per `EPD-T-6`, link it here.

---

## 8. Roll-back plan

1. Revert the PR(s) implementing `EPD-T-2` through `EPD-T-5`.
2. No migration to revert (none added).
3. No feature flag to disable (none added).
4. N/A — no bilateral/platform-report payload touched.
5. No downstream consumers to notify (internal fix only).

---

## Required cross-references

- `docs/specs/bugfix/external-partners-duplication/requirements.md`, `design.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
