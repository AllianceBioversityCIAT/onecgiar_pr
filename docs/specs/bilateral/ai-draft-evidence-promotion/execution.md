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
