# Tasks — W3/Bilateral Manual Reporting User Guide

## 1. Scope Of This Task List

- **Module / feature:** `changes/w3-bilateral-user-guide` — end-user PDF guide, manual reporting path
- **Linked spec:** `requirements.md` + `design.md` (+ `judgment.md`, Judgment Day round 1, **APPROVED**)
- **Worktree / branch:** `/Users/jcadavid/Development/worktrees/onecgiar_pr/w3-bilateral-user-guide` · `feat/w3-bilateral-user-guide`
- **Owner / driver:** Leader (AKILI), Implementer per task
- **Status:** `in-progress` — run 1 scope: **`BG-T-1`…`BG-T-6`** (no environment needed). `BG-T-7`…`BG-T-13` deferred pending the environment half of `BG-OQ-1`.
- **Approval Mode:** pre-approved — **Phase 3 gate: auto-approved (pre-approved mode)**
- **Execution limits (operator standing preference):** at most **one** Reviewer round per task — a second FAIL escalates, never loops. No `npm test` over a whole package; targeted commands only.

### Budget carried from `design.md` §12

**13 tasks · 1,300–1,700 LOC · 17 review rounds.** Tripwire: **>1,700 LOC or >20 rounds** → Leader stops and offers the three pre-agreed cuts in order. Cutting the manual path is not one of them.

### Review depth assigned

| Depth | Tasks |
|---|---|
| `lenses` | `BG-T-3` — the read-only guard is the only thing standing between a capture run and a really-submitted result |
| `full` | `BG-T-4` (changes the shared `RouteConfig` contract, fail-loud semantics) · `BG-T-9` (carries `P-11`, the mislabel defect Judgment Day caught) |
| `checklist` | the remaining ten |
| `skip-eligible` | **none.** Every task here owns either a MUST gate or authored prose that defect classes D8/D9 can only catch by a human read. There is no purely mechanical task in this list, so nothing is classified skip-eligible. |

---

## 2. Pre-flight Checklist

- [x] `requirements.md` approved (`auto-approved (pre-approved mode)`).
- [x] `design.md` approved, and additionally survived Judgment Day — 10 findings, all fixed (`judgment.md`).
- [x] Open questions resolved — **five closed** in `requirements.md` §11; **`BG-OQ-1` open by design**, owned by `BG-T-8` as its first step and blocking only captures 4–7.
- [x] CLARISA dependencies: **n/a** — no CLARISA endpoint, cache table, or master-data read in this spec.
- [x] No conflicting in-flight spec: active `bilateral/*` specs (`ai-draft-evidence-promotion`, `bulk-uploader-handoff`, `qa-ai-traffic-light`, `qa-ai-verdict-drawer`, `webhook-external-platforms`) touch **product code**, which this spec does not. Overlap is one-way: `qa-ai-traffic-light` / `qa-ai-verdict-drawer` can restyle the surface `BG-T-9` photographs last. Recorded in `design.md` §13; no lock needed.
- [x] Migrations: **n/a** — no database change. `migration:check` is not a gate for this spec.
- [~] **Environment ready** — **partly.** Centre/project fixed to `Bioversity (Alliance)` + `B-A1368` (operator, 2026-09-21). Client origin and reporter JWT **still open**, by operator choice. This box gates **`BG-T-7` onward only**; `BG-T-1`…`BG-T-6` are cleared and are the agreed scope of this execution run.

---

## 3. Task List

### `BG-T-1` — Copy the W1/W2 tooling and guard the archive against mutation  `[x]`

- **Type:** `infra`
- **Description:** Copy `src/`, `template/`, `.env.example`, `.gitignore`, `tsconfig.json`, `package.json` from `docs/specs/archive/2026-09-16-changes--user-guide-pdf/tooling/` into this spec's `tooling/`. Change only `package.json`'s `name`/`description`. Do **not** copy `dist/`, `node_modules/`, `content/`, or `routes.config.json` — those are authored fresh. Add `tooling/src/guards/archive-immutable.ts`, run as the first step of `build-guide`, asserting the archived folder is unchanged.
- **Implements:** `BG-R-10`, `BG-R-22`, `BG-AC-10`, `BG-DD-1`, `BG-DD-10`
- **Files (expected):** `docs/specs/changes/w3-bilateral-user-guide/tooling/**`, `tooling/src/guards/archive-immutable.ts`
- **Depends on:** `—` · **Blocks:** `BG-T-2`
- **Estimate:** `S` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** touch one byte of any file under `docs/specs/archive/2026-09-16-changes--user-guide-pdf/` → `git diff --quiet -- <archive path>` must go non-zero, and restoring the byte must return it to zero. **Environment path that could make it pass for the wrong reason:** a `git diff` that silently succeeds outside a repo, or a relative path that misses the archive entirely — so the guard asserts a non-zero *file count* under the path first and fails if the path resolves empty. **Amended at execute time (2026-09-21):** the *executed* `ts-node` falsifier moved to `BG-T-2`'s Done criteria, because `ts-node` is not installed until `BG-T-2` — running it here was a dependency inversion in the original text. `BG-T-1` still owns the guard's **source** and the git-level falsifier, which needs no dependencies.
  - **Red run:** `n/a (no test gate)` — the gate is `git diff --quiet -- docs/specs/archive/2026-09-16-changes--user-guide-pdf/` plus the empty-path assertion. The `npx ts-node src/guards/archive-immutable.ts` execution is `BG-T-2`'s.
  - **Disqualifier:** if the archived tooling cannot be copied without edits to run at all (e.g. a hard-coded path to the old spec folder), stop and re-specify — `BG-DD-1`'s "mechanical diff" premise (`BG-R-22`) would be false and the shared-tooling alternative needs reopening.
  - **Consumers:** `none (no shared symbol changed)` — the copy introduces no symbol anything outside this folder reads.
- **Definition of done:**
  - [ ] Every file marked *copied verbatim* in `design.md` §4 diffs clean against its source except `package.json`'s two string fields.
  - [ ] `git diff -- docs/specs/archive/2026-09-16-changes--user-guide-pdf/` is empty.
  - [ ] The git-level falsifier above was **executed** and observed going red, then green again after restore.
  - [ ] Commit follows the convention; no secret in the diff (`.env` is not created by this task).
- **Skills:** none from the Skill Map — standalone Node/TS tooling, outside both packages.

### `BG-T-2` — Install the tooling, pin the browser channel, verify the copy is verbatim  `[x]`

- **Type:** `infra`
- **Description:** `npm install` inside `tooling/`, confirm Playwright resolves a usable browser (system Chrome via `PLAYWRIGHT_CHANNEL=chrome` — the bundled Chromium CDN was unreachable during the W1/W2 run), create `.env` from `.env.example` (gitignored, never committed), and record a verbatim-diff report of the copy against its source.
- **Implements:** `BG-R-22`, `BG-R-13`
- **Files (expected):** `tooling/package-lock.json`, `tooling/.env` *(gitignored — never committed)*
- **Depends on:** `BG-T-1` · **Blocks:** `BG-T-3`
- **Estimate:** `S` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** `npx tsc --noEmit` inside `tooling/` must compile the copied sources; introduce a deliberate type error and it must go red. If `tsc` passes on a file with a wrong-shaped assignment, the compile gate is not evidence (the `KZ-1` compile-gate class: 169 green tests over code that never compiled).
  - **Red run:** `n/a (no test gate)` — gates are `npx tsc --noEmit` and `git status --porcelain tooling/` showing `.env` **untracked**.
  - **Disqualifier:** if no browser channel can be resolved at all, stop — every capture task is blocked and the spec cannot proceed past `BG-T-6`.
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:**
  - [ ] `npx tsc --noEmit` clean; falsifier executed and observed red.
  - [ ] **Carried from `BG-T-1` (execute-time amendment):** `npx ts-node src/guards/archive-immutable.ts` executed — green on a clean archive, red after a deliberate one-byte touch, and green again after restore. This is the first point in the run where `ts-node` exists.
  - [ ] `.env` exists, is **gitignored**, and `git check-ignore tooling/.env` confirms it.
  - [ ] No token value printed to the terminal, the log, or the commit — not even a substring (`.cursorrules`).
  - [ ] Verbatim-diff report attached to the execution entry.
- **Skills:** none from the Skill Map.

### `BG-T-3` — Read-only enforcement: default-deny request guard  `[x]`

- **Type:** `infra`
- **Description:** Add `tooling/src/guards/read-only.ts` implementing `design.md` §3.3: allow `GET`/`HEAD` anywhere; allow other methods only to an inert allowlist (font CDNs, `hotjar`, `clarity`, `google-analytics`, `tawk`); **abort the request and fail the whole run** on any other method to any other origin. Install the handler on the browser context **before `injectAuth()`** — which itself does `goto` + `reload` — not merely before the route loop. Write every decision to `dist/capture-requests.log`.
- **Implements:** `BG-R-7`, `BG-AC-7`, `BG-DD-3`, and the negative clauses *MUST NOT submit a result* / *MUST NOT trigger a billable AI assessment* / *MUST NOT issue any non-idempotent request*
- **Files (expected):** `tooling/src/guards/read-only.ts`, `tooling/src/capture.ts` (install site)
- **Depends on:** `BG-T-2` · **Blocks:** `BG-T-4`
- **Estimate:** `M` · **Review:** `lenses` — correctness-critical; this is the only thing preventing a capture run from submitting somebody's result
- **Verification:**
  - **Falsifier:** point a throwaway route's `steps` at any button that issues a `PATCH`/`POST` (e.g. *Save draft* on a deliberately dirtied field) and run — the guard must abort with method, origin, path and route id. **Then the inverse:** a normal capture run must still complete, proving the guard is not simply blocking everything. A guard that passes both is evidence; one that only passes the first is a broken pipeline reported as safety.
  - **Red run:** `n/a (no test gate)` — the gate is the two-direction falsifier above plus `dist/capture-requests.log` showing zero denied entries on a clean run.
  - **Disqualifier:** if any legitimate page load in the planned route set issues a non-GET to a non-allowlisted origin, **stop and escalate** — `P-5`/`P-13` would be refuted and `BG-DD-3` needs re-specifying via the Pivot Protocol, not a widened allowlist. Widening the allowlist to make a run pass is the failure mode this clause exists to forbid.
  - **Consumers:** `none (no shared symbol changed)` — new module, imported only by this copy's `capture.ts`.
- **Definition of done:**
  - [ ] Both directions of the falsifier executed and recorded.
  - [ ] Handler provably installed before `injectAuth()` (assert ordering, not just presence).
  - [ ] `dist/capture-requests.log` produced and contains no secret — the log records method/origin/path, never headers or bodies (`.cursorrules`).
  - [ ] **Acknowledged gap written into the log header:** WebSocket (`pusher`/`webSocketUrl`) is not intercepted by `page.route()`.
- **Skills:** `playwright-cli`

### `BG-T-4` — Declarative pre-capture `steps` with a fail-loud unique-selector guard  `[x]`

- **Type:** `infra`
- **Description:** Extend the copied `RouteConfig` with an optional `steps: Step[]`, a four-variant closed union — `click` (selector, optional label), `waitFor` (selector or ms), `press` (key), `fill` (selector, literal value) — executed after `goto` and **before** `readySelector`, so the readiness gate describes the state the steps produced. Every selector-bearing step asserts `count() === 1` and fails the run naming the step and route on 0 or 2+ matches.
- **Implements:** `BG-R-14`, `BG-R-6`, `BG-AC-6`, `BG-AC-14`, `BG-DD-2`, and the negative clause *a step whose selector is missing or non-unique MUST fail the run rather than capture a wrong screen*
- **Files (expected):** `tooling/src/capture.ts`
- **Depends on:** `BG-T-3` · **Blocks:** `BG-T-5`, `BG-T-7`
- **Estimate:** `M` · **Review:** `full` — changes the shared config contract and owns a fail-loud semantic
- **Verification:**
  - **Falsifier:** three inputs, each must fail the run with a distinct message — (1) a `click` selector matching **zero** elements; (2) one matching **two or more**; (3) a `fill` whose selector matches zero. Then one input that must **pass**: a valid three-step drawer sequence. A guard that cannot be made red by input (2) is the *inert fixture* class — `:nth-of-type` or `.first()` anywhere in the resolution path would silently make a 2-match look like a 1-match, so the assertion must read the raw `count()`.
  - **Red run:** `n/a (no test gate)` — gates are the four falsifier inputs plus `npx tsc --noEmit`.
  - **Disqualifier:** if reaching a planned state needs anything outside the four variants (conditional branching, retries, scrolling to a virtualised row), **stop and re-specify** — an escape hatch to arbitrary code reopens the rejected "imperative TS callback" alternative and its write risk.
  - **Consumers:** **Amended at execute time (2026-09-21) — this task's own sweep refuted the expectation written here.** The line originally read "the result must list only `capture.ts` and `routes.config.json`". The sweep `grep -rn "RouteConfig\|routes.config" tooling/` in fact returns **five** files: `src/capture.ts` (the real consumer, declaration `:159` — **not exported**, so structurally un-importable), **`src/assemble.ts`, which reads the same JSON at `:54` and declares its OWN independent 7-field `RouteConfig` at `:63`**, plus incidental filename mentions in `template/README.md`, `src/annotate.ts`, `src/tokens.ts`. Substance of `P-10` survives — extra JSON keys are ignored by `assemble.ts`'s cast, so adding `steps`/`bounds` needs no lockstep change — but the literal claim was false and `design.md` `P-10` now records the corrected sweep. `P-10` is **settled: verified**.
- **Definition of done:**
  - [ ] All four falsifier inputs executed; three red with distinct messages, one green.
  - [ ] `P-10` settled and the sweep result recorded in the execution entry.
  - [ ] `npx tsc --noEmit` clean.
- **Skills:** `playwright-cli`

### `BG-T-5` — Frame-bounds and skeleton guard

- **Type:** `infra`
- **Description:** Add `tooling/src/guards/frame-bounds.ts` and an optional per-route `bounds {minW,maxW,minH,maxH}`. After each capture, assert the PNG's real pixel dimensions fall inside its bounds and that the existing skeleton gate found nothing visible. Exit non-zero on violation.
- **Implements:** `BG-R-8`, `BG-AC-8`, `BG-DD-6`, and the negative clause *No capture may show a skeleton or loading state*
- **Files (expected):** `tooling/src/guards/frame-bounds.ts`, `tooling/src/capture.ts`
- **Depends on:** `BG-T-4` · **Blocks:** `BG-T-7`
- **Estimate:** `S` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** set a route's `bounds` to a window the real capture cannot satisfy → run must go red naming the route and the measured size. Then reproduce the two historical failures deliberately: force a `1280×720` skeleton frame and a `1280×186177` frame; both must be rejected. A bounds guard that accepts 186,177 px is not a guard.
  - **Red run:** `n/a (no test gate)` — the gate is a **rendered measurement** of the produced PNG, read from the file's actual dimensions (not from the requested viewport, which is exactly the value that lied in the W1/W2 run).
  - **Disqualifier:** if a legitimate capture cannot satisfy any stable bounds because the page height varies per run, stop and re-specify that route's framing (fixed viewport + `fullPage: false`) rather than widening bounds until they admit anything.
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:**
  - [ ] Three falsifier inputs executed and observed red; a clean run observed green.
  - [ ] Dimensions are read from the written PNG, never from the requested viewport.
- **Skills:** `playwright-cli`

### `BG-T-6` — Assert the guide's fonts and tokens against the app's own stylesheets

- **Type:** `infra`
- **Description:** Make the template resolve its font stack and color tokens from `onecgiar-pr-client/src/styles/fonts.scss` and `colors.scss` at build time, and assert the resolved values. `docs/ux-ui/design.md` §7 is **not** a source here — its Poppins entry is stale and its correction is an unapplied pending standardization (`P-9`).
- **Implements:** `BG-R-9`, `BG-AC-9`, `BG-DD-7`, and the negative clause *NOT from `docs/ux-ui/design.md` §7*
- **Files (expected):** `tooling/src/tokens.ts` (assertion), `tooling/template/guide.css`
- **Depends on:** `BG-T-2` · **Blocks:** `BG-T-13`
- **Estimate:** `S` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** hard-code `Poppins` as the body face in the template → the assertion must go red, reporting expected (read from `fonts.scss`) vs found. An assertion that cannot be reddened by substituting the *known-wrong* value is not evidence — and this is the one wrong value we know the baseline doc contains.
  - **Red run:** `n/a (no test gate)` — gate is `npx ts-node src/tokens.ts` in assert mode.
  - **Disqualifier:** if `fonts.scss` declares faces with no machine-readable custom property (the kaizen P5 note says it declares them literally), read the literal declaration — do **not** fall back to `design.md` §7, which is the failure this task exists to prevent.
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:**
  - [ ] Falsifier executed and observed red with the Poppins substitution.
  - [ ] The asserted stack matches `fonts.scss` as read at build time; the value is recorded in the execution entry.
- **Skills:** `tailwind-design-system`

### `BG-T-7` — Route config: workspace, catalog, drafts, results *(captures 1–3, 16–17)*

- **Type:** `docs`
- **Description:** Author the URL-reachable half of `routes.config.json`: `workspace-identity`, `catalog`, `catalog-create-cta`, `drafts`, `results-status` — the last deep-linked `?source=w3&method=manual`. Anchors are `[data-guide]` only. No `steps` needed for these five.
- **Implements:** `BG-R-6`, `BG-AC-6`, `BG-DD-4`
- **Files (expected):** `tooling/routes.config.json`
- **Depends on:** `BG-T-4`, `BG-T-5` · **Blocks:** `BG-T-8`
- **Estimate:** `M` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** rename one anchor in the config to a non-existent `data-guide` value → the run must fail naming it (proves the anchors are actually resolved, not just declared). Five PNGs must be produced, each within bounds and skeleton-free.
  - **Red run:** `n/a (no test gate)` — gate is `npm run capture` plus the `BG-T-5` measurement.
  - **Disqualifier:** if a `[data-guide]` anchor matches 2+ elements because the catalog renders many cards, do **not** add `:nth-of-type` — the anchors are applied with `[attr.data-guide]="$first ? … : null"` (`P-12`), so a multi-match means that premise broke and the task re-specifies.
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:**
  - [ ] Five captures produced, measured (dimensions recorded), skeleton-free.
  - [ ] Leader **viewed** each PNG before the Reviewer was spawned (`KZ-changes--user-guide-pdf-1`).
  - [ ] `dist/capture-requests.log` shows zero denied requests.
- **Skills:** `playwright-cli`

### `BG-T-8` — Route config: the setup drawer *(captures 4–7)* — settles `BG-OQ-1`

- **Type:** `docs`
- **Description:** **First step: settle `BG-OQ-1`** — confirm the Center, a multi-Science-Program project, and the environment, and record the answer in `execution.md` before authoring any config. Then author the four drawer captures, each with its `steps` chain: click *Create result* → select the primary SP → choose *Complete the Form Manually* → choose a result type (which is what reveals the title field, `P-7`), using `fill` to put literal text in the title so the word gauge is meaningful.
- **Implements:** `BG-R-4`, `BG-R-21`, `BG-AC-4`, `BG-DD-2`
- **Files (expected):** `tooling/routes.config.json`
- **Depends on:** `BG-T-7` · **Blocks:** `BG-T-9`
- **Estimate:** `L` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** run the drawer chain against a **single**-Science-Program project → capture 4 must be rejected or visibly lack the step-1 selector, proving the capture depends on the multi-SP precondition rather than accidentally passing on any project. This is the D8 class made testable: the narrative says "contributes to multiple Science Programs", so a single-SP screenshot must not silently satisfy the gate.
  - **Red run:** `n/a (no test gate)`.
  - **Disqualifier:** if the environment holds no multi-SP project, **stop and escalate** — `A2` is refuted; the drawer narrative must change, which is a requirements amendment, not an Implementer decision.
  - **Consumers:** `none (no shared symbol changed)`.
  - ⚠️ ***Create* is never clicked** — it would `POST_createBilateralHeader` and create a real result. The `BG-T-3` guard is the backstop, and a run that aborts here is a **defect in this task**, not a guard false-positive.
- **Definition of done:**
  - [ ] `BG-OQ-1` answer recorded in `execution.md` **before** any config was authored.
  - [ ] Four captures produced, measured, viewed by the Leader, skeleton-free.
  - [ ] `dist/capture-requests.log` shows zero denied requests — proving no write was attempted.
  - [ ] The title capture shows literal text and a live word gauge.
- **Skills:** `playwright-cli`

### `BG-T-9` — Route config: the editor *(captures 8–15)*

- **Type:** `docs`
- **Description:** Author the editor captures against a **pre-existing** result (`BG-DD-5`; never create one). **Capture 8 is `editor-general-info` and needs no step — that is the landing section. Capture 9 is `editor-overview` and *does* need a rail click.** Then contributors, geography, evidence, type-specific (10–13), the footer/save capture (14) and the rail submit control (15). Shoot capture 15 last.
- **Implements:** `BG-R-3`, `BG-AC-3`, `BG-DD-5`, `P-11`
- **Files (expected):** `tooling/routes.config.json`
- **Depends on:** `BG-T-8` · **Blocks:** `BG-T-11`
- **Estimate:** `L` · **Review:** `full` — this task carries `P-11`, the mislabel defect Judgment Day caught
- **Verification:**
  - **Falsifier:** for each of the six section captures, assert the rendered `[data-testid="bilateral-section-heading"]` **text matches the caption the config assigns**. Deliberately swap captures 8 and 9 back to the pre-judgment arrangement → the assertion must go red. Without this, the run is green while a General-information screenshot is captioned *Overview* — exactly `J-1`, and class D8 has **no other automated gate**.
  - **Red run:** `n/a (no test gate)` — the gate is the heading-text comparison above, which is a **rendered measurement**, not a class-presence check.
  - **Disqualifier:** if a rail click triggers a write, **stop and escalate** — `P-1` is refuted and `BG-DD-5` collapses (fallback: these six sections degrade to prose). Do not retry with a different click target.
  - **Consumers:** `none (no shared symbol changed)`.
  - **Type-specific precondition:** the chosen result's type must be **neither 4 nor 8**, or section 6 does not exist (`hasTypeSpecificSection`). Assert the type before capturing.
- **Definition of done:**
  - [ ] Eight captures produced; every section caption verified against the rendered heading text.
  - [ ] The 8/9 swap falsifier executed and observed red.
  - [ ] Leader measured and viewed all eight.
  - [ ] `dist/capture-requests.log` shows zero denied requests.
- **Skills:** `playwright-cli`

### `BG-T-10` — Content: introduction and guide sections 1–7

- **Type:** `docs`
- **Description:** Author `content/intro.md` and sections 1–7 (introduction, Center workspace, finding your project, the setup drawer, choosing how to report, the manual form, the editor at a glance). Reuse the in-app tour's approved wording where it describes the same element.
- **Implements:** `BG-R-2`, `BG-R-15`, `BG-R-20`, `BG-AC-15`, `BG-DD-9`, and the negative clause *not traceable to a UI label read from a screenshot, nor to the tour's wording alone*
- **Files (expected):** `tooling/content/intro.md`, `tooling/content/sections/01-…07-*.md`
- **Depends on:** `BG-T-7` · **Blocks:** `BG-T-13`
- **Estimate:** `L` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** for every factual sentence, a primary-source citation recorded in the execution entry (code, route table, or the rendered app). **A sentence with no citation is a defect, and a sentence citing only `bilateral-tour.service.ts` is also a defect** — the tour is product copy, not a source of truth about behavior. There is no automated gate for D9: the substitute is this citation list plus the HITL read.
  - **Red run:** `n/a (no test gate)` — D9 is a recorded gap in `requirements.md` §8 with a human substitute.
  - **Disqualifier:** if a section cannot be written without asserting something no primary source confirms, mark that sentence `UNVERIFIED` and escalate — never ship a plausible guess into an end-user document.
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:**
  - [ ] Citation list attached, one entry per factual sentence.
  - [ ] U.S. English; no PRMS-internal jargon unglossed.
  - [ ] Section count and order match `design.md` §4 / `proposal.md` §4.
- **Skills:** `cognitive-doc-design`

### `BG-T-11` — Content: guide sections 8–15 — settles `BG-OQ-2`

- **Type:** `docs`
- **Description:** Author the six editor-section narratives, *Saving your work* (Save draft, "N fields missing", what each error means), and *The AI quality check and Submit for review*. **`BG-OQ-2` is resolved to option (a):** use a result that already carries an assessment, whose verdict card is painted by a `GET`. Fall back to prose (option c) if no such result exists. Option (b) is struck — the dialog is derived from the run state, so opening it *is* the billable call.
- **Implements:** `BG-R-2`, `BG-R-3` *(the "absent for types 4 and 8" clause)*, `BG-R-15`, `BG-AC-2`, `BG-DD-8`
- **Files (expected):** `tooling/content/sections/08-…15-*.md`
- **Depends on:** `BG-T-9` · **Blocks:** `BG-T-13`
- **Estimate:** `L` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** section 15 must read correctly **both** with and without a dialog figure — remove the figure and the prose must still stand with no reordering and no TOC change (`BG-DD-8`). If removing it breaks the section, the degradation path was never real.
  - **Red run:** `n/a (no test gate)`.
  - **Disqualifier:** if capturing the verdict card requires *any* non-GET, take option (c) — prose only. Never click *Submit for review*.
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:**
  - [ ] The "type-specific is absent for types 4 and 8" clause is stated explicitly in the guide.
  - [ ] Degradation falsifier executed.
  - [ ] Citation list attached.
  - [ ] `BG-OQ-2`'s chosen branch (a or c) recorded in `execution.md`.
- **Skills:** `cognitive-doc-design`

### `BG-T-12` — Content: sections 16–18, statuses, and the glossary

- **Type:** `docs`
- **Description:** Author the AI-Assisted contrast section, the result-status section, and the glossary. The glossary names **seven** result types — the ids run to 8 but there is no id 3. Statuses are what the UI paints: Editing · Pending review · Approved · Rejected.
- **Implements:** `BG-R-5`, `BG-R-12`, `BG-AC-5`, `BG-AC-12`, and the negative clause *MUST NOT present the PRD/TRD three-step lifecycle as what the reporter will see*
- **Files (expected):** `tooling/content/sections/16-…18-*.md`, `tooling/content/glossary.json`
- **Depends on:** `BG-T-9` · **Blocks:** `BG-T-13`
- **Estimate:** `M` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** grep the finished glossary for the string `eight` in the result-type entry and for `Quality Assessed` in the status entry — **both must return zero hits**. Each is a specific wrong value we know the upstream documents contain: "eight types" was `J-2`, and "Quality Assessed" is what `docs/prd.md` AC-2 and `docs/trd/trd.md` §5 W1 say while the UI never paints it. A check that cannot be reddened by re-inserting either string is not a check.
  - **Red run:** `n/a (no test gate)`.
  - **Disqualifier:** if the seven-type count or the four painted badges no longer match the code at authoring time, re-verify at source and amend — do not copy this spec's own numbers forward unchecked.
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:**
  - [ ] Seven result types, enumerated, with the id-gap noted.
  - [ ] Four painted statuses; the PRD/TRD divergence not presented to the reader.
  - [ ] Both zero-hit greps executed.
  - [ ] `BG-R-30` (W1/W2 cross-reference) deliberately **not** exercised, per `BG-OQ-6`.
- **Skills:** `cognitive-doc-design`

### `BG-T-13` — Assemble, verify structure, render the PDF, secret audit, HITL

- **Type:** `docs`
- **Description:** Run `build-guide` end to end: archive guard → assemble → verify-structure → pdf. Audit for leaked secrets across tooling output, the PDF and the staged diff. Present the rendered PDF to the operator for the HITL read that is the substitute gate for defect classes D8, D9 and D10.
- **Implements:** `BG-R-1`, `BG-R-11`, `BG-R-13`, `BG-AC-1`, `BG-AC-11`, `BG-AC-13`
- **Files (expected):** `tooling/dist/w3-bilateral-reporting-user-guide.pdf`, `tooling/dist/capture-requests.log`
- **Depends on:** `BG-T-6`, `BG-T-10`, `BG-T-11`, `BG-T-12` · **Blocks:** `—`
- **Estimate:** `M` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** delete one section file and re-run → `verify-structure` must fail naming the missing section and the unresolved TOC anchor. Separately, insert a fake token string into a content file → the secret audit must go red. Two different gates, two different deliberate breakages.
  - **Red run:** `n/a (no test gate)` — gate is `npm run build-guide` plus the secret audit.
  - **Disqualifier:** if the PDF renders but the Leader's own view shows a mislabelled or degenerate figure, the task is **not** done — D8 has no automated gate and presence checks pass on a broken render (`KZ-changes--user-guide-pdf-1`). Re-shoot the route rather than accepting the page.
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:**
  - [ ] PDF produced by one command from a clean `dist/`; page count and section order recorded.
  - [ ] Leader measured **and viewed** every figure, and states so as evidence in the Reviewer brief.
  - [ ] Secret audit clean over output, PDF and staged diff; `.env` still untracked.
  - [ ] `git diff -- docs/specs/archive/2026-09-16-changes--user-guide-pdf/` empty.
  - [ ] Operator HITL sign-off recorded in `execution.md`.
- **Skills:** `cognitive-doc-design`, `playwright-cli`

---

## 4. Coverage Closure

Closed at **scenario and clause** granularity, not requirement ID.

| Requirement | Clause / scenario | Owning task |
|---|---|---|
| `BG-R-1` | single PDF, cover→glossary, U.S. English | `BG-T-13` |
| `BG-R-2` | manual path end to end | `BG-T-10`, `BG-T-11` |
| `BG-R-3` | six section captures | `BG-T-9` |
| `BG-R-3` | *"absent for types 4 and 8"* clause | `BG-T-11` |
| `BG-R-4` | drawer + manual form captures | `BG-T-8` |
| `BG-R-5` | AI-Assisted contrast | `BG-T-12` |
| `BG-R-6` | labelled callouts | `BG-T-7`, `BG-T-8`, `BG-T-9` |
| `BG-R-6` | *exactly one* anchor match, fail loud | `BG-T-4` |
| `BG-R-7` | read-only, tooling-enforced | `BG-T-3` |
| `BG-R-7` | *MUST NOT submit* / *MUST NOT trigger billable AI* / *MUST NOT issue non-idempotent* | `BG-T-3`; re-asserted in `BG-T-8`, `BG-T-9`, `BG-T-11` |
| `BG-R-8` | dimension bounds | `BG-T-5` |
| `BG-R-8` | *no skeleton* clause | `BG-T-5` |
| `BG-R-9` | fonts/colors from stylesheets | `BG-T-6` |
| `BG-R-9` | *NOT from `design.md` §7* clause | `BG-T-6` (falsifier substitutes Poppins) |
| `BG-R-10` | archive byte-identical | `BG-T-1`, re-checked `BG-T-13` |
| `BG-R-11` | one-command regeneration | `BG-T-13` |
| `BG-R-12` | statuses as painted | `BG-T-12` |
| `BG-R-12` | *MUST NOT present the three-step lifecycle* | `BG-T-12` (zero-hit grep on `Quality Assessed`) |
| `BG-R-13` | no secret leaked | `BG-T-2`, `BG-T-13` |
| `BG-R-14` | declarative steps | `BG-T-4` |
| `BG-R-14` | *missing/non-unique selector MUST fail* | `BG-T-4` (falsifier inputs 1–3) |
| `BG-R-15` | every claim to a primary source | `BG-T-10`, `BG-T-11`, `BG-T-12` |
| `BG-R-15` | *not a screenshot label, not the tour alone* | `BG-T-10` |
| `BG-R-20` | reuse the tour's wording | `BG-T-10` |
| `BG-R-21` | one consistent worked example | `BG-T-8` |
| `BG-R-22` | copy stays a mechanical diff | `BG-T-1`, `BG-T-2` |
| `BG-R-30` | MAY cross-reference W1/W2 | `BG-T-12` — deliberately **not** exercised (`BG-OQ-6`) |

Every `BG-AC-1`…`BG-AC-15` is named in the *Implements* line of exactly one owning task. **No requirement is discharged by citing a different requirement.**

## 5. Dependency Graph

```
BG-T-1 → BG-T-2 → BG-T-3 → BG-T-4 → BG-T-5 → BG-T-7 → BG-T-8 → BG-T-9 → BG-T-11 ┐
                     │                                                             ├→ BG-T-13
                  BG-T-6 ──────────────────────────────────────────────────────────┤
                            BG-T-10 (after BG-T-7) ─────────────────────────────────┤
                            BG-T-12 (after BG-T-9) ──────────────────────────────────┘
```

## 6. Rendered-Measurement Checklist — Scope

Two tasks carry gates that read rendered output, so the checklist is answered explicitly rather than left ambiguous.

| Checklist item | `BG-T-5` (frame bounds) | `BG-T-9` (section captions) |
|---|---|---|
| **Geometry, not class presence** | Yes — dimensions read from the written PNG, never from the requested viewport (the value that lied in the W1/W2 run) | Yes — compares rendered heading **text**, not a class or attribute |
| **Production fonts loaded** | Owned by `BG-T-6`, which asserts the stack against `fonts.scss` | same |
| **Baseline measured first** | Yes — each route's bounds are set from an observed clean capture, not guessed | `n/a` — no overflow assertion |
| **Two viewports** | `n/a` — these routes use a **fixed** per-route viewport with `fullPage: false` precisely because `fullPage` is a no-op on inner-scroll containers; a second viewport would test framing this spec deliberately pins | `n/a` |
| **Clip containment** | `n/a` — the assertion is about the captured image's own size, not an element near a scroll boundary | `n/a` |
| **Effective CSS px + host zoom named** | Yes — viewport sizes in the route config are effective CSS px at zoom 1 | `n/a` |

No gate in this spec asserts overflow, visibility, position or containment of a DOM element inside a layout, so the remaining items of the checklist do not apply.

---

## 7. Dependency Graph Note

Acyclic. Longest path: `BG-T-1 → … → BG-T-11 → BG-T-13` (10 nodes). `BG-T-6` and `BG-T-10` are the only parallelisable branches; the operator's one-session concurrency rule means they run sequentially anyway.
