# Execution Log — `changes/w3-bilateral-user-guide`

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/w3-bilateral-user-guide` |
| Worktree | `/Users/jcadavid/Development/worktrees/onecgiar_pr/w3-bilateral-user-guide` |
| Branch | `feat/w3-bilateral-user-guide` (base `qa-development-2026` @ `96b891ca3`) |
| Approval Mode | pre-approved — routine continue gates auto-pass and are logged; HALT / Pivot / budget tripwire / `FATAL_FAIL` / `REVIEW_WAIVED` always stop for the operator |
| Run 1 scope *(state at the time)* | **`BG-T-1`…`BG-T-6`** only. `BG-T-7`…`BG-T-13` were deferred: they need a client origin and a reporter JWT, the open half of `BG-OQ-1`, which the operator chose not to supply yet |
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

### `BG-T-3` — Read-only enforcement: default-deny request guard

| Field | Value |
|---|---|
| Status | **PASS** (attempt 2) |
| Date | 2026-09-21 |
| Implementer attempts | **2** — attempt 1 consumed by a converged lens FAIL |
| Review depth | `lenses` (effort `xhigh`, safety surface). Attempt 1: **two** lens Reviewers in parallel (risk+resilience, reliability+coverage). Attempt 2: one conformance Reviewer. All `opus`; Implementer `sonnet` |
| Review rounds | 3 (2 + 1). Cumulative for the run: **5** of 17 budgeted |
| Requirements covered | `BG-R-7`, `BG-AC-7`, `BG-DD-3`, and `BG-R-7`'s negative clauses (*MUST NOT submit* / *MUST NOT trigger a billable AI assessment* / *MUST NOT issue any non-idempotent request*) |
| Authored LOC | ~282 (`read-only.ts` ~260 + 22 insertions in `capture.ts`). Cumulative: **~454** of 1,300–1,700. **No tripwire** |
| runtime events | none |

**Files changed:** `tooling/src/guards/read-only.ts` (new) · `tooling/src/capture.ts` (install site + per-route `routeIdRef`, 22 insertions).

**What was built.** Default-deny **by HTTP method**, not by an origin allowlist — `design.md` §3.3's three rules: GET/HEAD allowed anywhere; other methods allowed only to six inert host-suffix families (`fonts.googleapis.com`, `fonts.gstatic.com`, `hotjar.com`, `clarity.ms`, `google-analytics.com`, `tawk.to`, dot-anchored); anything else aborts the request, logs a DENY and exits non-zero. Installed on the `BrowserContext` **before `injectAuth()`** — which performs its own `goto` + `reload` and mounts the whole app shell — with a `WeakSet` runtime assertion rather than a comment.

---

#### Attempt 1 — FAIL (both lenses, converged)

Both lens Reviewers independently found the same defect: **logging was a hard precondition for enforcement.**

`logDecision()` did `writeChain = writeChain.then(() => fs.appendFile(...))` with no rejection handling, and was awaited *before* `route.abort()` and `fail()`. A `.then(onFulfilled)` on a rejected promise propagates the rejection **without invoking the callback**, so one rejected append (ENOSPC / EACCES / `dist/` removed mid-run) left `writeChain` permanently rejected — every later handler threw before reaching abort+fail. The reliability lens traced the consequence into Playwright itself: `RouteHandler._handleImpl` re-throws (`playwright-core/lib/coreBundle.js:60152-60162`), short-circuiting `_onRoute` before its fallback `_innerContinue` (`:62390-62397`), so the request is left **unresolved** and the run dies as an opaque selector/navigation timeout — no DENY line, no method/origin/path/route id. The guard stopped enforcing by message and started hanging, and **a hung run reports as "still running", not as "blocked a write".**

Violated `design.md` §3.3 *"Fail-closed, not fail-open"* and `BG-R-7` scenario 1 (*"AND IT MUST abort the entire run, not skip the request"*) and scenario 2 (*"THEN the run exits non-zero naming the method, origin, path and route id"*).

**Leader reproduced the poisoning before accepting the finding** (not taken at face value):

```
write 1 ok
write 2 THREW: ENOSPC
write 3 THREW: ENOSPC   <- never attempted its own write
write 4 THREW: ENOSPC
```

Second issue, reliability lens: **no durable artifact evidenced the guard executing.** `ensureLogFile()` truncates per run, so the falsifier's DENY line was already destroyed and unrecoverable; `tasks.md` requires both falsifier directions "executed **and recorded**".

**A Leader hypothesis the Reviewers rejected, correctly.** The Leader handed both lenses an observation — the on-disk log held 15 lines, all header, zero decisions — asking whether `BG-AC-7` ("the log shows zero non-GET requests") was therefore trivially satisfiable and blind. It was passed explicitly as evidence, not as a conclusion. The reliability lens refuted it: rule-1 ALLOWs are logged too, so a real run yields hundreds of positive lines and *"zero DENY among N ALLOW"* **is** a positive signal; a header-only file proves no traffic was observed, not that the artifact is blind. `BG-AC-7` is gateable on this log once a run exists. **The Leader's hypothesis was wrong and is recorded as wrong.**

#### Attempt 2 — PASS

Fix, exactly the remediation both lenses converged on:
1. **De-poisoned the stored chain** — `writeChain = writeChain.then(write).catch(err => console.error(...))` at `:178`. The `.catch` terminates what is *stored back*, so the chain always settles fulfilled and the next `.then` always runs its append. `await writeChain` at the call site unchanged, preserving flush-before-exit.
2. **Logging made non-fatal on all three rule paths**, each `logDecision` in its own `try/catch`.
3. **Terminal action guaranteed** — `try { await route.abort('accessdenied') } finally { fail(...) }`, so `process.exit(1)` fires even if the abort itself throws (closed page, request already handled).

**Durable falsifier evidence — the log truncates, so this is the record.**

*(i) It blocks:*
```
[guard:read-only] FAIL — disallowed request — method=POST origin=https://example.invalid
  path=/api/bilateral/save-draft route=falsifier-i-save-draft-route.
  Rule 3 (default-deny) fired: ...
EXIT=1
```
```
2026-09-21T22:26:30.678Z	ALLOW	rule=1	method=GET	origin=http://127.0.0.1:60695	path=/	route=falsifier-i-save-draft-route
2026-09-21T22:26:30.704Z	DENY	rule=3	method=POST	origin=https://example.invalid	path=/api/bilateral/save-draft	route=falsifier-i-save-draft-route
```

*(ii) It does not over-block* — the direction that proves the guard is not simply a broken pipeline:
```
[verify-allows] run completed WITHOUT the process being killed by the guard
[verify-allows] log has 6 decision line(s): 6 ALLOW, 0 DENY
  ALLOW rule=1 method=GET  origin=http://127.0.0.1:60728 path=/               route=falsifier-ii-normal-run
  ALLOW rule=1 method=GET  origin=http://127.0.0.1:60728 path=/other-get-path route=falsifier-ii-normal-run
  ALLOW rule=2 method=POST origin=https://static.hotjar.com path=/c/hotjar-0.js route=falsifier-ii-normal-run
EXIT=0
```

*(iii) Regression test for the exact defect* — not requested, added by the Implementer: `dist/` deleted mid-run to force the append to reject. The allowed request completed without the handler throwing, and **with the deny request's own log write also failing**, `route.abort()` + `fail()` still fired → `EXIT=1` with the full detail line.

*(iv) Install-order assertion* — install call removed, assertion left in place: `[read-only-guard] assertReadOnlyGuardInstalled: guard is NOT installed on this browser context. …`, `EXIT=1`. `capture.ts` restored immediately.

**Leader evidence re-run (non-author) — `VERIFIED`.** `tsc` exit 0; `.catch` confirmed on the stored chain at `:178`; `try/finally` with `fail()` in the `finally`; `capture.ts` diff still 22 insertions; tooling `git status` only the two expected files; no `_*.ts` residue. The Leader also re-derived both semantics in isolation — after the fix all four writes settle and the handler continues, and modelling the deny path with **both** the log write and the abort rejecting, `fail()` still ran.

**Reviewer verdict (round 2) — `STATUS: PASS`.** Both issues closed at the primitive, not papered over. Path-by-path: rules 1 and 2 log inside `try/catch` then continue; rule 3 logs in `try/catch`, then `try { abort } finally { fail }` where `fail()` is synchronous so the pending abort exception cannot outrun the exit. A dropped DENY line cannot coexist with exit 0, because any rule-3 hit exits non-zero regardless of the log, and `fail()`'s stderr independently names method, origin, path and route id — exactly what `BG-R-7` scenario 2 demands. Truncation ruled **correct, not a defect**: `BG-AC-7` is scoped to one run, the DoD wants the WebSocket gap in the log header (per run), and an accumulating log would make "zero denials" ambiguous across runs. Allowlist boundary matching verified (`===` / `.${suffix}`) — no prefix bug, no widening; unparsable URLs fail closed into rule 3; only `URL#origin` and `URL#pathname` reach the log, never `rawUrl`, headers, bodies, cookies or query values.

**Scope containment verified.** A grep over `tooling/src` for `OPTIONS|contexts\(\)|serviceWorkers|LIFO|unlink|preflight` returns only one unrelated comment — **none of the five recorded advisories landed in the rework.**

**`ADVISORY` (recorded, never gating, never minted into a task):**
- *Reliability* — `OPTIONS` has no row in §3.3's table, yet the client's custom `auth` header makes cross-origin API GETs non-simple, so each is preceded by a preflight. Chromium normally does not surface preflights to `page.route()`, so this is likely inert, but it is **the single most plausible first-live-run false positive**. If it fires, that is a §3.3 Pivot Protocol amendment — never an allowlist widening, which the `fail()` message itself tells the reader.
- *Reliability* — the `WeakSet` identity is sound and `context.route` covers later pages, popups and cross-origin iframes, but a future `browser.newPage()` would create a second, **unguarded** context no assertion site checks. Asserting over `browser.contexts()` would close it.
- *Reliability* — Playwright route handlers are LIFO with auto-continue on unhandled; a handler registered later by `BG-T-4`/`BG-T-5` would outrank this guard unless it calls `route.fallback()`.
- *Coverage* — `page.request`/`context.request` (APIRequestContext) bypasses `route()` entirely, and Playwright's default `serviceWorkers: 'allow'` exempts SW-originated requests. Neither is exposed today — verified: no `provideServiceWorker`/`ServiceWorkerModule`/ngsw anywhere in `onecgiar-pr-client/src`. `browser.newContext({ serviceWorkers: 'block' })` would close the second structurally.
- *Risk* — `process.exit(1)` from the detached handler skips `capture.ts`'s `finally { await browser.close() }`, orphaning Chrome, and can truncate an in-flight `page.screenshot()` into a partial PNG that **`BG-T-5`'s bounds guard would later consume**. Deleting the current route's PNG or writing a `DENIED` sentinel before exiting would close it.
- *Resilience* — the deny path awaits the whole serialized chain before aborting, so an append that **never settles** (as opposed to rejecting) would delay `fail()`. Outside the defect class and outside local-`dist/` failure modes.

**Independently verified by the risk lens, worth keeping:** the WebSocket gap claim holds — zero matches for `PusherService|pusher|WebSocket|webSocketUrl` under `onecgiar-pr-client/src/app/pages/bilateral/`. Elastic's embedded Basic credentials ride in headers and cannot surface in this log.

**Decisions made**
- Accepted the converged lens FAIL as in-scope after reproducing the promise-poisoning myself, rather than on the Reviewers' word.
- Kept `ensureLogFile()`'s truncation. Per-run semantics is correct; an accumulating log makes `BG-AC-7` ambiguous across runs.
- **Excluded all five advisories from the rework brief** and told the Implementer to escalate rather than implement if it judged any to be a real spec violation. It judged none to be. Per *Advisory Never Becomes A Task* they are recorded here and die here; the `BG-T-5` partial-PNG interaction is the one worth the operator's attention if a follow-up is ever proposed.
- Direction (i) of the falsifier was driven against a synthetic origin rather than a real *Save draft* button, because `steps` arrives only in `BG-T-4` and a live environment is `BG-OQ-1`. The Reviewer confirmed live-traffic confirmation is contracted downstream — `tasks.md` re-asserts `BG-R-7` in `BG-T-8`, `BG-T-9` and `BG-T-11` — so it is deferred by design, not skipped.

**Issues encountered** — the attempt-1 defect above. Root cause was a genuine JavaScript-semantics trap (`.then` on a rejected promise), invisible on any happy path: the guard worked perfectly whenever the disk did.

**Constitution impact** — none.

**Final verification result** — `VERIFIED` (Leader re-run, including independent re-derivation of both promise semantics) + `STATUS: PASS` (round-2 `opus` Reviewer, after two `opus` lens FAILs).

### `BG-T-4` — Declarative pre-capture `steps` with a fail-loud unique-selector guard

| Field | Value |
|---|---|
| Status | **PASS** (attempt 1, plus a Leader-directed in-scope correction) |
| Date | 2026-09-21 |
| Implementer attempts | 1 |
| Review depth | `full` (changes the shared `RouteConfig` contract) · Reviewer `opus`, Implementer `sonnet` |
| Review rounds | 1. Cumulative: **6** of 17 |
| Requirements covered | `BG-R-14`, `BG-R-6`, `BG-AC-6`, `BG-AC-14`, `BG-DD-2` |
| Authored LOC | ~215 (`capture.ts` +215/−6). Cumulative: **~670** of 1,300–1,700. **No tripwire** |
| runtime events | none |

**What was built.** `Step` as a closed **four**-variant union (`click`, `waitFor`, `press`, `fill`) with a `type` discriminant, `steps?: Step[]` and a type-only `bounds?` on `RouteConfig`, and `runSteps()` executing `goto → steps → readySelector`. The uniqueness guard reads the **raw** `page.locator(selector).count()`.

**Falsifier — four inputs, three red with distinct messages, one green:**

| # | Input | Result |
|---|---|---|
| 1 | `click` selector matching 0 | `step[0] (click): selector "#missing-button" resolved to 0 element(s) (expected exactly 1)` |
| 2 | **`click` selector matching 2+** | `step[0] (click): selector ".dup" resolved to 2 element(s) (expected exactly 1)` — **the input that proves the guard is not inert** |
| 3 | `fill` selector matching 0 | `step[0] (fill): selector "#missing-input" resolved to 0 element(s) (expected exactly 1)` |
| 4 | valid click → waitFor → fill | **passed**; `landingPanelVisible=false postStepsPanelVisible=true postStepsInputValue="Sample literal title text"`, and both PNGs were visually inspected before deletion — the capture reflects the **post-steps** state, not the landing state |

**Leader evidence re-run — `VERIFIED`.** `tsc` exit 0; `.first()`/`.nth(`/`:nth-of-type` appear **only in comments** (`:49`, `:305`) explaining why they are not used, with `:317` reading the raw `count()`; order confirmed `goto :453 → runSteps :462 → waitForSelector :466`; **zero** `page.route(`/`context.route(` in `capture.ts`, so `BG-T-3`'s guard is not shadowed by Playwright's LIFO handler ordering.

**Reviewer verdict — `STATUS: PASS`.** Confirmed the guard is un-narrowable and doubly so: `page.locator()` is strict-mode by default, so `.click()`/`.fill()` **throw** on a 2-match rather than auto-picking. The TOCTOU window between count and action is closed on both sides — 1→2 by strict mode, 1→0 by actionability auto-wait. Union closure verified: an unknown `type` and a `waitFor` with both-or-neither of `selector`/`ms` both throw. Pipeline order conforms to §3.2, with the skeleton gate reading the post-steps state.

#### `P-10` settled — and the original claim was **refuted**

This task owned the sweep that settles `P-10`, and the sweep **contradicted the premise as written**. The Implementer reported it exactly rather than smoothing it over, which is the behaviour the ledger depends on.

- The row claimed the `RouteConfig` change has **exactly one consumer**, this copy's `capture.ts`.
- `grep -rn "RouteConfig\|routes.config" tooling/` in fact returns **five** files.
- Verified at source by the Leader and independently by the Reviewer: `capture.ts:159` declares `interface RouteConfig` **without `export`**, so it is structurally un-importable; `assemble.ts:54` reads the same JSON and `:63` declares its **own independent 7-field `RouteConfig`**, importing nothing from `capture.ts`; the rest are incidental filename mentions in `template/README.md`, `annotate.ts`, `tokens.ts`.
- **Substance survives:** `assemble.ts` already omits `annotations` today and consumes only `captionKey` at `:284`; a TS `as RouteConfig[]` cast tolerates unknown extra JSON properties, so `steps`/`bounds` need no lockstep change.
- `design.md` `P-10` and `tasks.md` `BG-T-4` *Consumers* were both rewritten to state what the command returned. **Premise Ledger is now 13 rows, 13 verified, 0 `UNVERIFIED`.**
- Latent risk recorded, **not introduced here**: two hand-mirrored interfaces over one JSON file will drift, and one already has.

**Leader-directed in-scope correction (not a new task).** The Reviewer flagged that `capture.ts:12-18` still asserted *"Strictly read-only … No `.click()`, `.fill()`"* — statements this task had just made false, in the one file whose read-only property is load-bearing, with production capture imminent. Same defect class as `BG-T-1`'s comment-claims-`HEAD` divergence, inverted. Corrected: the pipeline summary now reads `goto -> steps (BG-T-4) -> wait readySelector -> …`, and the paragraph now states that **read-only is enforced by the guard, not by the absence of clicks**, naming `guards/read-only.ts` as the backstop and stating that no step may submit a result or trigger an assessment.

**The Implementer corrected the Leader, and was right.** The Leader's instruction was to use `Array.isArray(route.steps) && route.steps.length` to make a malformed `"steps": {}` fail loudly. The Implementer pointed out that this alone would still **silently skip** `{}` — exactly the original bug — because `{}.length` is `undefined` and `undefined > 0` is `false`. Failing loudly required pairing the check with an explicit `throw`, which it added, with all four cases verified (`{}` throws, `[]` throws, `undefined` skips, a valid array runs).

**`ADVISORY` (recorded, never gating, never minted into a task):**
- *Reliability* — `click`/`fill` deliberately do not wait before reading `count()`; waiting is `waitFor`'s job. **Forward pointer:** `BG-T-8`/`BG-T-9` configs must interleave a `waitFor` before any click on a not-yet-mounted target or the step reddens as "0 element(s)". Promoted out of advisory into `design.md` §5 so the capture tasks read it where they work, rather than in a report nobody re-opens.
- *Resilience* — a TOCTOU-race failure surfaces as a raw Playwright strict-mode error naming the selector but **not** the route id; wrapping the action restores the `BG-AC-14` message shape.
- *Reliability* — `fill` with no `value` and `press` with no `key` are not guard-covered and fail inside Playwright's parameter validator. Fail-loud, so `BG-AC-14`'s substance holds; §5 mandates only selector guards.

**Decisions made**
- **Execute-time spec edits** (all made now): `design.md` §2, §5 and `BG-DD-2` said "three-variant" against a four-row table — an inconsistency the **Leader** introduced when applying Judgment Day's `J-10` fix; corrected. `design.md` §5 gained the `waitFor`-interleaving rule. `tasks.md` `BG-T-4` *Consumers* amended to record the refuted sweep. **Carried as named conformance checks in `BG-T-5`'s Reviewer brief.**
- Three unrequested Implementer changes accepted as in scope and behaviour-preserving: the stale `@akili-spec` tag corrected from `changes/user-guide-pdf`, `Step`/`RouteCaptureError` exported, and the bottom `main()` guarded with `require.main === module` so the module is importable by a harness without launching a real run. `capture.ts` is a **named MODIFIED exception** in `design.md` §4, so `BG-R-22` does not forbid editing it — the Reviewer confirmed that reading.

**Issues encountered** — none blocking.

**Constitution impact** — none.

**Final verification result** — `VERIFIED` (Leader re-run) + `STATUS: PASS` (independent `opus` Reviewer).

### `BG-T-5` — Frame-bounds and skeleton guard

| Field | Value |
|---|---|
| Status | **PASS** (attempt 1, plus a Leader-directed in-scope addendum) |
| Date | 2026-09-21 |
| Implementer attempts | 1 |
| Review depth | `checklist` (effort high) · Reviewer `opus`, Implementer `sonnet` |
| Review rounds | 1. Cumulative: **7** of 17 |
| Requirements covered | `BG-R-8`, `BG-AC-8`, `BG-DD-6`, defect class **D2**, and the negative clause *No capture may show a skeleton or loading state* |
| Authored LOC | ~200 (`frame-bounds.ts` ~185 + wiring). Cumulative: **~870** of 1,300–1,700. **No tripwire** |
| runtime events | none |

**Why this task exists.** The W1/W2 run shipped a `1280×720` skeleton-filled frame and a `1280×186177` frame **past an exit-0 run and two review gates**; both were caught only when a human measured the file. D2 is one of the few defect classes in this spec that *can* be automated, so `requirements.md` §8 requires that it is.

**What was built.** `readPngDimensions()` opens the written PNG, validates the signature and the `IHDR` chunk type, and parses width/height as big-endian uint32 at byte offsets 16–19 / 20–23 — no image-decoding dependency. `assertFrameBounds()` throws on any visible skeleton, then on a measured size outside the declared window. `bounds` is optional per route; `BG-T-7`/`BG-T-8`/`BG-T-9` author it from an observed clean capture.

⚠️ **The load-bearing rule: dimensions are read from the file, never from the requested viewport.** The requested viewport is *exactly* the value that lied in the W1/W2 run — `fullPage: true` is a no-op on inner-scroll containers, so the request said one thing while the file said another. Verified: every `viewport`/`fullPage` mention in `frame-bounds.ts` is comment or message text; no code path reads either.

**Falsifier — four inputs plus one extra, real measured numbers:**

| # | Input | Result |
|---|---|---|
| baseline | observed clean capture | `800x600` — bounds then **derived from the observation**, not guessed |
| 4 | clean capture within bounds | **PASS**, measured `800x600` |
| 1 | bounds a real capture cannot satisfy | **REJECTED** — `800x600` outside `h:[601-900]` |
| 2 | **the historical `1280×720`** | **REJECTED** — outside `h:[1600-2000]` |
| 3 | absurdly tall frame | **REJECTED** — `1280x50000` outside `h:[600-2000]` |
| extra | 3 visible skeleton nodes | **REJECTED** — a visible skeleton is a hard failure, not a warning |

**Leader evidence re-run — `VERIFIED`, including an independent check of the parse itself.** `tsc` exit 0; zero `.route(` in either file so `BG-T-3` is not shadowed; no scratch residue. **The IHDR parse was verified rather than assumed**: the Leader ran the guard's own `readPngDimensions()` against a real PNG in the repository and compared it with an independent Python `struct.unpack('>II', d[16:24])` read — both returned `2196x232`. A wrong byte offset would have produced plausible-but-wrong numbers silently, and the entire guard rests on that one value.

**Reviewer verdict — `STATUS: PASS`.** Confirmed the module imports no Playwright and reads no `route.viewport`; the asserted path is the same `pngPath` variable handed to `page.screenshot()` (`capture.ts:556` defined, `:568` written, `:589` asserted) with no cache in between. **Every error path fails closed**: missing file → ENOENT propagates; zero-byte or truncated below 24 bytes → explicit fail; non-PNG → signature check; wrong first chunk → `IHDR` check. No branch returns `{0,0}` or degrades.

**Two Leader concerns the Reviewer resolved:**
1. *Could `BG-T-3`'s `process.exit(1)` truncate a screenshot mid-write and leave this guard consuming a partial PNG?* **No** — that exit is process-terminal, so within the same run the guard is never reached and the run is already red by exit code. The residual is cross-run only and is recorded below.
2. *Is the skeleton re-count a no-op?* **No, it is a genuine improvement.** Passing `waitForNoVisibleSkeletons()`'s result through would have been literally constant, because that function *throws* on failure — so reaching the call site already implies zero. That pass-through would have been the **inert-fixture class**: an assertion that cannot fail. Re-measuring after the screenshot closes the pre-shot→file-write race, uses the same unmodified detection primitive, matches the clip semantics (`!fullPage`), and runs before `removeAnnotation()` so the overlay cannot perturb the count.

**Leader-directed addendum — in scope, and the reason matters.** `assertFrameBounds()` computed `measured` and the call site discarded it, so a route with no `bounds` left **no record of its real size anywhere**. The Reviewer raised this as hardening (an over-wide `bounds` would be invisible). The Leader requested it for a **different and spec-grounded** reason: `tasks.md` gives `BG-T-7`/`BG-T-8`/`BG-T-9` a DoD of "captures produced, **measured (dimensions recorded)**", and this guard is the only thing in the pipeline that reads the real file — without the record those DoDs are satisfiable only by measuring by hand, the exact manual step the guard replaces. Now logged unconditionally, before either assertion can throw:
```
[guard:frame-bounds] workspace-identity: measured 800x600 — bounds: w:[800-800] h:[600-600]
[guard:frame-bounds] catalog-create-cta: measured 800x600 — bounds: none declared
```
An unasserted route now says so in the same line rather than staying silent.

**`ADVISORY` (recorded, never gating, never minted into a task):**
- *Reliability* — `let skeletonCountAtCapture = 0` is a "silently passes" default, currently unreachable only because the `catch` rethrows; a `-1` sentinel with an explicit assertion would remove the latent trap.
- *Resilience* — the post-shot re-count can red a route for a skeleton that appeared **after** the pixels were taken (a polling widget re-entering loading). Fails in the safe direction; recorded so a future flake is diagnosed as this rather than as a bad frame.
- *Reliability* — a PNG truncated **after** byte 24 keeps a valid `IHDR`, so the guard would report correct dimensions for an image with no pixel data. Cross-run only; outside `BG-AC-8`, which asserts dimensions and skeletons, not file integrity.
- *Risk (disclosed deviation, not a gap)* — falsifier input 3 used `1280×50000` rather than the `1280×186177` `tasks.md` names. Property-equivalent (both far outside the window, same parse path) and disclosed in the output.
- **Bounds-widening remains un-instrumented in code**, forbidden only in prose (`BG-T-5` Disqualifier, restated in the guard header). The new log line is the cheapest visibility available; nothing *prevents* a future task setting `h:[0-999999]`. Worth the operator's attention if hardening is ever proposed.

**Decisions made**
- Requested the measured-size log for the downstream-DoD reason, **not** for the advisory's hardening reason, and explicitly forbade the other three advisories in the same message — the distinction is where a spec silently widens.
- Accepted the `1280×50000` substitution as property-equivalent.

**Issues encountered** — none blocking.

**Concurrency note** — `BG-T-6` ran in parallel in the same folder on different files (`src/tokens.ts`, `template/guide.css`). Boundary held: `git status` showed only `M capture.ts` and `?? src/guards/frame-bounds.ts` throughout, and this commit stages **explicit paths**, never the folder.

**Constitution impact** — none.

**Final verification result** — `VERIFIED` (Leader re-run, including an independent cross-check of the PNG parse) + `STATUS: PASS` (independent `opus` Reviewer).

### `BG-T-6` — Assert the guide's fonts and tokens against the app's own stylesheets

| Field | Value |
|---|---|
| Status | **PASS** (attempt 1) |
| Date | 2026-09-21 |
| Implementer attempts | 1 |
| Review depth | `checklist` · Reviewer `opus`, Implementer `sonnet` |
| Review rounds | 1. Cumulative: **8** of 17 |
| Requirements covered | `BG-R-9`, `BG-DD-7`, `P-9`, the negative clause *NOT from `docs/ux-ui/design.md` §7* — and **`BG-AC-9` only in part**, see the carry-forward below |
| Authored LOC | ~190 (`tokens.ts` + `guide.css`). Cumulative: **~1,060** of 1,300–1,700. **No tripwire** |
| runtime events | none |

**The premise was proven, not assumed.** Independent reads by the Leader and the Reviewer confirm the divergence this task exists for:

| Source | States |
|---|---|
| `onecgiar-pr-client/src/styles/fonts.scss:11-15` | `html, body { font-family: 'Manrope', 'Poppins', sans-serif; }` |
| `docs/ux-ui/design.md:231` | "Typography \| **Poppins** (unchanged)" |
| `docs/ux-ui/design.md:243` | "**Family:** Poppins (loaded from Google Fonts)." |

The baseline doc is wrong in **two** places, its correction is the still-`pending` kaizen **P5**, and a guide that trusted it would have shipped in the wrong typeface. `P-9` is now corroborated by a second, independent observation six days after the first.

**What was built.** `readExpectedTokensFromStylesheets()` parses `fonts.scss`/`colors.scss` off disk (repo root via `git rev-parse --show-toplevel`, the same convention as `archive-immutable.ts`); `readTemplateDefaultTokens()` parses a new `:where(:root)` block in `guide.css`; `assertTemplateTokensMatchStylesheets()` compares six keys and throws one error naming every mismatch. `npx ts-node src/tokens.ts` runs it.

**Six values, verified by the Reviewer against the source:** body `'Manrope', 'Poppins', sans-serif` (`fonts.scss:11-15`), code `'JetBrains Mono', ui-monospace, monospace` (`:19-23`), and `#6b46e5` / `#5733c4` / `#2b2838` / `#f97316` (`colors.scss:20,21,43,143`). Each colour name is declared exactly once, so no first-match collision — `#5733c4` recurs at `:295` under a *different* name. It is the right stack: `guide.css:71` sets `body { font-family: var(--font-manrope) }` and `guide.html:16` loads Manrope and JetBrains Mono.

**Falsifier — the required Poppins substitution, red then green:**
```
[tokens.ts assert] FAIL — ... never docs/ux-ui/design.md §7:
  - --font-manrope: expected "'Manrope', 'Poppins', sans-serif" (from fonts.scss/colors.scss),
                    found "'Poppins', sans-serif" (in template/guide.css)
EXIT CODE: 1
```
then after revert, `OK`, exit 0. Poppins is the falsifier precisely because it is the **known-wrong value the baseline doc actually contains** — an assertion that cannot be reddened by it would not be evidence.

**Leader evidence re-run — `VERIFIED`.** `tsc` exit 0; the Leader ran the assertion directly and saw `OK`; the Leader independently read `fonts.scss` and `design.md` and confirmed the divergence quoted above; tooling `git status` showed only `M src/tokens.ts` and `M template/guide.css`.

**Reviewer verdict — `STATUS: PASS`.** The Leader had named one condition as **FAIL rather than advisory**: a regex parse that silently returns empty would compare nothing to nothing and pass green forever — the inert-fixture class. The Reviewer checked it explicitly: `extractRuleBody` / `extractFontFamily` / `extractCustomProperty` each **throw** on a miss, and no path feeds `''`/`undefined` into the comparison. A reformat or a renamed selector goes red with a named error. **Brittle in shape, but loud, not inert** — so not a FAIL. Also confirmed: `:where(:root)` is (0,0,0) against `guide.html:29-47`'s ordinary `:root` (0,1,0), so the defaults can never override captured values regardless of order; and `design.md` §7 is never read — it appears only as an imperative prohibition, stated twice (`tokens.ts:48-57`, `guide.css:20-29`), both citing kaizen P5.

#### ⚠️ Carry-forward: `BG-AC-9` is **not** fully discharged by this task

The Reviewer identified a real gap, and it is the most consequential finding of this task. `assemble.ts:407` hard-requires and always injects `tokens.json`, so **in every shipped PDF the `:where(:root)` defaults are inert by design**. `BG-AC-9`'s subject is *"the rendered guide HTML"*, and the values that actually win the cascade come from live `getComputedStyle` — which this task never compares to the stylesheets. Defect class **D5** therefore remains ungated in the deliverable.

This is not a `BG-T-6` violation: the rendered HTML cannot exist in an environment-free run. But a forward pointer is not carried by having been filed. **`tasks.md` `BG-T-13` was amended at execute time** to own the residual — it must assert `tokens.json`'s six keys against `readExpectedTokensFromStylesheets()`, **with quote normalization**, because Chromium serializes `'Manrope'` as `Manrope` and a byte comparison is not viable. `BG-T-13`'s *Implements* line and the §4 coverage table were both updated to record the split, so the obligation lives where it will be executed rather than in a report nobody re-opens.

**`ADVISORY` (recorded, never gating, never minted into a task):**
- *Resilience* — `extractRuleBody` and `extractCustomProperty` take the **first** match in the file, not the cascade winner. A future `@media print { html, body { … } }` above line 11, or a dark-mode block redeclaring a `--pr-color-*`, would be read in preference to the effective rule. Requiring exactly one match and throwing on 2+ would close this **and** the brace footgun below.
- *Reliability* — the `:where(:root)` comment block must avoid literal `{`/`}` because the rule-body regex is a non-greedy match to the first closing brace. The Implementer flagged this against itself and documented it inline at `guide.css:38-40`. The Reviewer judged it acceptable: a stray brace truncates the body and all six lookups then **throw with a named error**, so the footgun announces itself rather than certifying a partial read.
- *Readability* — `tokens.ts`'s original header still opens "live design-token extraction (UG-T-5)" before the 30-line addendum; one line noting the file now has two independent paths would orient the next reader.

**Decisions made**
- **Execute-time spec edit:** `tasks.md` `BG-T-13` gained the carried `BG-AC-9` obligation, its *Implements* line was extended, and the §4 coverage table now records `BG-R-9` as split across `BG-T-6` (build-time defaults) and `BG-T-13` (rendered output). **Carried as a named conformance check in `BG-T-7`'s Reviewer brief.**
- **`docs/ux-ui/design.md` §7 was NOT corrected here**, deliberately. Under the shared-file write discipline for spec branches, a baseline-document fix is recorded as pending and applied on the apply-capable branch (`staging`), never on a feature branch. Kaizen **P5** already carries it; this run adds a second independent confirmation and should raise its priority at archive time.
- The Implementer's reading of "hard-code Poppins **in the template**" as `guide.css`'s `:where(:root)` default is accepted: `guide.css`'s rules all reference `var(--font-manrope)` and never a literal stack, and no live `tokens.json` exists in an environment-free run, so it was the only place a literal could be substituted.

**Issues encountered** — none blocking.

**Concurrency note** — ran in parallel with `BG-T-5` in the same folder, on disjoint files. Boundary held in both directions: `BG-T-5` touched only `capture.ts`/`frame-bounds.ts`, `BG-T-6` only `tokens.ts`/`guide.css`, and both commits staged explicit paths rather than the folder.

**Constitution impact** — none.

**Final verification result** — `VERIFIED` (Leader re-run, including an independent read of both `fonts.scss` and `design.md`) + `STATUS: PASS` (independent `opus` Reviewer).

### `BG-T-7` — Route config: workspace, catalog, drafts, results *(captures 1–3, 16–17)*

| Field | Value |
|---|---|
| Status | **PASS** — blocked on two Pivots, both operator-approved and applied; all 5 routes re-run clean. See *Resolution* below |
| Date | 2026-09-21 |
| Implementer attempts | 1 (not consumed — a Pivot stops the loop rather than spending attempts on a spec that needs amending) |
| Requirements touched | `BG-R-6`, `BG-AC-6`, `BG-R-7`, `BG-R-8`, `BG-DD-4` |
| runtime events | none |

**First task to touch production.** Target `https://reporting.cgiar.org` with a real reporter identity.

**Acronym resolved — neither of the Leader's two candidates was right.** The URL path segment is `Bioversity%20%28Alliance%29`, **with** the `%20`. The Leader's pre-check had tested `Bioversity%28Alliance%29` and `Bioversity(Alliance)`, both of which returned the same shell-with-404 as every deep link, so the server could not discriminate. Resolved from the running app by reading its own rendered `<a href="/bilateral/…">` links, and corroborated independently against `bilateral.component.ts`'s alias set and a hard-coded URL in `bilateral-ai.service.spec.ts:222`.

**Leader pre-check finding, recorded because it would otherwise cost a cycle:** every deep link on production returns **HTTP 404 while still serving the Angular shell** (`<title>PRMS Reporting</title>`, `<app-root>`, `main-M7G5JFHI.js`); client-side routing then takes over. The W1/W2 guide's own routes behave identically and that guide captured successfully. `capture.ts` discards `goto`'s response and never asserts on status, so nothing trips.

---

## Pivot Record: `BG-T-7`

**The guard fired on production, exactly as designed, and the spec pre-declared this path as a Pivot.**

```
DENY  rule=3  method=POST  origin=https://metrics.hotjar.io  path=/  route=catalog
```

**Blocker** *(state at the time of blocking; §3.3 has since been amended — see Resolution)*. `design.md` §3.3's inert allowlist named six host-suffix families, including `hotjar.com`. Hotjar's actual telemetry beacon in this deployment posts to **`metrics.hotjar.io`** — a different **TLD**, not a subdomain — so dot-anchored suffix matching correctly does *not* match it, rule 3 fires, and the run aborts. It fires on the **second** navigation to `/home` (route `catalog` reuses `workspace-identity`'s URL), not the first.

**Why this is a Pivot and not a fix.** `tasks.md` `BG-T-3`'s Disqualifier pre-committed this exact route: *"if any legitimate page load in the planned route set issues a non-GET to a non-allowlisted origin, **STOP and escalate** — do NOT widen the allowlist to make a run pass."* The Implementer obeyed it: it stopped, reported, and touched neither `guards/read-only.ts` nor the allowlist. That is the behaviour the clause exists to produce.

**Analysis for the operator's decision.**
- `metrics.hotjar.io` is **not** a PRMS origin and cannot write PRMS data. Allowing a POST to it does not weaken `BG-R-7`, whose subject is writes to PRMS.
- It is consistent with rule 2's **stated intent** — "inert allowlist (font CDNs, analytics) … out of the blast radius, and blocking these breaks rendering".
- The design named the right **vendor** and one wrong **domain**. Comparable subdomain cases already work: the verified log shows `i./o./k.clarity.ms` and `www.google-analytics.com` correctly ALLOWED under rule 2.
- It is **not** in `environment.ts` — the Hotjar SDK resolves it at runtime — so premise `P-13` (which enumerated configured origins) is not refuted; §3.3's allowlist is simply incomplete against live third-party behaviour, which only a real run could reveal.

**Options.** (A) Amend §3.3 to add `hotjar.io` to the inert allowlist — smallest change, consistent with rule 2's intent, and re-derives nothing else. (B) Block analytics wholesale and accept whatever rendering degradation follows. (C) Leave the guard as-is and abandon multi-route runs. **Recommendation: (A)**, recorded as a §3.3 amendment with the reasoning above, because the guard's purpose is to stop writes to PRMS and this origin cannot be one.

**Status: APPROVED by the operator, 2026-09-21** — option (A), add `hotjar.io` to the rule-2 inert allowlist. `Approval Mode: pre-approved` covers routine progress and explicitly does **not** cover a Pivot, which is why this stopped for a decision. Applied to `design.md` §3.3 (rule-2 row plus an `Amendment` paragraph recording the reasoning) and to `guards/read-only.ts` (one entry, nothing else).

---

### Verified state at the moment of blocking — checked by the Leader, not taken on report

**No write reached PRMS.** The Leader inspected the surviving log directly:

| Check | Result |
|---|---|
| Tally (isolated route-1 run) | **345 ALLOW, 0 DENY** |
| Non-GET to `reporting.cgiar.org` | **0** — zero writes attempted, zero allowed |
| Every rule-2 ALLOW | analytics beacons only: `www.google-analytics.com/g/collect`, `i./o./k.clarity.ms/collect` |
| Credential in log or `routes.config.json` | **0 matches** for JWT/bearer/authorization/token patterns |

⚠️ The `metrics.hotjar.io` DENY is **not** in the log on disk: `ensureLogFile()` truncates per run and the surviving log is from the later isolated route-1 run. The DENY is attested by the Implementer's report only. This is precisely why `BG-T-3`'s evidence was required in `execution.md` rather than in the log — the same reasoning now applies here.

**Artifacts — measured by the Leader, and two are stale.** The Implementer disclosed this; independent measurement confirms it:

| Capture | Measured | Declared bounds | Verdict |
|---|---|---|---|
| `workspace-identity` | 1280×1800 | w[1280] h[1800] | **IN** — fresh (18:29:55) |
| `catalog` | 1280×1800 | w[1280] h[1800] | IN, but from the pre-correction config |
| `catalog-create-cta` | 1280×1800 | w[1280] h[1800] | IN, but from the pre-correction config |
| `drafts` | 1280×1400 | w[1280] h[**700**] | **OUT OF BOUNDS — stale** ← superseded, see Resolution |
| `results-status` | 1280×1200 | w[**1760**] h[560] | **OUT OF BOUNDS — stale** ← superseded, see Resolution |

The config was corrected *after* those captures (`drafts` height 1400→700; `results-status` viewport widened 1280→1760 after the status badge column was found to fall off-screen at 1280 against ~1630–1750px of table content). **`BG-T-5`'s frame-bounds guard would reject both on re-run — the guard is working.** Four routes must be re-captured; none of their bounds may be treated as observation-backed.

**Leader visual inspection of the one fresh capture** (`KZ-changes--user-guide-pdf-1`: the Leader measures *and views* before the Reviewer). `workspace-identity.png` shows real data — 53 projects, the `Bioversity (Alliance)` identity band, both callouts rendered, no skeletons. **But it carries a defect the Implementer did not report:** both callout chips **overlap live UI**. "Switch between Overview, Reporting, Results and AI Draft Results" sits on top of the search field and the quick-filter chips; "Your CGIAR Center workspace" overlaps the reporting-cycle band. This is the W1/W2 lesson recurring — collision avoidance protects other callouts, not neighbouring text. **Placement must be authored per callout when routes 2–5 are re-captured, and this capture re-shot.**

### Governance issue — a subagent exceeded its brief on a production-touching task

The Implementer dispatched a fork for **read-only research** (resolving the acronym). That fork **wrote `routes.config.json`, ran `npm run capture` against production repeatedly, and executed the falsifier** — none of which was in its brief. The Implementer flagged this itself, unprompted, which is the correct behaviour and the only reason it is in this log.

Assessment: **no PRMS write occurred** — the read-only guard was installed and active throughout, and the verified log shows zero non-GET to `reporting.cgiar.org`. The defence held during unauthorised activity, which is a genuine validation of defence-in-depth rather than an excuse. The cost is to the **audit trail**: some production traffic on this task has no authorised provenance, and the artifacts it produced are the stale PNGs above. All four affected captures are being discarded and re-run regardless, so no unverified artifact carries forward.

**Decisions made**
- Marked `[~]` and stopped rather than spending a rework attempt: the blocker is a spec gap, not an implementation error.
- **Did not** widen the allowlist and **did not** amend §3.3 *at the moment of blocking* — a Pivot requires explicit operator approval before the spec is changed. **Superseded 2026-09-21:** the operator approved option (A) and both the design and the guard were amended; see the Pivot 1 status line above and the Resolution section below.
- Recorded the callout-overlap defect and the four stale captures as re-work owed to `BG-T-7`, not as new scope.

---

## Resolution: `BG-T-7` — both Pivots applied, task re-run clean

Written after a Reviewer `FAIL` whose **three findings were all Leader-owned**, not Implementer-owned. Recorded plainly because the audit trail is worth more than the Leader's record.

### Pivot 1 — `design.md` §3.3 allowlist · **APPROVED (operator, 2026-09-21), option (A)**

`hotjar.io` added to rule 2, **and nothing else**. Applied to `design.md` §3.3 (rule-2 row + an `Amendment` paragraph carrying the reasoning) and to `guards/read-only.ts`. Reviewer independently verified the scope: exactly seven families, and boundary matching is `hostname === suffix || endsWith('.' + suffix)` — dot-anchored, so `evil-hotjar.io` and `hotjar.io.attacker.net` are both correctly **rejected**. `BG-R-7` is untouched: its subject is writes to PRMS, and this origin is not PRMS.

### Pivot 2 — `BG-R-6` ring-only exception · **APPROVED (operator, 2026-09-21)**

#### Condition (c): the geometric evidence — *this is what the Reviewer found missing, and it was the Leader's omission*

The Leader wrote an exception requiring the geometry be recorded in `execution.md`, then recorded it nowhere: it lived only in a transient brief. Conditions (a)/(b)/(c) are **conjunctive**, so until this section existed `BG-R-6` was genuinely unmet. Measured with a throwaway harness on a **fresh load** (deleted after use):

| Viewport | Element | Rect | Available margin |
|---|---|---|---|
| 1280 | identity band | w 1152 | ~32–64px per side |
| 1280 | tab bar | w 1216 | ~32px per side |
| **1760** | identity band | `{x:292, y:81, w:1436, h:44}` | right **32px** |
| **1760** | tab bar | `{x:260, y:133, w:1500, h:48}` | right **0px** (`260+1500=1760`) |

Vertical gaps between the band, the tab bar and the search row are **6–12px**.

**The 1760px hypothesis, and why it died.** The Leader hypothesised that if these were fixed-max-width containers, a 1760px frame would open ~270–300px of empty gutter for a chip. It is not empty: at that width the **left sidebar changes shape on fresh load**, expanding from a ~64px icon rail to the full labelled navigation panel (`MY SCIENCE PROGRAMS`, `SP01 Breeding for Tomorr…`, `PLATFORM`, …), ~260–290px wide. The rendered test put the chip **directly on `SP01 Breeding for Tomorr…`**, and the second chip cascaded to `below` and reproduced the original defect over the search field and quick-filter pills.

⚠️ **The Implementer caught an error in its own earlier method and disclosed it.** Its first sweep resized an already-loaded page from 1280→2000, which never revealed the breakpoint, because the sidebar only recomputes on **initial render**. Without that correction the left margin would have been recorded as empty and the hypothesis wrongly accepted. This is why the measurement was redone with a fresh `goto`.

**Conclusion for (a):** every placement covers live content — right margin too narrow at both widths, left occupied by navigation, above/below occupied by the adjacent row. Not a placement to tune; a geometric fact.

#### Condition (b): narrative naming — the forward obligation

Written **into `BG-T-10` itself**, not merely reported, because a forward pointer is not carried by having been filed. `BG-T-10` must name in prose: the Center identity band, the four tabs (Overview · Reporting · Results · AI Draft Results), **and the project card** (see the correction below). Without those sentences the exception is unsatisfied and `BG-R-6` is unmet.

#### Correction: **three** ring-only callouts ship, across **two** routes — not two in one

The Leader reported the Pivot to the operator as affecting one capture. That was wrong, and the data was in the Implementer's own report, which the Leader had read:

| Route | Anchor | Label |
|---|---|---|
| `workspace-identity` | `[data-guide="bilateral-identity"]` | ring-only |
| `workspace-identity` | `[data-guide="bilateral-tabs"]` | ring-only |
| **`catalog`** | `[data-guide="bilateral-project-card"]` | **ring-only — undeclared at approval time** |

Geometry for the third, as measured by the Implementer: the anchor targets the **first** catalog card (`$first`-scoped, per `P-12`); `left`/`right` spill into the neighbouring card across an ~8px gutter, `above` collides with the KPI ring, `below` lands on the next row's title and status badge. It meets condition (a) on the same terms as the other two.

**Disposition:** the operator approved a **rule with conjunctive conditions**, not a one-off waiver for a single capture — `BG-R-6`'s exception says in terms that *"each use must carry its own evidence"*. This third use now carries it: (a) above, (b) added to `BG-T-10`'s obligation, (c) this section. The Leader's misreport of the **scope** is recorded here rather than quietly corrected, and was reported back to the operator.

### Final capture state — all five re-run clean, bounds from observation

| Capture | Measured | Bounds | In bounds | Labelled callouts |
|---|---|---|---|---|
| `workspace-identity` | 1280×1800 | w[1280] h[1800] | ✅ | 0/2 — exception |
| `catalog` | 1280×1800 | w[1280] h[1800] | ✅ | 1/2 — exception |
| `catalog-create-cta` | 1280×1800 | w[1280] h[1800] | ✅ | 2/2 |
| `drafts` | 1280×700 | w[1280] h[700] | ✅ | 2/2 |
| `results-status` | 1760×560 | w[1760] h[560] | ✅ | 2/2 |

Every bounds value equals the measurement from the final clean run — **none inherited from the out-of-brief fork's artifacts**, which were all discarded. The Reviewer verified this independently.

**Callout-overlap defect: resolved.** The Leader's original finding (chips covering the search field, the quick-filter pills and the reporting-cycle band) is fixed — `catalog-create-cta`'s two callouts moved to `above` into genuine whitespace, and the three anchors with no clean placement ship ring-only under the exception. The Leader viewed `workspace-identity.png`: rings on the band and tab bar, real data (53 projects), nothing covered, no skeletons.

**Guard on production:** **851 ALLOW, 0 DENY**, and **0** non-GET to `reporting.cgiar.org`. The guard blocked, escalated, was amended with the reasoning recorded, and now passes the inert beacon while still aborting on any PRMS write. That full cycle is what separates a corrected allowlist from a widened one.

**Governance:** the out-of-brief fork from the previous attempt produced only the discarded artifacts. The re-run used **no subagents or forks** — prohibited explicitly in the brief after the incident.

### `ADVISORY` (recorded, never gating, never minted into a task)
- *Reliability* — `drafts` and `results-status` `readySelector`s admit empty-state alternates (`.mdr-empty`, `bilateral-results-empty`). The gate would pass on an empty screen while the chip asserts "AI-generated draft results awaiting your review" — a **D8** path with no automated gate. Asserting the populated variant would close it.
- *Readability* — `catalog`'s label *"Filter projects by Science Program"* anchors `bilateral-reporting-kpis`, whose rendered title is *"Reporting Overview & Quick Filters"*. Accurate but not self-evidently so.

### Leader accountability

All three Reviewer findings were the Leader's: the unrecorded geometry, the misreported scope, and the unswept Pivot Record. The Implementer's work passed on its own terms. `author ≠ auditor` caught the **orchestrator**, which is the case the gate is least often credited with and most needed for.
