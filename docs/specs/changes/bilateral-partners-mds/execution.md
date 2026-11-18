# Execution — Bilateral External partners back in the MDS

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-partners-mds` |
| Started | 2026-11-18 |
| Branch | `qa-development-2026-ss` (onecgiar_pr) · `fix/bilateral-pdf-non-kp-partners` (alliance-ibd-pdf-viewer) |
| Base | `548d9bf29` (onecgiar_pr) · `b5e092d` (pdf-viewer) |
| Approval Mode | `gated` → **`pre-approved`** from 2026-11-18 (user, in session: "si pre-approved"). Exceptions (HALT, Pivot, budget tripwire, FATAL_FAIL) still stop |
| Leader | Opus 5.5 (T1) · Implementer `akili-implementer` (sonnet, T2) · Reviewer `akili-reviewer` (opus, T3) |
| Persona drift | `akili doctor --agents`: `leader.md` primary-instructions OUTDATED (2.36.0); implementer/reviewer current. Not fixed here (not the apply-capable branch) — pending for `staging` |

### Session decisions

- User time box: ~20 min for the onecgiar_pr work (2026-11-18). Response: T-1, T-2, T-3 run in one wave of 3 (disjoint packages/repos); Reviewer gates kept.
- User: the PDF change (T-3) may take its time; the prtest manual check of T-2 is done by the user, quickly.
- User asked whether the green-check validator must change. Leader answer: no — `validation_contributor_partner_P25` already returns FALSE on `count_institutions <= 0 AND no_applicable_partner = FALSE` (`src/migrations/1762866499786-updatepartnersContributors.ts:149`), and the bilateral submit gate is the client tracker + `assertSubmittable` (DD-4). Live function body not checked (`SHOW CREATE FUNCTION` on prtest suggested to the user).

## Task Execution History

### BPX-T-3 — PDF: print non-KP partners in the MDS-only bilateral PDF — PASS

- **Date:** 2026-11-18
- **Attempts:** 1
- **Attempt 1**
  - files changed: `alliance-ibd-pdf-viewer/app/templates/reportingtool/results_bilaterals_p25/components/common-sections.tsx` (+8/−5); commit `74fe0ed` on `fix/bilateral-pdf-non-kp-partners` (not pushed, no PR — user: no rush)
  - Implementer verification: fixture `docs/specs/changes/bilateral-pdf-mds-only/fixtures/bil-policy.json` rendered via a local `next build` + curl (`r.sh`, a one-fixture variant of `render.sh`, no masking). Before: `grep -c '>Partners<'` = 0. After: 1, rows `NONKP-PARTNER-ALPHA` (India, NGO Local) and `NONKP-PARTNER-BETA` (Kenya, Research organizations). Render diff: one new `<div>` (Partners subtitle + table) plus build-id/RSC noise. `npx tsc --noEmit` clean
  - Red run: n/a (no test gate); before-render grep quoted above
  - Evidence re-run (Leader inline): **VERIFIED** — `grep -c '>Partners<'` before 0 / after 1; both partner names present; `git diff b5e092d 74fe0ed --stat` = 1 file, 8+/5−; `npx tsc --noEmit` clean
  - Reviewer: **PASS** — matches BPX-R-8 and P-12; combined list feeds `hasPartners`, `hasAnything` and the table; no other removed block returns; header cites this spec
  - runtime events: none
- **spawns:** implementer 12 calls, 74036 tokens, ended complete; reviewer not reported by host, ended complete
- **Advisory / coverage note (Reviewer):** the fixture has no `kp_partner_data`, so KP-only and mixed lists are not rendered; same code path, not required by BPX-R-8
- **Issues:** Implementer's first `taskkill //IM node.exe` was denied by the auto-mode classifier; it then stopped only its own server by PID. Port 3000 free
- **Requirements covered:** BPX-R-8
- **Artefacts:** `C:\Users\User\AppData\Local\Temp\claude\4ef056d2158051e4\de40b2c4-d80d-4d4a-ab19-114fd770be5e\scratchpad\bpx-t3\` (before.html, after.html, r.sh)
- **Running totals:** tasks 1/4 · LOC ~13 / ~380 · review rounds 1/5
- **Pending (DoD):** PR in `alliance-ibd-pdf-viewer` — open when the user asks
- **Continue gate:** auto-approved (pre-approved mode)

### BPX-T-1 — Server: partner-answer check in `assertSubmittable` — PASS

- **Date:** 2026-11-18
- **Attempts:** 1 (with 1 checkpoint)
- **checkpoints:** 1 (Leader time stop at ~40 min — the user asked for a fast run; full-suite runs were stalling under CPU contention). Not respawned: the code was complete, and the only open items were gate re-runs, which the Leader ran as the evidence re-run
- **Attempt 1**
  - files changed: `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts` (+26), `bilateral-center.service.spec.ts` (+119)
  - Implementation: the check sits in `assertSubmittable`, after owner/primary-SP and before `assertPersistedMds`. KP results skip it. It passes when `no_applicable_partner === true`, else when `resultByIntitutionsRepository.count({ result_id, is_active: true, institution_roles_id: In([PARTNER, KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS]) })` > 0. Otherwise it throws `BadRequestException` with the design §5 text. No DI change. The only change to existing fixtures is the default `count: jest.fn().mockResolvedValue(1)`
  - Red run (`npx jest src/api/bilateral/services/bilateral-center.service.spec.ts -t "partner answer"`), 3/7 red before the change:
    ```
    × refuses with 400 naming External partners when there is no answer, and writes no history
      Received promise resolved instead of rejected
      Resolved to value: {"message": "Result submitted for review successfully", "response": {"resultId": 77, "status": 5}}
    × refuses when the only partner rows are inactive — Received promise resolved instead of rejected
    × fires before the Innovation Use MDS validator — Received promise resolved instead of rejected
    ```
  - Mutations, each reverted after the run:
    - (a) KP skip → `if (true)`: `× skips the check for a Knowledge Product with nothing (BPX-R-4)`
    - (b) `is_active: true` dropped: `× refuses when the only partner rows are inactive` (role-2/role-8 cases also red)
    - (c) `In([PARTNER])` only: `× passes with one active role-8 (KP additional contributor) row`. The first attempt did not apply because of a CRLF regex mismatch; it was re-run and applied
  - Implementer gates: `npx tsc --noEmit -p tsconfig.json` exit 0. eslint initially gave 8 prettier errors in the new block; fixed with `prettier --write`
  - Evidence re-run (Leader inline): **VERIFIED**
    - scoped eslint on the 2 files: `ESLINT_OK`
    - full spec file `npx jest src/api/bilateral/services/bilateral-center.service.spec.ts`: `Tests: 253 passed, 253 total`. This covers the existing 19 `assertSubmittable` consumers, with no assertion changed (disqualifier not triggered)
    - full server suite: see the *Full-suite gates* line below
  - Reviewer: **PASS**. Order, KP skip, predicate and message match §5/DD-4. No write happens before the throw. BPX-R-10 holds (`bilateral.service.ts` and `create-bilateral.dto.ts` untouched). Each mutation was traced to a real kill
  - runtime events: none
- **spawns:**
  - implementer: 71 calls, 168969 tokens, ended checkpoint
  - reviewer: 9 calls, 79190 tokens, ended complete
- **ADVISORY (Reviewer, not gating):**
  - the flag test does not assert `count` is not called
  - the role mocks read TypeORM's internal `FindOperator._value`
  - risk: existing Editing/Draft/Rejected non-KP results with no partner answer will be refused at submit, as intended by §11. Support should know before release
- **Requirements covered:** BPX-R-5, BPX-R-4 (server), BPX-R-10
- **Issues:** the orphaned full-suite jest processes from the stopped Implementers were left running (~19 `node`). The Leader's `Stop-Process` was denied by the auto-mode classifier, and the user killed them (`taskkill //F //IM node.exe`)

### BPX-T-2 — Client: partners block in Block 1, required for editable non-KP — PASS

- **Date:** 2026-11-18
- **Attempts:** 1 (with 1 checkpoint)
- **checkpoints:** 1 (Leader time stop, same cause as T-1). Not respawned: the code was complete and only the full jest and lint runs were open
- **Attempt 1**
  - files changed (`section-contributors/`):
    - `section-contributors.component.ts` (91 lines)
    - `.html` (201)
    - `.component.spec.ts` (195)
    - `.readonly.spec.ts` (106)
  - Implementation:
    - `isPartnerRequired = !readOnly() && !isKnowledgeProduct?.()`
    - `external-partners` item published (`filled: partnersHydrated() && externalPartnersSatisfied()`) only when required
    - the `republishPartnersScope` effect (`untracked` publish)
    - `hiddenFieldsWithValues` counts the linked question only
    - `showFullMetadata` replaced by `hasFullMetadataFields`; the container is `@if (hasFullMetadataFields() && showAllFields())`
    - the block moved into Block 1, with `[required]` and the red hint
    - comments cite this spec
  - Red run (`npx jest src/app/pages/bilateral/components/section-contributors --no-coverage`), before the change:
    ```
    ● … external-partners tracker item (BPX-R-2/R-3/R-4) › publishes external-partners for an editable non-KP result
      expect(received).toEqual(expected) // deep equality
      Expected: {"filled": false, "key": "external-partners", "label": "External partners"}
      Received: undefined
    ```
    The static template read was also red (container guard not found, `received -1`), and so were the readonly picker cases ("External partners" picker is not rendered at all)
  - Mutations, each reverted after the run:
    - (a) drop `!readOnly()`: 3 red, incl. "publishes no external-partners for a read-only result (BPX-R-3, #9503)" and "re-publishes when readOnly flips after load"
    - (b) `filled` without `partnersHydrated()`: 3 red, incl. "is filled only when hydrated AND answered" (`Expected: false Received: true`)
    - (c) remove the effect: 2 red, incl. "re-publishes when readOnly flips after load (DD-2 effect)" (`Received: undefined`)
  - Static read: the test "renders the partner block once, in Block 1, before the MDS banner and outside the Full metadata container" passes
  - Implementer gates: `npx ng build` exit 0 (only pre-existing NG8113/NG8112/sass warnings, none in this folder)
  - Evidence re-run (Leader inline): **VERIFIED**
    - folder suite: `Tests: 252 passed, 252 total`
    - `npx eslint <folder>` could not run because the package has no flat config; `ng lint` is the gate, see *Full-suite gates*
  - Reviewer: **PASS**. R-1..R-4, R-6, R-7, R-9 (comments) and DD-1..DD-3 met. Rail and tracker service untouched (disqualifier not triggered). Mutation (b) traced through `onPartnersModelChange` → `updateContributorsMds`. Layout still needs the manual prtest check
  - runtime events: none
- **spawns:**
  - implementer: 55 calls, 229176 tokens, ended checkpoint
  - reviewer: 10 calls, 122204 tokens, ended complete
- **ADVISORY (Reviewer, not gating):**
  - hard-coded `border-[#ECEFF1]` copied into the new `@else` banner (old debt)
  - curly vs straight quotes in the hint text
  - the hint is not linked by `aria-describedby`
  - `isKnowledgeProduct?.()` optional call: a host without it silently makes KP results required
  - the folder `section-contributors/CLAUDE.md` still states the P2-3821 rule. The client `CLAUDE.md` §10 expects the folder doc updated in the same commit. It is not in the task file list, so it is pending the user's decision
- **Assumptions (Implementer):** `showFullMetadata` removed as a duplicate of `showAllFields`; `hasFullMetadataFields` tested false for types 2 and 7, true for 1, 6 and an unknown type
- **Requirements covered:** BPX-R-1, R-2, R-3, R-4 (client), R-6, R-7, R-9 (code comments)
- **Pending (DoD):** the manual prtest check (user)
- **Follow-up (BPX-R-9 code-comment half, found by the T-4 sweep):** three stale P2-3821 comments were rewritten. Comment lines only, by a separate Implementer spawn (127581 tokens, 15 calls, ended complete):
  - `section-contributors.component.spec.ts` ~L1411 ("no longer tracked at all")
  - `section-contributors.readonly.spec.ts` ~L171 and ~L223 ("moved into Full metadata")

### BPX-T-4 — Docs: record the supersession — PASS

- **Date:** 2026-11-18
- **Attempts:** 2
- **Review intensity:** `skip-eligible` claimed, **not earned**:
  - the falsifier was run only post-change (no red observed);
  - the DoD sweep is a judgment ("updated or knowingly kept").
  - A Reviewer ran.
- **Attempt 1**
  - files changed:
    - `docs/specs/bilateral/contributors-partners-optional/requirements.md` (notes under BIL-R-1/2/4)
    - `.../proposal.md:65` (the P2-3368 AC5 row; no separate P2-3368 spec exists)
    - `docs/specs/changes/bilateral-pdf-mds-only/requirements.md:45`
  - Implementer verification:
    - falsifier grep: each of BIL-R-1/2/4 carries a note
    - P2-3821 sweep table returned; it flagged `section-contributors/CLAUDE.md` and 3 stale spec comments
  - Leader read of the diff: **MISMATCH** (implicit FAIL):
    - BIL-R-4 cited BPX-R-2/R-5 instead of R-7;
    - BIL-R-2 cited R-1/R-4 instead of R-2/R-4/R-5;
    - the PDF row note said the field "stays in the form" instead of describing BPX-R-8;
    - the proposal row ran on without a separator
- **Attempt 2** (same spawn as the T-2 comment follow-up)
  - files changed: same 3 `.md` files
  - Reviewer: **PASS**. Every note cites the correct BPX requirement, all four attempt-1 findings are fixed, the falsifier is not triggered, and no superseded text was rewritten
- **runtime events:** none
- **spawns:**
  - implementer (attempt 1): 9 calls, 77637 tokens, ended complete
  - implementer (attempt 2): shared with the T-2 follow-up above
  - reviewer: 5 calls, 32754 tokens, ended complete
- **Leader narrowing:** the `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` §4 edit was not made, per the task's own Disqualifier (module guide edits only on the apply-capable branch `staging`). It is recorded below as pending
- **Requirements covered:** BPX-R-9
- **Running totals:**
  - tasks: 4/4 code-complete
  - LOC: ~690 (+server 145, client ~593 incl. tests, PDF 13, docs ~8), against a budget of ~380
  - review rounds: 5/5
- **Budget tripwire:** LOC over budget (~1.8×). The main cause is the T-2 spec rewrites (~300 test lines) and the moved HTML block, which counts as both removal and addition. Reported to the user at the closing gate. **User accepted the overrun** (2026-11-18, "Si acepto")
- **Full-suite gates:**
  - client full jest, run 1: `Tests: 91 failed, 15261 passed` across 5 failed suites, one of them `quality-assurance.component.spec.ts`; the other four were not captured
  - run 2 (JSON): killed by Claude Code for low system memory
  - run 3 (`--maxWorkers=3 --json`, user asked the Leader to run it): `92 failed, 15260 passed`, 6 suites. **None in `section-contributors` or files this spec touched**:
    - `bilateral-overview.aggregate.spec.ts`: 1 failure, the "< 100ms" performance timing
    - `general-interceptor.service.spec.ts`: 4
    - `dashboard-lab.kpi-status-chip.spec.ts`: 4
    - `impact-level-info.component.spec.ts`: 1
    - `shell-topbar.component.spec.ts`: 82
    - `quality-assurance.component.spec.ts`: suite failed to run
  - These are judged unrelated to this spec, but not proven pre-existing (no baseline run at `548d9bf29`)
  - the folder suite after the comment follow-up: `252 passed, 252 total`
  - server full suite and `ng lint`: not yet run

### BPX-T-2 follow-up — folder guide `section-contributors/CLAUDE.md` — PASS

- **Date:** 2026-11-18
- **Approved by the user:** "Sí, en este commit". It was outside the task file list; the client `CLAUDE.md` §10 rule says folder docs are updated in the same commit
- **Attempts:** 2
- **Attempt 1** (148159 tokens, 21 calls, ended complete):
  - rewrote the partners sections (Verified stamp, Qué es, the Contrato tracker bullet, the hydration invariant, the BPX trap, `hasFullMetadataFields`, tests marked as history)
  - Reviewer: **FAIL**, two false current-rule statements:
    1. L47-50: "el servidor nunca pidió más (`submitForReview`: centro líder + Science Program)". False since BPX-T-1/BPX-R-5
    2. L260-263: the checkbox was described with hard-coded `[isStatic]="true"` (línea 168). The working tree has `[isStatic]="!readOnly()"` at html ~L309
- **Attempt 2** (150319 tokens, 10 calls, ended complete):
  - both sentences rewritten against the working tree
  - sweep `línea|isStatic|nunca pidió|submitForReview`: every hit is true or historical
  - Reviewer: **PASS**. Both fixes verified, and every other partners statement matches the ts/html line by line
- **Effort:** low → medium on the retry
- **ADVISORY:**
  - the guide is 357 lines, against a 120-line cap (it was already over before this change)
  - the test counts (157 / 45) were not recounted

## Pending items

- **Shared file (apply on `staging`):** `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` §4. Proposed line: "Partners gate (`changes/bilateral-partners-mds`, 2026-11-18, mandatory per Angel Jarrin): a non-KP result cannot be submitted without at least one active partner row or the 'no external partners' tick; the check sits in `assertSubmittable` (`bilateral-center.service.ts`); KP stays optional (BPX-R-4); `POST /api/bilateral/create` still accepts payloads without `contributing_partners` (BPX-R-10)."
- **User decision:** the folder guide `section-contributors/CLAUDE.md` still states the P2-3821 rule (lines ~11, 34, 45, 153, 183, 193)
- **`leader.md` persona drift:** run `akili doctor --agents --fix` on `staging`
- **HITL:**
  - manual prtest check (T-2 DoD)
  - inspect the PDF renders and open the `alliance-ibd-pdf-viewer` PR (T-3)
- **Full suites:** see the *Full-suite gates* line below
