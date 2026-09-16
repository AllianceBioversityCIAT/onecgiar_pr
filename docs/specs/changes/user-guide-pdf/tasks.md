# Tasks — End-User PDF Guide for the Reporting Tool

## 1. Scope of this task list

- **Module / feature:** `changes/user-guide-pdf`
- **Linked spec:** `docs/specs/changes/user-guide-pdf/requirements.md` + `design.md`
- **Sprint / target phase:** none specified
- **Owner / driver:** unassigned (see `requirements.md` §1)
- **Status:** in-progress (`UG-T-1` complete; see `execution.md`)

**Granularity note:** the design's budget (§ Design Decisions → Budget) estimated ~10 tasks / ~650–850 LOC / ~2 review rounds. This list decomposes into **16 finer-grained tasks** for clearer per-session scoping, but the **LOC and review-round totals stay within the same budgeted range** — the finer split does not represent scope growth, and `/akili-execute` should track the LOC/review-round dimension, not raw task count, against the tripwire.

---

## 2. Pre-flight checklist

Block execution until every box is ticked.

- [x] `requirements.md` is approved (approved-as-written per user confirmation 2026-09-15, see `execution.md` Document Control).
- [x] `design.md` is approved (same basis).
- [ ] `UG-OQ-1` (P/A persona wording) and `UG-OQ-2` (credentials/seed-data ownership) working assumptions in `requirements.md` §11 are accepted, or overridden by the user.
- [x] `UG-OQ-4` (real deployed origin to reference in guide copy) is answered before `UG-T-9` (content authoring) closes — see `UG-T-8`.
- [x] Capture target confirmed reachable: local dev DB is unreachable (`ETIMEDOUT`), so per `design.md` `UG-DD-6` this run targets production `https://reporting.cgiar.org` instead (user-confirmed 2026-09-15, changes already shipped there, authenticated Chrome session available).
- [x] Network reachability to `https://clarisa.cgiar.org/landing-page/glossary` confirmed (2026-09-15: SPA route — HTTP 404 on the raw fetch, renders in a real browser; see `execution.md` §3).
- [x] No conflicting in-flight spec touching the same entities (`docs/specs/` search — none found at spec time).
- [x] Migration check: **N/A**, no migration in this spec.

---

## 3. Task list

### `UG-T-1` — Scaffold the tooling package — **[x] COMPLETE** (PASS, see `execution.md`)

- **Type:** infra
- **Description:** Create `docs/specs/changes/user-guide-pdf/tooling/` with `package.json` (Playwright as the sole meaningful devDependency), `tsconfig.json`, `.env.example` (`CLIENT_BASE_URL`, `TEST_TOKEN` or `TEST_USER_EMAIL`/`TEST_USER_PASSWORD`), and a `.gitignore` that excludes `raw/`, `dist/*.html`, `tokens.json`, and `.env` — only `dist/reporting-tool-user-guide.pdf` and the tooling source/content are committed.
- **Implements:** `UG-R-7` (foundation for a re-runnable pipeline)
- **Files (expected):** `tooling/package.json`, `tooling/tsconfig.json`, `tooling/.env.example`, `tooling/.gitignore`
- **Depends on:** —
- **Blocks:** `UG-T-2`, `UG-T-4`, `UG-T-5`, `UG-T-6`
- **Estimate:** S
- **Definition of done:**
  - [x] `npm install` succeeds inside `tooling/` with no dependency on either app package.
  - [x] `.env` is confirmed gitignored; `.env.example` contains no real values.
  - [x] No secret or token committed (`.cursorrules`).

### `UG-T-2` — Verify environment and seed data — **[x] COMPLETE** (PASS, Leader pre-flight, see `execution.md`)

- **Type:** infra
- **Description:** Per `design.md` `UG-DD-6`, this run targets production (`https://reporting.cgiar.org`) instead of the local stack (local dev DB is unreachable). Confirm SP01 (or the real equivalent visible there) exists in the active phase with at least one IPSR package and one received notification, and obtain a valid `TEST_TOKEN` from the user's own already-authenticated Chrome session (localStorage `token` key) for a representative end-user role. This resolves `UG-OQ-2`'s working assumption in practice rather than leaving it theoretical.
- **Implements:** `UG-R-2` (precondition for authenticated capture)
- **Files (expected):** none (environment verification only; record findings in this task's PR description or a short note in `tooling/.env.example` comments)
- **Depends on:** `UG-T-1`
- **Blocks:** `UG-T-3`
- **Estimate:** S
- **Definition of done:**
  - [x] All 6 target routes render non-empty, representative content when visited manually while logged in.
  - [x] A valid `TEST_TOKEN` is available locally (never committed).

### `UG-T-3` — Define `routes.config.json` — **[x] COMPLETE** (PASS on attempt 2, see `execution.md`)

- **Type:** infra
- **Description:** For each of the 6 routes, record: `url`, `readySelector` (a DOM selector present only once real content has loaded — proves the route did not land on login/error/empty state), `clickTarget` (selector for the element the annotation marks), and `captionKey` (links to the matching content file in `UG-T-9`).
- **Implements:** `UG-R-2`, `UG-R-3`
- **Files (expected):** `tooling/routes.config.json`
- **Depends on:** `UG-T-2`
- **Blocks:** `UG-T-7`, `UG-T-9`
- **Estimate:** M
- **Definition of done:**
  - [x] Each `readySelector` is verified to be absent on the login page and present only after real data loads (manually confirmed once per route).
  - [x] Each `clickTarget` resolves to exactly one element via `page.locator(...).count() === 1`.

### `UG-T-4` — `auth.ts` (localStorage token+user injection) — **[x] COMPLETE** (PASS, retroactive Reviewer audit, see `execution.md`)

- **Type:** infra
- **Description:** Implement the login-state injection described in `UG-DD-4`: after `page.goto(CLIENT_BASE_URL)`, use `page.evaluate()` to set both `localStorage['token']` and `localStorage['user']` (rebuilt from the JWT payload), then reload so `RolesService` picks up the session.
- **Implements:** `UG-R-2`, security requirement in `design.md` §7 (no bypass endpoint, real token only)
- **Files (expected):** `tooling/src/auth.ts`
- **Depends on:** `UG-T-1`
- **Blocks:** `UG-T-7`
- **Estimate:** S
- **Definition of done:**
  - [x] After running `auth.ts` standalone against a manual test page load, `window.ng.getComponent(...)`-level inspection (or an equivalent role check) confirms `isAdmin`/`readOnly` reflect a real logged-in session, not the logged-out default.
  - [x] No token/credential value is logged to console.

### `UG-T-5` — `tokens.ts` (live design-token extraction) — **[x] COMPLETE** (PASS; live DoD closed in the `UG-T-7` run, see `execution.md`)

- **Type:** infra
- **Description:** Implement `UG-DD-2`: read `getComputedStyle(document.documentElement)` on the authenticated, loaded app for `--pr-color-primary-300`, `--pr-color-primary-400`, `--pr-color-secondary-400`, `--pr-color-orange-500`, and the resolved `font-family` stacks (Manrope, JetBrains Mono), writing them to `tokens.json`. Fail loudly (throw) if any expected custom property is missing/empty rather than silently defaulting.
- **Implements:** `UG-R-4`
- **Files (expected):** `tooling/src/tokens.ts`
- **Depends on:** `UG-T-1`
- **Blocks:** `UG-T-7`, `UG-T-11`
- **Estimate:** S
- **Definition of done:**
  - [x] Running against the live app produces a `tokens.json` whose values match what DevTools shows for the same custom properties (manual spot check).
  - [x] Deliberately querying a non-existent custom property throws instead of returning an empty string silently.

### `UG-T-6` — `annotate.ts` (DOM overlay click-target marker) — **[x] COMPLETE** (PASS; visual DoD closed on `overview.png`/`results-list.png`, see `execution.md`)

- **Type:** infra
- **Description:** Implement `UG-DD-3`: given a `Locator`, compute its `boundingBox()`, inject a fixed, high-`z-index` `<div>` appended to `document.body` styled as a highlight ring/arrow using the orange token (`--pr-color-orange-500`) from `UG-T-5`'s output, positioned over (but not obscuring the label of) the target element; provide a companion function to remove the overlay after the screenshot.
- **Implements:** `UG-R-3`
- **Files (expected):** `tooling/src/annotate.ts`
- **Depends on:** `UG-T-1`
- **Blocks:** `UG-T-7`
- **Estimate:** M
- **Definition of done:**
  - [x] Manual visual check on at least one route: the overlay renders on top of the target UI regardless of the app's own internal stacking contexts (per the stacking-context risk noted in `design.md` §12).
  - [x] The overlay does not cover the target element's own visible label text (offset the ring/arrow so the label remains legible).
  - [x] The overlay is confirmed removed from the DOM after the screenshot (no residual node before the next route navigates).
  - [x] On at least one route, the orange marker is visually confirmed distinct from the app's own violet brand accent in the same screenshot — not blending in (closes the `UG-R-3` scenario's `AND IT MUST` clause).

### `UG-T-7` — `capture.ts` (orchestration) — **[x] COMPLETE** (PASS on attempt 2, see `execution.md`)

- **Type:** infra
- **Description:** For each route in `routes.config.json`: `page.goto()`, wait for `readySelector` (timeout → non-zero exit with the failing route/selector named in the error), call `annotate.ts` on `clickTarget`, `page.screenshot({ fullPage: true })` to `raw/<route-id>.png`, remove the overlay. Log one line per route per `design.md` §9. The script must not click, submit, or otherwise mutate any data (read-only).
- **Implements:** `UG-R-2`, `UG-R-7`, `UG-R-10` (configurable base URL/list, not hardcoded)
- **Files (expected):** `tooling/src/capture.ts`
- **Depends on:** `UG-T-3`, `UG-T-4`, `UG-T-5`, `UG-T-6`
- **Blocks:** `UG-T-12`, `UG-T-15`
- **Estimate:** M
- **Definition of done:**
  - [x] A full run against the seeded local environment (`UG-T-2`) produces 6 annotated `raw/*.png` files.
  - [x] Deliberately pointing `readySelector` at a selector that will never appear causes a non-zero exit naming the specific route — verified once as a negative-path check.
  - [x] Code review confirms no interaction beyond `goto`/read-only queries/`screenshot` (no `.click()` on create/submit/delete controls).

### `UG-T-8` — Resolve the guide's sign-in URL reference (`UG-OQ-4`) — **[x] COMPLETE** (PASS, see `execution.md`)

- **Type:** docs
- **Description:** Obtain, from the user/product owner, the real deployed origin (staging or production) the guide's body text should tell end users to sign in at, since the 6 target routes are `localhost:4200` (capture-only). Record the answer in this task's notes for `UG-T-9` to consume.
- **Implements:** `UG-R-11`
- **Files (expected):** none (decision recorded in the PR description / a short `tooling/content/NOTES.md` line)
- **Depends on:** —
- **Blocks:** `UG-T-9`
- **Estimate:** XS
- **Definition of done:**
  - [x] A real origin (or an explicit "use a generic phrase, no URL" decision) is confirmed by the user, not guessed.

### `UG-T-9` — Author guide content (intro + 6 sections) — **[x] COMPLETE** (PASS on attempt 2, see `execution.md`)

- **Type:** docs
- **Description:** Write `content/intro.md` (what the guide is, who it's for, how to use it) and `content/sections/01..06-*.md` — one per target route — each following the pattern in `design.md` §"Section layout pattern": what a P/A finds there, why it matters, and an explicit click-target caption matching `routes.config.json`'s `clickTarget`/`captionKey`. The Results Center section must explicitly state it's where to update the current reporting year's innovations (`UG-R-6`). Sign-in instructions use the origin resolved in `UG-T-8`, never `localhost`.
- **Implements:** `UG-US-1..7`, `UG-R-1`, `UG-R-6`, `UG-R-11`
- **Files (expected):** `tooling/content/intro.md`, `tooling/content/sections/01-landing.md` … `06-innovation-packages.md`
- **Depends on:** `UG-T-3`, `UG-T-8`
- **Blocks:** `UG-T-12`
- **Estimate:** L
- **Definition of done:**
  - [x] Every section explicitly names the click-target it pairs with (matches `routes.config.json`'s `clickTarget` for that route).
  - [x] All copy is U.S. English, plain-language (no internal jargon like `status_id` or entity codes without a plain explanation).
  - [x] Results Center section contains an explicit "update current-year innovations" statement (`UG-AC-4`).

### `UG-T-10` — Curate the glossary from the CLARISA glossary — **[x] COMPLETE** (PASS, see `execution.md`)

- **Type:** docs
- **Description:** Fetch https://clarisa.cgiar.org/landing-page/glossary — **note:** a direct HTTP fetch of this exact URL returned 404 during `/akili-execute` pre-flight (2026-09-15); confirm the correct current path (it may be a client-rendered SPA route requiring a browser, or the path may have moved) before curating. Extract only the terms that actually appear in the 6 covered flows (e.g., AOW, HLO, Science Program, Initiative, ToC, IPSR-related terms), and write `content/glossary.json` as `[{ term, definition, sourceUrl, accessedOn }]`. Any in-flow term absent from the CLARISA glossary must be flagged (a `sourceUrl: null` / `note` field), never silently dropped.
- **Implements:** `UG-R-5`, `UG-US-8`
- **Files (expected):** `tooling/content/glossary.json`
- **Depends on:** —
- **Blocks:** `UG-T-12`
- **Estimate:** M
- **Definition of done:**
  - [x] Every entry with a `sourceUrl` is a faithful match (or attributed paraphrase) of the live CLARISA definition, spot-checked by a second read against the source page.
  - [x] No term unrelated to the 6 flows is included.
  - [x] Any in-flow term not found on CLARISA is explicitly flagged, not omitted.

### `UG-T-11` — Build `template/guide.html` + `guide.css` — **[x] COMPLETE** (PASS on attempt 2, see `execution.md`)

- **Type:** infra
- **Description:** Build the static HTML skeleton (cover, intro placeholder, TOC placeholder with anchor links per `UG-DD-5`, 6 section containers, glossary container) and its CSS, consuming color/font values from `tokens.json` (`UG-T-5`) via CSS custom properties injected at render time — never hardcoded hex/px duplicates. Cover uses the navy-carbon chrome gradient; section header bands reuse the same; body text meets 4.5:1 contrast (dark ink on white/light backgrounds).
- **Implements:** `UG-R-4`, `UG-R-12` (alt-text/caption slots), `UG-R-20` (optional cover date stamp), accessibility NFR in `requirements.md` §8
- **Files (expected):** `tooling/template/guide.html`, `tooling/template/guide.css`
- **Depends on:** `UG-T-5`
- **Blocks:** `UG-T-12`
- **Estimate:** M
- **Definition of done:**
  - [x] No hardcoded color/font value appears in `guide.css` outside of a `var(--...)` reference populated from `tokens.json`.
  - [x] A contrast check (manual — e.g., browser DevTools contrast tool) confirms body text ≥ 4.5:1 against its background.
  - [x] TOC anchors (`<a href="#section-id">`) resolve to a matching `id` on each section header.
  - [x] Cover page renders a build/version date stamp (`UG-R-20`).

### `UG-T-12` — `assemble.ts`

- **Type:** infra
- **Description:** Read `tokens.json`, `content/intro.md`, `content/sections/*.md`, `content/glossary.json`, and `raw/*.png`, and render them into `template/guide.html` → `dist/guide-assembled.html`. Each screenshot `<img>` gets an `alt` attribute derived from its section's caption (`UG-R-12`).
- **Implements:** `UG-R-1`
- **Files (expected):** `tooling/src/assemble.ts`
- **Depends on:** `UG-T-7`, `UG-T-9`, `UG-T-10`, `UG-T-11`
- **Blocks:** `UG-T-13`
- **Estimate:** M
- **Definition of done:**
  - [ ] `dist/guide-assembled.html` opens correctly in a browser with all 6 screenshots, captions, and the glossary rendered.
  - [ ] Every `<img>` has a non-empty `alt` attribute.
  - [ ] No unrendered template placeholder or unconverted markdown syntax (e.g. `{{...}}`, stray `**`/`##`) appears anywhere in the assembled HTML — spot-checked (closes the `UG-R-1` scenario's `AND IT MUST` clause).

### `UG-T-13` — `verify-structure.ts` (automated structural gate)

- **Type:** tests
- **Description:** Parse `dist/guide-assembled.html` and assert: the 6 expected section `<h2>` headings exist, in the specified order, plus an intro block and a glossary block. Exit non-zero naming the missing/misordered section if the assertion fails.
- **Implements:** `UG-AC-1` (automated half of the defect-class gate in `requirements.md` §8)
- **Files (expected):** `tooling/src/verify-structure.ts`
- **Depends on:** `UG-T-12`
- **Blocks:** `UG-T-14`
- **Estimate:** S
- **Definition of done:**
  - [ ] Running against the real `dist/guide-assembled.html` passes.
  - [ ] Deliberately reordering or deleting one section heading in a scratch copy causes the script to fail with a message naming that section — verified once as a negative-path check.

### `UG-T-14` — `pdf.ts` (final render)

- **Type:** infra
- **Description:** Load `dist/guide-assembled.html` in Playwright and call `page.pdf({ format: 'Letter', printBackground: true, ... })` to produce `dist/reporting-tool-user-guide.pdf`.
- **Implements:** `UG-R-1`
- **Files (expected):** `tooling/src/pdf.ts`, `dist/reporting-tool-user-guide.pdf`
- **Depends on:** `UG-T-13`
- **Blocks:** `UG-T-15`, `UG-T-16`
- **Estimate:** S
- **Definition of done:**
  - [ ] The PDF opens in a standard reader with backgrounds/gradients rendered (not stripped by print defaults).
  - [ ] TOC anchor links are clickable and jump to the correct section inside the PDF.

### `UG-T-15` — Credential-leak and read-only audit

- **Type:** tests
- **Description:** Grep `tooling/` (source, config, and any captured console output/logs from a real run) for credential-shaped strings (JWT patterns, `password`, `token=`), and re-confirm via code review that `capture.ts`/`annotate.ts` never call a mutating action.
- **Implements:** `UG-AC-6`, `.cursorrules`
- **Files (expected):** none (audit task; fix any finding in the files it touches)
- **Depends on:** `UG-T-7`, `UG-T-14`
- **Blocks:** none
- **Estimate:** S
- **Definition of done:**
  - [ ] Grep finds zero credential-shaped strings in committed files.
  - [ ] Code review sign-off that `capture.ts`/`annotate.ts` are read-only.

### `UG-T-16` — HITL review: click-target accuracy and glossary fidelity

- **Type:** docs (manual review)
- **Description:** A human (or a **T6 Multimodal** pass per the model-routing registry) opens the final PDF and, for each of the 6 sections, confirms the annotated marker points at the element the narrative describes; separately cross-checks every glossary entry against a live view of https://clarisa.cgiar.org/landing-page/glossary. This is the substitute gate named in `requirements.md` §8 for the two defect classes with no automated check.
- **Implements:** `UG-AC-3`, `UG-AC-5`
- **Files (expected):** none (review outcome recorded in the PR description; fixes loop back to `UG-T-6`/`UG-T-9`/`UG-T-10` as needed)
- **Depends on:** `UG-T-14`
- **Blocks:** none
- **Estimate:** M
- **Definition of done:**
  - [ ] Every one of the 6 markers is confirmed pointing at the correct element.
  - [ ] Every glossary entry is confirmed traceable to CLARISA (or explicitly flagged as not found there).

---

## 4. Dependency graph

```
UG-T-1 (scaffold)
  ├── UG-T-2 (verify env/seed data)
  │     └── UG-T-3 (routes.config.json)
  │           ├── UG-T-7 (capture.ts) ─────────────────┐
  │           └── UG-T-9 (content authoring) ───────┐   │
  ├── UG-T-4 (auth.ts) ──────────────────────────────┼───┤
  ├── UG-T-5 (tokens.ts) ── UG-T-11 (template/css) ──┼───┤
  └── UG-T-6 (annotate.ts) ──────────────────────────┘   │
                                                          │
UG-T-8 (resolve sign-in URL) ── UG-T-9                   │
                                                          │
UG-T-10 (glossary curation) ──────────────────────────────┤
                                                          ▼
                                                    UG-T-12 (assemble.ts)
                                                          │
                                                    UG-T-13 (verify-structure.ts)
                                                          │
                                                    UG-T-14 (pdf.ts)
                                                       ├── UG-T-15 (credential/read-only audit)
                                                       └── UG-T-16 (HITL review)
```

**Parallel-friendly branches:** `UG-T-4`/`UG-T-5`/`UG-T-6` (independent primitives); `UG-T-9` and `UG-T-10` (content vs. glossary authoring); `UG-T-8` can run any time before `UG-T-9` needs it.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `UG-TEST-1` | negative-path script check | `UG-R-2` (fail loudly on bad selector) | `tooling/src/capture.ts` manual negative run, per `UG-T-7` DoD |
| `UG-TEST-2` | structural assertion | `UG-AC-1` | `tooling/src/verify-structure.ts` |
| `UG-TEST-3` | negative-path script check | `verify-structure.ts` correctness | Scratch-copy reorder/delete test, per `UG-T-13` DoD |
| `UG-TEST-4` | grep / manual code review | `UG-AC-6`, `.cursorrules` | Per `UG-T-15` |
| `UG-TEST-5` | manual / T6 visual review | `UG-AC-3` | Per `UG-T-16` |
| `UG-TEST-6` | manual cross-check | `UG-AC-5` | Per `UG-T-16` |

No server/client Jest or Cypress coverage thresholds apply (no code added under either app package).

---

## 6. Rollout & verification

- [ ] PR(s) opened with the commit message convention (`<emoji> <type>(<scope>) [ticket]: <description>`) — see PR strategy below.
- [ ] `verify-structure.ts` passes on the committed `dist/guide-assembled.html` build artifact (or is re-run in CI-less local verification before merge, since this spec adds no CI wiring).
- [ ] `UG-T-15` (credential/read-only audit) and `UG-T-16` (HITL review) both signed off before the final PDF is committed.
- [ ] No downstream consumers to notify (standalone artifact, no in-app link in v1).

### PR Strategy Recommendation

Estimated LOC (~650–850, mostly `tooling/src/*.ts` + `guide.css`) is **above the ~400 LOC single-PR guideline**, and the work splits cleanly along the pipeline's natural seams. Recommend **3 PRs**, in this order:

1. **PR 1 — Capture automation core:** `UG-T-1` through `UG-T-7` (scaffold, env verification, routes config, `auth.ts`, `tokens.ts`, `annotate.ts`, `capture.ts`). Reviewable as "does this correctly and safely capture 6 authenticated, annotated screenshots." Out of scope: no content, no PDF output yet — reviewers should not expect to see the final guide in this PR.
2. **PR 2 — Assembly & build gate:** `UG-T-11` through `UG-T-14` (template/CSS, `assemble.ts`, `verify-structure.ts`, `pdf.ts`), depending on PR 1's `raw/*.png` output shape and `tokens.json` contract. Reviewable as "given screenshots + content, does this produce a correctly structured, on-brand PDF." Links back to PR 1 for the upstream contract.
3. **PR 3 — Content, glossary, and the final artifact:** `UG-T-8`, `UG-T-9`, `UG-T-10`, plus `UG-T-15`/`UG-T-16` sign-off and the committed `dist/reporting-tool-user-guide.pdf`. Reviewable primarily as **content review** (is the copy accurate and plain-language, is the glossary faithful to CLARISA) rather than a code review. Depends on both prior PRs merging first.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once the PDF is committed and reviewed.
- [ ] File a follow-up spec if two-pass page numbering (`UG-DD-5`) or in-app distribution (`UG-OQ-3`, currently a Non-Goal) is later requested.
- [ ] Recommend (separately, out of scope here) a small doc-sync change to correct `docs/ux-ui/design.md` §7's stale Poppins reference.

---

## 8. Roll-back plan

1. Revert the PR(s) listed above, in reverse order (PR 3, then PR 2, then PR 1).
2. No database/API change to revert — deleting `docs/specs/changes/user-guide-pdf/tooling/` and `dist/` fully removes this spec's footprint.
3. No feature flag exists to disable.
4. No bilateral/platform-report payload is touched — nothing to compare against a prior shape.
5. No downstream consumers to notify (standalone artifact).

---

## Required cross-references

- `docs/specs/changes/user-guide-pdf/requirements.md` and `design.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
- `onecgiar-pr-client/CLAUDE.md` §9 (auth-injection pattern reused by `UG-T-4`).
