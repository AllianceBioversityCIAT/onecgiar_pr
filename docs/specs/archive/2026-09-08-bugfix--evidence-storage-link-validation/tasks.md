# Module Spec — `tasks.md`

> Depth: **Lite** (Bug Mode). Linked: `requirements.md`, `design.md` (same folder).

---

## 1. Scope of this task list

- **Module / feature:** `results-validation-module` — Evidence-section file-storage link rejection
- **Linked spec:** `docs/specs/bugfix/evidence-storage-link-validation/requirements.md` + `design.md`
- **Owner / driver:** AKILI Execute (assigns Implementer)
- **Status:** shipped (client-only) — `EVL-T-1`/`EVL-T-2` reverted 2026-09-07, `EVL-T-3` is the sole deliverable. See `execution.md` "Scope Reduction".

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved (user selected Continue after Phase 1 review).
- [x] `design.md` approved (user selected Continue after Phase 2 review).
- [x] No open questions in `requirements.md` (none logged) or `design.md` (`EVL-DD-1`'s literal date is a task done-criterion, not an open question).
- [x] No CLARISA dependency (none — confirmed in `requirements.md` §9).
- [x] No conflicting in-flight spec (no other spec under `docs/specs/` touches `results-validation-module/`).
- [x] No migration involved — `migration:check` is a no-op for this change.

---

## 3. Task list

> **[REVERTED] Scope reduction, 2026-09-07 — see `execution.md` "Scope Reduction: `EVL-T-1`/`EVL-T-2` reverted".** Both tasks below were completed, reviewed (PASS), and passing tests — then explicitly reverted by the user: `evidenceValidation()` (what they patch) is only reachable via the v1 API route, which the client calls exclusively for **non-P25** results. The user's actual scope was always P25 only, and P25 traffic never reaches this code regardless of what it does — so the user ordered it removed rather than left in place doing nothing. The code changes were `git checkout`'d / deleted; not committed at any point, so nothing to revert in history. **This is not "not started" `[ ]`** — treat as closed-and-declined, not as remaining work. `EVL-T-3` (below) is the spec's sole surviving task.

### [REVERTED] `EVL-T-1` — Add red regression tests for the file-storage evidence-link bug

- **Type:** `tests`
- **Description:** In `results-validation-module.repository.spec.ts`, add test cases against the evidence-section validity computation (the code path around the current `_regex`/`multiplePerField` logic at `results-validation-module.repository.ts:861-867`) that encode the ticket's exact reproduction and the requirement's four acceptance criteria. Written against **current (unfixed) code**, so the SharePoint-link cases fail (red) until `EVL-T-2` lands.
- **Implements:** `EVL-R-1`, `EVL-AC-1`, `EVL-AC-2`, `EVL-AC-3`, `EVL-AC-4`
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-validation-module/results-validation-module.repository.spec.ts`
- **Depends on:** —
- **Blocks:** `EVL-T-2`
- **Estimate:** `S`
- **Skills:** `nestjs-expert`, `tdd`, `systematic-debugging` (already used to confirm the root cause in `proposal.md` — this task encodes that reproduction as tests)
- **Test cases to add (map to ACs):**
  1. Evidence with only a SharePoint link (`https://cgiar.sharepoint.com/...`), `last_updated_date` = today → section validity currently `1` (bug); test asserts it SHOULD be `0` — **fails on current code** (`EVL-AC-1`).
  2. Same fixture feeding the submission-gate read path → currently allows submission; test asserts it should not (`EVL-AC-2`).
  3. Evidence with only a plain public link (e.g. `https://example.org/report.pdf`) → asserts section validity `1`, unchanged (`EVL-AC-3`, must stay green before and after `EVL-T-2` — this is the regression guard).
  4. Evidence with only a SharePoint link but `last_updated_date` set before the (not-yet-defined) effective-date constant → asserts section validity `1` (`EVL-AC-4`) — write this case to import the constant name `EVIDENCE_LINK_RULE_EFFECTIVE_DATE` that `EVL-T-2` will introduce; it will fail to compile/import until `EVL-T-2` lands, which is expected and acceptable for a red-first task in Bug Mode (note this in the PR/commit so CI failure on this task's own commit is understood, not alarming).
  5. Parameterized/additional cases for OneDrive, Google Drive, Dropbox hosts, reusing case 1's shape (`EVL-R-1`'s full host set).
- **Definition of done:**
  - [x] Test file compiles except for the intentionally-forward-referenced import in case 4 (documented in the file header comment).
  - [x] Cases 1, 2, and 5 fail against current `main`/base code (captured in `execution.md` as the "red" evidence — `npx jest results-validation-module.repository.spec.ts --silent` output showing the failures).
  - [x] Case 3 already passes (baseline, no regression yet to guard).
  - [x] Lint clean.
  - [x] No secret or token leaked in test fixtures.

### [REVERTED] `EVL-T-2` — Implement the file-storage host denylist with grandfather cutoff

- **Type:** `server`
- **Description:** In `results-validation-module.repository.ts`, add the `EVIDENCE_LINK_RULE_EFFECTIVE_DATE` constant and a private `_isAcceptableEvidenceLink(evidence: Evidence): boolean` helper per `design.md` §5 and `EVL-DD-1`, and use it in place of the inline `this._regex.test(e.link.trim())` predicate at line 866. **Before merging, replace the placeholder default date in `EVIDENCE_LINK_RULE_EFFECTIVE_DATE` with the actual planned rollout date** — this is part of this task's done criteria, not a follow-up.
- **Implements:** `EVL-R-1`, `EVL-R-2`, `EVL-R-3`, `EVL-R-10`, `EVL-AC-1`, `EVL-AC-2`, `EVL-AC-3`, `EVL-AC-4`
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-validation-module/results-validation-module.repository.ts`
- **Depends on:** `EVL-T-1`
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `nestjs-expert`
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`<emoji> <type>(<scope>) [ticket]: <description>`, scope `results-validation-module`, ticket `P2-3345`) — **open, not merged yet**.
  - [ ] `EVIDENCE_LINK_RULE_EFFECTIVE_DATE`'s literal default date is the actual planned rollout date, not a placeholder (`EVL-DD-1`) — **open human-gate item**: currently set to today's date (2026-09-07) at implementation time; must be confirmed/updated to the real rollout date before merge (see `execution.md` `EVL-T-2` entry).
  - [x] All `EVL-T-1` test cases pass (1, 2, 3, 4, 5 all green) — this is the "green after" half of the regression proof.
  - [x] Lint + format clean.
  - [x] Coverage thresholds still met (server 5/20/35/40 minimum) — no new uncovered branches introduced.
  - [x] No migration needed (confirmed — no schema change).
  - [x] No secret or token leaked in logs or messages.
  - [x] Swagger/DTOs: not applicable (no API surface change).
  - [x] Bilateral/platform-report: not applicable.

---

### [x] `EVL-T-3` — Client-side: block "Add evidence" for a file-storage link in the modal

*(Added by Pivot, 2026-09-07 — see `execution.md` "Pivot Record: EVL-T-2 post-QA". Discovered via manual QA on `EVL-T-2`: the user's real requirement was that a SharePoint/OneDrive/Drive/Dropbox link should never be addable in the first place, not only that the section's overall validity computation should discount it.)*

- **Type:** `client`
- **Description:** In `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts`, promote the file-storage denylist regex currently local to `validateButtonDisabled` (lines 475-476) to a `private readonly` class field, and use it inside the `draftValid` getter (lines 417-423) so the Add/Edit New Evidence modal's "Add evidence"/"Save changes" button is disabled whenever the entered "Link" source link matches the denylist. See `design.md` §6 for the exact before/after.
- **Implements:** `EVL-R-11`, `EVL-AC-5`, `EVL-AC-6`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts`
- **Depends on:** `EVL-T-2` (server-side fix already landed; this is an independent, additive client gate — no runtime dependency, but sequenced after so the client and server rules are demonstrably consistent)
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Test cases to add:**
  1. `draftValid` returns `false` for a SharePoint link (`EVL-AC-5`).
  2. `draftValid` returns `false` for OneDrive (`onedrive.live.com`, `1drv.ms`), Google Drive (`drive.google.com`, `docs.google.com`), and Dropbox links — full host-set parity with `EVL-R-1`/`EVL-R-11`.
  3. `draftValid` returns `true` for a plain public link (`EVL-AC-6`, regression guard — must already pass, must stay green).
  4. `draftValid` returns `true` for a file-source draft (`is_sharepoint: true`) with a file attached, regardless of the regex (upload path is unaffected — unchanged behavior).
  5. `draftValid` returns `false` when the link field is empty (unchanged behavior, regression guard).
- **Definition of done:**
  - [x] `draftValid` rejects all four denylisted host families; `EVL-AC-5`/`EVL-AC-6` covered by new/updated Jest cases in `rd-evidences.component.spec.ts`.
  - [x] `validateButtonDisabled` refactored to reference the new shared `private readonly` field instead of a locally-declared regex — no duplicate regex literal left in the file.
  - [x] No change to `validateButtonDisabled`'s existing behavior (still gates the whole-section save the same way it did before this task) — confirmed by Reviewer, 4 pre-existing cases pass unchanged.
  - [x] Lint clean (`ng lint`).
  - [x] Client coverage thresholds still met (50/60/60/60) — 86/86 tests passing, no coverage-excluded paths touched.
  - [x] No new HTTP call, no new denylist definition (reuses the existing regex, per `requirements.md` §3) — confirmed by Reviewer grep (exactly 2 occurrences in the folder: the new shared field + the pre-existing, already-tracked copy in `evidence-item.component.ts:109`).
  - [x] Manual smoke: paste a `cgiar.sharepoint.com` link in "Add New Evidence" → "Add evidence" button is visibly grayed out; replace with a plain link → button re-enables. **Confirmed by the user in the live browser, 2026-09-07** (result #9075, same repro as the original QA finding).

---

## 4. Dependency graph

```
EVL-T-1 (red regression tests)
   └── EVL-T-2 (fix: denylist + grandfather cutoff — turns EVL-T-1 green)
EVL-T-3 (client: block Add-evidence modal button for a denylisted link — independent, added by Pivot)
```

`EVL-T-1`/`EVL-T-2` are a single localized server-side change; the test task landed first to prove the bug (Bug Mode requirement). `EVL-T-3` is a separate, additive client-side task with no code dependency on `EVL-T-1`/`EVL-T-2` — it is sequenced after them only because it was discovered during QA of the server fix.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `EVL-TEST-1` | unit (server) | `EVL-R-1`, `EVL-AC-1` — SharePoint link rejected post-cutoff | `onecgiar-pr-server/src/api/results/results-validation-module/results-validation-module.repository.spec.ts` |
| `EVL-TEST-2` | unit (server) | `EVL-R-3`, `EVL-AC-2` — submission gate agrees | same file |
| `EVL-TEST-3` | unit (server) | `EVL-AC-3` — plain link unaffected (no regression) | same file |
| `EVL-TEST-4` | unit (server) | `EVL-R-2`, `EVL-AC-4` — pre-cutoff evidence grandfathered | same file |
| `EVL-TEST-5` | unit (server) | `EVL-R-1` — full host denylist (OneDrive, Google Drive, Dropbox) | same file |
| `EVL-TEST-6` *(Pivot)* | unit (client, Jest) | `EVL-R-11`, `EVL-AC-5` — modal Add button disabled for denylisted link | `onecgiar-pr-client/.../rd-evidences/rd-evidences.component.spec.ts` |
| `EVL-TEST-7` *(Pivot)* | unit (client, Jest) | `EVL-AC-6` — modal Add button stays enabled for a plain link (regression guard) | same file |

Server coverage MUST stay above branches 5% / functions 20% / lines 35% / statements 40% (project-wide, already met — this change only adds cases to an existing spec file). Client coverage MUST stay above branches 50% / functions 60% / lines 60% / statements 60% (`EVL-T-3`).

---

## 6. Rollout & verification

*(Corrected 2026-09-07 after the scope reduction — the original bullet below claimed the green check itself would flip red, which was true only for `EVL-T-1`/`EVL-T-2`, now reverted. See `execution.md` "Scope Reduction".)*

- [ ] PR opened with commit convention, ticket `P2-3345`.
- [ ] CI green (lint, tests, build, `migration:check:ci` — no-op here, SonarCloud).
- [x] Manual QA on staging *(done by the user directly against their local dev environment, not staging — accepted as equivalent)*: reproduce the exact Jira repro (portfolio P25, phase Reporting 2026, Editing result, add a `cgiar.sharepoint.com` evidence link in the Add New Evidence modal) and confirm the **"Add evidence" button is disabled and the link cannot be added**. The Evidence-section green check itself is explicitly **unaffected** by this spec — already-saved evidence, any host, any phase, keeps computing exactly as before (`EVL-T-1`/`EVL-T-2` reverted; `validation_evidences_P25` intentionally untouched).
- [ ] Not applicable: bilateral/platform-report notification, admin/role/phase runbook update.
- [ ] No new telemetry to verify post-deploy (no new logging added).

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified on staging.
- [ ] File a follow-up (non-blocking) for the shared client/server denylist constant noted in `proposal.md` §12 and `design.md` §13, to prevent future host-list drift between the two.
- [ ] No `docs/prd.md` Open Question resolved by this spec.

---

## 8. Roll-back plan

*(Corrected 2026-09-07 — `EVL-T-1`/`EVL-T-2` no longer exist to roll back; only `EVL-T-3` ships.)*

1. Revert the PR for `EVL-T-3` (single client-side commit, `rd-evidences.component.ts` + its spec).
2. No migration to run `migration:revert` against — none exists, none was ever created.
3. No feature flag to disable — the modal gate is unconditional.
4. Not applicable: bilateral/platform-report payload shape (untouched).
5. No downstream consumers to notify (client-only UI gate).

---

## Required cross-references

- `docs/specs/bugfix/evidence-storage-link-validation/requirements.md`, `design.md` (same folder).
- `docs/prd.md` (`AC-1`, `AC-6`), `docs/trd/trd.md` (`api/results/results-validation-module`, `W2`).
- `docs/specs/bugfix/evidence-storage-link-validation/proposal.md`.
