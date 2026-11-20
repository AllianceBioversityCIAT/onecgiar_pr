# Execution — Bilateral evidence: public / private tag per piece of evidence

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/evidence-privacy-tag` |
| Ticket | P2-4110 |
| Approval Mode | ~~gated~~ → **pre-approved** from 2026-11-19 (user: "todo pasa preaprobado … cuando despierte esta tarea ya esté hecha"). Delivery mandate: push to `qa-development-2026-ss`, and also to `performance-refactor` if needed; push the Fetcher (T-11) to that repo's dev branch. Exceptions still stop: HALT, Pivot, budget tripwire, FATAL_FAIL, PRODUCT_BUG, destructive actions |
| Branch | `qa-development-2026-ss` (base `cfc18d03e`) |
| Leader | Claude Code session, `opus` (T1) |
| Implementer / Reviewer | `akili-implementer` wrapper (T2) / `akili-reviewer` wrapper (T3) |
| Budget (design §11) | 11 tasks · ~780 LOC · ~15 review rounds |
| Started | 2026-11-19 |

## Pre-flight (2026-11-19)

- In-flight spec check (`grep -rln "section-evidence\|result-review-drawer\|evidence.entity" docs/specs --include=tasks.md`): hits outside `archive/` are `bilateral/review-toc-only-editing` (not-started), `bugfix/bilateral-geography-extra-metadata` (not-started), `bugfix/innovation-developer-prefill-stale-lead-contact` (done), `bugfix/p2-3382-bilateral-long-term-degree` (not-started), `bugfix/p2-3542-section-bar-toc-tabs` (in-progress, only a D9 browser walk on TEST outstanding, no code), `bugfix/toc-target-row-duplication` (not-started). None is touching these files now.
- `akili doctor --agents`: `leader.md` → `primary-instructions` OUTDATED (matched 2.36.0). Implementer/Reviewer personas current. Not fixed here: `.agents/` is a shared file, which spec branches don't touch. Pending item: run `akili doctor --agents --fix` on `staging`.
- Local environment pre-check: `node -v` → v26.13.1 (contract says 20.x). No `onecgiar-pr-server/.env`; `docker info` fails (daemon off); no `mysql` client. **No database is reachable locally.**

## Execute-time spec edits

| Date | File · section | Change | Reason / approval |
|---|---|---|---|
| 2026-11-19 | `tasks.md` EVP-T-1 · Verification | Added an "Execute-time amendment": `migration:check` doesn't detect entity drift. T-1 closes on the QA-catalog red→green, `tsc` and a static up/down review. Real-DB up/down/up, the P-17 row count and `migration:check:ci` become an open gap (CI / validate HITL) | The premise was probed (`scripts/check-pending-migrations.ts:66-80` compares files against the migrations table) and no DB is reachable. User picked "Proceed, mark DB gates gap" at the Leader's question. The requirement meaning (NFR Data) is unchanged |

## Task Execution History

### EVP-T-2 — Pure visibility resolver · PASS (attempt 1) · 2026-11-20

- **Attempts:** 1. Implementer `akili-implementer` (T2, effort medium); Reviewer `akili-reviewer` (T3, effort high, lens checklist). It ran in parallel with EVP-T-1, with disjoint files.
- **Files changed:** `onecgiar-pr-server/src/api/results/evidences/utils/evidence-visibility.ts` (new), `evidence-visibility.spec.ts` (new).
- **Implementer verification:**
  - `npx jest src/api/results/evidences/utils/evidence-visibility.spec.ts` → `Tests: 11 passed, 11 total`.
  - Reds, quoted from the report:
    - Import red: `error TS2307: Cannot find module './evidence-visibility'`.
    - Stub `{visibility:'public', exposed:null}`: `Tests: 9 failed, 2 passed, 11 total`, for example `● link, is_public = 0 -> private, exposed false  - "exposed": false, - "visibility": "private", + "exposed": null, + "visibility": "public"`.
    - Mutation "treat NULL as private": `Tests: 2 failed, 9 passed` (`● link, is_public NULL (untagged) -> public, exposed null`, `● treats undefined is_public on a link as untagged`).
    - Mutation "files follow is_public": `Tests: 4 failed, 7 passed` (including `● file ignores is_public: is_public = 1 with is_public_file = 0 -> private`).
    - Both mutations were reverted; 11/11 after the revert.
  - `tsc`: 2 TS2345 errors in `innovation-pathway-step-four.service.spec.ts`. They come from EVP-T-1's entity change, not from this task's files (routed to T-1).
- **Evidence re-run (Leader inline):** `npx jest src/api/results/evidences/utils/evidence-visibility.spec.ts src/api/qa-catalog/qa-catalog.completeness.spec.ts --silent --reporters=summary` → `Tests: 41 passed, 41 total` (11 + 30) → **VERIFIED**.
- **Reviewer:** `STATUS: PASS`. All six §3.1 rows plus the two "file ignores is_public" rows are asserted. The function is pure and meets EVP-DD-2 and EVP-R-1. The task has a `Review: checklist` field and meets Review intensity, but the Leader spawned a Reviewer anyway under override (b)/(g), because the task creates a new exported symbol that T-5/T-6/T-7 consume.
- **ADVISORY (4R, not gating):**
  - RELIABILITY: a NULL/undefined `is_sharepoint` is treated as a link, but no test pins it. Suggested case: `{is_sharepoint:null,is_public:0}` → private.
  - READABILITY: `toFlag` uses `Boolean(Number(v))`, so a string `'true'` → false. Only 0/1/boolean are expected.
- **Not Done / Assumptions (verbatim, summarised):** "The tsc failure comes from the `Evidence` entity now declaring `is_public` as a required, non-optional property … most likely from the EVP-T-1 entity change." "Judgment call: `is_sharepoint` NULL/undefined treated as a link." No owed item for T-2 → not a continuation. The tsc item is carried to EVP-T-1.
- **spawns:** implementer 37 calls, ~150.6k tokens, ended complete; reviewer 7 calls, ~74.7k tokens, ended complete.
- **Requirements covered:** EVP-R-1 (derivation rule), EVP-DD-2.
- **Running totals vs budget:** tasks 1/11 · LOC ~140 / ~780 · review rounds 1 / ~15.
- **Gate:** auto-approved (pre-approved mode).
