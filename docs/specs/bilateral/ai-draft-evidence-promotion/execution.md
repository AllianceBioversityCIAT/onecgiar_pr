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
| Budget (`design.md` §11) | 5 tasks · ~300 LOC · 2 review rounds |
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
