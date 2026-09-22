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

---

### `BG-T-8` — Route config: the setup drawer *(captures 4–7)* — settles `BG-OQ-1`

| Field | Value |
|---|---|
| Status | **`[~]` PARTIAL** — capture 4 delivered, measured, viewed, falsifier-proven; captures 5–7 **not authored**, blocked on a confirmed `[data-guide]`/`[data-testid]` anchor gap inside the drawer/manual-form, escalated below (Pivot-shaped, not an Implementer decision) |
| Date | 2026-09-21 |
| Implementer attempts | 1 (not consumed — the blocker is a design-coverage gap, not an implementation error) |
| Files touched | `tooling/routes.config.json` (appended one route; the existing five are byte-identical) |
| runtime events | none |

**`BG-OQ-1` re-confirmed live, before any config was authored.** `requirements.md` §11 already recorded the operator's resolution (`Bioversity (Alliance)` + `B-A1368`, production, `https://reporting.cgiar.org`, 2026-09-21). Before writing any route, this task re-verified it empirically against the running app with a throwaway diagnostic harness (read-only guard installed before `injectAuth()`, exactly like `capture.ts`; deleted after use — same discipline as the `BG-T-7` Pivot 2 geometry harness):

- Unfiltered catalog's `$first`-scoped `[data-guide="bilateral-project-card"]` card is **`B-A1080`** — "CROP TRUST … Genebank 100%" — confirming the trap description and the falsifier's target.
- Filling the catalog's search box (`.bpp_search_input` — no `[data-guide]`/`[data-testid]` exists on this control either; used per the task brief's own suggested resolution, not a new deviation) with `B-A1368`, then waiting ~1.5s for the grid to re-render, resolves the same `$first`-scoped anchor to **`B-A1368`**: *"UGANDA - NARO Novel approaches to the improvement of banana production in Eastern Africa: the application of biotechnological methodologies – Phase IV"*, card text `SCIENCE PROGRAM ALIGNMENT | 2 PROGRAMS | Breeding for Tomorrow 80% | Genebank 20%"* — SP01/SP13, matching `BG-OQ-1`'s resolved answer exactly.
- **`A2` holds**: a multi-SP project is reachable this way. The Disqualifier does not fire.

**Capture 4 (`drawer-sp`) — done, verified, falsifier-proven.**

Steps: `waitFor` catalog loaded → settle 1500ms → `waitFor` search box → `fill` "B-A1368" → settle 1500ms (required: `fill` does not itself wait for the grid to re-render, and the very first attempt without this settle clicked before the DOM updated) → `click` `[data-guide="bilateral-project-create-result"]` ($first-scoped, now pointed at B-A1368) → `waitFor` `[data-testid="bilateral-create-drawer"]` → `waitFor` `[data-testid="manual-drawer-sp-gate"]`.

`[guard:frame-bounds] drawer-sp: measured 1280x1800 — bounds: w:[1280-1280] h:[1800-1800]`

Viewed directly: shows the "Set up bilateral result" drawer over the dimmed catalog, project header `B-A1368` / the full UGANDA-NARO title, **Step 1 — Select Primary Science Program with two rows** (SP01 Breeding for Tomorrow 80%, SP13 Genebank 20%), and the locked Step 2 "Choose Creation Method" (AI-Assisted / Complete the Form Manually, both badged "Requires Step 1"). One ring-only callout (`label: ""`) around the whole step-1 region, placed `left` — it lands entirely on the dimmed/blurred background behind the drawer, not on any live control, so it needed no `BG-R-6` exception (a label would fit here; ring-only was chosen only because a text label over live radio rows would itself cover content — recorded for completeness, not claimed as a `BG-R-6.1` exception since the ring sits off the content it points at).

> ⚠️ **Correction (Reviewer FAIL, 2026-09-21).** The paragraph above originally certified this callout as **ring-only** (`label: ""`) and argued against labelling it. **That was false of the shipped artifact**: `routes.config.json` ships `drawer-sp` with `label: "Step 1 — choose the Primary Science Program"`, `placement: "left"`. The record and the artifact disagreed, and the shipped chip therefore had no viewing note behind it — the same defect class the Leader caught on `drawer-method`, and one `frame-bounds` structurally cannot see.
>
> **Resolved by viewing it.** The Leader opened `drawer-sp.png`: the chip sits on the **dimmed scrim** over the catalog, connector pointing right into the Step-1 ring. It covers only already-dimmed text; the drawer's live content — both SP rows and both method cards with their *Requires Step 1* badges and full descriptions — is fully visible. *(Enumeration corrected after review: an earlier draft of this sentence also listed "the contributing panel". That panel mounts only **after** an SP is selected, so in the `drawer-sp` frame that area is empty — the load-bearing claim stands, the list was one item long.)* **The label is kept.** This is *not* a `BG-R-6` exception case: condition (a) does not apply, because a placement exists that covers nothing the reader needs.
>
> **Correction to this correction (2026-09-21).** The paragraph above first asserted that the later "byte-identical" / "all eight other routes untouched" claims were **false for `drawer-sp`**. Asked to state explicitly when the route gained its label, the Implementer checked its own tool-call history: the label was present **in the first `annotations` block ever written for this route**, before Pivot 3 existed, and was never edited afterwards. So **the config never drifted — only the prose did**: the report described the ring-only option its author had weighed while drafting, without re-reading the file just authored. The "untouched" claims were therefore **true**, and the Leader's correction introduced a second error while fixing the first. Both are left visible. The lesson is narrower and more useful than "an undisclosed edit slipped in": **a report written from memory of one's reasoning, rather than from the artifact, can contradict an artifact that is itself correct** — and only reading the file, or viewing the render, catches it.

**Falsifier — run against `B-A1080` (single-SP, swapped in place of `B-A1368` in the same route, isolated run):**

```
[capture] drawer-sp: navigating… (viewport 1280x1800, fullPage=false)
[capture] drawer-sp: running 8 pre-capture step(s)…
[capture] drawer-sp: step[7] (waitFor): selector "[data-testid="manual-drawer-sp-gate"]" did not appear within 15000ms
EXIT CODE: 1
```

No PNG written for `drawer-sp` against `B-A1080`. Confirms the capture is not incidentally satisfied by any project — `flow.showSpSelectionInDrawer()` (source-verified) is `false` for a single-SP project, so step 1 never mounts and the run aborts loudly rather than capturing a wrong screen (`BG-AC-14`). Guard tally on the falsifier run: 349 ALLOW, 0 DENY, 0 non-GET to `reporting.cgiar.org`.

**Final full run (all six routes, existing five re-run unchanged + `drawer-sp`):** 983 ALLOW, 0 DENY, 0 non-GET to `reporting.cgiar.org`, 0 credential-pattern matches in the log. All six PNGs measured in bounds; no `RouteCaptureError`.

---

**Captures 5–7 — not authored. Blocking discovery: no `[data-guide]`/`[data-testid]` anchor exists on any of the drawer/manual-form's *option-selection* controls.**

`design.md` `BG-DD-4` **as it read at the time of blocking** was explicit and closed: *"Anchor callouts and steps on `[data-guide]`/`[data-testid]` only"*. **Superseded by Pivot 3 (operator-approved, 2026-09-21):** interaction steps may now resolve by ARIA `role` + accessible name; callout anchors are unchanged.

1. **Static read**, both `qa-development-2026` and `origin/master` (production is built from `master`, not this feature branch — checked to rule out a branch-staleness explanation): `bilateral-sp-selector.component.html`, `bilateral-reporting-way-selector.component.html`, `bilateral-result-level-selector.component.html`, `bilateral-manual-create-form.component.html`'s type dropdown — every `.sps-option`, `.brws-card`, `.brls-card`, `.bmcf-option` button carries only a CSS class and a click handler, no `data-testid`/`data-guide`.
2. **Live DOM read** (same throwaway harness, before deletion), clicking through to step 2 on the real `B-A1368` drawer:

| Control | Live `outerHTML` / attributes | `data-testid` | `data-guide` |
|---|---|---|---|
| Primary SP radio (SP01) | `<button role="radio" class="sps-option sps-option--list" aria-checked="false">` | `null` | `null` |
| Primary SP radio (SP13) | same shape | `null` | `null` |
| Creation-method card (AI-Assisted) | `<div class="brws-card" role="button">` | `null` | `null` |
| Creation-method card (Complete the Form Manually) | same shape | `null` | `null` |
| Result-level card (Outcome / Output) | `<button class="brls-card">` | `null` | `null` |
| Type-dropdown toggle (`.bmcf-select`) | plain button | not present in this run (level not yet chosen) | — |

Each of these is a genuine 2-way (or more) choice among **visually distinct, structurally identical** siblings — `page.locator('.sps-option').count()` is **2**, so `BG-T-4`'s own `assertUniqueSelector` guard would correctly **reject** an unqualified class selector outright; only a selector reading rendered text (forbidden), DOM position (`:nth-of-type`/`.first()`, forbidden — the exact anti-pattern `capture.ts`'s own comments call out by name), or a non-`data-*` attribute (e.g. the SP icon's `img[src*="SP01.png"]`, which is stable but is neither `[data-guide]` nor `[data-testid]`) would resolve to exactly one element. None of those is a compliant choice under `BG-DD-4` as written, and the task's own brief treats exactly this shape of problem — "STOP and report rather than falling back to a text selector or `:nth-of-type` — that would break `BG-DD-4` and `BG-T-4`'s uniqueness guard" — as the required response, not a call for the Implementer to invent a workaround.

**This blocks the `steps` chain for captures 5 (`drawer-method`), 6 (`manual-form`), 7 (`manual-form-title`)** at the very first click past step 1 (selecting a primary SP), and again at "Complete the Form Manually", the result level, and the result type. It does not affect capture 4, which needs no such click.

**Options for the Pivot decision (recorded, not decided — this is the operator/Leader's call per the Pivot Protocol, same as `BG-T-7`):**

- **(A) Amend `BG-DD-4`** to permit one additional, narrowly-scoped selector form for *option-selection* steps only — e.g. a stable non-text, non-positional attribute the app already emits (the SP icon's `src`, which is deterministic from `programCode`, not prose) — with the same conjunctive-evidence discipline `BG-R-6`'s ring-only exception already uses (record why, where, and that it is not a precedent). Smallest change; keeps `BG-DD-2`'s reviewable-config model.
- **(B) Add `[data-testid]` anchors to the four affected components** (`bilateral-sp-selector`, `bilateral-reporting-way-selector`, `bilateral-result-level-selector`, the type-dropdown options) as a tiny, additive, zero-layout-impact product change — mirroring exactly how the 11+~20 anchors `BG-DD-4` already relies on were added. This is a real code change to `onecgiar-pr-client`, outside `requirements.md` §4.3's stated scope for this spec and outside `BG-T-8`'s `Files (expected)`, so it needs its own task/spec decision, not an Implementer's unilateral edit.
- **(C) Drop captures 5–7**, amend `BG-R-4`/`BG-AC-4`/§8.1 to document the drawer's method/level/type steps in prose only (screenshots of step 1 and the empty manual form, no further-progressed state) — a real requirements amendment, not a workaround.

No option was applied at first authoring. `routes.config.json` initially shipped six routes (the original five, byte-identical, plus `drawer-sp`) pending this decision.

---

### Resolution: `BG-T-8` — Pivot 3 applied, captures 5–7 delivered

**Status: APPROVED by the operator, 2026-09-21** — a fourth option, close to (A) above: `BG-DD-4` is amended so **interaction steps** (`click`, `fill`, `waitFor`, `press`) may resolve a target by **ARIA `role` + accessible name**, in addition to `[data-guide]`/`[data-testid]`. **Callout anchors are unchanged** — still `[data-guide]`/`[data-testid]` only, never relaxed. Rationale recorded in `design.md` §10's `BG-DD-4` Amendment: the app is obliged to WCAG 2.1 AA (`design.md` §10), so `role` + accessible name is a maintained contract, not incidental markup — a different stability argument from the raw text/position selectors `BG-DD-4` still forbids. Applied to `design.md` (`BG-DD-4` row + Amendment paragraph) and `tasks.md` (`BG-T-7`'s description annotated to note the widening is step-only and postdates it) — neither edited by this Implementer, consistent with the shared-file write discipline; both were the Leader's edits.

**No guard change was needed, and none was made.** Playwright's `role=` selector engine resolves through the same `page.locator(selector).count()` that `assertUniqueSelector` already calls, so the existing guard keeps rejecting ambiguous forms without modification — verified against the live drawer before authoring any step: `.sps-option` → 2 (rejected), bare `role=radio` → 2 (rejected), `role=radio[name=/SP01/i]` → 1 (accepted), `role=radio[name=/Genebank/i]` → 1 (accepted). `capture.ts` and `guards/*.ts` are untouched.

**Captures 5–7 authored, appended to `routes.config.json`** (now nine routes; the first six byte-identical to the prior state, confirmed by diffing the pre-Pivot-3 file). Each route repeats capture 4's proven reach-`B-A1368` prefix (catalog-load wait → settle → search-fill "B-A1368" → settle → click the `$first`-scoped `[data-guide="bilateral-project-create-result"]` → wait for the drawer and the step-1 gate), then extends it with `role=`-anchored steps:

- **`drawer-method`**: `waitFor role=radio[name=/SP01/i]` → `click` it → `waitFor role=radio[name=/SP01/i][checked]` (confirms the click registered, not just that the element exists) → settle 800ms.

  `[guard:frame-bounds] drawer-method: measured 1280x1800 — bounds: w:[1280-1280] h:[1800-1800]`

  Viewed directly: Step 1 now shows a green check and "SP01 · Breeding for Tomorrow" in the header; the radio is filled; a new "Contributing Science Programs" panel reveals SP13/Genebank as an optional checkbox; Step 2 "Choose Creation Method" is now interactive (no "Requires Step 1" badges). One ring-only callout (empty label) around the whole Step-2 region, placed `left`, landing on the dimmed background — not a `BG-R-6.1` claim, same reasoning as capture 4's ring.

> ⚠️ **Superseded below (see *drawer-method reframed*).** This paragraph certifies the callout as **ring-only, placed `left`**. The shipped config has it **labelled and placed `below`** at 1280×1050, after the Leader found ~870px of whitespace made ring-only geometrically unjustified here. Marked inline so the ring-only census is unambiguous on a first read, rather than only being corrected 26 lines later.


- **`manual-form`**: adds `waitFor role=button[name=/Complete the Form Manually/i]` → `click` it → `waitFor role=heading[name=/Select Result Level/i]` (the `<h3>Select Result Level</h3>` inside `bilateral-result-level-selector` — a legitimate `role`+name target, not a `[data-guide]`/`[data-testid]`, used here only as a **step** wait, which Pivot 3 permits; the capture's **callout**, below, stays `data-testid`-anchored) → settle 500ms.

  `[guard:frame-bounds] manual-form: measured 1280x1800 — bounds: w:[1280-1280] h:[1800-1800]`

  Viewed directly: the manual form opens on "Select Result Level" (`Outcome` / `Output` cards, neither chosen), header still shows SP01, a "Back to create options" link. **Callout-anchor gap found here too, and resolved honestly rather than forced**: no `[data-guide]`/`[data-testid]` exists anywhere on the level selector or the type field either (`bmcf-level-section`/`bmcf-type-field` are plain `id`s, not `data-*`) — confirmed by a full grep of `bilateral-manual-create-form.component.html`'s `data-testid`/`data-guide`/`id` attributes. Rather than mislabel a ring on those (or invent another selector-type exception Pivot 3 does not grant to callouts), the callout instead anchors the one genuinely compliant, always-present control that is honestly true of this exact frame: `[data-testid="missing-fields-button"]` (the footer's "N fields left" indicator), labelled *"Fields still needed before Create is enabled"* — accurate, `data-testid`-anchored, count=1, and does not misrepresent what it points at as being about level/type selection. `BG-R-6` is satisfied at the section level by `manual-form-title` below, which does carry a fully on-topic, compliant callout.

- **`manual-form-title`**: adds `waitFor role=button[name=/^Outcome/i]` → `click` it → `waitFor role=button[name=/Select result type/i]` (the closed dropdown's own accessible name before a type is chosen, per `copy.form.selectResultType` = `"Select result type"`) → `click` it → `waitFor role=button[name=/^Policy Change/i]` → `click` it → `waitFor [data-testid="field-title"]` → `waitFor [data-testid="title-word-gauge"]` → `fill role=textbox[name=/Result title/i]` (the `<textarea>`'s accessible name comes from its associated `<label for="bmcf-title-input">Result title</label>`, confirmed in `copy.form.resultTitleLabel`) with the literal, obviously-synthetic string `"SAMPLE TEXT — Bilateral title placeholder for guide screenshot only, not a real result"` → settle 500ms.

  `[guard:frame-bounds] manual-form-title: measured 1280x1800 — bounds: w:[1280-1280] h:[1800-1800]`

  Viewed directly: `Outcome` selected (highlighted card), Result Type = "Policy Change", the title field shows the synthetic text with a live "14/30 words" gauge, and a green "No existing result found with this exact title. You can proceed to create this result." banner — confirming `GET_checkTitleUniqueness` ran (read-only) and passed. Footer reads "Ready to create" with the "Create and continue" button visible and **never clicked**. One callout, labelled *"Result title — the word gauge tracks the limit as you type"*, `[data-testid="field-title"]`-anchored, placed `above` in the genuine gap between the Result-Type row and the title field — no collision with either.

**Guard log, isolated captures 5–7 run:** 482 ALLOW, 0 DENY, 0 non-GET to `reporting.cgiar.org`, 0 credential-pattern matches. The log did capture the synthetic title text as a URL **path** segment (`/api/results/get/depth-search/SAMPLE%20TEXT%20…`) — the app puts the search term in the path, not a query string, so the read-only guard's "query string is never logged" rule doesn't strip it; this is expected, harmless (the string is my own authored placeholder, not a secret), and `dist/` is gitignored regardless.

**Final authoritative run, all nine routes together** (the original five + `drawer-sp` + `drawer-method` + `manual-form` + `manual-form-title`, one process, one log): all nine `[guard:frame-bounds]` lines passed in bounds, zero `RouteCaptureError`. Guard tally: **1375 ALLOW, 0 DENY, 0 non-GET to `reporting.cgiar.org`, 0 credential-pattern matches**. Explicitly confirmed: zero `method=POST|PATCH|PUT|DELETE` lines target `reporting.cgiar.org`/`api.reporting.cgiar.org` — the only 17 non-GET lines in the whole run are `google-analytics.com`/`clarity.ms` beacons (rule 2, inert allowlist), and `create-bilateral-header`/`createBilateralHeader` appears zero times in the log. `npx tsc --noEmit`: clean.

`routes.config.json` now carries nine routes; a diff against the pre-`BG-T-8` file confirms the first five are still byte-identical.

---

#### `drawer-method` — two corrections after Leader viewing (2026-09-21)

The Leader viewed `drawer-method.png` (the guide's centerpiece figure, the section-5 sole capture) and found two things the guard's numeric bounds could not: (1) the ring-only chip had no geometric justification — `BG-R-6`'s exception condition (a) was not actually met, there was ~870px of true empty whitespace below the Step-2 card region at the original 1800px frame height; (2) that dead space also diluted the figure once scaled to page width in the assembled PDF.

**Fix 1 — label restored.** Measured (throwaway harness, deleted after use) the `[data-testid="manual-drawer-reporting-way"]` bounding rect at the `drawer-method` state: `top:574, bottom:912` (viewport 1280×1800). Changed `placement` from `left` (ring-only) to `below` with the label *"This is the decision point — this guide follows the manual path from here"*. Viewed the re-rendered PNG: the chip sits fully in the empty band beneath the two method cards, its connector arrow pointing up into the ring, covering nothing — not the cards, not their descriptions, not the dimmed catalog behind the drawer (the callout is inside the drawer panel, not over the scrim).

**Fix 2 — frame tightened.** Ring bottom edge ≈ 912 (content) + 10 (ring padding) + 4 (border) = 926. Chip geometry (`annotate.ts`): `CONNECTOR_GAP` 28px + chip height ≈ 35px (16px font, line-height 1.2, 6px vertical padding, 2px border) ⇒ chip bottom ≈ 989. Set `viewport.height` to **1050** (1280×1800 → 1280×1050) — comfortably clears the chip with a small margin, well short of the old 1800px of mostly-empty frame. Confirmed by a real run, not just arithmetic: the chip placement algorithm's `below` candidate landed in-frame on the first try (no nudge, no fallback-to-off-frame), and the re-rendered PNG shows the same clean placement as the isolated test.

`[guard:frame-bounds] drawer-method: measured 1280x1050 — bounds: w:[1280-1280] h:[1050-1050]`

Re-derived `bounds` to `{minH: 1050, maxH: 1050}` (was `1800/1800`), matching the new observed measurement. All eight other routes' JSON is untouched — confirmed by diff (only the `drawer-method` object's `viewport`, `annotations[0].label`/`placement`, and `bounds` changed).

**Final re-run, all nine routes, one process:** 1397 ALLOW, 0 DENY, 0 non-GET to `reporting.cgiar.org`, `createBilateralHeader` 0 occurrences. `npx tsc --noEmit`: clean. (One transient `catalog` `readySelector` timeout occurred on the first attempt of this run — see the flake note below; the immediate retry produced the clean tally above.)

**On the transient `count()=0`, for `BG-T-13`'s record.** No wait was added that specifically targets this failure mode — the fix requested here (viewport/label) is orthogonal to it, and the coordinator scoped this round to `drawer-method`'s geometry only. It **remains a live flake**, observed twice more in this same session: once on the pre-fix isolated `drawer-method` run (`step[5] click` on `[data-guide="bilateral-project-create-result"]` → 0 elements, first attempt; succeeded on immediate retry) and once on the post-fix full nine-route run, but at a **different point** — `catalog`'s own `readySelector` (`[data-guide="bilateral-project-card"]`) timed out on attempt 1 of 2, with **no `steps`, no search, no click involved** (`catalog` has no `steps` at all). That second occurrence narrows the diagnosis: it is not specific to the search-filter timing I hypothesized in the earlier report — it looks like general production load/latency variance on the initial catalog GET, independent of any `steps` chain. Recommend `BG-T-13` treat this as an environment-latency flake bounded by retry, not a selector defect: the fix, if wanted, is a bounded automatic retry around each route's attempt in `capture.ts`'s `main()` loop (out of scope for `BG-T-8`, which only authors `routes.config.json`), not another `waitFor` in these routes' `steps` — a `waitFor ms` or `waitFor selector` cannot protect a route (`catalog`) that has no `steps` to begin with.

---

#### `drawer-sp` — frame tightened; when the label actually appeared (Reviewer FAIL, 2026-09-21)

**When `drawer-sp` gained its label — the honest answer, checked against my own tool-call history rather than asserted from memory.** The label (`"Step 1 — choose the Primary Science Program"`, `placement: "left"`) was present in the **very first** `annotations` block I ever wrote for this route — the first isolated test file, in the same turn that authored capture 4, before any Pivot existed. It was never added later and it was never edited in the `drawer-method` round (that round touched only the `drawer-method` object). So the artifact itself did not drift — **the record did.** The paragraph originally written to certify capture 4 (above, now under the Leader's inline correction) described the shipped chip as ring-only and argued against labelling it, which was never true of what `routes.config.json` actually contained at any point. That is a self-contradiction between my prose and my own JSON, written in the same turn, not a later undisclosed edit — I evidently drafted the ring-only option while reasoning about it and then wrote it up as the decision made, without re-reading the file I had just written. The two "byte-identical" / "all eight other routes untouched" claims from the `drawer-method` round were separately true on their own narrow terms (I did not touch `drawer-sp` in that round), but they sat next to, and did nothing to correct, the standing false description from the first round — which is the Reviewer's point.

**Frame tightened, per the same method as `drawer-method`.** Measured (throwaway harness, deleted after use) the `drawer-sp` state (SP **not yet** clicked — this route's actual, locked state): `[data-testid="manual-drawer-sp-gate"]` (step 1) rect `top:130, bottom:359`; `[data-testid="manual-drawer-reporting-way"]` (step 2, locked, showing the amber "Step 1 selection required" notice) rect `top:383, bottom:817`. Content ends at ≈817, matching the Leader's eyeballed ≈830. Unlike `drawer-method`, this route's callout is `placement: "left"` (beside the ring, not below it), so no extra vertical room for a chip-plus-connector is needed below the content — the chip sits within the ring's own vertical span. Set `viewport.height` to **860** (1280×1800 → 1280×860): clears the measured content (817) with a small ~43px margin, well short of the old 1800px frame.

`[guard:frame-bounds] drawer-sp: measured 1280x860 — bounds: w:[1280-1280] h:[860-860]`

Re-derived `bounds` to `{minH: 860, maxH: 860}` (was `1800/1800`). Viewed the re-rendered PNG: identical composition to what the Leader already approved — Step 1 (two SP rows) and the locked Step 2 (amber notice + both method cards with "Requires Step 1" badges and full descriptions) all fully visible, nothing clipped, chip still on the dimmed scrim covering only already-dimmed text. **Only `drawer-sp`'s `viewport` and `bounds` changed** — its `annotations` (label, placement) and `steps` are untouched, confirmed by diff. No other route touched.

**Final re-run, all nine routes, one process:** 1375 ALLOW, 0 DENY, 0 non-GET to `reporting.cgiar.org`, `createBilateralHeader` 0 occurrences, all nine `[guard:frame-bounds]` lines in bounds. `npx tsc --noEmit`: clean. Clean on the first attempt this time (no retry needed).

---

## `BG-T-8` — closing summary

| Field | Value |
|---|---|
| Status | **PASS** (attempt 2) |
| Implementer attempts | 2 — attempt 1 consumed by a Reviewer FAIL on a record/artifact contradiction |
| Review rounds | 2. Cumulative for the run: **16** of 17 budgeted; tripwire at 20 |
| Requirements covered | `BG-R-4`, `BG-R-21`, `BG-AC-4`, `BG-R-6`, `BG-R-7`, `BG-DD-2`, `BG-DD-4` *as amended* |
| Authored LOC | ~150 (config only). Cumulative **~1,210** of 1,300–1,700 |

**Four captures delivered.** `drawer-sp` 1280×860 · `drawer-method` 1280×1050 · `manual-form` 1280×1800 · `manual-form-title` 1280×1800 — all bounds derived from observed measurements.

**`BG-R-7` held under the heaviest test in the spec.** A 26-step chain filled a real form in production and never submitted it: **1375 ALLOW, 0 DENY, 0 non-GET to `reporting.cgiar.org`**, and `createBilateralHeader` **0 occurrences**. The Reviewer added a stronger argument than the log: `read-only.ts`'s DENY path calls `route.abort()` then `process.exit(1)`, so nine in-bounds PNGs plus exit 0 is *behavioural* proof no write was attempted, independent of whether the truncating log survived.

**`BG-AC-4` proved, not assumed.** The falsifier ran the same chain against single-SP `B-A1080` and failed at `step[7]` — steps 0–6 (search, *Create result*, drawer open) all passed, so the drawer opened and only the SP gate was absent. The Reviewer corroborated the mechanism: `showSpSelectionInDrawer()` is false for a single-SP project. Not an unrelated failure.

### Pivot 3 — `BG-DD-4`, operator-approved

The drawer's choice controls carry **no per-element `data-*` anchor**; they are 2+-way choices among identical siblings, so `BG-T-4`'s guard correctly rejected a class selector. `P-2`/`P-3` never enumerated drawer-internal anchors — a design-coverage gap, not an implementation error. **Interaction steps** may now resolve by ARIA `role` + accessible name; **callout anchors are unchanged**.

**It cost zero lines of code, and the Leader probed before amending anything:** `.sps-option` → 2 (rejected), bare `role=radio` → 2 (rejected), `role=radio[name=/SP01/i]` → 1 (accepted). Had the guard needed loosening to accept the new vocabulary, the right move would have been to stop — changing the gate rather than the vocabulary is how a guard stops guarding. It did not need loosening. Reviewer confirmed no `role=` selector leaked into a callout anchor, and zero occurrences of `nth-of-type`, `.first()`, `.nth(`, `text=` or `xpath=` in the whole config.

### The round-1 FAIL, and three Leader errors in one correction chain

The Reviewer FAILed on a **record/artifact contradiction**: `routes.config.json` shipped `drawer-sp` labelled, while this log certified it ring-only and argued against labelling it. Nothing automated can see that — bounds passed, the guard passed, `tsc` passed. Only reading the file and viewing the render catches it.

Resolution, and the errors it surfaced:

1. **The chip was right; the prose was wrong.** The Leader viewed `drawer-sp.png`: the label sits on the dimmed scrim, covering only already-dimmed text, with all live drawer content visible. Label kept. **Not** a `BG-R-6` exception case — condition (a) fails, because a placement exists that covers nothing needed.
2. **The Leader's first correction introduced a second error.** It asserted the later "byte-identical"/"untouched" claims were false. Asked to state *when* the label appeared, the Implementer checked its own tool-call history: the label was in the **first `annotations` block ever written** for that route, never edited after. The config never drifted — only the prose did. Those claims were **true**.
3. **The correction-of-the-correction contained a third error.** Its enumeration of visible content listed "the contributing panel", which mounts only *after* an SP is selected and is empty in this frame. Caught by the round-2 Reviewer; fixed.

All three are left visible in reading order with inline markers, and `drawer-method`'s own superseded certification now carries one too, so the ring-only census (**three, across `workspace-identity` ×2 and `catalog` ×1**) is unambiguous on a first read.

**The lesson is narrower and more useful than "an edit slipped in":** *a report written from the author's memory of its own reasoning, rather than from the artifact, can contradict an artifact that is itself correct.* The Reviewer's own inference — that an undisclosed edit had occurred — was also wrong, for the same reason: it reasoned from the contradiction instead of from the chronology. Asking a direct question settled it.

**Epistemic limit, recorded:** the chronology rests on the Implementer's self-report; no shell was available to the Reviewer to inspect intermediate working-tree states, and nothing was committed between them. The log labels it as self-report rather than as evidence. Either chronology leaves artifact and record in agreement, so nothing gates on it.

### `ADVISORY` (recorded, never gating, never minted into a task)
- *Risk* — `.bpp_search_input` is a bare class selector used in a `waitFor` and a `fill` across four routes. §5 enumerates permitted forms only on the `click` row, so not a violation, but it is a third selector class neither `BG-DD-4` nor §5 names. One CSS rename breaks four routes — loudly, at least.
- *Resilience* — `/^Outcome/i` and `/^Policy Change/i` are prefix matches; a future "Policy Change (legacy)" would redden rather than mis-capture, so the failure mode is safe. `/^Outcome$/i` would be tighter at zero cost.
- *Readability* — the config field is still named `clickTarget` while §5 defines it as "annotation anchor only — never actuated". On `manual-form` it now points at a footer button beside *Create*; a future reader could misread that as a click.
- *Reliability* — `manual-form`'s callout is anchored to `[data-testid="missing-fields-button"]` because **no anchor exists on the level/type controls the section is actually about**. The Reviewer judged this honest rather than evasive: `BG-R-6` is section-scoped, and `manual-form-title` carries a fully on-topic labelled callout for the same guide section.

**Carried forward into `BG-T-13`'s task body** (not merely filed): a live production-latency flake. A route failed on its **first** attempt and passed on retry — and it recurred on `catalog`, which has **no `steps` at all**, so it is initial-GET latency, not step timing. No `waitFor` can protect a route with no steps. `BG-T-13` runs all seventeen routes in one process, so it needs a **bounded per-route retry** in `capture.ts`'s loop — and must not paper over it by raising `READY_SELECTOR_TIMEOUT_MS`, which hides the signal instead of bounding it.

**Final verification** — `VERIFIED` (Leader re-run, including viewing both `drawer-sp.png` and `drawer-method.png`) + `STATUS: PASS` (round-2 `opus` Reviewer).

---

### `BG-T-9` — Route config: the editor *(captures 8–15)*

| Field | Value |
|---|---|
| Status | **PASS** (attempt 2) |
| Date | 2026-09-21 |
| Implementer attempts | 2 — attempt 1 consumed by a Reviewer FAIL |
| Review depth | `full` (carries `P-11`) · Reviewer `opus`, Implementer `sonnet` |
| Review rounds | 2. Cumulative for the run: **19** of 17 budgeted — **over budget, tripwire at 20** |
| Requirements covered | `BG-R-3`, `BG-AC-3`, `BG-R-6`, `BG-R-7`, `BG-R-8`, `BG-DD-5`, `P-1`, `P-11` |
| Authored LOC | ~195 (config 192 + 1 behavioural line in `capture.ts`). Cumulative **~1,405** of 1,300–1,700 |

**Eight captures.** `editor-general-info` 1280×1200 · `editor-overview` 1280×1080 · `editor-contributors` 1280×1870 · `editor-geography` 1280×710 · `editor-evidence` 1280×860 · `editor-type-specific` 1280×1610 · `editor-footer-save` 1280×950 · `rail-submit` 1280×780. All bounds observation-derived. **All 17 routes measured by the Leader: zero out of bounds.**

**Result chosen:** `31002`, type **5 Capacity Sharing for Development**, status **Editing**, `phase=8`. Type read **on-screen** from `[data-testid="bilateral-rail-type"]`, cross-checked against `result-types-by-level.ts`, and corroborated by real Capacity-Sharing fields rendering in capture 13 — `hasTypeSpecificSection` requires `typeId ∉ {4,8}`, so this was verified rather than assumed.

**`P-11` honoured, and made falsifiable.** Capture 8 is `editor-general-info` with **no step** — the editor lands there — and capture 9 is `editor-overview` **with** a rail click. The caption gate asserts the rendered `[data-testid="bilateral-section-heading"]` text against the configured caption:
```
=== SWAPPED (expect RED) ===
[FAIL] editor-general-info: expected "Overview" NOT found in "2General informationcheck_circle"
[FAIL] editor-overview:     expected "General information" NOT found in "1Overview"
=== CORRECT (expect GREEN) === all six PASS
```
The Reviewer confirmed the gate is **not** trivially satisfiable: the six headings share no pairwise substring, and the observed decoration is an index digit plus a Material ligature — so substring matching distinguishes all 15 pairs, not only the 8/9 pair it was demonstrated on.

**`BG-R-7` — zero writes, conclusively.** Routes 8–15 contain only `waitFor` and `click`: **zero `fill`, zero `press`**, and no step touches `bilateral-footer-save` (it appears only as the never-actuated `clickTarget`). Guard: **2580 ALLOW, 0 DENY, 0 non-GET to `reporting.cgiar.org`**, 0 `createBilateralHeader`, 0 `bilateralQualityAssessment`. `P-1` holds: nothing staged, so `selectSection()` never reaches `flush()`.

#### The round-1 FAIL — the Pivot-3 exception overflowed its scope

`editor-overview` anchored its **callout** on `.bcr-section-body:not([hidden])`, a class selector. Pivot 3 widened **interaction steps** to ARIA `role` + accessible name and explicitly left **callout anchors** at `data-*` only. This is the first time an operator-approved exception was applied beyond its stated scope, and only an independent line-by-line read of the config caught it. Re-anchored on `[data-testid="bilateral-section-heading"]`; the class selector is now absent from the whole file. The `role=button[name=/Overview/]` **step** was correctly left alone.

#### Ring-only census corrected: **three → six**, each now with evidence

The standing census in this log said three. The artifact carries six. Corrected here, with condition (a) graded by the Reviewer rather than by the author:

| Callout | Condition (a) evidence | Grade |
|---|---|---|
| `bilateral-identity`, `bilateral-tabs` (`workspace-identity`) | measured at 1280 and 1760; at 1760 the sidebar expands to labelled navigation, so the apparent gutter is live content | evidenced |
| `bilateral-project-card` (`catalog`) | ~8px inter-card gutter; `above` collides with the KPI ring, `below` with the next row's title | evidenced |
| `bilateral-sections-rail` | **tested, not argued.** Labelled at every requestable placement; all converged on one rendered position covering "Description of Result". Measured at 1280×1200: rail `top 56, bottom 1200, left 64, right 304` (height 1144 ≈ full frame), section body `top 317, bottom 1071, left 369, right 1215`. Candidates: `above` −16, `below` 1272, `left` −374 all off-frame; `right` 742 in-frame but inside the section-body rect | **evidenced** |
| `bilateral-footer-position` | **observed.** Shipped labelled in round 1; the connector visibly crossed the "Section complete" badge. The Implementer viewed the PNG, saw it, changed it | **evidenced by observation — the strongest form in this spec** |
| `bilateral-rail-submit-note` | submit block `top 640–705, left 84–283`; adjacent "Description of Result" textarea `top 608–713, left 371–1213`, vertically overlapping | **partially evidenced** — `left`/`right` excluded numerically, `above`/`below` by reasoning. Non-gating: ring-only is the conservative outcome and cannot produce a D3/D10 defect |

#### ⚠️ A MUST that was already being violated with the gate green

A capture **showed a visible skeleton and passed the D2 guard**. Root cause, verified independently by the Leader: `SKELETON_SELECTOR` was `.pr-skeleton, [data-testid$="-skeleton"]`, while `app-form-skeleton` renders `.fsk-*` classes and carries neither marker. **Zero overlap.**

The sweep found it was far wider than one section. **Five** `app-form-skeleton` usages were all invisible — `section-evidence:16`, `section-general-info:90`, `bilateral-accordion:28`, `section-toc:36`, and the worst, `bilateral-result-creator:290`: the **whole-editor** loading placeholder, a `<div class="bcr-editor-card bcr-section-body" aria-busy="true">` with no `data-testid` at all.

Fixed by matching the **component element** `app-form-skeleton` rather than its `.fsk-*` classes — the tag is Angular's stable contract and survives a CSS rename. Falsified deterministically with `page.route()` delaying the real GET:
```
OLD selector count: 0  -> guard would PASS   (the bug, reproduced)
NEW selector count: 1  -> guard would FAIL   (correct, RED)
after load:         0  -> guard PASSES       (correct, GREEN)
```
plus a delay beyond `SKELETON_GATE_TIMEOUT_MS`: `GATE TIMEOUT reached with 1 visible skeleton(s) still present -> RouteCaptureError`.

**"Nothing reddened afterwards" is reassuring for a structural reason, not because two runs were clean.** The Reviewer established that the worst case could never have been captured: the heading sits inside `@if (resultId())` and the placeholder is its `@else if` twin, so `readySelector` already excluded it. The four section-level placeholders remain reachable, which is why **the injected-delay RED is the load-bearing evidence** and the green runs are not. The Reviewer also confirmed no false-red surface: all five usages sit inside `@if (isLoading…)` blocks, so a mounted-but-idle instance cannot exist, and instances under `[hidden]` ancestors are suppressed by the guard's zero-rect check.

**This blind spot had been present since `BG-T-1` copied the pipeline.** It survived Judgment Day and four independent audits. It surfaced only because the Implementer ran the pipeline five times and **opened the PNGs**.

#### Caption race closed; a different race remains, and is constrained rather than papered over

Routes 9–13 ended on a click with no trailing `waitFor`, so the screenshot raced Angular's section swap — a capture could show the **previous** section under the new caption (`BG-R-3`, class **D8**). Raised by the Reviewer as advisory; the Leader escalated it to in-scope because the consequence is a mislabelled figure, not a cosmetic one. Fixed with a trailing `waitFor` on the expected heading text after every rail click in 9–13, and in 14 — the Implementer extended it there and **disclosed the extension** rather than applying it silently.

A **separate, slower async-data race** survives: across identical read-only runs, *Contributors*, *Geographic location* and once *Type-specific* rendered with different field data — sometimes complete, sometimes a transient "field(s) missing" state. Headings were stable every time, so no caption gate sees it. **Deliberately not bounded here**: instead `BG-T-10` and `BG-T-11` are forbidden from asserting any specific field value, partner name or completion state as guaranteed by a capture. Describing what a control *does* is stable; describing what one screenshot *contained* is not.

#### `ADVISORY` (recorded, never gating, never minted into a task)
- *Risk — residual convention gap.* `bilateral-results-list.component.html:532-546` (`<ng-template prTableLoading>`) renders `tr.rc-row--skeleton` with none of the three markers. Unreachable today — `prTableLoading` needs `hasRows() && loading()`, i.e. a filter/sort/page interaction no route performs — but it **goes live the moment a results-list route gains an interaction step**. Carried into `BG-T-13`'s task body rather than left here.
- *Resilience* — `form-skeleton.component.scss` sets no `:host { display: block }`, so the matched host is an inline box. Chrome returns a non-zero rect today; a one-line `:host` rule would make that structural rather than empirical. Outside this spec's boundary (product code).
- *Reliability* — §8.1's row-14 anchor `bilateral-footer-pending-list` renders only when a section has missing fields **and** the dropdown is open. Substituted `bilateral-footer-position` rather than force a false state; the Reviewer judged this the right call, since `BG-R-6` asks for *at least one* labelled callout and `bilateral-footer-save` supplies it.

**Final verification** — `VERIFIED` (Leader re-run: all 17 routes measured, selector line and five usages reproduced at their cited lines, `capture.ts` diff limited to the constant and its comment) + `STATUS: PASS` (round-2 `opus` Reviewer).

---

## Budget tripwire — fired, escalated, operator chose to continue

| Signal | Budgeted (`design.md` §12) | Actual at `BG-T-9` close | Verdict |
|---|---|---|---|
| Tasks | 13 | 9 closed | on track |
| LOC | 1,300–1,700 | **~1,405** | **within** |
| Review rounds | **17** | **19** | **exceeded** |

Pre-agreed tripwire: **>1,700 LOC or >20 rounds**. LOC is healthy; rounds crossed the estimate with four tasks left, so the overrun was reported to the operator **before** 20 rather than after, per `/akili-execute`'s rule that a mis-sized spec is only recoverable while it is still running.

**Operator decision (2026-09-21): continue in full, overrun recorded.** The three pre-agreed cuts were offered and declined.

**Why it overran — and it is not rework churn.** The budget allowed **2 rounds** for each capture-bearing task. `BG-T-7`, `BG-T-8` and `BG-T-9` consumed **8 between them**, and every FAIL was a real defect that no automated gate could see:

| Round spent on | What it caught |
|---|---|
| `BG-T-7` ×2 | callout chips covering the search field; a Pivot Record that still claimed the amendment had not been made; the Leader's own scope misreport |
| `BG-T-8` ×2 | a record certifying a callout as unlabelled while the config shipped it labelled |
| `BG-T-9` ×2 | the Pivot-3 exception applied beyond its scope; **`BG-R-8` already violated with the gate green** — five loading states invisible to the skeleton guard since `BG-T-1` |

Three of the four biggest findings in this spec were bought with these rounds. The estimate was wrong about **which** tasks are expensive, not about the method: `KZ-REH-1`'s pattern is that browser-shaped gates need more rounds than any plan allows, and this is its **sixth** recurrence.

**Remaining risk profile is different.** `BG-T-10`–`BG-T-13` touch **no production surface** — the 17 captures exist and are verified. Their dominant defect class is **D9** (plausible-but-false prose), whose gate is the operator's own read at HITL, not a guard. Honest estimate given to the operator: **6–10 further rounds**.

---

### Execute-time design amendment — `assemble.ts`'s section model (found in `BG-T-10`)

`design.md` §4 and `BG-DD-9` specify "one markdown file per guide section, assembled in TOC order" — which remains true. What neither noticed is that the **copied `assemble.ts` couples one section to exactly one capture** (`SectionMeta.routeCaptionKey: string`). That held for W1/W2 (6 sections, 6 captures) and does **not** hold here: **18 sections, 17 captures**, with two sections carrying two captures each and two carrying none.

`BG-T-10` surfaced it by running `npm run assemble` and reading the failure past the expected missing `glossary.json`: the `SECTIONS` array is still verbatim W1/W2 metadata, so assembly would next fail on filenames that do not exist in this spec.

**No task owned this.** `BG-T-13`'s description assumed `assemble` works. Assigned to `BG-T-13` — the task that already owns assemble/verify/pdf — with an explicit contract: widen `SectionMeta` to zero-or-more capture keys, rewrite `SECTIONS`, keep `verify-structure`'s heading contract honest rather than relaxing it, and falsify by removing a section and observing the verifier redden.

**Not a Pivot.** No approved requirement changes meaning: `BG-R-1` still asks for cover, intro, TOC, 18 sections and a glossary. The amendment makes that achievable rather than redefining it. **The guide does not reshape itself to fit the tool** — `proposal.md` §4's structure is the approved deliverable.

**Second finding from the same task: a duplicated introduction.** `intro.md` (175 words) and `sections/01-introduction.md` (161 words) were two different openings doing the same job. The archived precedent settles the convention — its `intro.md` is front matter and `sections/01` is the first *screen* — and `proposal.md` §4 row 1 *is* the introduction. Collapsed into `intro.md`; sections now begin at row 2, so `02-…07-*` keep their numbering and `BG-T-11`'s `08–15` range stays correct.

---

### `BG-T-10` — Content: introduction and guide sections 1–7

| Field | Value |
|---|---|
| Status | **PASS** (attempt 2) |
| Date | 2026-09-21 |
| Implementer attempts | 2 — attempt 1 consumed by a Reviewer FAIL on two D9 defects |
| Review depth | `checklist` · Reviewer `opus`, Implementer `sonnet` |
| Review rounds | 2. Cumulative: **21** (budget 17, operator-approved overrun) |
| Requirements covered | `BG-R-2`, `BG-R-15`, `BG-R-20`, `BG-AC-15`, `BG-R-1` (U.S. English), `BG-R-6` exception condition (b), `BG-DD-9` |
| Authored LOC | ~1,636 words across 7 files. Cumulative ~1,405 LOC + this prose |

**Delivered:** `intro.md` (224 w) and `sections/02-workspace` (206) · `03-finding-your-project` (268) · `04-starting-a-result` (195) · `05-choosing-how-to-report` (184) · `06-manual-form` (318) · `07-editor-at-a-glance` (241). **1,636 words.**

**The defect class changed with this task, and so did the gate.** Everything before `BG-T-10` was caught by guards, falsifiers and measurements. From here the dominant class is **D9 — a plausible-but-false sentence** — which `requirements.md` §8 records as having **no automated gate**. `tsc` cannot see it, no guard catches it, and a reviewer who reads only the prose and finds it fluent cannot distinguish a true instruction from a fluent invention. The substitute is the citation discipline plus a review that checks prose **against the product**.

#### Three D9 defects, all found by reading the code behind the sentence

| Sentence as written | What the code says |
|---|---|
| "clicking it again … clears the filter" (§3 KPI cards) | **No card is a toggle.** `setProgramFilter()` sets unconditionally (`bilateral-projects-panel.component.ts:276`); `setMultiProgramOnly` is only ever called as `(true)` (`.html:192`) — every call site checked |
| "**Results** lists the bilateral results the Center has **already submitted**" (§2) | The status filter spans `editing`, `qa`, `submitted`, `discontinued` (`bilateral-results-list.component.ts:106-114`). **The reader's own unsubmitted draft lives there** — precisely where they would go looking for it |
| "or **Reset Filters** clears it" (§3) | `Reset Filters` renders **only** inside `@if (filteredProjects().length === 0)` (`.html:221-229`). A reader with a non-empty filtered list cannot find it |

All three share one shape: **they send a reader after something that is not there**, and all three read perfectly well. The third was a Reviewer *advisory* the Leader escalated to required, because it is the same failure in a quieter form.

**A `BG-R-20` finding worth keeping.** The Results-tab error is also a reuse miss: the in-app tour already says *"Inspect submitted **and in-progress** bilateral results"* (`bilateral-tour.service.ts:141`). The correct, already-approved wording existed for that exact element and was not reused. `BG-R-20` was written for **voice consistency**; it turns out to be an **accuracy control** as well. Where the product already carries a reviewed description, departing from it is also an opportunity to be wrong.

#### A fourth D9 was nearly introduced — by the Leader

Dictating the Results-tab fix, the Leader proposed *"with filters for phase, status and Science Program."* The Implementer verified at source, found `statusFilter`/`programFilter` exist only as signals settable from URL params and removable as chips — **with no interactive picker for either** — and shipped only what it could confirm, flagging the deviation rather than obeying.

The Leader then verified this independently (`statusFilter` has zero template hits; the filter aria-labels are only "Filter by project" and "Filter by created by"), and the round-2 Reviewer confirmed it a third time. **Had the instruction been executed literally, the guide would have told readers to filter by controls that do not exist** — a fourth defect, introduced by the role responsible for catching them.

This is the third time in this spec a subordinate corrected the Leader and was right. The mechanism that makes the chain work is that **the Implementer treats an instruction as a requirement to verify, not an order to execute**.

#### The three ring-only naming obligations — `BG-R-6` condition (b), discharged

Verified in **running prose**, not captions: the **Center identity band** and the **four tabs** in `02-workspace.md`, the **project card** in `03-finding-your-project.md`. The condition exists so a reader who cannot see a label still learns the element's name.

#### A Leader decision submitted for independent judgment, and upheld with an improvement

§5 reads *"**AI-Assisted** is described as a way to reuse information without duplicating effort…"*. The distancing is deliberate: it reports what the card claims rather than asserting what the AI path does, because the deeper behaviour has no primary source and `BG-R-15` forbids the unsourced version. The Leader instructed it **not** be rewritten, then asked the Reviewer to judge whether that was sound discipline or an evasion leaving the reader under-informed at the guide's central decision point.

The Reviewer upheld the distancing **and** identified what was genuinely missing: the *mechanics* are sourceable. Added: *"Picking **AI-Assisted** replaces the drawer's contents with a document-upload panel in place of the form"* (`bilateral-manual-create-drawer-host.component.html:96-99`). The reader is now informed at the fork without a single unsourced claim about the AI.

#### Two structural findings, both from running the tool rather than reading it

1. **`assemble.ts`'s section model cannot express this guide.** Found by running `npm run assemble` and reading **past** the expected missing `glossary.json`: the `SECTIONS` array is still verbatim W1/W2 metadata, and `SectionMeta` pairs **one section to exactly one capture**. True of W1/W2 (6 and 6); false here — **18 sections, 17 captures**, two sections with two captures and two with none. **No task owned this.** Assigned to `BG-T-13` with an explicit contract, recorded above as an execute-time design amendment. Not a Pivot: `BG-R-1` still asks for cover, intro, TOC, 18 sections and glossary; the amendment makes that achievable rather than redefining it. **The guide does not reshape itself to fit the tool.**
2. **A duplicated introduction.** `intro.md` and `sections/01-introduction.md` were two different openings doing the same job. The archived precedent settles it — `intro.md` is front matter, `sections/01` is the first *screen* — and `proposal.md` §4 row 1 *is* the introduction. Collapsed; sections now begin at row 2, so `02–07` keep their numbers and `BG-T-11`'s `08–15` range stays valid.

#### Citation list — every factual sentence to a primary source

Recorded here because `BG-T-10`'s falsifier requires it in the execution entry, and because the list is the only durable evidence that `BG-R-15` was met. Sources are code, route tables or spec documents; **never** a screenshot label, and **never** `bilateral-tour.service.ts` as evidence even where its wording was reused.

- **intro** — scope → `BG-R-2` · audience → `requirements.md` §5 · ring/chip convention → `annotate.ts` · sign-in URL → `BG-OQ-1` resolution · module separation → `docs/trd/trd.md` §2 + `bilateral-page-header.component.html:93-97` · pages as distinct routes → `routing-data.ts` `BilateralRouting`
- **§2** — identity band → `bilateral-page-header.component.html:120-152` · four tabs and order → `:286-376` · Overview → `bilateral-overview.component.html` · Reporting → `bilateral-projects-panel` · **Results (corrected)** → `bilateral-results-list.component.ts:106-114`; phase filter → `.html:92-107` · AI Draft Results → `my-draft-results.component.ts` + badge signal `:369-375`
- **§3** — search → `bilateral-projects-panel.component.html:6-14` · quick chips → `:22-40` · KPI cards → `:124-208` · **clear behaviour (corrected)** → `.ts:275-284`, `.html:24-30`, `:226-228` · **`Reset Filters` visibility (corrected)** → `.html:221-229` · card anatomy → `:234-317` · **grid vs table (corrected)** → `:256-258` vs `:322-393` · drawer opens → `:241, :311`
- **§4** — drawer title → `bilateral-manual-create.copy.ts` · context header → `bilateral-create-drawer.component.html:23-60` · step 1 multi-SP only → `bilateral-manual-create-flow.service.ts:27-35` + `bilateral-sp-selector.component.html:6-30` · contributing SPs → `:65-95`
- **§5** — card copy → `bilateral-reporting-way-selector.component.ts:29-44` · disabled until primary SP → `:47-58` · **AI swap (added)** → `bilateral-manual-create-drawer-host.component.html:96-99`, `bilateral-ai-upload.component.html:20-25`
- **§6** — level cards → `bilateral-result-level-selector.component.ts:3-6` · **seven types, id gap at 3** → `result-types-by-level.ts` · KP tabs → `bilateral-manual-create-form.component.html:37-150` · title auto-fill → `.ts:249-257` · **title appears only after type** → `.html:161` · 30-word gauge → `.ts:137-141` · uniqueness states → `.html:172-220`
- **§7** — two-column layout → `bilateral-result-creator.component.html:52-412` · six rail sections, type-specific absent for 4/8 → `.ts:219-236` · **editor opens on General information** → `.ts:79` · progress label → `.ts:248-252` · footer position → `.html:311-332` · Save draft → `.html:400-408`

**`UNVERIFIED` sentences: none.** Where a candidate sentence lacked a code-level source (deeper AI-Assisted eligibility, AI Draft Results mechanics), it was written to the level of detail the code supports rather than filled in.

**Both Judgment Day severe findings propagated correctly into the content:** "**seven** result types … the ids run to 8 but there is no id 3", and "the editor opens on **General information**, not Overview". Verified at source by the Reviewer, not taken from the spec.

#### `ADVISORY` (recorded, never gating)
- *Reliability* — the dense table also omits the grid's Science Program Alignment header and its labelled "View results (N)" link; judged compaction, covered by "a more compact row".
- *Readability* — §3's Science Program Alignment conditional is loose (the box renders whenever `sciencePrograms.length > 0`); the following single-Program sentence rescues it. Left alone deliberately.
- *Readability* — the grid header renders `100%` for a single-Program project even when `sp.allocation` is null, where the table renders nothing.

**Closing decision recorded rather than taken silently:** the final one-clause `Reset Filters` qualifier was proposed verbatim by the round-2 Reviewer and verified at source by the Leader, so the task closed without a third review round. That reasoning is written here instead of the gate being quietly skipped.

**Final verification** — `VERIFIED` (Leader re-run: U.S. English sweep clean, no asserted counts, three naming obligations in running prose, all corrected sentences re-read at source) + `STATUS: PASS` (round-2 `opus` Reviewer).
