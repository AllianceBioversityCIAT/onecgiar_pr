# Execution Log — `changes/w3-bilateral-user-guide`

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/w3-bilateral-user-guide` |
| Worktree | `/Users/jcadavid/Development/worktrees/onecgiar_pr/w3-bilateral-user-guide` |
| Branch | `feat/w3-bilateral-user-guide` (base `qa-development-2026` @ `96b891ca3`) |
| Approval Mode | pre-approved — routine continue gates auto-pass and are logged; HALT / Pivot / budget tripwire / `FATAL_FAIL` / `REVIEW_WAIVED` always stop for the operator |
| Run 1 scope | **`BG-T-1`…`BG-T-6`** only. `BG-T-7`…`BG-T-13` are deferred: they need a client origin and a reporter JWT, the open half of `BG-OQ-1`, which the operator chose not to supply yet |
| Models | Leader `opus` (T1) · Implementer `sonnet` (T2, via `.claude/agents/akili-implementer.md`) · Reviewer `opus` (T3, via `.claude/agents/akili-reviewer.md`) — `author ≠ auditor` enforced by wrapper config, not by convention |
| Operator limits | At most **one** Reviewer round per task; a second FAIL escalates rather than loops. Targeted commands only — never a whole-package test run |
| Budget (from `design.md` §12) | 13 tasks · 1,300–1,700 LOC · 17 review rounds. Tripwire at **>1,700 LOC or >20 rounds** |
| Prior gate | Judgment Day round 1 on `design.md` — 10 findings, all fixed, terminal state **APPROVED** (`judgment.md`) |

### Execute-time spec edits

Recorded at the moment each is made, and carried as a named conformance check in the affected task's Reviewer brief.

| Date | File · section | Edit | Reason |
|---|---|---|---|
| 2026-09-21 | `tasks.md` · `BG-T-1` Verification + `BG-T-2` Done criteria | Moved the *executed* `npx ts-node src/guards/archive-immutable.ts` falsifier from `BG-T-1` to `BG-T-2`; `BG-T-1` keeps the guard's source and the git-level falsifier | Dependency inversion in the approved text: `ts-node` is not installed until `BG-T-2`, so `BG-T-1` could not have executed it. No requirement's meaning changes — `BG-R-10`/`BG-AC-10` are still proved, one task later |

---

## 2. Task Execution History

### `BG-T-1` — Copy the W1/W2 tooling and guard the archive against mutation

| Field | Value |
|---|---|
| Status | **PASS** |
| Date | 2026-09-21 |
| Implementer attempts | 1 (no attempt consumed — no Reviewer FAIL and no Implementer-reported verification failure; the two Leader-found defects below were corrected inside attempt 1, pre-review) |
| Review depth | `checklist` · Reviewer `opus`, Implementer `sonnet` |
| Requirements covered | `BG-R-10`, `BG-R-22`, `BG-AC-10`, `BG-DD-1`, `BG-DD-10` |
| Authored LOC | ~172 (guard 170 + 2 lines of `package.json`). Copied files are a verbatim copy and are not counted as authored. Budget 1,300–1,700 — **no tripwire** |
| runtime events | none |

**Files changed** (all new/untracked at review time; the Leader commits):
`tooling/.env.example`, `tooling/.gitignore`, `tooling/tsconfig.json`, `tooling/package.json`, `tooling/src/{auth,tokens,annotate,assemble,verify-structure,pdf,capture}.ts`, `tooling/template/{guide.css,guide.html,README.md}`, `tooling/src/guards/archive-immutable.ts` (the only authored file).

**Implementer verification** — copy asserted verbatim; `git diff --quiet -- <archive>` CLEAN; `diff -r` on `src/` showed only the new `guards/`; `template/` and the three flat files byte-identical; `package.json` limited to its named exceptions.

**Leader evidence re-run (non-author, mechanical) — `VERIFIED`.** Re-executed every command above and matched the Implementer's report exactly: archive clean against `HEAD` with no untracked files; `src/` differs only by `guards/`; `template/` identical; `.env.example`/`.gitignore`/`tsconfig.json` identical; the not-copied set (`dist`, `node_modules`, `content`, `routes.config.json`, `package-lock.json`) absent.

**Falsifier, executed by the Leader** — three observations, archive restored byte-identical afterwards:

| # | Input | `git diff --name-only HEAD -- <archive>` | Old index-only form |
|---|---|---|---|
| 1 | clean archive | empty | — |
| 2 | archive file modified, unstaged | lists the file | — |
| 3 | same modification **staged** | **lists the file** | **empty — the false pass** |

**Two defects found by the Leader inline and corrected within attempt 1:**

1. **Guard not wired into `build-guide`.** The task Description requires the guard to run "as the first step of `build-guide`", but the first submission only added a standalone `guard:archive` script. **Root cause was the Leader's own brief**, which told the Implementer to leave scripts byte-identical without carving out `build-guide`. The Implementer surfaced the contradiction in its `Not Done / Assumptions` field rather than silently choosing — the behaviour the field exists for. Corrected: `build-guide` = `guard:archive && assemble && verify-structure && pdf`.
2. **Guard exited 0 on a staged archive mutation.** It ran `git diff --name-only -- <path>`, which compares the working tree to the **index**, so a `git add`-ed mutation was invisible. Not hypothetical: the Leader runs `git add` on this branch. At one intermediate point the header comment already claimed the `HEAD` comparison while the code still lacked it — a comment asserting behaviour the code does not have, which reads coherent to a text-only review. Corrected to `['diff', '--name-only', 'HEAD', '--', archivePath]`, and the contrast in the falsifier table above is the evidence.

**Reviewer verdict — `STATUS: PASS`.** Both Leader-disclosed corrections audited and found sound. Confirmed: the non-empty path assertion precedes both diff calls and would fire on a missing or misresolved path; staged deletions and staged renames are caught; an unborn or broken HEAD throws and exits 1; the guard always audits its own worktree (root resolved from `__dirname`), so detached HEAD and sibling worktrees are fine; no `.cursorrules` violation; scope clean (no `npm install`, no `.env`, no `ts-node` execution).

Reviewer also identified **two residual states that exit 0 while the archive is not byte-identical on disk** — (a) a file staged then reverted in the worktree (the index carries the mutation, `diff HEAD` is empty), and (b) a `.gitignore`d file added under the archive (`--exclude-standard` hides it). **Neither is a `BG-AC-10` violation**: the AC's own command (`git diff -- <path>`) misses both as well, and the guard is a strict superset of the acceptance criterion. Recorded, not fixed.

**`ADVISORY` (4R lenses — recorded, never gating, and never minted into a task):**
- *Reliability* — add `git diff --name-only --cached HEAD -- <path>` to close the staged-then-reverted index hole.
- *Risk* — `--exclude-standard` means an `npm install` inside the **archive's** own tooling leaves the folder non-identical on disk with the guard green; `--ignored` or a persisted baseline count would close it.
- *Risk* — `HEAD` is branch-relative, so an archive mutation already **committed** on this branch is invisible to `BG-R-10`'s "before and after"; `git merge-base HEAD master` as the diff base would cover it.
- *Readability* — `archive-immutable.ts:125` says "before any git call"; `resolveRepoRoot()` does precede it. Reword to "before the diff checks".
- *Risk (minor)* — the empty-path failure prints the absolute path (embedding the OS username) while the header promises relative paths only.

**Decisions made**
- **Execute-time spec edit, `design.md` §4** (made now, at the Reviewer's advisory): the tree annotated `package.json # name + description changed only` and omitted `archive-immutable.ts` from `guards/`. Both were inaccurate once the guard was wired. Corrected to name the real delta and list the file. No requirement's meaning changes. **Carried as a named conformance check in `BG-T-2`'s Reviewer brief.**
- The three `Risk` advisories are genuine hardening ideas beyond `BG-AC-10`. Per `/akili-execute`'s *Advisory Never Becomes A Task*, they are recorded here and die here; if the operator wants them, they belong in a follow-up proposal, not in this spec's budget.

**Issues encountered** — the `ts-node` dependency inversion in the approved `BG-T-1` text (see *Execute-time spec edits*, Document Control): the task asked for an executed `ts-node` falsifier before `BG-T-2` installs `ts-node`. Split so `BG-T-1` owns the guard source plus the git-level falsifier, and `BG-T-2` owns the executed one.

**Constitution impact** — none. The task adds dev-only tooling under `docs/specs/`, outside both packages; no module was created or reshaped, no public surface changed, and no child `CLAUDE.md` is warranted for a spec folder. CodeGraph re-index is not pending for it (not application source).

**Final verification result** — `VERIFIED` (Leader re-run) + `STATUS: PASS` (independent `opus` Reviewer). Archive byte-identical: `git diff --quiet HEAD -- docs/specs/archive/2026-09-16-changes--user-guide-pdf` → exit 0, `git status --porcelain` on that path → empty.

### `BG-T-2` — Install the tooling, pin the browser channel, verify the copy is verbatim

| Field | Value |
|---|---|
| Status | **PASS** |
| Date | 2026-09-21 |
| Implementer attempts | 1 (clean — no FAIL, no runtime event) |
| Review depth | `checklist` · Reviewer `opus`, Implementer `sonnet`. Reviewer owed under **override (c)**: the verbatim-diff report is derived evidence a later gate (`BG-R-22`) consumes |
| Requirements covered | `BG-R-22`, `BG-R-13` |
| Authored LOC | **0** — `package-lock.json` is generated, `.env` is untracked. Cumulative authored: ~172 of 1,300–1,700. **No tripwire** |
| runtime events | none |

**Files changed:** `tooling/package-lock.json` (new, generated, committed — deliberately not copied from the archive); `tooling/.env` (created, **gitignored, untracked**, credential values empty); `tooling/node_modules/` (installed, gitignored). **No source file changed.**

**Environment finding worth carrying forward.** The **bundled** Chromium downloaded successfully here — Chrome for Testing 153.0.8010.12 — and the system `chrome` channel also launched. This **contradicts the W1/W2 run six days earlier**, where `cdn.playwright.dev` was unreachable and `PLAYWRIGHT_CHANNEL=chrome` was mandatory. `PLAYWRIGHT_CHANNEL` is therefore left **empty** in `.env`, with `.env.example`'s escape hatch intact as a fallback. The operator's Playwright memory has been corrected from "CDN blocked" to "probe, never assume".

**Proof of browser capability — a launch, not a version string.** The Implementer wrote a throwaway script that launches headless, opens a page, sets content, reads it back and closes, then deleted the script (`src/_launch-check.ts` confirmed absent by both the Leader and the Reviewer). Results: `LAUNCH_OK channel=bundled` and `LAUNCH_OK channel=chrome`. A version string would have been a presence-assertion, which proves a binary exists and not that it runs.

**Falsifier (a) — compile gate, executed.** Baseline `npx tsc --noEmit` exit 0 → injected `const __deliberateTypeError: string = 42;` into `src/tokens.ts` → **exit 2, `TS2322: Type 'number' is not assignable to type 'string'`** → reverted → exit 0. This closes the compile-gate class in which a runner that erases type-only imports let 169 green tests sit on code that never compiled.

**Falsifier (b) — the carried `BG-T-1` item: the guard, executed for the first time.** `ts-node` exists only from this task on, so every prior check of the guard was simulated with raw git. Three runs of `npx ts-node src/guards/archive-immutable.ts`:

| # | Archive state | Result |
|---|---|---|
| 1 | clean | `[guard:archive] OK — 32 file(s) … clean and fully tracked.` exit **0** |
| 2 | one byte touched, unstaged | `FAIL … modified/deleted tracked file(s): … src/tokens.ts` exit **1** |
| 3 | same change **`git add`-ed** | **still exit 1**, same file named — the staged case the guard was fixed for |

Archive then restored; `git diff --quiet HEAD -- <archive>` exit 0, `git status --porcelain` empty, guard green again.

**Leader evidence re-run (non-author, mechanical) — `VERIFIED`.** Six checks, all matching: `tsc` exit 0; `.env` ignored; `diff -r --exclude=guards` on `src/` identical (the check that matters, given the inject-and-revert into `src/tokens.ts`); guard exit 0 on a clean archive; `_launch-check.ts` absent; tooling `git status` shows only `?? package-lock.json` with no `.env`.

**Reviewer verdict — `STATUS: PASS`.** Verified the copy independently by line count per file against the archive (`auth` 223, `annotate` 537, `assemble` 449, `capture` 323, `verify-structure` 218, `pdf` 101, `tokens` 181, `template/guide.css` 409, `guide.html` 143, `README.md` 132, `.gitignore` 20, `.env.example` 20, `tsconfig.json` 19) and read `src/tokens.ts` in full on both sides — line-for-line identical, and a grep for `__deliberate|launch-check` over `tooling/src` returns zero, so the inject-and-revert left no residue. Lockfile audited without reading its body: same five devDependencies as `package.json`, no `dependencies` block, 24 `node_modules/*` entries (same count as the archive's lockfile), every `resolved` URL on `registry.npmjs.org`, and zero matches for `_auth`, `authToken`, `password`, `credentials`, `TEST_TOKEN` or `Bearer`. Confirmed conformance to **`design.md` §4 as amended in `BG-T-1`**.

The Reviewer also corrected the Leader: the brief said "four devDependencies"; there are **five**. No impact on the audit — recorded because a miscount in a brief is how a wrong number travels.

**`CLIENT_BASE_URL` judgment call — upheld, no correction.** The Implementer read "leave every value EMPTY" as "do not fill in credentials or the channel yourself" and kept `.env.example`'s own committed, non-secret default `http://localhost:4200`. The Reviewer judged this defensible: the task says create `.env` **from** `.env.example`, `BG-R-13` constrains tokens and credentials rather than a localhost origin, and the value matches `docs/infrastructure.md` §6. Blanking it would have diverged from the instruction as written.

**`ADVISORY` (recorded, never gating, never minted into a task):**
- *Readability* — `design.md` §4's tree did not list `package-lock.json`, though `BG-T-2`'s *Files (expected)* names it and it now exists. Documentation drift, not a conformance break.

**Decisions made**
- **Execute-time spec edit, `design.md` §4** (made now): added `package-lock.json` to the tree, annotated "generated by BG-T-2; committed (not copied)". Second §4 accuracy fix in two tasks; both came from Reviewer advisories. No requirement's meaning changes. **Carried as a named conformance check in `BG-T-3`'s Reviewer brief.**
- `PLAYWRIGHT_CHANNEL` left empty rather than pinned to `chrome`, because pinning it would encode a constraint that no longer holds and would silently prevent the bundled browser from being used.

**Issues encountered** — none.

**Constitution impact** — none. Dev-only tooling under `docs/specs/`, outside both packages; no module created or reshaped.

**Final verification result** — `VERIFIED` (Leader re-run) + `STATUS: PASS` (independent `opus` Reviewer). Archive byte-identical; `.env` untracked and ignored; no credential in any tracked artifact.
