# Execution Log — AI draft evidence promotion

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/ai-draft-evidence-promotion/` |
| Command | `/akili-execute` |
| Leader model | T1 Architect — `opus` (Opus 5, 1M context) |
| Implementer model | T2 Coder — per `.claude/agents/akili-implementer.md` binding |
| Reviewer model | T3 Auditor — per `.claude/agents/akili-reviewer.md` binding (author ≠ auditor) |
| Approval Mode | **gated** (inherited from `proposal.md` via `requirements.md` Document Control) |
| Branch | `JuanGuzman-io/bug-p2-2340-ai` |
| Baseline commit | `d3d58a986` |
| Budget (`design.md` §11) | 5 tasks · ~300 LOC · 2 review rounds → **corrected after `ADE-T-3`** to ~570 code-only · 4 review rounds (see *Budget Tripwire*) |
| Started | 2026-09-16 |

### Leader decisions recorded at Step 0

- **CodeGraph not used.** `.codegraph/` contains only a `.gitignore`; no index is present in this
  worktree, so graph lookups would fail. Implementers explore by file. (`CLAUDE.md` records CodeGraph
  as initialized; the index is not committed and has not been built here. Not a blocker — recorded so
  a later run does not re-derive it.)
- **Kaizen source.** `docs/specs/kaizen-log.md` does not exist in this repo; lessons live one-per-spec
  under `docs/specs/kaizen/`. `KZ-EVL-1` (`bugfix--evidence-storage-link-validation.md`) is the lesson
  in this spec's domain and is already absorbed into `design.md` §3.1; it is passed to the Implementer
  for the tasks that touch the dispatch chain (`ADE-T-3`, `ADE-T-4`).
- **Lint scope narrowed for parallel workers.** `ADE-T-1` and `ADE-T-3` run concurrently in one
  checkout. Each Implementer lints **only its own files** rather than the full
  `"{src,apps,libs,test}/**/*.ts"` glob, so a half-written file from the other worker cannot surface
  as a spurious error in the wrong worker's report. The full-glob lint runs once, inline by the
  Leader, after both land.
- **Effort dial.** `ADE-T-1` → `medium` (well-specified, pure function, sharp negative constraints).
  `ADE-T-3` → `high`, single Reviewer in lens-checklist mode. `ADE-T-3` was considered for `xhigh` +
  parallel lens reviewers (it edits a service three other modules depend on and carries a
  secret-logging constraint); judged disproportionate for a ~70-LOC additive change whose security
  surface is a `grep` gate the checklist lens already covers. `ADE-T-4` is where `xhigh` + parallel
  lens reviewers is warranted — confidentiality guard, idempotency, fail-soft posture.

---

## Task Execution History

### `ADE-T-1` — Office allowlist and the qualifying-document predicate

| Field | Value |
|---|---|
| Status | **PASS** |
| Date | 2026-09-16 |
| Implementer attempts | 1 |
| Effort | `medium` |
| Skills loaded | `nestjs-expert` |
| Review mode | Lens checklist (single Reviewer, 4R advisory) |

**Requirements covered:** `ADE-R-2` · `ADE-AC-2` (all three clauses — the THEN, the `BUT it must NOT`,
and the `AND IT MUST` exclude-on-extension-not-`source_type` clause).

#### Attempt 1

**Files changed**

- `onecgiar-pr-server/src/api/bilateral-ai/constants/evidence-formats.constant.ts` (new, 62 lines)
- `onecgiar-pr-server/src/api/bilateral-ai/constants/evidence-formats.constant.spec.ts` (new, 94 lines)

**Implementer verification**

- `npx jest --testPathPattern="evidence-formats" --silent --reporters=summary --forceExit`
  → `Test Suites: 1 passed, 1 total / Tests: 12 passed, 12 total`
- `npx eslint <the two files> --quiet` → clean, no output

**Implementer `Not Done / Assumptions`** — nothing left undone. Two assumptions declared: `file_name:
null` used for the `TEXT_CONTEXT` case and `'report'` for the no-extension case (values the task did
not pin); one extra case added beyond the required set (`DOCUMENT` with `file_name: null`) because
the entity column is nullable. Both additive, both inside scope — carried to the Reviewer for
judgement rather than waved through by the Leader.

**Reviewer verdict: `STATUS: PASS`**

> The constant and predicate satisfy `ADE-R-2` and all three clauses of `ADE-AC-2`, the allowlist is
> literal and provably independent of the upload allowlist in `bilateral-ai-file-storage.service.ts`,
> and the suite contains the named falsifying input without falling into the self-referential
> Disqualifier.

Reviewer confirmed independently, against the source rather than the report: the allowlist is defined
once repo-wide (`evidence-formats.constant.ts:15`) and derived from nothing; the upload allowlist at
`bilateral-ai-file-storage.service.ts:52` is inline, unexported and not imported here, so `design.md`
§9's separation holds; the `notes.txt` + `DOCUMENT` case genuinely falsifies a `source_type`-only
predicate; the `it.each` table is a literal restatement of `ADE-R-2`, not a `map` over the constant,
so the Disqualifier is not crossed; the predicate is a plain function with no DI and no I/O; the
12-test count reconciles exactly with the file (1 + 5 + 6), so the reported green belongs to this suite.

#### `ADVISORY` (4R lens — recorded, never gating, and per `/akili-execute` §2.4 these do not become tasks)

- **RELIABILITY** — a leading-dot name with no basename (`'.pdf'`) qualifies: `'.pdf'.split('.')` is
  `['', 'pdf']`, so the `length < 2` guard does not catch it. Inert in practice because `file_name`
  arrives from the `{uuid}-{safeName}` upload path. **Carried forward to `ADE-T-4`**, which builds its
  selection on this predicate.
- **READABILITY** — `evidence-formats.constant.ts:36` uses `draftEvidence?.source_type` then plain
  `draftEvidence.file_name` two lines on. The second access is safe (unreachable when the argument is
  nullish) but the mixed style reads as an oversight.
- **RISK** — the Disqualifier holds only because the `it.each` table is literal. A later tidy-up that
  replaces it with `QUALIFYING_EVIDENCE_EXTENSIONS.map(...)` would silently make the suite
  self-asserting. **Carried forward to `ADE-T-4`**, the likeliest moment for that edit.
- **Out of diff, not gated** — `package-lock.json` shows modified in this worktree. Confirmed by the
  Leader as **pre-existing on the branch** (present in `git status` before any task ran, at baseline
  `d3d58a986`), not an `npm ci` side effect. Excluded from this task's commit.

**Issues encountered:** the Implementer found `node_modules` absent in this worktree and ran `npm ci`
while `ADE-T-3` was live in the same checkout. This is shared-dependency-tree contention of the kind
`.agents/leader.md` → *Delegation Thresholds* warns about — the Leader's lint-scoping guard covered
file-level collisions but not this one. No damage observed to `ADE-T-1`. If `ADE-T-3` reports a
module-resolution failure, it is to be re-verified on a quiet tree before being read as a work FAIL.

**Decisions made:** none beyond the Step 0 entries above. No spec ambiguity surfaced; no pivot.

**Final verification:** green as reported, re-confirmed by the Reviewer's count reconciliation.

### `ADE-T-3` — Server-side SharePoint upload, with a bounded timeout

| Field | Value |
|---|---|
| Status | **PASS** |
| Date | 2026-09-16 |
| Implementer attempts | 1 |
| Effort | `high` |
| Skills loaded | `nestjs-expert`, `error-handling-patterns` |
| Review mode | Lens checklist (single Reviewer, 4R advisory) |

**Requirements covered:** `ADE-R-3` · `ADE-R-5` (fault-detection half) · `ADE-QAS-3` · DD-3.

#### Attempt 1

**Files changed**

- `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-file-storage.service.ts` (+31)
- `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-file-storage.service.spec.ts` (+56)
- `onecgiar-pr-server/src/shared/services/share-point/share-point.service.ts` (+91)
- `onecgiar-pr-server/src/shared/services/share-point/share-point.service.spec.ts` (+109)

**Implementer verification**

- `npx jest --testPathPattern="share-point|bilateral-ai-file-storage" --silent --reporters=summary --forceExit`
  → `Test Suites: 3 passed, 3 total / Tests: 49 passed, 49 total`
- Blast radius: `npx jest --testPathPattern="evidences" --silent --reporters=summary --forceExit`
  → `Test Suites: 4 passed, 4 total / Tests: 47 passed, 47 total`
- `npx eslint <the 4 files> --quiet` → clean
- Grep gate (DC-8): added lines vs `console.|logger.|.log(|.error(|.warn(|.debug(` → **no matches**

**Timeout decision (DD-3 left the value to execution):** `UPLOAD_FROM_STREAM_GRAPH_TIMEOUT_MS =
30_000`, a private static constant consumed only by a `withGraphTimeout` helper inside
`uploadFromStream`. Applied twice — once to the session-mint chain, once to the byte PUT.
Mechanism is a JS-level `Promise.race`, **not** an axios `timeout` config: axios config is inert
against a fully-mocked `httpService`, which is how this codebase stubs `SharePointService`, so only
a race is provable against the never-settling stub the task names as its Disqualifier.

**Implementer `Not Done / Assumptions`, carried verbatim and adjudicated by the Reviewer rather
than by the Leader:**

> - `uploadFromStream` always passes `count: 1` to `createUploadSession` … This is a judgment call
>   since ADE-T-4 (the actual `promoteDraft` wiring) is out of this task's scope; flagging it so the
>   Leader/ADE-T-4 implementer can confirm the assumption holds when the loop is wired up.
> - I did not touch `createFileFolder`'s own Graph `PUT` (invoked transitively inside
>   `createUploadSession`) with an independent timeout beyond what wrapping the whole
>   `createUploadSession` call already provides — wrapping the outer call bounds the full chain
>   (folder creation + session POST) in one race, which is sufficient for DD-3 without duplicating
>   `createUploadSession`'s internals or touching its signature.

Both resolved as **conformant**, on evidence rather than on the Implementer's rationale — see below.
Neither is outstanding scope, so this task reaches `[x]`.

**Reviewer verdict: `STATUS: PASS`**

> `ADE-T-3` conforms to DD-3 and §7.2 — every outbound Graph call `uploadFromStream` makes is inside
> one of two 30 s races (the session-mint race covers `getToken`, `createFileFolder` and the session
> POST transitively), the never-settling tests genuinely falsify "DD-3 described" rather than
> implemented, and all four negative constraints hold against the source. `count: 1` is correct for
> the sequential loop `ADE-T-4` will wire.

Adjudications the Reviewer reached by reading the source, not the report:

1. **DD-3 — bounding the chain is conformance, not a gap.** No outbound call on this path sits
   outside a race, so no hang outlives 30 s + 30 s. Per-call bounding would be *weaker* against
   DD-3's stated purpose (6 bounded calls × 30 s = 180 s before the promotion moves on) and would
   require duplicating `createUploadSession`'s internals, which the task's own negative constraint
   pushes against.
2. **`count: 1` is correct.** `getLastSharepointId` is `SELECT MAX(id) FROM evidence_sharepoint`
   (`evidences.repository.ts:370-386`) — a global high-water mark, not a per-result counter — and
   each committed document writes one row in `saveSPData` (`evidences.service.ts:561`), so
   documents 2..6 get distinct names. A running index would double-count.
3. **The silent `undefined` id cannot corrupt the DD-6 checkpoint.** `saveSPData` throws first —
   `evidences.service.ts:496` refuses when `!data?.link?.webUrl`, which is exactly what
   `addFileAccess(undefined, …)` produces — so the sequence fails before any stamp is written.
   Fail-soft outcome plus an inert orphan, which DD-6 already accepts.
4. **The Disqualifier is discharged.** The rejection can only originate in `withGraphTimeout`: the
   stub never settles, fake timers stop real wall time from settling anything, and the `/timed out/i`
   matcher matches no other message in the file. With the helper removed the test cannot report green.

#### `ADVISORY` (4R lens — recorded, never gating, never minted into tasks)

- **RELIABILITY** — a lost race stops `uploadFromStream` *waiting* but neither destroys the S3
  `Readable` nor aborts the axios request. An abandoned 25 MB upload holds a socket and the S3 stream
  for its full duration on a container runtime. Suggested: `stream.destroy()` on the timeout path, or
  an `AbortController.signal`.
- **RELIABILITY** — `size === 0` is reachable (`validateSources` accepts a 0-byte file because
  `Buffer.alloc(0)` is truthy) and yields `Content-Range: bytes 0--1/0`, which Graph rejects with a
  400. It fails soft, but opaquely, and `?? 0` conflates "0-byte object" with "`HeadObject` returned
  no `ContentLength`".
- **RELIABILITY** — `{ id: response?.data?.id }` resolves successfully on an unexpected Graph body,
  relocating the failure into `saveSPData`'s message rather than attributing it to the upload.
- **READABILITY** — the timeout docblock claims the session POST and the PUT "each get this budget
  independently"; the first budget actually covers the token mint, the folder-creation PUT, two DB
  reads and the POST. The real worst case is 60 s per document, not 30 s + 30 s of two small calls.
- **TESTING RIGOR** — `expect(getObjectMock).not.toHaveProperty('promise')` asserts a property of the
  fixture the test itself built. The real no-buffering proof is that `getObjectStream` resolves
  against a mock that has no `promise` at all.

#### Forward pointers — **must be copied into `ADE-T-4`'s brief** (a pointer filed here is not carried by having been filed)

1. **Order is load-bearing for naming.** The loop must call `saveSPData` (which persists
   `evidence_sharepoint`) **before** minting the next document's session — exactly `design.md` §3.2.
   Batching the mints, or moving `saveSPData` out of the per-document sequence, gives every document
   of the draft the same computed name.
2. **Persist `sp_file_name` from the `name` `uploadFromStream` returns**, never from a locally
   recomputed name. On a partial failure (upload succeeded, `saveSPData` threw) no
   `evidence_sharepoint` row is written, so the next document computes the *same* suffix as the
   orphan already in the folder; the driveItem `id` from the PUT is the authoritative value.
3. **The DC-8 grep gate will hit pre-existing `console.*` calls.** `uploadFromStream` routes through
   `createUploadSession`'s existing `console.log({driveId, newFolderId, filePath, finalFileName})` and
   `console.error('CreateUploadSession error:', …)` (`share-point.service.ts:46-51, 70-76`). Neither
   carries a token (axios puts request headers on `error.config`, not `error.response`), so `AC-9`
   is **not** breached — but they are `console.*`, not the Nest `Logger` `ADE-R-8` presumes. Not
   `ADE-T-4`'s to fix; flagged so the gate is not surprised.
4. **From `ADE-T-1`:** the predicate admits a leading-dot name with no basename (`'.pdf'`); and the
   `it.each` table in `evidence-formats.constant.spec.ts` must stay literal — replacing it with
   `QUALIFYING_EVIDENCE_EXTENSIONS.map(...)` would silently make that suite self-asserting.

#### Forward pointer to `ADE-T-5` (latency)

30 s + 30 s per document means a 6-document draft can legitimately spend **~6 minutes** inside the
transfer before `ADE-QAS-2`'s 45 s p95 is even measurable. This is the timeout *ceiling* under fault,
not the expected path, but `ADE-T-5`'s measurement and DD-2's escalation must reason about the total
budget explicitly rather than about a single document.

**Issues encountered:** none in the work. The `npm ci` run by `ADE-T-1`'s Implementer mid-flight (see
that task's entry) caused no observable damage here — all three suites green.

**Final verification:** green as reported; Reviewer re-derived the negative constraints from source.

---

## Budget Tripwire — fired after `ADE-T-3`, escalated to the user

`design.md` §11 budgets **~300 LOC (≈170 implementation, ≈130 tests)**; `tasks.md` §8 breaks the same
figure down to **~335** with a per-task table. Measured against the two completed tasks, counting
added lines only (`git diff | grep '^+[^+]'`), and separately excluding blank and comment lines so
docblocks do not flatter the number:

| | `tasks.md` §8 estimate | Raw added | Code-only |
|---|---|---|---|
| `ADE-T-1` implementation | ~30 | 56 | **31** |
| `ADE-T-3` implementation | ~70 | 115 | **64** |
| **Implementation subtotal** | **~100** | 171 | **95** |
| `ADE-T-1` tests | — | 86 | **77** |
| `ADE-T-3` tests | — | 141 | **135** |
| **Test subtotal** | **~130 (for T-1…T-4, all four)** | 227 | **212** |

**The implementation is on budget. The tests are not, and they are the whole overrun.**
Code-only implementation is 95 against ~100 estimated for these two tasks — within noise. Test code
is 212 against the ~130 budgeted for *all four* code tasks, with `ADE-T-2` and `ADE-T-4` still to
come. `ADE-T-4` alone owns a seven-row clause-coverage table in `tasks.md`, each row requiring its
own named test, so it will be the largest test file in the spec.

**Projection to completion** (code-only): implementation ≈ 95 + 15 (`ADE-T-2`) + 90 (`ADE-T-4`) ≈
**200** against ~170 budgeted — a modest overshoot. Tests ≈ 212 + ~40 + ~120 ≈ **370** against ~130
budgeted — roughly **2.8×**. Total ≈ **570** against ~300.

**Cause — not scope creep.** No task was minted, no advisory became work, no task exceeded its
declared file list, and both tasks passed review on the first attempt (2 review rounds consumed of
the 2 budgeted, with zero rework). The overrun is entirely test volume, and it traces to an internal
inconsistency in the approved spec: §11 budgeted ~130 test lines while `tasks.md` independently
mandates, per task, a named falsifying input, a Disqualifier, and — for `ADE-T-4` — seven
clause-level tests plus a blast-radius suite. Those two numbers were never consistent with each
other. The tests written are the tests `tasks.md` demands; it is the **budget line that was wrong**,
not the execution.

**Consequences of each option** (presented to the user; execution paused pending the decision):

1. **Continue and correct §11's budget** — recommended. The test volume is what `tasks.md` §5/§6
   already committed to, and §6 *Coverage closure* assigns every clause a named owner. Nothing to cut
   without dropping coverage the spec explicitly owns.
2. **Continue unchanged, leave §11 stale** — cheapest now, but the next spec inherits a budget line
   already demonstrated wrong, and the tripwire stops meaning anything.
3. **Reduce test scope to fit ~130** — would require dropping clause coverage from `ADE-T-4`'s table.
   Not recommended: those clauses are the `BUT` / `AND IT MUST` cases `requirements.md` §9 was written
   around, and DC-1…DC-4 name them as the only automated gates this spec has.

**Review-round budget:** 2 of 2 consumed, both PASS on first attempt, 0 rework attempts used.
`ADE-T-2` and `ADE-T-4` have no review rounds left in the §11 budget — a second, related overrun the
user should weigh alongside the LOC one, since `ADE-T-4` is the task most likely to need a rework
round.

**User decision (2026-09-16):** option 1 — *amend §11, then continue*. `design.md` §11 now carries the
approved figures in one column and the corrected ones (~570 code-only: ≈200 implementation, ≈370
tests; 4 review rounds, one per code task) in a second, with the cause recorded in place. Next task
by the user's choice: **`ADE-T-4` alone**, effort `xhigh`, parallel lens reviewers; `ADE-T-2` follows.
Rationale for not pairing them: both edit `bilateral-ai.service.ts` (`promoteDraft` vs
`createDraftFromCandidate`) — different methods, same file, a concrete collision.

### `ADE-T-4` — Evidence transfer service, wired into `promoteDraft`

| Field | Value |
|---|---|
| Status | **PASS** (attempt 2) |
| Date | 2026-09-16 |
| Implementer attempts | 2 |
| Effort | `xhigh` (attempt 1) · `xhigh` (attempt 2 — held, not bumped; see *Decisions*) |
| Skills loaded | `nestjs-expert`, `error-handling-patterns`, `tdd` (attempt 1) · `nestjs-expert` (attempt 2) |
| Review mode | **Parallel lens reviewers** — Reliability · Resilience · Risk, each with baseline spec conformance |

**Requirements covered:** `ADE-R-1`, `R-3.1`, `R-4`, `R-5`, `R-7`, `R-8`, `R-9` · `ADE-AC-1`, `AC-3`,
`AC-4`, `AC-5`, `AC-6` (shape only — declared gap), `AC-7` (*AND IT MUST* same-code-path clause).

#### Attempt 1

**Files changed**

- `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-evidence-transfer.service.ts` (new, +188)
- `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-evidence-transfer.service.spec.ts` (new, +383)
- `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai.service.ts` (+22 — constructor param, `promoteDraft` call after the `status_id` write, defense-in-depth `try`)
- `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai.service.spec.ts` (+71 — `makeService()` stub for the new constructor param per the project's constructor-change rule; two `promoteDraft` tests: call order via `invocationCallOrder`, unchanged response when the transfer rejects)
- `onecgiar-pr-server/src/api/bilateral/bilateral.module.ts` (+12 — imports `SharePointModule`, registers the provider)

**Implementer verification**

- `npx jest --testPathPattern="bilateral-ai"` → 11 suites / 204 tests passed
- `npx jest --testPathPattern="evidences"` → 4 suites / 47 passed (unchanged)
- `npx jest --testPathPattern="app.module"` → 1 suite / 2 passed
- `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` → 0 errors in touched files; 3 pre-existing in
  `bilateral-center.service.ts` / `.spec.ts` / `bilateral-center.controller.spec.ts` (untouched)
- `npx tsc --noEmit` → clean
- `npm run migration:check` → **inconclusive in the sandbox** (`ECONNREFUSED`) — see *Issues*
- DC-8 grep over added `this.logger.` lines → no token / URL / `webUrl` / `Authorization`

**Implementer `Not Done / Assumptions`, carried verbatim:**

> - **`npm run migration:check` inconclusive** (environment has no DB) — no entity/schema touched by this task, so risk is believed nil, but I can't produce a real execution to cite.
> - **DD-4 compensating delete** — a judgment call beyond the literal design diagram: `design.md` §3.2 shows `insert evidence row → saveSPData → stamp` with "failure at any step → leave unstamped, continue" but doesn't explicitly say to delete the evidence row on a `saveSPData`-specific failure. I added an explicit `evidencesRepository.delete(savedEvidence.id)` in that failure branch because `DD-4`'s own text says a refusal must become "**no evidence row**, logged, promotion unaffected" — without the delete, a `saveSPData` throw (e.g. the DD-4 confidentiality refusal) would leave an orphaned `evidence` row with an empty link, which is exactly the "half-written evidence row" `ADE-AC-3` forbids.
> - **`is_public_file: false as unknown as number`** — `EvidencesCreateInterface.is_public_file` is typed `number` (legacy DTO for the manual-upload form), but `ADE-AC-1`'s test explicitly requires strict `=== false`, which fails `tsc` if assigned directly (verified via a scratch compile). Used a narrow double-cast at that one field rather than `any`-typing the whole payload.
> - **`sp_folder_path`** — populated via an extra `sharePointService.generateFilePath(String(resultId))` call so the `evidence_sharepoint.folder_path` column isn't left empty, matching `design.md` §5's data-model table. One additional per-document DB round trip not shown in §3.2's diagram.

**Leader probe of the `migration:check` deferral** (per `.agents/leader.md` → *Deferring a check*):
assumption stated — "cannot run because no MySQL is reachable from this worktree"; probed on the
quiet tree after the worker reported — `npm run migration:check` → `code: 'ECONNREFUSED'`, exit 1.
**Blocker confirmed.** Proxy check: `git diff --name-only` over `**/entities/**`, `**/*.entity.ts`,
`src/migrations/**` → **0 files**, so this spec cannot have produced a pending migration. The real
gate is CI's `migration:check:ci`. Recorded as probe-confirmed, not as a guess.

**Lens verdicts**

| Lens | Verdict | One-line summary |
|---|---|---|
| **Reliability** | `STATUS: PASS` | Data matches a manual SharePoint upload field for field (incl. the load-bearing `is_supplementary = false`, which the section read filters on); the not-public answer reaches `evidence_sharepoint.is_public_file` as an explicit `0`; six of seven clause tests genuinely falsify their natural wrong implementation. |
| **Resilience** | `STATUS: PASS` | Every failure point enumerated; the only `ADE-AC-3`/`AC-4`-breaching states need a compound DB fault on top of the first fault; the compensating write is *required* by `ADE-AC-3`/DD-4, correctly scoped to `saveSPData` only, and cannot orphan an `evidence_sharepoint` row (that repository writes as its last statement). Two **spec gaps** surfaced — see below. |
| **Risk** | `STATUS: FAIL` | One issue: the compensating rollback is a **hard `delete` on `evidence`**, the only one in the codebase; violates PRD `AC-7` / TRD W7 (soft delete), which `requirements.md` §9 lists as applying to this spec. |

**Adjudication of the Implementer's assumptions, on evidence rather than rationale:**

1. **`false as unknown as number` — accepted (Reliability + Risk, independently).** Every read of
   `is_public_file` in `saveSPData` is `??`, `=== null || === undefined`, loose `!=`, or `!(...)` —
   there is no `=== 0`, `== 1`, `Number()` or bare truthiness anywhere (`evidences.service.ts:446,
   :450, :481, :487, :517-519, :555`). `false` and `0` are indistinguishable in all six.
   `addFileAccess` receives `false` → scope `organization`, never `anonymous`. The column
   (`tinyint NOT NULL DEFAULT 0`) stores `0`. Decisive: the **client already sends a boolean** on the
   manual path (`section-evidence.model.ts:7`, `evidencesBody.model.ts:30`) — the DTO's `number` is
   the pre-existing mis-typing; this caller sends the identical runtime value the manual path sends,
   the strongest reading of `ADE-AC-7`'s same-code-path clause. Spec tension resolved: `ADE-R-3.1`
   is the requirement; `design.md` §5's `= 0` is the column value; `tasks.md`'s `=== false` is the
   payload assertion; all three hold. Type smell, not a defect.
2. **Compensating write — required (all three lenses).** Without it the DD-4 confidentiality
   refusal — a live platform defect — leaves an `is_active = 1` evidence with `link = ''`, visible
   and unopenable: verbatim `ADE-AC-3`'s forbidden state. Correctly wrapped around `saveSPData`
   only, never the stamp. **Its form was the FAIL** — see Risk.
3. **Second `generateFilePath` call — accepted.** `saveSPData` never computes `folder_path`; it
   takes `sp_folder_path` from the caller (`:550-551`), so omitting it stores `NULL` and breaks
   `design.md` §5. Same `getResultInformation` read as `createUploadSession` → same string.
   Correct but redundant.

**Leader ruling on the Risk FAIL — in scope; consumes attempt 2.** Reliability read the hard
delete as *not* an `AC-7` violation (the row never became visible); Risk read it as a violation
(the constitution carves out no such exception; W7 makes hard delete admin-only with an audit
entry). The Leader sides with Risk: `requirements.md` §9 names `AC-7` as applying, `ADE-R-7` requires
ordinary-evidence behaviour, and the soft-delete form has strictly less coupling — a hard delete
depends silently on `saveSPData` writing `evidence_sharepoint` last; a soft delete cannot hit the
FK under any future reordering. Remediation is the Risk reviewer's own: `update(id, { is_active: 0,
last_updated_by })`, test assertion switched, comment amended.

**Reviewer-verified corrections to the evidence cited:**

- **`app.module.spec.ts` does not compile a DI container.** It reads `@Module` metadata via
  `Reflect.getMetadata` and exercises `configure(consumer)` with a mock; it never calls
  `Test.createTestingModule(...).compile()`. Its green therefore cannot detect a cycle, a missing
  export or an unresolvable provider. Both Reliability and Risk verified the wiring **statically**
  instead: `DraftEvidence` in `forFeature` (`bilateral.module.ts:100`), `SharePointModule` imported
  and exporting `SharePointService`, `EvidencesModule` exporting `EvidencesRepository` +
  `EvidencesService`, `BilateralAiFileStorageService` and the transfer service registered;
  `SharePointModule` imports only `GlobalParameterCacheModule` + `HttpModule` (no path back — no
  cycle); `EvidencesModule` already imports `SharePointModule`, so the edge is not new to the graph;
  `SharePointModule`'s own `EvidencesRepository` provider is not exported (no ambiguous token). The
  Done-list claim is **true; the cited test is not what proves it.** The real gate is the CI build /
  app boot. **This also weakens the project-wide "constructor change → run `app.module`" rule**, which
  is recorded for the Leader's own memory rather than for this spec.
- **The sibling-isolation test (`ADE-AC-1`) is weaker than its clause-table row.** It does not stage
  the two-draft fixture the row names, and `not.toHaveBeenCalledWith({ result_id: 200 })` is a
  tautology over a single-call fixture. The clause **is** carried — by the
  `find({ where: { draft_id: 5, is_active: true } })` assertion (falsifies a find-by-job
  implementation) plus the promote-level `transferForDraft(5, 100, 42)` pin — but the coverage table
  must not be read as stronger than that.
- **The "never a URL or token" log test is tautological for its own fixture** — the only variable
  part of the line is the error message the test supplies as `'timed out'`. Not a violation:
  `tasks.md` designates the **grep gate** as the encoding for `ADE-AC-3`'s no-secret clause, and the
  Risk reviewer ran that gate independently and it passed (10 `this.logger.` sites across the two
  services, 4 new, none carrying `webUrl` / `uploadUrl` / `Authorization` / `token` / `object_key`).

**Authorization and blast radius (Risk):** `userId` is `user.id` from `@UserToken()`
(`bilateral-ai.controller.ts:122-128`), JWT-gated — `/api/bilateral-ai/*` is not among the
`api/bilateral/*` JWT exclusions; `getDraftRaw` calls `assertCenterEntitlement` first; `resultId` is
`draft.result_id` from that entitled row, never a client value. `AC-3` / W8 satisfied. No DTO,
Swagger, controller or `/api/bilateral/*` payload changed; `docs/bilateral-result-summaries.en.md`
untouched (`AC-4`). `EvidenceTransferOutcome[]` is returned by the service and **discarded** by
`promoteDraft` — correct per `design.md` §6, and it keeps third-party error strings off the API.

#### Attempt 2 — rework on the Risk FAIL

**Brief:** the Risk reviewer's FAIL report passed to the Implementer **verbatim** (Structured
Feedback rule), with an Attempt History line and an explicit ring-fence: fix only the hard delete;
do **not** absorb the three-lens advisory about wrapping the compensating write (advisories never
widen a task). Effort held at `xhigh` — see *Decisions*.

**Files changed (2, both already in the attempt-1 set)**

- `bilateral-ai-evidence-transfer.service.ts:172-185` — `evidencesRepository.delete(savedEvidence.id)`
  → `evidencesRepository.update(savedEvidence.id, { is_active: 0, last_updated_by: userId })`;
  `throw error` preserved; comment now cites `AC-7` / W7 and says *deactivated*, not *removed*.
- `bilateral-ai-evidence-transfer.service.spec.ts` — `makeService()` stub gains
  `update: jest.fn().mockResolvedValue({ affected: 1 })` (keeps `delete` so the negative assertion
  is meaningful); the DD-4 test renamed to *"… deactivates the orphaned evidence row, and does not
  throw"* and now asserts `update(900, { is_active: 0, last_updated_by: 42 })` **and**
  `delete` not called — strictly stronger than the assertion it replaced.

**Implementer verification**

- `npx jest --testPathPattern="bilateral-ai-evidence-transfer"` → 12/12 passed
- `npx jest --testPathPattern="bilateral-ai"` → 11 suites / 204 passed
- `npx jest --testPathPattern="evidences"` → 4 suites / 47 passed
- `npx tsc --noEmit` → clean
- `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` → 0 errors in the two touched files; all
  remaining errors in pre-existing `bilateral-center.*` (confirmed untouched by `git status`)
- `grep -c "evidencesRepository.delete"` on the production file → `0` (Leader re-ran it: `0`)

**Implementer `Not Done / Assumptions`, verbatim:**

> The `grep` verification command as literally written (glob `*.ts` in that directory) does not
> return nothing, because it also matches the spec file's required `not.toHaveBeenCalled()`
> assertion referencing `evidencesRepository.delete`. The production service file itself has zero
> occurrences. Treating this as consistent with the task's own instruction to keep the `delete` stub
> for that assertion — flagging rather than deciding unilaterally.

**Leader resolution:** the Leader's own brief was internally inconsistent (a "must return nothing"
grep over `*.ts` alongside an instruction to keep a `delete` stub for a negative assertion). The
Implementer flagged rather than decided, which is the correct behaviour. Production file has zero
occurrences; the spec's single hit is the required negative assertion. **No outstanding scope.**

**Reviewer verdict (Risk lens re-review, scoped to the rework): `STATUS: PASS`**

> The `AC-7` / `W7` hard-delete violation is closed with the exact remediation prescribed —
> `update(id, { is_active: 0, last_updated_by: userId })` with `throw error` preserved — using the
> literal and column type the `Evidence` entity and the platform's own soft-delete SQL already use,
> and the deactivated row is filtered out by both the Evidence-section read
> (`getEvidencesByResultId`) and the submit-time evidence validation, so `ADE-AC-3`'s "no
> half-written evidence row" holds. Attempt 2 stayed strictly inside the remediation: two files, no
> new `try/catch`, and a test that is stricter than the one it replaced.

Verified at source by the reviewer: `is_active` is `tinyint`/`number` on `Evidence`
(`evidence.entity.ts:202-208`; the entity does not extend `BaseEntity`, so not the boolean variant);
the platform's own soft delete uses the same literal (`evidences.repository.ts:169, :330-339`);
`EvidencesRepository` inherits TypeORM `update` through `BaseRepository → ReplicableRepository →
Repository<Evidence>`; the Evidence-section read filters `e.is_active > 0`
(`evidences.repository.ts:413-465`) and the submit-time validation filters `is_active > 0` at every
`FROM evidence` subselect (`results-validation-module.repository.ts:665, :688, :711, :862`) —
**materially, the soft delete is stronger than the hard delete was on `ADE-AC-3`:** the validation
block at `:650-666` requires every counted row to carry a non-empty `link`, so an *active* orphan with
`link = ''` would have turned the Evidence green check red. No recovery path blanket-reactivates
evidence (`delete-recover-data.service.ts` has no `is_active = 1` sweep).

**Only one Reviewer re-spawned for attempt 2.** Reliability and Resilience PASSed attempt 1 on code
attempt 2 did not touch (the change is one UPDATE replacing one DELETE plus its test); the failing
lens re-audited the fix. Proportionate; `author ≠ auditor` preserved.

#### `ADVISORY` (all lenses, deduplicated — recorded, never gating, never minted into tasks)

- **RESILIENCE / RELIABILITY / RISK (raised independently by all three)** — the compensating write
  (`update … is_active: 0`) is itself unguarded. If it rejects, (a) the half-written row `ADE-AC-3`
  forbids survives, and (b) its error **replaces the root cause** in both `outcomes[].errorMessage`
  and the `warn` line, so a DD-4 confidentiality refusal is reported as a database error. A
  `try/catch` that logs the compensation's own failure and re-throws the *original* error would fix
  both. This is the one compound path the `never throws` describe does not exercise. **Ring-fenced
  from attempt 2 by the Leader; presented to the user at the gate as a candidate for a scope
  decision, not decided by the Leader.**
- **RESILIENCE** — a stamp-write failure after a successful `saveSPData` records
  `outcome: 'failed'` for a document that *did* attach — the one log line that can mislead an
  operator in the direction `ADE-R-8` exists to prevent.
- **RESILIENCE** — `getObjectStream`'s live S3 `Readable` is never destroyed when `uploadFromStream`
  rejects or times out; the socket is held until axios settles. Bounded (≤ 6 sequential documents).
- **RESILIENCE / observability** — skipped rows (non-qualifying, already stamped) produce no log
  line; the `ADE-OQ-2` `.txt`-only case is silent in the logs as well as the UI.
- **RELIABILITY** — `bilateral-ai.service.spec.ts:1155` asserts `status_id: expect.any(Number)`,
  which passes for `Discontinued (4)`; tighten to `ResultStatusData.Editing.value` (pre-existing test
  at `:925` shares the weakness).
- **RELIABILITY** — the `evidence` row is autocommitted for the duration of the Graph round trips
  before the compensation; a concurrent Evidence-section read can briefly see a link-less row.
  Identical in shape to the manual path (`evidences.service.ts:232-235`); no regression.
- **RELIABILITY → `ADE-T-5` pointer (DC-6)** — `evidence.link` is written only inside
  `saveSPData`'s `evidenceSharepoint.is_public_file != evidence.is_public_file` branch, entered
  today solely because a fresh `EvidenceSharepoint` leaves the property `undefined`. Should that
  entity ever gain a JS-side default, the link silently stays `''` with no error and **no failing
  test** (SharePoint is stubbed throughout). `ADE-T-5` step 2 must confirm a **non-empty
  `evidence.link`** on prtest explicitly, not just a 200.
- **RELIABILITY** — `uploadFromStream` already computes the upload path inside
  `createUploadSession`; returning it alongside `{ id, name }` would drop the second
  `generateFilePath` query and guarantee `folder_path` is the path the bytes landed in.
- **RISK** — `${message}` in the failure log is an unbounded third-party string. Safe today (axios,
  aws-sdk v2 and Graph error bodies verified URL-free) but the property rests on upstream formats,
  not on this diff's own composition. Cheap hardening: strip `https?://\S+` before interpolating.
- **RISK / test power** — the "never a URL or token" test proves the *template* adds no URL, not
  that a real error is scrubbed; feeding one test a URL-bearing message and asserting a scrubbed
  line would turn it into an absence proof. Pairs with the redaction advisory above.
- **RISK** — the `bilateral.module.ts` "compiles" Done item has no test behind it (see attempt 1);
  the real gate is the CI build / app boot, or a `bilateral.module.spec.ts` that compiles the graph.

**Decisions made**

- **Lens FAIL adjudicated in-scope** — the compensating write was this task's own addition; the
  violated rule (`AC-7`) is one `requirements.md` §9 names as applying; remediation was five lines.
  Consumed attempt 2 of 3.
- **Effort held at `xhigh` on the retry, not bumped.** The dial says bump one level per retry;
  `xhigh → max` would breach *never `max` a cheaper tier* (Implementer is T2). Escalating the tier
  for a fully-specified five-line convention fix was judged disproportionate — the FAIL was not an
  under-thinking failure but a convention the attempt-1 brief did not name. Recorded as a deviation.
- **Only the failing lens re-reviewed the rework** (see above).
- **`migration:check` Done item marked on the probe-confirmed proxy**, with CI as the real gate.
- **`app.module` Done item marked on the reviewers' static wiring verification**, with the explicit
  note that the named test does not prove it.

**Issues encountered:** the Leader's attempt-2 grep instruction was internally inconsistent (see
above). No environment damage; no pivot required for this task's own scope. Two **spec gaps**
surfaced by the Resilience lens are recorded in the Pivot Record below — they concern the design
text, not this diff.

**Final verification (attempt 2):** `bilateral-ai` 204/204 · `evidences` 47/47 · `tsc` clean ·
lint clean in touched files · production grep `0`.

**Coverage honesty (`tasks.md` §6):** `ADE-AC-1` sibling isolation is carried by the `find`
`where`-clause assertion plus the promote-level argument pin, **not** by the two-draft fixture the
clause table names. `ADE-AC-6` is shape-only by declaration. `ADE-AC-3`'s no-secret clause is
carried by the grep gate (run independently by the Risk reviewer), not by the log-content test.

## Constitution Impact: `ADE-T-4`

- **Module reshaped:** `api/bilateral-ai` gains a collaborator service
  (`BilateralAiEvidenceTransferService`) registered in `api/bilateral/bilateral.module.ts`;
  `BilateralAiService`'s constructor gains one dependency; `BilateralModule` now imports
  `SharePointModule` (edge already present in the graph via `EvidencesModule`).
- **Child guide:** `onecgiar-pr-server/src/CLAUDE.md` / `AGENTS.md` — if they enumerate
  `bilateral-ai/services/*`, the new service is missing. **Not edited from this branch** (shared-file
  discipline); pending for `/akili-archive`.
- **Parent index:** no new module, no `## Module Guides` change.
- **CodeGraph re-index pending** (no index exists in this worktree at all — see Step 0).

## Pivot Record: `ADE-T-4` — design-text gaps, **pending user approval** (task itself is `[x]`)

Surfaced by the Resilience lens; neither is a defect in the diff, which implements `design.md` §3.2
verbatim. Both concern approved design decisions that are inconsistent with each other or
incompletely priced. The Leader has **not** amended `design.md` — that is the user's decision.

**Gap 1 — DD-3 promises what DD-4 prevents.** DD-3 decides "the transfer bounds **every** outbound
call with an explicit timeout"; `ADE-QAS-3` measures "every attempt bounded by the DD-3 timeout".
DD-4 mandates reusing `EvidencesService.saveSPData` **unchanged**. `saveSPData → addFileAccess`
(`share-point.service.ts:193`) is `removeAllFilePermissions` + `getToken` + `createLink` — ~6 Graph
round-trips on the timeout-less `HttpModule`. `ADE-T-3` bounded `uploadFromStream` only (2 races).
A hanging Graph response inside `saveSPData` hangs `promoteDraft` — the failure DD-3 was written to
eliminate — with the result already in `Editing` (so not stranded) but the HTTP request and the draft
discard both blocked. `tasks.md` §6 assigns the "bound" half of `ADE-QAS-3` to `ADE-T-3` and only
"survives" to `ADE-T-4`, so no clause any task owns is violated — the contradiction is between two
DDs. **The obvious fix is dangerous and must not be improvised:** racing a timeout around
`saveSPData` lets the abandoned call still write `evidence.link` and `evidence_sharepoint` *after*
the compensation has deactivated the row. Alternatives for the user: (a) amend DD-3 to scope its
promise to the calls this spec adds, record the `saveSPData` leg as an accepted unbounded window
inherited from the platform, and let `ADE-T-5` measure it; (b) open a separate spec to add a
timeout **inside** `SharePointService.addFileAccess` (a shared service; out of this spec's scope,
affects `evidences`/`toc-results`/`versioning`); (c) both. **Leader recommendation: (a) now, (b) as
a follow-up proposal** — (a) makes the design honest today; (b) is a shared-module change that
deserves its own review.

**Gap 2 — DD-6 prices its ordering incompletely.** DD-6's *Implications* enumerate only the
pre-evidence crash window ("an orphan in SharePoint"). The window between `saveSPData` resolving and
the `file_management_reference` UPDATE landing costs a **duplicate visible evidence** on the next
run — the outcome §3.2 itself names as "worse than an invisible orphan file". Narrowed in practice
by `getDraftRaw`'s `is_discarded: false` guard (`bilateral-ai.service.ts:501`): a second promotion
needs **both** the stamp write and the discard write to be lost. No fix exists inside the spec —
stamping earlier contradicts DD-6, a transaction spanning a Graph call is outside the LITE tier
(ADR-001). **Leader recommendation:** amend DD-6's *Implications* to name the window and its
mitigation (the discard guard), so the design text matches what was measured.

No TRD ADR is overturned by either gap; both are feature-level DDs.
