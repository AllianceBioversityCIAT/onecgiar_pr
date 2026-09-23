# Execution Log — Progress Tracker Results Browse in the Report Form

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/progress-tracker-pull-bridge/progress-tracker-results-browse` |
| **Parent family** | `../family.md` (child #2) |
| **Depth** | Full · **Type** Change |
| **Approval Mode** | `gated`, carrying the requester's standing instruction from child 1 (2026-09-22): escalate only real design conflicts, and in particular divergent reveal sites in `PTB-T-3`. Routine continue gates auto-pass and are logged. HALT, Pivot, budget tripwire, `FATAL_FAIL`, `REVIEW_WAIVED` and the Leader-inline ask still stop for the user |
| **Requester constraints (2026-09-22)** | Client only: no `onecgiar-pr-server/` diff and no migration · consume child 1's **real** envelope · follow `tasks.md` order · **do not commit** (PRs are cut after child 2) · report PASS/FAIL as each task closes |
| **Branch** | `JuankCadavid/progress-tracker-pull-bridge` (shared with child 1, uncommitted) |
| **Budget (design.md §13)** | 7 tasks · ≈ 2,440 LOC · 2 review rounds (tripwire) |
| **Model routing** | Leader `opus` · Implementer wrapper `sonnet` · Reviewer wrapper `opus` (author ≠ auditor) |
| **Execute started** | 2026-09-22 |

---

## 2. Pre-flight — the consumed contract is now real code

`P-13` was open by design, because child 1's envelope was an approved contract rather than shipped code. Child 1 has since closed (T-1 to T-9, Leader-approved 2026-09-22), so the Leader read the real server before briefing `PTB-T-1`:

| Fact | Source (working tree) |
|---|---|
| Routes `GET indicators/:tocIndicatorId/results`, `GET programs/:programId/ready-counts` | `onecgiar-pr-server/src/api/progress-tracker/progress-tracker.controller.ts:55,83` |
| Mounted under `/api/progress-tracker` | `onecgiar-pr-server/src/api/modules.routes.ts:129` |
| Body `status: 'ok' \| 'not_found' \| 'unavailable'`, plus optional `generated_at`, `evidence_fingerprint` | `…/progress-tracker.service.ts:45,63-82` |
| Client `baseApiBaseUrl = environment.apiBaseUrl + 'api/'` | `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts:35` |

**Forward pointer for `PTB-T-5` (from child 1's `PTM-T-7`, shipped):** the create DTO now accepts an optional **`progress_tracker_provenance`** block, `{ result_key, evidence_fingerprint?, environment?, model?, generated_at? }`. It is validated with `forbidNonWhitelisted`, so **any other key is a 400** — including `pt_indicator_id`, which the server derives from `result_key` itself. `environment` must be one of `dev | staging | prod`, and `result_key` must match `<id>:<n>`. `PTB-R-16`'s "provenance fields" must be sent in exactly this shape, alongside the narrative tail in `toc_progressive_narrative`. Source: `onecgiar-pr-server/src/api/progress-tracker/dto/pt-result-provenance.dto.ts`.

---

## 3. Task Execution History

_(appended per task, newest last)_

### `PTB-T-1` — Client API methods

| Field | Value |
|---|---|
| **Status** | ✅ **PASS on attempt 1** (Implementer `sonnet` · Reviewer `opus`) · 2026-09-22 |
| **Requirements covered** | `PTB-R-6a`, `PTB-R-6b`, `PTB-R-7` |
| **Files** | `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts` (+28, two methods after `GET_cgspaceSearch`) · `…/results-api.service.spec.ts` (+54, 4 tests) |
| **runtime events** | none |

**Evidence** (Implementer report, then the Leader's non-author re-run → **VERIFIED**)

| Gate | Result |
|---|---|
| Red run before the methods existed | 4 failed (`GET_progressTrackerResults is not a function`) |
| Falsifier `baseApiBaseUrl` → `apiBaseUrl` | the same 4 went red; the request landed on `…/api/results/progress-tracker/…`. Reverted |
| `npx jest src/app/shared/services/api/results-api.service.spec.ts` | **305/305** (Leader re-run) |
| `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** (Leader re-run) |
| `npx ng lint --quiet` | clean (Leader re-run) |

**Decision — which tsconfig gates the client.** The Implementer ran `tsc -p tsconfig.json`, which pulls in `cypress/**` and every `*.cy.ts` and carries **~1,200 existing errors**, so as a gate it is noise. The gate for this child is **`tsconfig.app.json`**, in line with the project memory on client verification. The two `tsc` errors inside `results-api.service.spec.ts` (`:380`, `:3816`) already existed; this diff starts at `:5416`.

**Environment note (from the Implementer's `Not Done / Assumptions`, and not a scope gap).** This worktree had no `onecgiar-pr-client/node_modules` or `src/environments/environment*.ts` (both gitignored). The Implementer symlinked `node_modules` and copied the environment files from the sibling `qa-development-2026` worktree, following the worktree-per-spec convention. The Implementer also ran a `git stash push -u` to get a baseline grep; the Leader confirmed the shared stash list is empty afterwards and the diff is intact.

**Reviewer — `STATUS: PASS`.** Both routes match the real controller (`:55`, `:83`). Every fixture parameter (`max_results`, `refresh`, `mode`, `min_evidence`) exists in the server DTOs, so none would trip `forbidNonWhitelisted`. The full-URL match makes the falsifier genuine.

`ADVISORY` (recorded, not actioned):
- `params: any` lets `refresh: 1` compile and then fail with a 400 at runtime. **Carried into `PTB-T-2`'s brief as an obligation on the caller:** the component builds `refresh` as a literal boolean.
- The test title "(never 1/0)" claims more than the pass-through method can guarantee. This is the obligation above, and it belongs to the caller.
- The doc comment credits `forbidNonWhitelisted` with the `refresh` 400; strictly, `@IsBoolean` raises it. The conclusion (a 400) is still correct.

**Continue gate:** auto-passed under the requester's standing instruction.

### `PTB-T-2` — Leader clarification at brief time (recorded when made)

**Gap:** `design.md` §6.1's contract lists no fetch trigger, while `PTB-DD-2` / §6.2 item 5 mount the panel `[hidden]`-toggled. Read literally, the panel would be mounted when the form opens, and a fetch-on-mount would request an upstream draft (up to ~20 s of AI drafting) **on every report-form open**, including for users who never open the tab.

**Resolution (no requirement's meaning changes, so this is not a Pivot):**
- The component fetches when `tocIndicatorId` is set or changes.
- `PTB-T-3`'s host mounts the panel **lazily on the first open of the Progress Tracker tab** and keeps it mounted and `[hidden]` from then on.

This still satisfies `PTB-R-22` (switching away and back never re-fetches), and it matches the §2.3 sequence, where the GET follows the tab selection. **Carried into `PTB-T-3`'s brief**, and listed as a named conformance check for `PTB-T-2`'s and `PTB-T-3`'s Reviewers.

### `PTB-T-2` — attempt 1 → Reviewer `FAIL` (`opus`)

**Implementer attempt 1 (`sonnet`):** 4 new files under `…/lab-report-form/components/pt-results-browse/`. Red run 10 failed on rendered assertions. Falsifier (`unavailable` → `empty`) turned both AC-7 tests red. Green 14/14 · `tsc -p tsconfig.app.json` 0 errors · lint clean · coverage 94.8/62/100/94.6. **Leader re-run: VERIFIED** (14/14, 0 `tsc` errors, lint clean; falsifier re-executed with both AC-7 tests red, file restored and `cmp`-verified). `runtime events: none`.

**Reviewer FAIL — both issues upheld by the Leader:**

1. **Stale-response race.** Every change of `tocIndicatorId` opened a new subscription and never cancelled the previous one. The host re-arms the same instance on an indicator change (`lab-report-form.component.ts:527-557`). So a slow response for indicator A arriving after a fast one for B overwrote B's state, and "Use this result" would emit **A's provenance for B's form** (`PTB-R-8`, `PTB-R-16`).
2. **The guard test was vacuous.** It called `setInput(123)` twice. Signal inputs compare with `Object.is`, so the effect never re-ran and the test passed with the guard deleted. This is the eighth test in this family whose title claimed more than it asserted.

Everything else passed review: states mutually exclusive by construction; Manual escape beside the spinner; no server string rendered; `pt_url` sanitized by Angular's `[href]` with `rel="noopener"`; nested envelope matches the real `progress-tracker.service.ts:63-100`.

**Provenance decision accepted:** `generated_at` and `evidence_fingerprint` are copied onto every emitted proposal. **Named gap `PTB-G-1`:** `PTB-R-20` (a SHOULD, upgrade in place within ~1.5 s) is met by a single fetch with no fast/slow phase, and the design specifies none. Open until the TEST walkthrough measures real latency.

**Attempt 2 dispatched:**
- The full Reviewer report goes verbatim to the same Implementer, which still holds its context (resumed by message).
- Three Leader-examined advisories are tagged `[advisory-grade]`: `untracked()` around the fetch; a seeded upstream string in the AC-7 fixture so its "never leaks" assertion can fail; `aria-live` on `loading`.
- Effort raised from high to xhigh.

### `PTB-T-2` — `pt-results-browse` component: six states → **STATUS: PASS on attempt 2** (`opus`) · 2026-09-22

| Field | Value |
|---|---|
| **Requirements covered** | `PTB-R-3`, `PTB-R-4`, `PTB-R-5`, `PTB-R-8`, `PTB-R-21`, `PTB-R-23`; `PTB-AC-3`–`PTB-AC-7`. `PTB-R-20` is met by a single fetch (gap `PTB-G-1`) |
| **Files** | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/components/pt-results-browse/pt-results-browse.component.{ts,html,scss,spec.ts}` (new) |
| **Attempts** | 2 (attempt 1 FAIL, recorded above) · `runtime events: none` |

**Attempt 2 (`sonnet`, resumed by message, effort xhigh):**
- Fetching now runs through `toObservable(tocIndicatorId)` → `filter` → `distinctUntilChanged` → `tap(reset)` → `switchMap(fetch + catchError)` → `takeUntilDestroyed`.
- New race test: A is held on a pending `Subject`, the id switches to B, then A emits. B renders and A's result is dropped.
- The guard test now covers 123 → null → 123 (one call) and 123 → 456 (two calls).
- Advisory-grade items applied: `aria-live` on the loading state, and an AC-7 fixture seeded with an upstream-looking message.

**Evidence, including the Leader's non-author re-run → VERIFIED**

| Gate | Result |
|---|---|
| Folder Jest | **15/15** |
| `tsc -p tsconfig.app.json` | **0 errors** |
| `ng lint --quiet` | clean |
| Coverage (component) | 96.3 / 62.5 / 100 / 96.2 |
| Implementer: race test run against the attempt-1 shape | red (`[data-test="pt-proposal-B:1"]` received null) |
| **Leader mutation:** `switchMap` → `mergeMap` | race test **red** ✅ |
| **Leader mutation:** drop `distinctUntilChanged()` | guard test **red** ✅ |
| Original falsifier `unavailable` → `empty` | both AC-7 tests red (the HTTP-200 path and the transport path) |

**Reviewer (attempt 2) — `STATUS: PASS`:**
- Both issues are closed.
- `catchError` sits inside `switchMap`, so a transport failure does not kill the outer stream.
- A → null → A leaves A's state intact, and a request still in flight for A completes correctly.
- A → B → A re-fetches as it should.
- `tap(reset)` sets `loading` and clears `selectedKey` and `ptUrl`.

`ADVISORY` (recorded, not actioned):
- `role="status"` wraps the Manual button too, so its label may be announced along with the loading copy. Narrow it to the `<p>`.
- The component comment credits the guard with `PTB-R-22`, but **tab-switch retention is the host's job (`PTB-T-3`)**. The guard only covers the A → null → A gap. **Carried into `PTB-T-3`'s brief.**

**Continue gate:** auto-passed under the standing instruction. **Review rounds so far:** one rework round (T-2) of the 2 budgeted.

### `PTB-T-3` / `PTB-T-7` — dispatched in parallel, with Leader decisions recorded at brief time

`PTB-T-7` depends only on `PTB-T-2` and touches one new file, so it runs alongside `PTB-T-3` (the `tasks.md` §4 parallel note). Width: 2.

**`PTB-T-3` pre-analysis — reveal sites checked by the Leader (the requester's named escalation trigger).** All three sites (`:198`, `:307`, `:370`) share the single clause `!currentResultIsKnowledgeProduct() || kpEntryMode() === 'manual' || createResultBody().handler`. `:307` wraps it in a `!isEmerging() && (…)` that already exists and is orthogonal. **One identical OR term** ("PT tab with a proposal picked") therefore extends all three consistently. The Disqualifier (divergent conditions) does **not** fire, and **no escalation is needed.** The Implementer is told to stop if the source proves otherwise.

**Decisions in `PTB-T-3`'s brief (they fill gaps the spec leaves open and change no requirement's meaning):**
- **Default mode per indicator type** (the Reversion challenge's breakage 3): KP → `'browse'`, unchanged. **Non-KP → `'manual'`**, which keeps today's non-KP rendering (form visible at once, `PTB-R-13`) and fetches nothing until the user opens the tab.
- **Emerging mode shows no switcher and no PT panel.** It has no indicator, so there is no id to fetch with, and `PTB-R-12` forbids changing the emerging form.
- **`ptDraft` signal plus a minimal `onPtResultSelected` that only sets it** land in `PTB-T-3`, because the reveal term needs a "picked" state. Pre-fill, the banner (`PTB-R-15`) and the payload stay with `PTB-T-5`.
- **`tocIndicatorId` = `indicator().related_node_id`**, the string child 1's route keys on (source: `progress-tracker.service.ts:18-40`).
- **Lazy mount on first open plus `[hidden]` retention** (the `PTB-T-2` clarification). `PTB-T-2`'s review advisory is carried along: the component's guard does **not** provide tab-switch retention; the host does.

### 🛑 `PTB-T-2` REOPENED — a compile defect the PASS evidence could not see

While re-running `PTB-T-7`'s evidence, `npx tsc --noEmit -p tsconfig.app.json` reported **18 × TS4111** (`noPropertyAccessFromIndexSignature`) in `pt-results-browse.component.ts` (≈`:169-190`, `toProposal()`). The file is **byte-identical** (`cmp`) to the version that PASSed.

**Why the earlier "0 errors" was vacuous:** `tsconfig.app.json` compiles only what `main.ts` can reach. The component had **no host** until `PTB-T-3`, running concurrently, imported it, so it was never type-checked at all. ts-jest does not enforce this rule, so 15/15 stayed green. This is the unreferenced-component trap already recorded in the project memory (the relocation SCSS lesson, and the client tsc lesson). It came back because the tsc gate was taken as evidence **for a file the gate never compiled.**

**Status:** `PTB-T-2` goes back to `[~]` (the evidence was written before this checkbox write), and attempt **3 of 3** is dispatched: a narrow compile fix in the component file only, behaviour byte-identical. The Reviewer PASS on behaviour stands. The fix gets its own evidence re-run and a check against the attempt-2 behaviour.

**Lesson for the Kaizen step:** a client tsc gate for a **new, not-yet-mounted** file must use a config that reaches it (`tsconfig.spec.json` via its spec, or a mounted host), or record that it is **not applicable** until a host exists. "0 errors" from a config that never compiled the file is not evidence.

### `PTB-T-2` attempt 3 (compile fix) — evidence

Implementer (`sonnet`, resumed): a private `PtRawProposal` interface replaces the `Record<string, any>` cast in `toProposal()`. The change is type-only. **Leader re-run → VERIFIED:** full `npx tsc --noEmit -p tsconfig.app.json` reports **0 errors**, and this time the gate is **real**, because `lab-report-form.component.ts:38` imports the component. Component spec 15/15; lint clean. Re-review requested from the same Reviewer, because a rework triggers override (e).

### `PTB-T-7` — attempt 1 → Reviewer `FAIL` (`opus`)

**Implementer attempt 1 (`sonnet`):** `pt-client-leak-guard.spec.ts` (new) scans `.ts`/`.html`/`.scss` under `src`, excluding specs, CT files and `environments/`. Four tests.
- **Leader re-run → VERIFIED:** 4/4 green on today's tree. Leader probes (`execute-api` URL, `api.synapsis-analytics.com`, `PT_INTEROP_BASE_URL`) each went red; probe removed and green again. Lint clean.
- `runtime events: none`.

**FAIL — both issues upheld by the Leader:**
1. **Test 4's title claims a behavioural R-6b check** ("never builds an outgoing PT indicator_id"), but it only checks that a string is absent from one folder. This is the **ninth** test in this family to claim more than it asserts. The behavioural proof already lives in `pt-results-browse.component.spec.ts` (`toHaveBeenCalledWith(123, {})`) and `results-api.service.spec.ts` (full URL).
2. **The header never states the environment-file blind spot:** a PT URL or key placed in `environment*.ts` would go undetected. The header also says `environment*.ts` while the code excludes the whole directory.

**Attempt 2 dispatched:** the report goes verbatim to the same Implementer (resumed), with one Leader-examined `[advisory-grade]` item: redact hosts written without a scheme, so a failure can never print an API Gateway id (`.cursorrules`). Effort raised from medium to high.

### 🛑 Spec-wording finding for the requester — `PTB-R-7` / `PTB-AC-16` are too broad (a proposed amendment; **not applied**, it needs approval)

`PTB-R-7` reads "MUST NOT issue **any** request to a `synapsis-analytics.com` or `execute-api` host". Pre-existing PRMS features already do exactly that:
- **`ai-review.service.ts:334`** sends an XHR POST to `environment.reviewApiUrl`, which is an **`execute-api`** host in prod.
- **`bilateral-page-header.component.ts:286`** navigates to `environment.bulkUploaderUrl`, which is on a **`synapsis-analytics.com`** host (an unrelated bulk-results uploader run by the same vendor).

Neither has anything to do with the Progress Tracker. The requirement's **intent**, as its second sentence says ("Every Progress Tracker call MUST go to the PRMS origin"), is scoped to the PT upstream. As written, though, `PTB-AC-16`'s TEST-walkthrough network check could flag PRMS's own AI-review call.

**Proposed amendment:** narrow `PTB-R-7` and `PTB-AC-16` to "the Progress Tracker upstream host (the `PT_INTEROP_BASE_URL` origin)". This changes what an approved requirement means, so it goes to the requester. It blocks no task: `PTB-T-7`'s static guard is correct under either reading, because it excludes the environment files by path.

### `PTB-T-2` → **STATUS: PASS on attempt 3** (`opus`) · 2026-09-22

**Reviewer (attempt 3) — `STATUS: PASS`.** The change is type-only; the emitted JS for `toProposal()` is identical, with the same `??`, `Array.isArray` and `typeof` fallbacks. `PtRawProposal` was checked against the staging fixture: `confidence` numeric, the evidence item shape, `gender_split` as `{women, men}`, and the handle `null`. The nested per-result field-policy strings are never read. There is no `as any`, and the `unknown` → `PtRawProposal` cast is more honest than `Record<string, any>`.

`ADVISORY` (recorded, not actioned): `title`/`description`/`rationale` still trust the string type. A non-string would render as `[object Object]`, which is not a security issue. A `typeof === 'string'` guard, like the one on `confidence`, would harden it.

**Final `PTB-T-2` tally:** 3 attempts. Attempt 1 was a Reviewer FAIL (race plus a vacuous guard test). Attempt 2 PASSed. Attempt 3 was a post-PASS compile fix, surfaced by the host mount and found by the Leader, not by a Reviewer.

### `PTB-T-7` — Static leak sweep → **STATUS: PASS on attempt 2** (`opus`) · 2026-09-22

| Field | Value |
|---|---|
| **Requirements covered** | `PTB-R-6a`, `PTB-R-6b` (lexical half; the behavioural proof lives in the `PTB-T-1`/`PTB-T-2` specs), `PTB-R-6c` respected, `PTB-R-7`; `PTB-AC-16` static half |
| **File** | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/components/pt-results-browse/pt-client-leak-guard.spec.ts` (new) |
| **Attempts** | 2 (attempt 1 FAIL, recorded above) · `runtime events: none` |

**Attempt 2:**
- Test 4 retitled as a lexical guard.
- Test 3 now pins the PT URL path parameters to `${tocIndicatorId}` / `${programId}`, reading the live service file.
- The header names both blind spots and their substitutes: an environment-file key, and a PT id parsed out of `result_key`. The substitutes are a grep of the built `dist/` and the TEST walkthrough.
- The environment exclusion is now file-level, matching the header.
- Hosts written without a scheme are redacted.

**Leader re-run → VERIFIED:**
- 4/4 green on today's tree.
- A Leader probe with no scheme (`abcd123xyz.execute-api…`) went red, printed as `<redacted-host>/p` with the id absent.
- Probe removed; green again.
- `tsc -p tsconfig.app.json` 0 errors.

**Reviewer — `STATUS: PASS`.** Both issues are closed. Line 227 reads the real service, so a changed path parameter turns it red directly. The in-test mutation exercises the helper and is not a tautology.

`ADVISORY` (recorded, not actioned):
- Also assert that the mutated extraction equals `${indicator_id}`.
- The R-7/AC-16 wording amendment is still pending with the requester (see the spec-wording finding above).

**Review rounds so far:** two rework rounds (`PTB-T-2`, `PTB-T-7`), which is **the full budget of 2**. The next Reviewer FAIL trips the budget tripwire.

### `PTB-T-3` — attempt 1 report, and a Leader brief defect caught before review

**Implementer attempt 1 (`sonnet`):**
- Red run: 4 of 5 new tests failed before the change.
- Falsifier (`resetForm` hard-coded to `'browse'`) → the non-KP default test went red (`Expected "manual", Received "browse"`).
- Green: lab-report-form spec 107/107 (additions only); `dashboard-lab/components` 22 suites / 867 tests; `tsc -p tsconfig.app.json` 0 errors; lint clean.
- CT `indicator-drawer.reported-results.cy.ts`: 5 passing / 1 failing both **before** and **after**. The failure pre-exists (a `Contribution` header aria-sort test).

**🛑 Leader brief defect, found reading the report before review.** The brief said "the switcher and the PT panel must NOT render when `isEmerging()`". The Implementer followed it faithfully and wrapped the **whole** block in `@if (!isEmerging())`. At HEAD, an **emerging result with a KP category** renders the Browse/Manual switcher, the Browse panel and the handle field. The new version hid all three, so an emerging KP result could no longer be created: a `PTB-R-12`/`PTB-R-13` regression that **the brief itself introduced**.

**Correction re-issued to the same Implementer (brief re-issue, no attempt consumed):** emerging renders exactly as HEAD. Only the **new** surfaces (the PT tab, the PT panel, the non-KP two-tab switcher) are gated on "not emerging, and an indicator id exists". The KP `aria-label` is restored. Two new tests must go red against the current version: emerging KP keeps Browse/Manual and the handle field, and emerging non-KP has no tablist.

**Lesson:** a gating instruction in a brief must be scoped to **the new surfaces only**. "Hide X when Y" applied to a block that already carries delivered behaviour is a reversion by instruction. This is the Reversion challenge applied to the brief itself.

### `PTB-T-3` — attempt 1 (after the brief correction) → Reviewer `FAIL` (`opus`)

**Implementer (after the correction):** emerging renders as HEAD, and only the new surfaces are gated. The emerging-KP test was red against the pre-correction version. **Leader re-run → VERIFIED:** spec 109/109 with 0 removed lines; `dashboard-lab/components` 22 suites / 869 tests; `tsc -p tsconfig.app.json` 0 errors; lint clean. Falsifier red. CT 5 passing / 1 failing, both before and after (the failure pre-exists). `runtime events: none`.

**Reviewer FAIL — upheld by the Leader:**
- **Default mode is decided only at re-arm.** `resetForm()` (`:637`) derives the default from `currentResultIsKnowledgeProduct()` right after setting `result_type_id: null`. Two entry paths **have no category at re-arm**: emerging with no preset `emergingCategory`, and the ~350 uncategorised indicators (`needsCategoryChoice()`).
- On both paths the default becomes `'manual'`. The user then picks **Knowledge product** in `onCategoryChange(6)` (`:737-757`), which never touches `kpEntryMode`. The KP switcher appears with **Manual** selected; at HEAD it was always Browse. This changes existing KP behaviour, including in emerging mode (`PTB-R-12`, `PTB-R-13`, DoD "Default mode correct per indicator type").
- The reverse flip (KP → non-KP) leaves the non-KP tablist with no tab selected.
- The emerging-KP test only covers a **preset** category, so it passed under both behaviours.
- **Remediation (Reviewer's):** reset the mode in `onCategoryChange` when KP-ness flips, keeping `'progress-tracker'` where it is still offered. Add two tests (emerging picker → KP, uncategorised → KP), each checking `kpEntryMode()` and the Browse tab's `aria-selected`.

Confirmed passing: all three reveal sites extended identically, with `:370`'s `@else` intact; lazy mount plus retention proven by DOM identity and a single GET; panel inputs; the minimal handler; no sibling `KpEntryMode` touched.

`ADVISORY` (recorded, not actioned):
- The "emerging non-KP renders no tablist" test duplicates an assertion.
- The new non-KP tablist copies HEAD's a11y gaps (no `aria-controls`, `tabpanel` or arrow keys). Not a regression.
- `lab-report-form/CLAUDE.md` now quotes the old reveal condition and a two-valued `kpEntryMode`. It is owned by `tasks.md` §7 cleanup.

---

## 🛑 BUDGET TRIPWIRE — escalated to the requester; `PTB-T-3` rework held

`design.md` §13 budgeted **2 review rounds**. This is round **3**:

| # | Task | Cause |
|---|---|---|
| 1 | `PTB-T-2` | A genuine implementation defect (a stale-response race that would have sent the wrong provenance) plus a vacuous guard test |
| 2 | `PTB-T-7` | A test title claiming a behavioural check it did not make, plus an undisclosed blind spot in the header |
| 3 | `PTB-T-3` | A genuine gap: the default mode ignores a category chosen **after** re-arm. It is partly downstream of the Leader's brief, which specified "default per type" without naming the category-picker path |

**Not counted as review rounds, but part of the cost picture:**
- `PTB-T-2`'s post-PASS **compile fix**: the Leader's tsc gate was vacuous for an unmounted file.
- `PTB-T-3`'s **Leader brief defect**: the emerging gating, corrected before review.

Both are Leader-side misses, not Implementer churn.

**Progress:**
- Closed: `PTB-T-1`, `PTB-T-2`, `PTB-T-7`.
- `PTB-T-3` is `[~]`. One small fix is known and scoped (the `onCategoryChange` reset plus two tests), and 2 of 3 attempts remain.
- `PTB-T-4`, `PTB-T-5` and `PTB-T-6` wait on `PTB-T-3`.

**Also pending with the requester:** the proposed `PTB-R-7`/`PTB-AC-16` wording amendment (see "Spec-wording finding" above).

Per the tripwire rule, execution **stops here**.

## Requester decisions — 2026-09-22 (on the budget tripwire)

1. **Budget overrun accepted; continue.** `PTB-T-3` rework attempt 2 goes out with the Reviewer report verbatim, plus a Leader-added reverse-flip test (KP → non-KP selects Manual). Further FAILs stop only on HALT or Pivot, not on the budget again.
2. **`PTB-R-7` / `PTB-AC-16` narrowed to the Progress Tracker upstream host** (the `PT_INTEROP_BASE_URL` origin). This is an approved change to a requirement's meaning, applied with correction closure:
   - **Amended sites (forward sweep: `grep "synapsis-analytics\|execute-api"` across the family folder):**
     - `requirements.md` `PTB-R-7` (`:84`) and `PTB-AC-16` (`:143`)
     - `tasks.md` §6 rollout network-log line (`:231`)
     - parent `proposal.md` SC-3 (`:274`)
     - child `proposal.md` SC-3 (`:208`)
     - `family.md` (`:25`)

     Each amendment is date-stamped and names the two pre-existing PRMS URLs.
   - **Left as-is, on purpose:** `family.md:95` and the `indicator-mapping` design `P-14` (they record the PT staging base URL as measurement evidence); `tasks.md:167` (the `PTB-T-7` falsifier uses the PT staging URL, which the narrowed wording still forbids).
   - **Backward sweep** (`grep "PTB-R-7\|PTB-AC-16\|SC-3"`): the traceability rows, `design.md:46,149`, `tasks.md:29,162,195,201,224`, the `requirements.md` §7 security row and D-6/D-10 all still read correctly. `PTB-T-7`'s static guard still scans for all three patterns in source, which is stricter than the narrowed requirement and still correct.

### `PTB-T-3` — Host integration → **STATUS: PASS on attempt 2** (`opus`) · 2026-09-22

| Field | Value |
|---|---|
| **Requirements covered** | `PTB-R-1`, `PTB-R-2`, `PTB-R-12`, `PTB-R-13`, `PTB-R-22`; `PTB-AC-1`, `PTB-AC-2` (logic half), `PTB-AC-14`/`AC-15` (pre-existing suite unchanged) |
| **Files** | `…/lab-report-form/lab-report-form.component.{ts,html}` · `…/lab-report-form.component.spec.ts` (additions only) |
| **Attempts** | 2. Attempt 1 was a Reviewer FAIL (the category-picker default). Before that came a Leader brief defect, corrected before review with no attempt consumed. `runtime events: none` |

**Attempt 2:** `onCategoryChange` re-derives the mode when KP-ness flips, keeping `'progress-tracker'` because that tab exists on both switchers outside emerging. Three new tests: emerging picker → KP, uncategorised → KP, and the reverse flip KP → non-KP.

**Leader re-run → VERIFIED:**
- Removing the line turns all 3 red (Implementer).
- **Leader mutation**, one direction only (`if (isKnowledgeProduct) set('browse')`): the reverse-flip test goes red **on its own assertion**. Restored, `cmp`-verified.
- Spec 112/112 with 0 removed lines; `dashboard-lab/components` 872/872; `tsc -p tsconfig.app.json` 0 errors; lint clean.
- Original falsifier still red.

**Reviewer — `STATUS: PASS`:**
- The `'progress-tracker'` skip is correct for both KP and non-KP.
- The KP → non-KP handler/`mqapJson` clearing (`:778-782`) is unaffected: it keys on `wasKnowledgeProduct`, read before the patch.
- Emerging needs no extra reset, because the mode can never be `'progress-tracker'` there.

**Leader follow-up (comment only, no behaviour change):** the Reviewer's readability advisory found the 12-line rationale comment **duplicated** at `:741-763`, with one inaccurate word. The Leader deleted the duplicate and corrected the word. Spec 112/112 and lint clean afterwards.

`ADVISORY` (recorded, not actioned):
- Named gap **`PTB-G-2`**: the KP and non-KP switchers each mount their own `app-pt-results-browse`. A user on the PT tab of an **uncategorised** indicator who flips the category across KP / non-KP remounts the panel, which re-fetches (up to ~20 s) and loses the loaded list; `ptDraft` survives. `PTB-R-22` covers tab switches only, so this is not a violation. The fix would hoist a single panel outside both branches.
- `lab-report-form/CLAUDE.md` is now stale: it quotes the old reveal condition and a two-valued `kpEntryMode`. This is owned by `tasks.md` §7 cleanup, which must land in the **same commit** as the host change, per the folder-doc rule.
- The new non-KP tablist copies HEAD's a11y gaps (no `aria-controls`, `tabpanel` or arrow keys). Not a regression.

**Next:** `PTB-T-4` and `PTB-T-6` in parallel (different files). `PTB-T-5` after `PTB-T-4`, because both edit `lab-report-form.component.spec.ts`.

### `PTB-T-4` — Emerging-mode regression: the create footer must still render → **STATUS: PASS on attempt 1** (`opus`) · 2026-09-22

| Field | Value |
|---|---|
| **Requirements covered** | `PTB-R-12`, `PTB-AC-14` |
| **File** | `…/lab-report-form/lab-report-form.component.spec.ts`, 2 tests added (`:1711-1758`). The no-category case was already covered by `PTB-T-3`'s `PTB-R-12` test, which asserts the same control, so it was not duplicated |
| **runtime events** | none |

**Evidence (Implementer, then the Leader re-run → VERIFIED)**

| Gate | Result |
|---|---|
| Mutation A: `!isEmerging() &&` on Card 3's `@if` (`:440`) | **Leader re-run:** 4 red (the `PTB-R-12` test plus both new tests). Restored and `cmp`-verified |
| Mutation B: Card 3 closed after `</section>`, `@else` relocated | Implementer: all 3 footer assertions red. The KP test failed through its "no footer before the handle" guard |
| Spec | **114/114**; the pre-existing tests are untouched |
| Template | byte-identical to the PASSed `PTB-T-3` state (per-file diff comparison) |
| `tsc -p tsconfig.app.json` / lint | 0 errors / clean |

**Reviewer — `STATUS: PASS`.**
- The control is named by `data-testid="create-result-submit-btn"` plus the text `Create and continue`.
- Each test pre-asserts `isEmerging()` and KP-ness, so neither can pass by a different route.
- `disabled === false` is meaningful because only `creatingResult()` disables the button; `!canSave()` sets `aria-disabled` only.

**Named gap `PTB-G-3` (recorded, not actioned).** "Reachable" is only partly proven: jsdom cannot check CSS visibility, and the tests check no `[hidden]`/`inert` ancestor. Today the only `[hidden]` wrappers hold just the PT panel. A cheap lock would add `closest('[hidden],[inert],[aria-hidden="true"]')` → null.

### `PTB-T-6` — attempt 1 → Reviewer `FAIL` (`opus`)

**Implementer attempt 1 (`sonnet`):**
- Mounts the real `LabReportFormComponent` with stubbed `ApiService`/`ResultsApiService`; the isolation fallback was not needed.
- Viewports: 1440×900 with a 740 px container, and 390×900 with a 390 px container, the widths taken from `initialDrawerWidth()`.
- Fonts recorded. Baseline: two tabs average 352.5 / 179 px; three tabs 235 / 119.3 px.
- Falsifier as a positive control: the injected overflow is detected, and the control failed with the injection removed.
- 5/5 green. The `dashboard-lab/components/**/*.cy.ts` set is 16/17, the one failure being the pre-existing aria-sort case. `test:ct:changed` was substituted by the affected dashboard-lab set, because the shared worktree pulls in ~57 unrelated specs.
- **Leader evidence re-run deferred:** `PTB-T-5` is editing the same template, and no layout measurement is run while a delegated agent can mutate the page. `runtime events: none`.

**Reviewer FAIL — all four issues upheld by the Leader:**
1. **The floor and label-clip gates cannot go red.** With the tabs `flex-1`, the three-tab average is always exactly 2/3 of the two-tab one while nothing overflows. With the default `min-width:auto` and no `overflow:hidden`, `scrollWidth ≤ clientWidth` always holds. The realistic D-8 symptom at 390 px, labels **wrapping onto two lines**, is never measured (no `rect.height`).
2. **Fonts are recorded but never asserted.** `document.fonts.check()` is `true` even when no `@font-face` matches at all.
3. **The container stand-in is too generous.** The real aside scroll body adds `px-4` / `min-[640px]:px-6` (`indicator-drawer.component.html:153`), so the form really gets ~358 / 692 px. Containment was checked on the `w-full` strip, which is always contained.
4. **Test titles over-claim** ("labels not clipped", "floor", "contained"), and a stale comment contradicts the header. This is the **tenth** over-claiming title in this family.

The positive-control falsifier was **accepted** as equivalent evidence. The Reviewer asks for a second mutation that forces a wrap, to prove the new height gate.

**Rework held until `PTB-T-5` closes** (measurement concurrency). ⚠️ **Possible real D-8 finding ahead:** if the height gate goes red at ~358 px, three tabs genuinely wrap in the phone-width drawer. That is a **template decision** outside `PTB-T-6`'s tests-only scope (and the `PTB-OQ-1` visual confirmation), so it would be escalated rather than resolved by loosening the gate.

### `PTB-T-5` — attempt 1 → Reviewer `FAIL` (`opus`); one issue escalated as a spec conflict

**Implementer attempt 1 (`sonnet`):**
- `onPtResultSelected` pre-fills the title (30-word truncation with a visible notice), the type (guarded by `indicatorFixesResultType`, mapped through the canonical `resolveReportResultTypeId`) and the KP handle through `patch()`. `mqapJson` is untouched.
- `buildCreateResultPayload` takes an optional `ptProposal`. That sets `toc_progressive_narrative` = description + tail `"Drafted from Progress Tracker proposal <result_key>, generated <generated_at>."`, and a sibling `progress_tracker_provenance: {result_key, evidence_fingerprint, generated_at}` that is **absent** when there is no pick.

**Leader re-run → VERIFIED:**
- 8 suites / 419 tests across lab-report-form, reporting-aow-table and shared/report-result; 0 removed spec lines.
- `tsc -p tsconfig.app.json` 0 errors; lint clean; `build:dev` passes (Implementer).
- Falsifier 1 re-run by the Leader: AC-9 red, AC-10 green. Falsifiers 2 and 3 red (Implementer).
- `runtime events: none`.

**Design premise corrected — `P-4` was wrong.** `reporting-aow-table.component.ts` mentions `buildCreateResultPayload` only in a **docstring** (`:57`), confirmed by the Leader. There is **one** production caller. The `PTB-AC-13` guard ("an existing caller still sends `''`") therefore lives at builder level, and it is proven by Falsifier 2.

**Reviewer FAIL — both upheld by the Leader:**
1. **The banner follows the tab; provenance follows the pick** (`PTB-R-15`, `PTB-R-16`). Both banner copies sit inside the `[hidden]` PT panel, while `createResult()` sends the tail and provenance whenever `ptDraft()` is non-null. Pick → switch to Manual → rewrite → Create posts PT provenance, and **nothing on screen says a draft is attached.** The fix is implementable: render the banner whenever `ptDraft()` is set, outside the `[hidden]` panel, plus a test.
2. **🛑 A KP pick completes by auto-create, through a hidden field** (`PTB-R-14` vs `PTB-R-11`). After a KP pick, `missingFields()` keeps "Repository link/handle". The "N fields left" focus targets a handle input hidden in the Manual panel, and nothing on the PT tab explains this. When the user syncs on Manual, `validateHandle()` → `autoCreateIfKnowledgeProduct()` (KPAC-T-2/T-3, **existing KP behaviour**) posts the result **with PT provenance and without Create and continue**.
   - `PTB-R-14` forbids creation except through Create; `PTB-R-11` requires the existing KP flow unchanged; the task's own **Disqualifier** says "re-specify the KP pick instead".
   - **This is a spec conflict, escalated to the requester, not a rework item.**

`ADVISORY` (recorded; the Leader will fold the cheap ones into the rework once the conflict is ruled on):
- Stale `mqapJson`/`handler` stay in component state after a pick flips the type away from KP. The payload is safe, because the builder nulls KP fields for non-KP types, but switching back to KP would reuse the old repository metadata.
- A pick that flips KP-ness remounts the PT panel (→ `PTB-G-2`).
- `result_key` and `generated_at` are passed through verbatim; the risk is low, because the staging value passes `IsISO8601`.
- The truncation notice can go stale after a KP Sync that replaces the title.
- The util test "PTB-AC-17 — never carries countries…" cannot fail, because the type has no such fields. This is the **eleventh** over-claiming test; the real lock is the component test.

---

## Leader ruling — KP-pick conflict (`PTB-T-5`) — 2026-09-22 ~18:25 America/Bogota

**Decision: OPTION 1 — Suppress auto-create when a PT draft is attached.**

1. When `ptDraft()` is set: show an inline prompt on the PT tab ("Sync the repository handle to continue"; button jumps to Manual). Sync validates the handle but MUST NOT call `autoCreateIfKnowledgeProduct` / create. User finishes with **Create and continue**.
2. Non-PT KP flow unchanged (Sync may still auto-create).
3. Amend `PTB-R-11` wording to: existing KP flow unchanged **except that a PT pick never auto-creates**.
4. Also fix Reviewer issue 1 in the same rework: render the provenance/draft banner whenever `ptDraft()` is set, **outside** the `[hidden]` PT panel, plus a test (pick → Manual → rewrite still shows draft attached).
5. Fold cheap ADVISORY items that are safe into this rework; leave the rest named here.
6. Then resume `PTB-T-6` rework. Escalate only real HALT/Pivot / template D-8 wrap at ~358px if the height gate goes red for real.

---

## Leader rulings — D-8 tab strip + footer bleed — 2026-09-22 ~18:35 America/Bogota

**Tab labels (D-8): OPTION 1 — Short labels below 640px.**
Under the 640px aside breakpoint show `Browse` · `Manual` · `Tracker` (full names kept as `aria-label` / `title`); full labels at ≥640px. Keep the single-line CT gate as written.

**Footer bleed (~6 px past scroll body below 640px): RECORD AS NAMED GAP — do not fix in this child.**
Leader confirmed / Claude reported it predates this change (`-mx-6`/`px-6` already at HEAD). Name it in `execution.md` (e.g. `PTB-G-footer-bleed`) and leave the CT assertion scoped so it does not fail on this pre-existing overflow. Do not expand child-2 scope to restyle the footer.

**Standing for the rest of child 2:** keep deciding recommended options that preserve Create-and-continue as the only PT create path; accept further budget overruns without re-asking; escalate only real HALT/Pivot. After all PTB tasks PASS, stop for Leader review before any commit; then we port onto `qa-development-2026` for HILT.

If a Claude AskUserQuestion menu is still open: accept **1** for Tab labels, then for Footer bleed choose the "record / leave as pre-existing gap" option (or equivalent of not fixing in this child), then Submit.

### `PTB-T-6` — attempt 2: an honest red, a real D-8 finding (treated as a spec finding, not a consumed attempt)

**Implementer attempt 2 (`sonnet`, resumed) fixed all four Reviewer issues:**
- The min-width floor replaces the average.
- A `rect.height` single-line gate replaces the vacuous clip check.
- Fonts are asserted through `FontFace.status === 'loaded'` (Manrope, Material Icons Round).
- The scroll-body stand-in is rebuilt from `indicator-drawer`'s real `px-4 min-[640px]:px-6`, and each tab is checked for containment.
- A second falsifier forces a wrap (`max-width:90px`) and goes red as designed.
- A harness bug was found and fixed: Cypress CT does not reload between `it()`s, so injected `<style>` tags leaked across tests; an `afterEach` now strips them.

**Result: 5 passing, 1 failing, left red as instructed.** Two real causes:
- **(a) D-8:** at a 390 px aside (~111 px per tab), **"Browse repositories" and "Progress Tracker" wrap: 57 px vs 35 px.**
- **(b) Pre-existing:** the KP browse-mode Cancel-only footer (`HEAD:…/lab-report-form.component.html:711`, unconditional `-mx-6 px-6`) bleeds **6 px** past the scroll body below 640 px (scrollWidth 396 vs 390).

**Leader CT re-run** (port 4413, no agent active): same result, 5/1. The first failing assertion is the 396 > 390 overflow (the footer). The wrap is second, which the Implementer's diagnostic measured at 57 px.

The honest red was the outcome the brief ordered, and the fix requires a design decision. Under the Pivot rule ("do not consume attempts on a broken spec") **attempt 2 is not counted as a FAIL.**

## Requester decisions — 2026-09-22 (second escalation)

1. **KP pick → suppress auto-create on a PT pick** (the Leader's recommendation). While `ptDraft()` is set, handle Sync validates without auto-creating, and the PT tab shows an inline "sync the repository handle to continue" prompt with a jump to Manual. Creation stays with Create and continue. **`PTB-R-11` amended** (`requirements.md:88`, date-stamped). Backward sweep: `PTB-R-11`'s traceability row (`:211`) and `tasks.md` `PTB-T-5`'s `Implements` still read correctly.
2. **D-8 → short labels below a 640 px aside: Browse · Manual · Tracker**, with the full names kept as `aria-label`/`title`. **Added to `design.md` §6.3** ("Narrow tab labels"). `PTB-T-6`'s `Files (expected)` is **amended** to include the tab-strip markup for this change only.
3. **Footer bleed → leave it; record a follow-up** (`PTB-G-4` in `design.md` §14). `PTB-T-6`'s gate must not be red because of it: the D-8 gate checks the tabs' own containment, and the footer bleed is recorded, not asserted.

**Order:** the `PTB-T-5` rework first. Then `PTB-T-6` attempt 3 (label markup plus gate adjustments), so the CT measures a stable template.

### `PTB-T-5` — Pick-to-prefill mapping and the create payload → **STATUS: PASS on attempt 2** (`opus`) · 2026-09-22

| Field | Value |
|---|---|
| **Requirements covered** | `PTB-R-9`, `PTB-R-10`, `PTB-R-11` (as amended), `PTB-R-14`, `PTB-R-15`, `PTB-R-16`, `PTB-R-17`, `PTB-R-18`; `PTB-AC-8`–`PTB-AC-13`, `PTB-AC-17` |
| **Files** | `…/lab-report-form/lab-report-form.component.{ts,html,spec.ts}` · `…/shared/report-result/create-result-payload.util.{ts,spec.ts}` |
| **Attempts** | 2 (attempt 1 FAIL; its KP issue was escalated and ruled on by the requester) · `runtime events: none` |

**Attempt 2 (`sonnet`, resumed):**
- One pick banner, gated only on `ptDraft()` and outside every `[hidden]` panel.
- `autoCreateIfKnowledgeProduct()` returns early when `ptDraft()` is set (`:763`). This covers both the Sync path and the Browse path.
- An inline "sync the handle" prompt, with a jump to Manual, appears on the PT tab of an unsynced KP pick.
- `focusFirstMissingField()` switches to Manual before focusing.
- Advisory-grade items applied: stale `mqapJson`/handler cleared when a pick leaves KP; the truncation notice cleared on a successful Sync; the vacuous util test retitled.
- **Beyond the brief:** the three reveal sites were simplified from `(mode === 'progress-tracker' && ptDraft)` to `ptDraft`. They are still identical to each other.

**Evidence (Leader re-run → VERIFIED):**
- lab-report-form + reporting-aow-table + shared/report-result: 8 suites / **425** tests; 0 removed spec lines.
- `tsc -p tsconfig.app.json` 0 errors; lint clean; `build:dev` passes (Implementer).
- **Leader F-a** (remove the `:763` guard): red exactly on "a KP pick completes Sync without auto-creating; Create and continue then posts exactly once, carrying provenance". Restored and `cmp`-verified.
- Implementer: F-b (banner back inside `[hidden]`) red; F1 / F2 / F3 still red.

**Reviewer (attempt 2) — `STATUS: PASS`:**
- **(a) Reveal simplification accepted.** With `ptDraft()` null, all three sites reduce exactly to HEAD's expression (`PTB-R-13`). `ptDraft` cannot be set in emerging mode (`PTB-R-12`). `:443` keeps `!isEmerging()`, and `:506` keeps the `@else`. **This amends `PTB-T-3`'s reveal decision** ("PT tab + pick" becomes "pick"), recorded here as such.
- **(b)** Suppressing auto-create for a Browse selection made after a pick is honest: the banner stays true, and "Change proposal" is one click away.
- **(c)** KP auto-create with no pick is unchanged, proven by the untouched `KPAC-TEST-4` (Sync, `:969`) and `KPAC-TEST-3` (Browse, `:856`).

**Named gaps (recorded, not actioned; to confirm at the HITL look):**
- **`PTB-G-5`:** `focusFirstMissingField()` switches the tab and calls `focus()` in the same tick. Under OnPush the handle container is probably still `[hidden]`, so the tab switches but focus likely does not land. The change is untested.
- **`PTB-G-6`:** after a KP pick that carries a handle, the **pre-existing** "Selected from CGSpace" banner on the Browse tab (keyed on `createResultBody().handler`) claims a repository selection that never happened (`mqapJson` is null).
- **`PTB-G-7`:** a Browse selection made after a pick keeps the "Drafted from Progress Tracker proposal" narrative, a meaning mismatch the user fixes with "Change proposal".
- Carried over: `result_key` and `generated_at` are passed through verbatim (low risk).
- The Browse-tab reveal with a pick is not tested.

### `PTB-T-6` — attempt 3 → Reviewer `FAIL` (narrow); final attempt dispatched

**Attempt 3 (`sonnet`, resumed):**
- The D-8 fix follows the requester's decision: an `@container` query on each `[role=tablist]`, with short/full spans (`@min-[640px]:hidden` / `hidden @min-[640px]:inline`) and a full `aria-label`/`title` at every width. Applied to both switchers.
- The CT asserts the short labels at narrow, the full labels at wide, and the full accessible name at both.
- The footer bleed is logged, not asserted (`PTB-G-4`).
- 8 tab-identification lines in `PTB-T-3`'s spec-added Jest tests now read `aria-label`, because jsdom applies no CSS.
- Red with the markup reverted (57 vs 35 px); after the fix every tab measures 34.5 px.

**Leader re-run → VERIFIED:** CT **6/6** (port 4414); lab-report-form Jest **151/151** with 0 removed lines against HEAD; `tsc` 0 errors; lint clean.

**Reviewer FAIL** on one point. The two-tab baseline test is titled "single line" but never asserts it, so if the baseline itself wrapped, the three-tab gate would compare 57 against 57 and stay green. Upheld. This is the **twelfth** title claiming more than its test asserts. Everything else passed:
- (a) all four attempt-1 issues are closed;
- (b) the container query measuring the tablist is acceptable;
- (c) WCAG 2.5.3 is satisfied;
- (d) the Jest adaptation touches only spec-added tests.

**Execute-time spec edit (clarification; no requirement's meaning changes):** `design.md` §6.3 "Narrow tab labels" now says the 640 px threshold is measured on the tab strip, which means an aside of about 664–688 px. It is carried as a named conformance check into the final review.

**Attempt accounting for `PTB-T-6`:** attempt 1 FAIL (counted); attempt 2 an honest red that was a spec finding (not counted); attempt 3 FAIL (counted). **The next attempt is the last.** A FAIL there HALTs the task.

### `PTB-T-6` — Cypress CT: tab layout geometry → **STATUS: PASS on the final attempt** (`opus`) · 2026-09-22

| Field | Value |
|---|---|
| **Requirements covered** | `PTB-R-1`, `PTB-R-2`; `PTB-AC-1`, `PTB-AC-2` (layout half); D-8 |
| **Files** | `…/lab-report-form/lab-report-form.tabs.cy.ts` (new) · `…/lab-report-form.component.html`, tab-strip markup only (short labels, as the requester amended the task) · 8 tab-identification lines in `PTB-T-3`'s spec-added Jest tests |
| **Attempts** | 1 FAIL · 2 honest red, a spec finding not counted · 3 FAIL (baseline title) · final PASS. `runtime events: none` |

**Final attempt:** `assertVisibleLabelSingleLine` (`getClientRects().length === 1` on the rendered label span) is now mandatory in the two-tab baseline, and also in the three-tab tests. The header comment says the container query measures the tablist, which means an aside of about 664–688 px.

**Evidence (Leader re-run → VERIFIED):**
- CT **6/6** (port 4415).
- Implementer mutation (`max-width:90px` in the two-tab test only) → red: `"Manual entry" … expected 2 to equal 1`. Reverted and `cmp`-verified.
- dashboard-lab CT set 17/18. The one failure is the pre-existing `indicator-drawer.reported-results.cy.ts` aria-sort case.

**Reviewer — `STATUS: PASS`.** The baseline is now proven single-line and anchors the three-tab height gate. None of the earlier fixes regressed.

**Recorded (not blocking):**
- `npm run test:ct:changed` was **substituted** by the dashboard-lab CT set: the shared worktree pulls in ~57 unrelated specs.
- Pre-existing failure: the indicator-drawer aria-sort/Contribution header case.
- Cypress batching artifact: the spec run immediately after `indicator-drawer.reported-results.cy.ts` in one batch reports 0 tests. The Implementer attributes it to order, not content; this is unverified.
- `PTB-G-4` footer bleed: 6 px at narrow, logged and not asserted.

⚠️ **Ordering slip (Leader), recorded rather than hidden:** the `[x]` for `PTB-T-6` in `tasks.md` was written **before** this PASS block was appended, the reverse of the evidence-first rule. The gap lasted one tool call, and the Reviewer PASS and evidence existed in the conversation throughout. It was the same class of slip as child 1's `PTM-T-6`.

---

## 4. Summary — child 2 execution complete (2026-09-22)

**All 7 tasks `[x]`.**

| Task | Result | Attempts / review rounds |
|---|---|---|
| `PTB-T-1` API methods | PASS | 1 |
| `PTB-T-2` six-state panel | PASS | 3: race FAIL → PASS → post-PASS compile fix |
| `PTB-T-3` host integration | PASS | 2, plus a Leader brief defect corrected before review |
| `PTB-T-4` emerging footer regression | PASS | 1 |
| `PTB-T-5` pre-fill + payload | PASS | 2, plus the KP-pick spec conflict ruled on by the requester |
| `PTB-T-6` tab-geometry CT | PASS | final, plus the D-8 finding fixed by requester decision |
| `PTB-T-7` static leak guard | PASS | 2 |

**Final sweep (Leader):** Jest across `dashboard-lab`, `shared/report-result` and `results-api.service.spec.ts`: **43 suites / 1688 tests green**. `tsc -p tsconfig.app.json` **0 errors**. `ng lint` clean. **No `onecgiar-pr-server/` diff and no migration from child 2.** Client diff: 7 modified plus 2 new paths (the `pt-results-browse/` folder and `lab-report-form.tabs.cy.ts`). **Nothing committed**, per the requester.

**Budget:** 7 tasks as planned. Review rounds went well past the 2 budgeted; the requester accepted the overrun at the first tripwire.

**Spec changes during execute (all requester-approved or date-stamped clarifications):**
- `PTB-R-7`/`PTB-AC-16` narrowed to the PT upstream host. Six sites were amended, including SC-3 in both proposals and `family.md`.
- `PTB-R-11`: a PT pick never auto-creates.
- `design.md` §6.3 "Narrow tab labels", plus the tablist-measurement clarification.
- `P-4` corrected: there is one production caller of the payload builder.
- `PTB-T-6`'s file list amended.

**Named gaps carried to the HITL look / follow-ups:**
- `PTB-G-1`: R-20 met by a single fetch.
- `PTB-G-2`: the panel remounts when KP-ness flips.
- `PTB-G-3`: footer reachability is not CSS-verified.
- `PTB-G-4`: pre-existing footer bleed.
- `PTB-G-5`: focus hand-off to the handle field probably doesn't land.
- `PTB-G-6`: a misleading "Selected from CGSpace" banner after a KP pick.
- `PTB-G-7`: the PT narrative stays after a Browse selection.

**Still owed (`tasks.md` §6/§7, not execute tasks):**
- The `lab-report-form/CLAUDE.md` update: the three-mode switcher, the reveal condition now `|| !!ptDraft()`, auto-create suppression, and narrow labels. It must land **in the same commit** as the host change, per the folder-doc rule.
- The family TEST walkthrough, with a network-log check against the narrowed `PTB-AC-16`.
- A human check of the ~20 s loading state (D-9).
- Visual confirmation of the tab labels and banner (`PTB-OQ-1`/`PTB-OQ-2`).

**Lessons for Kaizen:**
1. A tsc gate on an **unmounted** file is vacuous.
2. Gating instructions in a brief must be scoped to **new** surfaces, or they revert delivered behaviour.
3. Twelve tests in this family claimed more than they asserted, and every Reviewer round found one.
4. CT geometry gates on `flex-1` rows need a height or line-count measurement; width alone cannot catch a wrap.
