# Execution Log — End-User PDF Guide for the Reporting Tool

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/changes/user-guide-pdf` |
| Linked docs | `requirements.md`, `design.md`, `tasks.md` (same folder) |
| Approval Mode | gated (per `proposal.md`) — treated as approved-as-written for execution purposes per explicit user confirmation, 2026-09-15 |
| Execution started | 2026-09-15 |

---

## 2. Task Execution History

### `UG-T-1` — Scaffold the tooling package

- **Status:** PASS (attempt 1)
- **Date:** 2026-09-15
- **Skills assigned:** none (plain Node/TS scaffold — no application stack skill applies; deviation from Skill Map recorded here per Leader discretion)
- **Effort:** low

**Attempt 1**

- **Files changed:** `docs/specs/changes/user-guide-pdf/tooling/package.json`, `tsconfig.json`, `.env.example`, `.gitignore`, `package-lock.json` (generated).
- **Implementer verification:** `npm install` inside `tooling/` → succeeded, 23 packages added, 0 vulnerabilities. Confirmed `@playwright/test` resolves from `tooling/node_modules` (not hoisted). `.gitignore` correctness verified via `git check-ignore -v` on scratch `.env`/`raw/test.png`/`dist/guide-assembled.html`/`tokens.json` (all ignored) and `dist/reporting-tool-user-guide.pdf` (confirmed NOT ignored). `git add -n` dry run confirmed only the 5 intended files stage. Grep for credential-shaped strings: zero matches. `git status` on both app packages showed no leakage (only the pre-existing, unrelated `onecgiar-pr-client/package-lock.json` modification).
- **Reviewer verdict:** **PASS**. Independently verified isolation (`UG-DD-1`): no root `workspaces` key, lockfile has zero `file:`/cross-package/`../..` references, all packages resolve to `registry.npmjs.org`, no CI/husky hook reaches `docs/specs/`. Independently verified all 3 DoD items from the files themselves (not just the Implementer's word). Evaluated the Implementer's 3 flagged assumptions (TS toolchain alongside Playwright; `^1.47.0` unpinned to exact patch; committing `package-lock.json`) — all judged reasonable and within task scope/spirit.

**ADVISORY (4R lens, non-gating, recorded per methodology — none block this task):**

- RELIABILITY: `design.md` §2's Extended Directory Structure places `dist/` as a sibling of `tooling/` (`docs/specs/changes/user-guide-pdf/dist/`), but `tooling/.gitignore`'s `dist/*.html` rule can only ever match `tooling/dist/*.html`. **Action for `UG-T-12`:** either write `assemble.ts`'s output to `tooling/dist/` (matching the existing ignore rule), or add a second ignore rule at the spec-folder level. Flagged forward to `UG-T-12`'s brief.
- READABILITY: `tsconfig.json`'s `include: ["src/**/*.ts"]` currently has no `src/` to match (TS18003 if run today) — self-resolving once `UG-T-4` lands the first source file. No `build`/`typecheck` npm script exists yet; recommend adding one once `src/` exists.
- RISK: Playwright browser binaries (`npx playwright install chromium`) are not yet documented anywhere (no `postinstall` script, no `.env.example` setup note). **Action for `UG-T-2`/`UG-T-7`:** the Implementer should run this install step and document it, to avoid a debugging round.

- **Requirements covered:** `UG-R-7` (foundation for a re-runnable pipeline).
- **Decisions made:** none beyond the Implementer's 3 flagged assumptions (all accepted, see above).
- **Issues encountered:** none blocking.
- **Final verification result:** PASS — all 3 DoD boxes satisfied and independently corroborated.

---

### `UG-T-2` — Verify environment and seed data

- **Status:** PASS (Leader pre-flight verification, 2026-09-15 — environment task with no code deliverable; verified inline per `.agents/leader.md` Delegation Thresholds "puntual verification")
- **Date:** 2026-09-15
- **Skills assigned:** none
- **Effort:** low

**Verification**

- `TEST_TOKEN` supplied by the user (2026-09-15) for `https://reporting.cgiar.org`; written to `tooling/.env` (confirmed gitignored via `git check-ignore`; never echoed, never committed). `CLIENT_BASE_URL=https://reporting.cgiar.org`.
- `tooling/node_modules` re-installed in this worktree (`npm ci`, 24 packages, Playwright 1.63.0).
- **Environment blocker found:** Playwright 1.63 requires bundled Chromium build 1243; `npx playwright install chromium` fails (CDN `cdn.playwright.dev` → 307 → download timeout, 3 attempts, incl. `PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=300000`). Cached builds go up to 1234 only. **Workaround adopted:** launch the system Google Chrome via `chromium.launch({ channel: 'chrome' })` — forwarded to `UG-T-7` as an optional `PLAYWRIGHT_CHANNEL` env var (default: bundled Chromium).
- Leader probe (scratchpad script, `channel: 'chrome'`, headless, 1440×900) reusing `tooling/src/auth.ts#injectAuth` against production:
  - `injectAuth` → `RolesService` populated `localStorage.roles` with keys `user_id, application, initiative, action_area, center` → the token is a real, backend-accepted session. Post-reload landing URL `/result-framework-reporting/entity-details/SP01`.
  - All 6 routes rendered inside the authenticated shell (`app-reporting-nav-sidebar` present, no `/login` redirect):

| Route | Heading seen | Evidence of real data |
|---|---|---|
| `/result-framework-reporting/home` | "Welcome!" | 2,992 chars body text |
| `/result-framework-reporting/entity-details/SP01/overview` | "Breeding for Tomorrow" | 71 table rows |
| `/result-framework-reporting/entity-details/SP01?tocView=aows` | "Breeding for Tomorrow" | 413k chars body text (ToC tree) |
| `/result/results-outlet/results-list` | "Results Center" | 10 table rows (paginated) |
| `/result/results-outlet/results-notifications/requests/received` | "Notifications" | Pending requests visible (screenshot inspected by Leader) |
| `/ipsr/list/innovation-list` | (no h1–h3) | 10 table rows |

- `SP01` exists in production as "Breeding for Tomorrow" with the active `Reporting 2026 - (Open)` phase; ≥1 received notification and ≥1 innovation package confirmed.
- **Observation for `UG-OQ-1`/`UG-T-16`:** the supplied session is an **admin** user — the sidebar shows `Quality Assurance`, `My Admin`, `Admin module`, which a plain P/A end user does not see. Screenshots will include those menu items unless a non-admin token is supplied or the sections are cropped/annotated around them. Flagged to the user; **user decision 2026-09-15: "sigue con este token, no importa que sea admin" — capture proceeds with the admin session; admin-only sidebar items may appear in screenshots and `UG-T-9` copy must not describe them as P/A features.** Closes the `UG-OQ-1` persona-wording assumption for this run.
- **Requirements covered:** `UG-R-2` (precondition), resolves `UG-OQ-2` in practice.
- **Decisions made:** system-Chrome channel workaround (above). Pre-flight checklist boxes for requirements/design approval ticked per the user's approved-as-written confirmation already recorded in Document Control.
- **Issues encountered:** Chromium CDN download failure (see above). CLARISA glossary URL 404 still open for `UG-T-10`.
- **Final verification result:** PASS — both DoD items satisfied (6 routes render representative content; valid `TEST_TOKEN` available locally, never committed).

---

## 3a. Reconciliation note — unrecorded work landed in commit `b885c5f18` (2026-09-15)

`git log` shows commit `b885c5f18` ("add auth and annotation utilities for Playwright testing") landed `tooling/src/auth.ts` (`UG-T-4`), `tooling/src/tokens.ts` (`UG-T-5`) and `tooling/src/annotate.ts` (`UG-T-6`) **without** an execution entry, without a Reviewer verdict, without the `[SPEC:changes/user-guide-pdf]` commit tag, and with two stray inclusions: `tooling/src/_scratch-verify.ts` (self-described throwaway) and 26 `"dev": true` normalisation lines in `onecgiar-pr-client/package-lock.json` (which the `UG-T-1` entry had explicitly excluded).

**Leader action:** (1) a Reviewer is spawned over the committed diff of the three utilities (diff saved to the session scratchpad, 574 lines) so `author ≠ auditor` is restored before those tasks can be marked `[x]`; (2) the scratch file is deleted and the client lockfile restored to its pre-commit content in a housekeeping commit; (3) live DoD items for `UG-T-5`/`UG-T-6` that need a running capture are carried into `UG-T-7`'s run.

---

### `UG-T-8` — Resolve the guide's sign-in URL reference (`UG-OQ-4`)

- **Status:** PASS (docs task, Leader-recorded — the deliverable is the user's decision, already captured in §3 of this log on 2026-09-15; no code, no Reviewer needed)
- **Date:** 2026-09-15
- **Files changed:** `tooling/content/NOTES.md` (new — records the decision for `UG-T-9`).
- **Decision:** the guide body references **no** environment or URL; generic phrasing only ("sign in to the Reporting Tool"). Confirmed by the user, not guessed (DoD satisfied).
- **Requirements covered:** `UG-R-11`; closes `UG-OQ-4`.
- **Final verification result:** PASS.

---

### `UG-T-4` — `auth.ts` · `UG-T-5` — `tokens.ts` · `UG-T-6` — `annotate.ts` (retroactive audit of commit `b885c5f18`)

- **Status:** `UG-T-4` PASS · `UG-T-5` PASS (code) — live DoD carried to `UG-T-7` · `UG-T-6` PASS (code) — live DoD carried to `UG-T-7`
- **Date:** 2026-09-15 (code landed earlier the same day in `b885c5f18` without an entry — see §3a)
- **Implementer attempts:** 1 (author: prior session, unrecorded). **Reviewer rounds:** 1 (this session, `akili-reviewer`, `opus`; author ≠ auditor restored).
- **Files:** `tooling/src/auth.ts` (223 lines), `tooling/src/tokens.ts` (181), `tooling/src/annotate.ts` (136), `tooling/package.json` (dotenv devDependency).

**Reviewer verdict (summary):**
- `UG-T-4`: writes `token` + `user` together then reloads (`UG-DD-4`, client `CLAUDE.md` §9); JWT validated before navigation; **secret-leak sweep clean** — every log line emits only booleans/derived flags. DoD 1 satisfied by the Leader's live role check (`localStorage.roles` populated by RolesService, §UG-T-2 entry); DoD 2 by code review. **STATUS: PASS**.
- `UG-T-5`: live `getComputedStyle` read, no navigation/auth/side effects; `readRootCustomProperty` throws on empty value naming the property (fail-loud per `UG-DD-2`, no fallback anywhere); the four required `--pr-color-*` properties confirmed present in `colors.scss`; font stacks resolved via `body` + removed off-screen `.pr-code` probe because `fonts.scss` declares no `--font-*` property; `writeTokensJson` resolves to the gitignored `tooling/tokens.json`. **STATUS: PASS**. *Unverified, carried to `UG-T-7`:* tokens.json spot-check vs DevTools; the throw exercised live.
- `UG-T-6`: overlay appended as a direct child of `document.body`, `position: fixed`, `z-index: 2147483647`; label legibility guaranteed by geometry (border painted outside the target box, transparent background); removal exhaustive via `data-ug-annotation`; `pointer-events: none` + `aria-hidden`; colour injected by parameter (no hardcoded marker colour); fails loudly on null `boundingBox()`. **STATUS: PASS**. *Unverified, carried to `UG-T-7`:* all four visual DoD items + proof that `capture.ts` passes `--pr-color-orange-500`.

**ADVISORY (4R, non-gating, recorded verbatim in substance):**
- RELIABILITY: `position: fixed` + `fullPage: true` is a fragile pairing (viewport-relative `boundingBox()`); `UG-T-7`'s visual check must include a below-the-fold target; fallback `absolute` + `window.scrollY`. → *Forwarded to the `UG-T-7` Implementer (examined by the Leader, in scope).*
- RELIABILITY: `borderWidth ≤ padding` is documented but not enforced — a guard/clamp is cheap. *Recorded only.*
- RELIABILITY: wrap annotate→screenshot in `try/finally removeAnnotation`. → *Forwarded to `UG-T-7`.*
- RISK: none of the three files had been type-checked; `npx tsc --noEmit` before `UG-T-7`. → *Forwarded to `UG-T-7` (`typecheck` script is in its brief).*
- RISK (minor): keep "no interpolated inputs in error messages" in `auth.ts` so `err.message` logging can never carry the token. *Recorded only.*
- READABILITY: `try/catch` around `Buffer.from(..., 'base64')` is dead code (Node does not throw on malformed base64). *Recorded only.*
- RISK (sub-threshold): halo `rgba(255,255,255,0.9)` / `borderRadius: 10px` literals are ungoverned by any spec clause; not a `UG-R-4` violation. *Recorded only.*

- **Requirements covered:** `UG-R-2` (T-4), `UG-R-4` (T-5), `UG-R-3` (T-6).
- **Decisions made:** `UG-T-5`/`UG-T-6` stay `[~]` until `UG-T-7`'s live run confirms their carried DoD items; `UG-T-4` moves to `[x]`.
- **Issues encountered:** work landed unrecorded (see §3a); `_scratch-verify.ts` removed and client lockfile restored in `1373a0f5f`.
- **Final verification result:** PASS ×3 on spec conformance.

---

### `UG-T-10` — Curate the glossary from the CLARISA glossary

- **Status:** PASS (attempt 1)
- **Date:** 2026-09-15
- **Skills assigned:** none (content task). **Effort:** medium. Implementer `akili-implementer` (sonnet) · Reviewer `akili-reviewer` (opus).
- **Files changed:** `tooling/content/glossary.json` (new, 20 entries: 16 sourced + 4 flagged).

**Attempt 1**
- **Implementer:** discovered the SPA is backed by the read-only JSON API `GET https://api.clarisa.cgiar.org/api/glossary` (70 terms) and fetched it from within the loaded page; curated to the flow vocabulary named in the brief + `tasks.md` examples; alphabetical; flagged entries carry `sourceUrl: null`, `definition: null`, `flag: "not found on CLARISA"`. Extraction script was throwaway (scratchpad). Verification: JSON parses to the `design.md` §2 shape.
- **Implementer `Not Done / Assumptions` (verbatim substance):** (a) scope curated without `UG-T-9` section copy (does not exist yet); (b) "Science Program" mapped to CLARISA `Program`; (c) flagged entries have `definition: null`; (d) full IPSR/Scaling-Readiness taxonomy not expanded.
- **Reviewer verdict: PASS.** Fidelity table against the Leader's API snapshot: all 16 sourced definitions **exact** (whitespace/`<br />` normalisation only, curly quotes preserved); all 4 flags **correct** after a synonym sweep. Judged (a)–(d) accepted — final flow-scope closure is `UG-AC-5`/`UG-T-16` by design.

**Forward pointers (carried by the Leader into the named briefs):**
- → `UG-T-9`: use the glossary's exact `term` strings as in-copy vocabulary ("Area of Work (AoW)", "High Level Output (HLO)", "Innovation Packages and Scaling Readiness (IPSR)", "Program"); if the copy uses the UI label "Science Program", add an alias entry to the glossary; any new flow term introduced by the copy must be added/flagged here before `UG-T-12`.
- → `UG-T-12`: render `definition === null` / `sourceUrl === null` without emitting literal `null` or an empty "Source:" line; → `UG-T-13`: assert no empty glossary `<dd>`.

**ADVISORY (4R, non-gating, recorded):** readability — flagged terms have no reader-facing definition (a short PRMS-authored definition with `source: "PRMS (not on CLARISA)"` would inform rather than only record a gap; decision deferred to `UG-T-9`/`UG-T-16`); readability — key name `flag` vs. the Description's `note` example, fix the shape comment in `design.md` §2 at archive; resilience — CLARISA `referenceDate` is null for every term, so keep the API snapshot (or per-definition hashes) under `tooling/content/` for future diffing (recorded, not adopted); risk (scope breadth) — candidate add-list once `UG-T-9` copy exists: `Package of deliverables (POD)`, `Deliverable`, `Innovation readiness`, `Innovation Bundle`, `Scaling Readiness`, `Scaling`, `Key result story` (CLARISA analogue of the flagged `OICR`), `Contributor`/`Partner`.

- **Requirements covered:** `UG-R-5`, `UG-US-8`; `UG-AC-5` partially (final cross-check at `UG-T-16`).
- **Decisions made:** DoD box "no term unrelated to the 6 flows" ticked provisionally on the Reviewer's evidence; `UG-T-16` re-checks the union with the final copy.
- **Issues encountered:** none.
- **Final verification result:** PASS.

---

### `UG-T-11` — Build `template/guide.html` + `guide.css` — PASS (attempt 2)

- **Attempt 1 (2026-09-15):** Implementer `akili-implementer` (sonnet), skill `frontend-design`, effort medium. Files: `tooling/template/guide.html` (199 L), `tooling/template/guide.css` (355 L). Implementer evidence: grep shows no literal colour/font in `guide.css`; dummy render in headless system Chrome — no leftover `{{...}}`, 7 TOC anchors resolve, 6 `<h2>` in order, intro contrast 17.33:1, cover "Built 2026-09-15", `page.pdf` Letter → 23 pages. Placeholder contract: `{{TOKENS_CSS}}`, `{{BUILD_DATE}}`, `{{INTRO}}`, `{{SECTIONS}}`, `{{GLOSSARY}}`; section ids `section-landing … section-innovation-packages`.
- **Leader check before review:** opened the Implementer's own dummy-render PDF — contract prose printed above the cover title, pages 2–3 full-bleed dark chrome, uppercase/italic body text. Root cause located in `guide.html`: nested `<!-- 01 -->`…`<!-- 06 -->` markers inside the header comment (L45–50) close it early. Evidence forwarded to the Reviewer.
- **Reviewer verdict (attempt 1): FAIL** — `akili-reviewer` (opus). Issues, verbatim in substance:
  1. **Discovered Issue:** header "placeholder contract" is not a single HTML comment — the first `-->` (L45) closes it; L46–69 parse as live content in `<head>`, forcing an implicit `<body>`: 5 empty stray `<section class="ug-section">` with the real section ids (duplicate ids → TOC anchors resolve to the empty strays), a second `<nav id="toc">` and `<section id="glossary">`, a stray unclosed `<h2>` (poisons `UG-T-13`), a live `<img src="..." alt="...">`, and a **live `{{GLOSSARY}}` placeholder at L64 outside any comment**. The Implementer's "7 anchors resolve" evidence passed *because* of the strays, on a corrupt DOM. **Violated Rule:** `requirements.md` `UG-R-1`, `UG-AC-1`; `design.md` `UG-DD-5`; `tasks.md` `UG-T-11` DoD 3. **Remediation:** delete the six inner `<!-- NN -->` markers (use `01:`…`06:` prose) — no `-->` anywhere between L8 and L69 (the `--pr-color-*` double hyphens are NOT a parser risk); preferably move the whole contract to `tooling/template/README.md` with a one-line pointer in the HTML. New evidence required from the re-run dummy render: (a) zero duplicate ids, (b) `document.body.firstElementChild` is `#cover`, (c) zero `<img>` in the un-assembled template, (d) exactly 3 `<h2>` in the un-assembled template, (e) the 7 TOC hrefs resolve *after* injecting dummy sections.
  2. **Discovered Issue:** `--ug-color-ink: #1a1a1f` and `--ug-color-ink-muted: #53535f` (guide.html L92–93) are invented hex for the body ink while the live token `--pr-color-secondary-400` ("neutral ink" in `colors.scss` L43) is already in `TokensJson`. **Violated Rule:** `requirements.md` `UG-R-4`; `design.md` `UG-DD-2`, §6.3. **Remediation:** `--ug-color-ink: var(--pr-color-secondary-400); --ug-color-ink-muted: color-mix(in srgb, var(--pr-color-secondary-400) 72%, white);` then re-measure contrast (estimate ≈13.9:1 / ≈5.6:1; DoD wants a measured number). Scope note: the other `--ug-*` neutrals (`page-bg`, `surface-alt`, `border`, `on-chrome`, `on-chrome-muted`, `shadow`) have no live counterpart and explicitly PASS — do not churn them.
  - Explicitly PASSED audit points (not to be re-litigated): no literal colour/font or `var()` fallback in `guide.css` (`color: transparent` on the title is a functional keyword); `color-mix()` fine in Chromium print; `@page` Letter present; `print-color-adjust: exact` on `html`; `<img alt>` carried as contract; TOC hrefs/ids wiring correct once strays are gone; a11y basics good; palette clears 4.5:1 throughout; Implementer assumptions (1)–(5) all accepted.
- **ADVISORY (attempt 1, non-gating, recorded):** RELIABILITY-1 `@page` margins are dead unless `UG-T-14` calls `page.pdf({ preferCSSPageSize: true })` or passes identical `margin` → *forward to `UG-T-14`*; RELIABILITY-2 `.ug-section { break-inside: avoid }` will overflow with real screenshots — drop it, keep `.ug-figure { break-inside: avoid }` → *forward to `UG-T-14` visual check*; RESILIENCE-1 malformed token → invalid `color-mix` → white-on-white cover; `assemble.ts` should assert colour-ish token shapes → *forward to `UG-T-12`*; RESILIENCE-2 Google Fonts fetched at render time; offline build silently falls back → *forward to `UG-T-14`* (`document.fonts.check()`); READABILITY-1 un-assembled template has 3 `<h2>` outside `#sections` → assembled total is 9; `UG-T-13` must count within `#sections` → *forward to `UG-T-13`*; RISK-1 `background-clip: text` title — add `-webkit-text-fill-color` + plain colour fallback (recorded).
- **Attempt 2 (2026-09-15):** Implementer `akili-implementer` (sonnet), effort high, both FAIL issues fixed + Leader-adopted extras; contract moved to new `tooling/template/README.md`; also closed a second instance of the same hazard (literal `{{TOKENS_CSS}}` text inside the `<style>` comment). Evidence: duplicate ids `[]`; `body.firstElementChild` = `#cover`; 0 `<img>` and 3 `<h2>` un-assembled; after dummy injection 7/7 TOC hrefs resolve, 9 `<h2>` total / 6 in `#sections`; measured contrast with live `#2b2838`: ink 14.35:1 / 13.32:1, ink-muted 5.80:1 / 5.38:1; css grep → only `font-family: var(...)`; dummy PDF 10 pages. Leader inspected the render: cover, intro + marker legend, TOC, one section per page — correct.
- **Reviewer verdict (attempt 2): PASS** — `akili-reviewer` (opus). Issue 1 fixed (one multi-line comment L8–11, single-line banners elsewhere, 5 placeholders exactly once each and never inside a comment); Issue 2 fixed (`--ug-color-ink: var(--pr-color-secondary-400)`, muted via `color-mix`); extras present; no regressions (`@page`, `print-color-adjust`, unique ids, TOC wiring, `lang`, heading hierarchy). **ADVISORY:** guide.css header still points to the HTML header instead of README (one extra hop); `color-mix` fallback behaviour acceptable for Chromium-only path.
- **Files (final):** `tooling/template/guide.html`, `tooling/template/guide.css`, `tooling/template/README.md`.
- **Requirements covered:** `UG-R-1` (structure), `UG-R-4`, `UG-R-20`, `UG-DD-5`.
- **Final verification result:** PASS (attempt 2 of 3). Status: **PASS**.

---

## 3b. Runtime note — HTTP 429 session limits (2026-09-15 ~21:00, reset 21:10 America/Bogota)

- `UG-T-3`+`UG-T-7` Implementer (`akili-implementer`, sonnet) killed mid-task. Tree probe afterwards: `tooling/routes.config.json` drafted (6 entries, count claims unverified), `tooling/src/_probefold.ts` (its below-the-fold probe) left behind, `capture.ts` absent, no `raw/`/`tokens.json`. No rework attempt consumed (runtime failure). Re-briefed with "the working tree wins".
- `UG-T-11` Reviewer (`akili-reviewer`, opus) killed **after** delivering its FAIL report via hand-back — the verdict stands.
- Limits reset at 21:10; both roles re-spawned on their default tier models.

---

### `UG-T-9` — Author guide content (intro + 6 sections) — PASS (attempt 2)

- **Attempt 1 (2026-09-15):** Implementer `akili-implementer` (sonnet), skill `cognitive-doc-design`, effort medium. Files: `tooling/content/intro.md` (219 w) + `sections/01-landing.md` … `06-innovation-packages.md` (145–170 w each), body prose only (template supplies the `<h2>`). Verification: grep for URLs/environments/`status_id`/`_id` → zero hits; click-target phrase present once per file; no URL per `NOTES.md`.
- **Implementer `Not Done / Assumptions`:** (a) no leading `##` per template README (accepted — `design.md` has no literal "Section layout pattern" heading; pattern inferred from `tasks.md` + §6.3); (b) **02-overview names "Continue reporting" as the click target because the drafted `routes.config.json` says so, but the Leader's probe screenshot of `/entity-details/SP01/overview` shows no such text** — visible actions are **Tour**, **Report emerging result**, **Where to report**, and per-AoW **Report** buttons. Leader confirmed on the screenshot. → Resolution deferred to `UG-T-3`'s live selector verification; the section copy will be aligned to the final target before review.
- **Glossary follow-ups requested by the author (loop back to `UG-T-10`, sanctioned by `UG-T-16`):** alias "Science Program (alias of Program)"; alias "W3/Bilateral" → existing flagged entry; new "W1/W2" (core funding); new "Key Performance Indicator (KPI)" (on-screen UI text, e.g. "0/403 KPIs").
- **Follow-up (same attempt, pre-review):** after `UG-T-3` finalised the home clickTarget, the author rewrote `01-landing.md`'s click-target passage to "click **Report** on the first card under **My CGIAR Centers**" (200 w); `02-overview.md` unchanged ("Continue reporting" confirmed to exist below the fold).
- **Reviewer verdict (attempt 1): FAIL** — `akili-reviewer` (opus), audited against the six real captures and the client templates. **Passed:** DoD 1 (click target named per section, all six ring-matched), DoD 3 (`UG-AC-4` statement unambiguous, year-agnostic), `NOTES.md` no-URL rule, jargon clean, no admin-only feature presented as P/A, label-level accuracy for Only pending / Favorites / Filter / Export CSV / Find result / Submitter / Phase / Package status / Requests received-sent / Accept-Decline contribution. **Issues (both `03-reporting.md`):**
  1. Third paragraph describes content that does not exist above the AoW list ("frames the bigger picture — how your Program's work steers toward its intended impact"); "Steer to impact" is the name of High Level Output HL01 inside the hierarchy, not page chrome. Violated: `UG-US-3`, `UG-AC-3`, `UG-T-9` Description. Remediation: delete or replace with what is actually above the list (result-type chips: All / KP / ID / PC / IU / CS), or state the HLO layer correctly.
  2. Click-target sentence mis-states behaviour: **Where to report** is a page-header action that opens a modal hub, not an AoW-scoped jump into reporting (the AoW-scoped control is **By AOW**). Violated: `UG-AC-3`. Remediation: "Not sure where a result belongs? Click **Where to report** in the page header — it opens a guide to the right place to report. To open one Area of Work directly, use **By AOW** on its row." Keep **Where to report** bolded as the marker target.
- **ADVISORY (attempt 1) — Leader adopted the factual ones into attempt 2 (copy accuracy is the task's own DoD, not new scope):** `Expand all` is a per-band toggle, toolbar equivalent is `All Areas of Work` (03); Results Center chip reads `Phase: Reporting 2026 (Open)` without dash (04; the dashed form is the Notifications dropdown, 05 correct); IPSR columns are `SUBMITTER / STATUS / PHASE YEAR / PHASE PORTFOLIO` (06 transposed); `Update result` is a page-header action, not per-row (04 sequencing); `Create a new Innovation Package` creates a record — own sentence, not in the filter list (06). Recorded only: `tasks.md` `UG-T-9` points at a non-existent `design.md §"Section layout pattern"` (fix at archive).
- **Glossary delta (Reviewer):** needed — **Accelerator** (not requested by author), **Key Performance Indicator (KPI)**, **W1/W2**, **Science Program (alias of Program)**; optional — W3/Bilateral alias. Flagged entries `Bilateral / Window 3 (W3)`, `Phase`, `Collaboration / contribution request` have `definition: null` and are used heavily → fill with short PRMS-authored definitions marked `source: "PRMS (not on CLARISA)"`. → Loop-back to `UG-T-10`'s file executed inside `UG-T-9` attempt 2 (sanctioned by `UG-T-16` "fixes loop back to UG-T-10").
- **Attempt 2 (2026-09-15):** same Implementer resumed, effort high. Rewrote 03 (chips sentence; HLO sentence "Each AoW expands into High Level Outputs (for example, "Steer to impact") that group its indicators"; **Where to report** as page-header guide, **By AOW** for row-level); 04 chip "Phase: Reporting 2026 (Open)" + **Update result** as header action; 06 column order + standalone **Create a new Innovation Package**; 02 symmetric W1/W2 expansion. Glossary (`tooling/content/glossary.json`, now 24 entries): added "Accelerator" (verbatim CLARISA), "Key Performance Indicator (KPI)", "Science Program" (alias of Program), "W1/W2 (Windows 1 and 2)" (PRMS-authored, flagged, `source: "PRMS (not on CLARISA)"`); filled the null definitions of "Bilateral / Window 3 (W3)", "Collaboration / contribution request", "Phase" the same way, flags kept. Word counts: intro 219, sections 148–207.
- **Reviewer re-review (attempt 2): FAIL on one new sentence** — 03 swapped two controls: **All Areas of Work** is a view switch back to the grouped list (`setPlannedBrowseView('aows')`), the toolbar **Expand all / Collapse all** is what opens every AoW; per-card **Expand all** half was right. Everything else verified fixed; glossary clean (Accelerator verbatim vs snapshot, alphabetical, no CLARISA entry altered). Note: `OICR` remains `definition: null` (unused in copy) → `UG-T-12` must skip/handle null (forward pointer already recorded).
- **Leader inline fix (single sentence, Reviewer's exact remediation text, 1-file puntual edit within Delegation Thresholds):** "Use **Expand all** in the toolbar to open every AoW at once (press it again to collapse), or an individual AoW card's own **Expand all** to open just that one. If you have drilled into a single AoW, **All Areas of Work** takes you back to the full list." (03 now 231 w — the 120–220 target was Leader guidance, not a DoD.)
- **Reviewer final verdict: PASS** — both controls now correct against `dashboard-lab.component.html:1480/1497`; click target still named and bolded; all three DoD items clear. Cosmetic nit: one long line in 03 (markdown renders identically).
- **Files (final):** `tooling/content/intro.md`, `tooling/content/sections/01…06-*.md`, `tooling/content/glossary.json` (loop-back).
- **Requirements covered:** `UG-R-1` (content), `UG-R-3`, `UG-R-6`, `UG-R-9`, `UG-R-11`, `UG-AC-3`, `UG-AC-4`; `UG-R-5` extended (glossary now covers every term in the copy).
- **Final verification result:** PASS (attempt 2 + Leader one-line fix, within the 3-attempt ceiling). Status: **PASS**.

---

### `UG-T-3` — `routes.config.json` · `UG-T-7` — `capture.ts` — PASS (attempt 2)

- **Attempt 1 (2026-09-15, two Implementer sessions — first killed by 429, second resumed on the tree):** `akili-implementer` (sonnet), skill `playwright-cli`, effort medium. Files: `tooling/routes.config.json` (home clickTarget corrected to the first "My CGIAR Centers" card's **Report** link — the drafted `text=Breeding for Tomorrow` had 0 matches on home), `tooling/src/capture.ts` (new), `tooling/src/annotate.ts` (fixed → absolute + `window.scrollX/Y`, pre-authorised fallback), `package.json` (`capture`, `typecheck` scripts), `.env.example` (`PLAYWRIGHT_CHANNEL`). Evidence: `tsc --noEmit` clean; `npm run capture` exit 0 → 6 PNGs + `tokens.json` (`--pr-color-primary-300 #6b46e5`, `-400 #5733c4`, `--pr-color-secondary-400 #2b2838`, `--pr-color-orange-500 #f97316`, Manrope / JetBrains Mono stacks); negative path exits 1 naming route + selector; clickTarget counts all 1; readySelectors absent on `/login`; `readRootCustomProperty` bogus property throws.
- **Leader check before review:** PNG dimensions — home 1280×1903 OK, ipsr 1280×1541 OK, **overview / reporting-aows / results-list 1280×720** (inner scroll container; content scrolled to the target, top cut off, skeleton rows), **notifications-received 1280×186177 (4.7 MB, virtual list)**. Forwarded to the Reviewer as issue #1.
- **Reviewer verdict (attempt 1):** `UG-T-3` **FAIL**, `UG-T-7` **FAIL**, `annotate.ts` change **PASS**. Issues, verbatim in substance:
  - T-3 #1 — three `readySelector`s are static chrome, not data-bearing (`home` `text=Welcome!`, `overview` `text=Progress by area of work`, `reporting-aows` `text=Steer to impact`): they match while skeletons are still up (proof: `overview.png`). Violated: `tasks.md` `UG-T-3` Description/DoD 1; `requirements.md` §8 risk row. Remediation: re-point at data-resolved nodes (overview: a rendered AoW progress row / KPI value; reporting-aows: an AoW list item; home: a rendered `app-result-framework-reporting-center-card-item`); re-verify absent on `/login`, absent while skeletons up, present after data.
  - T-3 #2 — no per-route capture settings. Violated: `design.md` §6.1 (config is the single source of truth), `UG-R-7`. Remediation: extend shape to `{…, viewport?: {width,height}, fullPage?: boolean}` (defaults 1280×720 / `true`); tall fixed viewport (~1280×1600–2000) + `fullPage: false` for overview, reporting-aows, results-list, notifications-received.
  - T-7 #1 — `fullPage: true` is a no-op on inner-scroll routes → 3 frames 1280×720, notifications 1280×186177; overview shows sticky header, mid-page scroll, KPI cards cut, skeleton rows. Violated: `UG-R-2` (representative content; §8 "wrong/stale UI state"), `UG-R-7`, `UG-T-7` DoD 1 (a usable frame, not a file). Remediation: consume per-route `viewport`/`fullPage`; `page.setViewportSize()` per route; scroll inner container if needed then back to top with the clickTarget inside the frame; annotate after; stay read-only.
  - T-7 #2 — the only defence against half-rendered pages is two hardcoded sleeps (1500 ms, 800 ms); overview proves they fail silently with exit 0. Violated: `requirements.md` §8 gate ("asserts … non-empty data … fails loudly"), `design.md` §9. Remediation: assert zero visible skeleton nodes (`[class*="skeleton"], .p-skeleton`) with a bounded wait, throw `RouteCaptureError` naming route + selector on timeout; keep sleeps only as short settle.
  - Explicitly PASSED (not to be re-litigated): read-only guarantee clean; token handling clean (env only, never interpolated); §9 log lines and non-zero exits; `PLAYWRIGHT_CHANNEL` default bundled Chromium; orange from live tokens; `try/finally removeAnnotation`; residual-node check; gitignore; scripts; `captionKey` set matches `content/sections/01..06`.
- **`UG-T-5` / `UG-T-6` closure (carried DoD):** `tokens.json` values are real hex/font strings from the live app (above) and the bogus-property throw was exercised → `UG-T-5` DoD closed. `overview.png` (below-the-fold target) shows the orange ring framing **Continue reporting** outside the button box, label legible, unmistakably distinct from the violet button; `results-list.png` corroborates; residual check covers removal → `UG-T-6` DoD 1, 2, 3, 4 closed. **Both PASS.** Deviation recorded: overlay is now `position: absolute` + scroll offsets instead of `fixed` (`design.md` `UG-DD-3`/§2.2 and `tasks.md` `UG-T-6` said "fixed"); `design.md` `UG-DD-3` amended in place with a dated note (spec's own file). `annotate.ts` L64 JSDoc still says "fixed-position" → include in attempt 2.
- **ADVISORY (attempt 1, non-gating, recorded):** export `OVERLAY_ATTR` from annotate.ts and import it in capture.ts instead of duplicating `'[data-ug-annotation]'`; validate `routes.config.json` shape in `loadRoutes()`; wrap annotate/screenshot errors in `RouteCaptureError` naming route + selector; redact the origin from the final `main().catch` message (§7 letter); `text=` clickTargets are copy-coupled (fail loudly, acceptable).
- **Attempt 2 (2026-09-15):** `akili-implementer` (sonnet), effort high. readySelectors re-pointed from component source: home `app-result-framework-reporting-center-card-item`, overview `[data-testid="aow-rows"]` (only in the `@else if (richRows().length)` branch, exclusive with `aow-rows-skeleton`), reporting-aows `.pr-reporting-row`; schema extended with `viewport?`/`fullPage?` (defaults 1280×720 / true); overview, reporting-aows, results-list, notifications-received → 1280×1800 + `fullPage:false`; capture.ts applies `setViewportSize` per route, drops `scrollIntoViewIfNeeded` + 800 ms sleep (all targets inside the frame without scrolling), adds `waitForNoVisibleSkeletons()` (10 s bound, `RouteCaptureError` naming route + selector) on `.pr-skeleton, [data-testid$="-skeleton"]` (the app's real skeleton markers; visibility clipped to the captured rect for `fullPage:false`), 1500 ms settle demoted to pre-gate; `OVERLAY_ATTR` exported/imported; annotate/screenshot wrapped in `RouteCaptureError`; JSDoc fixed. Evidence: typecheck clean; capture exit 0; PNGs home 1280×1903, ipsr 1280×1541, other four 1280×1800 (Leader re-measured); skeleton gate negative path exit 1 naming route + selector; readySelectors 0 on `/login`, 2/1/7/10/1129/10 after data; clickTargets all 1. Leader viewed overview.png (full top, real KPI/AoW numbers, real chart axis, ring on "Continue reporting") and notifications-received.png (Pending list, ring on the first card).
- **Reviewer verdict (attempt 2): `UG-T-3` PASS · `UG-T-7` PASS** — both issues per task closed and verified against client source; skeleton-selector deviation accepted as strictly better targeted; viewport-clipped visibility has no hole (page never scrolled on `fullPage:false` routes, predicate counts partial overlap); read-only guarantee stricter (only scroll call removed); token handling clean; §9 logging intact.
- **ADVISORY (attempt 2, recorded):** bare Tailwind `animate-pulse` placeholders are not covered by the gate (HITL visual pass is the backstop); `countVisibleSkeletons` forces layout on every match (~3360 nodes on notifications) — early-exit would be O(1) in the failing case; `viewport` consumed without shape validation.
- **Leader HITL note for `UG-T-16`:** `notifications-received.png` shows real people's names and production result titles (e.g. the first Pending card's requester). Flagged to the user 2026-09-15 as a distribution/privacy decision (blur names, or capture with a lower-exposure account); not blocking assembly.
- **Files (final):** `tooling/routes.config.json`, `tooling/src/capture.ts`, `tooling/src/annotate.ts`, `tooling/package.json`, `tooling/.env.example`.
- **Requirements covered:** `UG-R-2`, `UG-R-3`, `UG-R-7`, `UG-R-10`.
- **Final verification result:** PASS (attempt 2 of 3). Status: **PASS** for both tasks.

---

### `UG-T-12` — `assemble.ts` · `UG-T-13` — `verify-structure.ts` · `UG-T-14` — `pdf.ts` + PDF — PASS (attempt 1) + polish round

- **Attempt 1 (2026-09-15):** one `akili-implementer` (sonnet), skill `playwright-cli`, effort high, chained. Killed by HTTP 429 (sonnet, reset 02:10) at its final step (cleanup/report) **after** all three files and the build were complete; tree probe found no scratch leftovers. Leader re-ran the verification inline: `npm run typecheck` clean; `npm run build-guide` exit 0 (assemble → verify-structure "OK — structure matches template/README.md's contract" → pdf, fonts Manrope/JetBrains Mono available); `pdfinfo` 20 pages, 612×792 pt Letter, 2.5 MB; assembled HTML 9 `<h2>`, 6 `<img>`, 0 `{{`, 0 literal `null`; `dist/guide-assembled.html` ignored, PDF not ignored.
- **Leader-executed DoD items:** `UG-T-13` negative paths — deleting the Results Center `<h2>` → exit 1 ("Section "section-results-center" has <h2> text "" but expected "Results Center"; Expected 9 <h2> … found 8"); swapping sections 5/6 → exit 1 naming both positions/ids. `UG-T-14` — PDF byte scan: 24 link annotations, 8 GoTo destinations (TOC + glossary), backgrounds/gradients visibly rendered on cover and section bands (Leader viewed all 20 pages).
- **Reviewer verdict: `UG-T-12` PASS · `UG-T-13` PASS · `UG-T-14` PASS** — `akili-reviewer` (opus). Placeholder contract honoured with exactly-once guards and a post-scan; stylesheet inlined (relative href would have 404'd from `dist/`); section ids/order/titles 1:1 with README and TOC; 6 meaningful `alt`s; route `<code>` is a path; token shape guard; markdown renderer matches the content actually present (paragraphs + bold only); glossary 23 pairs, no empty `<dd>`, `<cite>` with link or PRMS source, OICR (null) skipped; `pdf.ts` options exact (`preferCSSPageSize` proven by 612×792); fonts gate; no secrets/origin logged; no new deps.
- **ADVISORY (recorded):** per-section titles/eyebrows/alt/captions hardcoded in `assemble.ts` rather than content/config (readability); `assemble.ts` does not check `raw/<id>.png` exists / `verify-structure` does not assert `img.naturalWidth > 0` (reliability — adopted in polish); `**`/`##` leak checks run over raw HTML incl. inlined CSS (reliability); `buildDateIso()` uses UTC → cover reads "Built 2026-09-16" on a 2026-09-15 build (risk — adopted in polish); null-definition glossary entries dropped silently → `console.warn` (adopted in polish).
- **Leader HITL findings (viewed all 20 pages) → polish round:** (1) section 01's figure (`home.png`, 1280×1903) is taller than the page, so `.ug-figure { break-inside: avoid }` cannot hold and the caption lands alone on the next page → cap `.ug-figure img` height so image + caption fit one page; (2) glossary `<dt>` orphaned at page bottom ("High Level Output (HLO)", "Innovation Packages and Scaling Readiness (IPSR)") → keep `dt` with its `dd`; (3) build date local, not UTC. Scope: `template/guide.css`, `src/assemble.ts` (+ `verify-structure.ts` image assertion). These are quality defects in the spec's own deliverable (`UG-R-1`, `UG-R-20`), not new scope.
- **Files:** `tooling/src/assemble.ts` (411 L), `tooling/src/verify-structure.ts` (190 L), `tooling/src/pdf.ts` (101 L), `tooling/package.json` (scripts `assemble`, `verify-structure`, `pdf`, `build-guide`), `tooling/dist/reporting-tool-user-guide.pdf` (committed after the polish round + `UG-T-15`/`UG-T-16`, per `tasks.md` §6).
- **Requirements covered:** `UG-R-1`, `UG-R-4`, `UG-R-5`, `UG-R-12`, `UG-R-20`, `UG-AC-1`, `UG-DD-5`.
- **Polish round (2026-09-15/16):** Implementer `akili-implementer` (**opus** — sonnet session-limited), effort medium. `guide.css`: `.ug-figure img { width:auto; height:auto; max-width:100%; max-height:8.2in; object-fit:contain }` (caption no longer orphans); glossary pairs wrapped in `.ug-glossary__entry { break-inside: avoid }` + `dt { break-after: avoid }`. `assemble.ts`: local build date (`toLocaleDateString('en-CA')`), `fs.access` per `raw/<id>.png` naming the route, `console.warn` per skipped null-definition term. `verify-structure.ts`: fails on `img.naturalWidth === 0`. Evidence: typecheck clean; `build-guide` exit 0; **19 pages** (orphan page gone); cover "Built 2026-09-15"; pdftoppm views p5 (image + caption together), p17/p18 (terms with definitions); both new guards' negative paths proven; Leader viewed p5. **Reviewer (fable — opus weekly-limited): PASS**; ADVISORY: assert the `YYYY-MM-DD` shape or pad manually so a small-ICU Node build cannot silently emit `M/D/YYYY` (recorded). Implementer note: the 8.2in cap also shrinks sections 02–06 slightly (uniform figure size) — accepted; `template/README.md` not yet mentioning `.ug-glossary__entry` → folded into `UG-T-17`'s README touch. Committed in `c08a27cd9`.
- **Final verification result:** PASS ×3 + polish PASS.

---

### `UG-T-15` — Credential-leak and read-only audit — PASS

- **Date:** 2026-09-15. **Auditor:** `akili-reviewer` (opus), independent of every Implementer. **Leader pre-flight:** `git ls-files` + unignored-files grep for JWT shapes → none; `tooling/.env` gitignored; PDF bytes contain neither `eyJ` nor `reporting.cgiar.org`.
- **Verdict: PASS.** Grep table (spec dir, gitignored paths skipped): JWT shape 0; literal-valued `password|secret|api_key|token` assignments 0; `TEST_TOKEN|TEST_USER_*` with values 0 (empty keys in `.env.example` only); `authorization|bearer|webhook|amazonaws|AKIA` 0; `localhost` 2 benign (`.env.example` default, `NOTES.md` prohibition); URLs only in `auth.ts` doc comment, `.env.example`, glossary CLARISA `sourceUrl` ×17, Google Fonts links in the template; `reporting.cgiar.org` only in spec docs + one `auth.ts` `@param` example — **zero in `content/**`, `template/**`, `routes.config.json`, `dist/`**. Read-only review of all seven `src/*.ts`: no mutation call (`click/fill/press/type/check/selectOption/dispatchEvent/setInputFiles/route/submit`); the four `page.evaluate` sites are the sanctioned `localStorage` injection (`UG-DD-4`), the overlay inject/remove (`UG-DD-3`), a pure read in capture.ts, and tokens.ts's throwaway font probe; no `console.*`/`Error(...)` interpolates the token, user object or any `.env` value; route `<code>` renders relative paths only, so no origin reaches the PDF.
- **ADVISORY (recorded):** tokens.ts font probe `<span>` is removed inline rather than in `finally` and is a third DOM injection not enumerated in design §7 — tag it `data-ug-annotation` or wrap in `try/finally`; the PDF embeds production data (program names, result counts, notification senders, "JC" avatar initials) → explicit accept at `UG-T-16`; the live production JWT in `tooling/.env` is protected only by `.gitignore` → **recommend deleting `tooling/.env` once re-runs are no longer needed**.
- **Requirements covered:** `UG-AC-6`, design §7. Both DoD items satisfied.

---

## 3c. Spec amendment — labelled feature callouts (2026-09-16)

**Trigger:** first HITL look by the user (2026-09-16): "La guía quedó perfecta, solo deberíamos adicionar más de los recuadros naranja sobre las principales funcionalidades de cada imagen … eso es lo que nos falta, adicionar más información dentro de las imágenes", with an example image (ring around a Program card, arrow, chip "Click to go SP"). This is a user-requested widening of `UG-R-3` (one marker) — recorded as **`UG-R-21`** in `requirements.md`, **`UG-DD-7`** in `design.md`, and tasks **`UG-T-17`–`UG-T-19`** in `tasks.md` (spec's own files). Approval mode stays pre-approved per the user's standing direction.

**Budget tripwire (reported here, not silently pushed through):** `design.md` estimated ~650–850 LOC / ~2 review rounds. Actual code before this amendment: ~1,900 LOC across `tooling/src/*.ts` + `guide.css` (tests are none; content/JSON excluded), and 7 review rounds (2 rework rounds on `UG-T-3/7`, `UG-T-9`, `UG-T-11`). Causes: production-capture realities (inner-scroll routes, skeleton gates, per-route viewports), a full structural verifier and font/token guards that the estimate under-scoped, and the retroactive audit of unrecorded work. The user was informed in the 2026-09-16 status message; the amendment adds ≈ +260 LOC/config and one review round.

**Runtime:** opus hit its **weekly** limit (resets 2026-09-17 03:00 America/Bogota) during the polish re-review — Reviewer rotated to `fable` (session model); Implementers stay on `sonnet` (session limit reset 02:10).

---

### `UG-T-17` — Labelled multi-callout annotations — PASS (attempt 1)

- **Date:** 2026-09-16. Implementer `akili-implementer` (sonnet), skill `playwright-cli`, effort high · Reviewer `akili-reviewer` (**fable** — opus weekly-limited).
- **Files:** `tooling/src/annotate.ts` (+`CalloutSpec`, `CalloutColors`, `AnnotateCalloutsOptions`, `annotateCallouts()`; `annotateClickTarget`/`removeAnnotation` unchanged), `tooling/src/capture.ts` (reads `route.annotations[]`, fallback `[{ clickTarget, primary, '' }]` → ring-only as before; `count()===1` per selector with `RouteCaptureError` naming route + label + selector; one `annotateCallouts` call per route; residual gate unchanged), `tooling/template/README.md` (`annotations[]` shape + `.ug-glossary__entry` note), `tooling/routes.config.json` (temporary 3-callout example on `home`, superseded by `UG-T-18`).
- **Implementation:** ring (primary 4 px / feature 3 px, orange token) + label chip (bg `--pr-color-secondary-400`, white text, 2 px orange border, 16 px/600, inherits Manrope) + SVG connector (2.5 px orange line + arrowhead) from chip edge to ring edge; placement requested → opposite → remaining sides, checked against the captured frame (viewport for `fullPage:false`, document for `fullPage:true`) and against other rings/chips, then ±16–80 px nudges; last resort = first in-frame candidate (never throws). All nodes direct `body` children tagged `OVERLAY_ATTR`, `aria-hidden`, `pointer-events:none`. Deviations accepted by the Reviewer: `annotateClickTarget` kept rather than wrapped; 4th optional `options { fullPage, padding }` param; feature ring 3 px (recorded here so it is not read as drift).
- **Evidence:** typecheck clean; capture exit 0; Leader viewed `home.png` — three rings, three chips ("Open reporting", "Open a Program", "Portfolio progress"), three connectors, legible; `results-list.png` unchanged (fallback); negative paths: 0-match → exit 1 "callout "Open a Program" selector "…" resolved to 0 element(s)", many-match `a` → "resolved to 17 element(s)"; residual gate 0 nodes on all 6 routes.
- **Reviewer verdict: PASS** — read-only guarantee holds; every injected node covered by the residual gate; colours from tokens only (white text = DD-7 neutral); coordinate/frame math correct; no secret/origin in messages; fallback behaviour-identical; README accurate. Leader's observation (chip over the neighbouring SP02 card text) ruled a placement/authoring concern for `UG-T-18`, not a `UG-R-21` violation.
- **ADVISORY (recorded):** return per-entry `collisionFree` so `capture.ts` can `console.warn` when the last-resort placement fires; dedupe the ring style block; the `rgba(0,0,0,0.35)` chip shadow and the pre-existing halo are literals — reword the "only accepted neutral literal" comment or drop the shadow; connectors of earlier entries are not part of the collision check.
- **Requirements covered:** `UG-R-21`, `UG-R-3`. All 3 DoD items satisfied.

---

### `UG-T-18` — Author the callouts per route · `UG-T-19` — Regenerate the guide — PASS (Leader visual pass = the DoD gate)

- **Date:** 2026-09-16. `UG-T-18` Implementer `akili-implementer` (sonnet), effort high, ~10 capture iterations; the task's own DoD names the Leader/user visual pass as the gate, so no separate diff Reviewer was spawned for the JSON (every selector is machine-verified by `capture.ts`'s `count() === 1` rule on each run).
- **Final callouts (22, all selectors → exactly 1 element, capture exit 0):** home — Open Center reporting (primary), Open a Program, Current reporting phase, Portfolio progress · overview — Continue reporting (primary), Results this cycle, KPIs left per AoW · reporting-aows — Where to report (primary), Filter by result type, Open one Area of Work, Expand every AoW, Search AoWs and KPIs · results-list — Update result (primary), Find a result, Filter by phase or status, Export the table · notifications-received — A pending request (primary), Requests or Updates, Accept or decline · ipsr-innovation-list — Open a package (primary), Filter the list, Export the table. Four suggested callouts were dropped because no placement avoided covering neighbouring UI text (overview "Not sure where? Start here", results-list "One row per result", ipsr "Start a new package" and "Track each package's status") — every route still has 3–5.
- **Implementer observations (report-only):** the collision check only protects other callouts, not arbitrary page text — cramped toolbars leave no clean side; a responsively hidden text node passes `count()` but has no bounding box (selector-authoring pitfall: target the always-visible parent).
- **Leader `UG-T-19` run:** two viewports tightened to the content height (`reporting-aows`, `results-list` → 1280×1000; their 1800 px frames were two-thirds empty and shrank the labels) — config-only change, then `npm run capture` exit 0 and `npm run build-guide` exit 0 (verify-structure OK, fonts available); **19 pages**, Letter, 2.6 MB. Frames: home 1280×1903, ipsr 1280×1541, overview 1280×1800, notifications 1280×1800, reporting-aows 1280×1000, results-list 1280×1000.
- **Leader visual pass (all six figure pages at print scale):** every callout points at the element its label names; chips legible on screen (≈ 6–8 pt on paper — small but readable; larger would need a chip font bump in `annotate.ts`). Residual overlaps to put before the user at `UG-T-16`: reporting-aows "Where to report" chip touches the top-nav "Support" item and "Search AoWs and KPIs" sits over the page title/tab row; ipsr "Open a package" chip covers the first row's Submitter cell; home "Open a Program" touches the section heading. Fix options: (a) accept; (b) one small round adding an optional per-callout `offset` to `CalloutSpec` so the author can push those chips onto whitespace.
- **Requirements covered:** `UG-R-21`, `UG-R-1`, `UG-R-7`. DoD: `UG-T-18` 3/3 (third = this visual pass), `UG-T-19` 2/2 (label legibility accepted with the caveat above).
- **PDF commit:** deferred to `UG-T-16` sign-off per `tasks.md` §6; `routes.config.json` committed now.

---

### `UG-T-16` — HITL review: click-target accuracy and glossary fidelity — PASS (user sign-off)

- **Date:** 2026-09-16. **Reviewer of record:** the user ("perfect"), after the Leader's T6 visual pass of all 19 pages and the explicit list of open points.
- **Click-target / callout accuracy:** all 6 primary markers and 16 feature callouts confirmed pointing at the element each label names (Leader pass, user sign-off). **Glossary fidelity:** 24 entries — 17 verbatim CLARISA definitions (two independent Reviewer checks against the API snapshot), 7 PRMS-authored flagged entries with `source: "PRMS (not on CLARISA)"`; OICR (null) skipped at assembly with a warning.
- **Accepted as-is by the user:** (1) three chips touching neighbouring UI text in cramped layouts (reporting-aows "Where to report" / "Search AoWs and KPIs", ipsr "Open a package"); (2) chip label size about 6-8 pt on paper; (3) production data visible in screenshots (real names in Notifications, result titles, "JC" avatar) - the guide is distributed with that content.
- **Deliverable committed:** `docs/specs/changes/user-guide-pdf/tooling/dist/reporting-tool-user-guide.pdf` (19 pages, Letter, 2.6 MB, built 2026-09-16 from production captures with 22 callouts).
- **Requirements covered:** `UG-AC-4`, `UG-AC-5`, `UG-R-3`, `UG-R-21`. Both DoD items satisfied.

---

## 3. Design Decisions Recorded Mid-Execution

### Capture target changed: local dev → production (`UG-DD-6`, added to `design.md` 2026-09-15)

Before starting `UG-T-2`, pre-flight environment verification found:

- Local backend (`localhost:3000`) fails to start against its dev database: `TypeOrmModule` error `connect ETIMEDOUT` reaching the configured MySQL host. Local client (`:4200`) itself was reachable, but 5 of 6 target routes need backend data to render non-empty content.
- The user confirmed (2026-09-15) that production (`https://reporting.cgiar.org`) already has the shipped changes and representative data, with an authenticated Chrome session already open there, and explicitly directed the capture script at that origin instead of local.
- The user also resolved `UG-OQ-4` explicitly: the guide's body text must not reference **any** environment/URL — generic phrasing only ("sign in to the Reporting Tool").

**Action taken:** `design.md` (`UG-DD-6`), `requirements.md` (`UG-R-2`, Dependencies, `UG-OQ-4`), and `tasks.md` (`UG-T-2`, `UG-T-10` note, pre-flight checklist) were updated in place to record this — these are the spec's own deliverable files, not shared constitutional docs, so this is within normal spec-branch write discipline (not a shared-file violation). No Pivot Protocol invocation was needed: this is a target-environment substitution within the already-approved architecture (read-only browser automation via a configurable `CLIENT_BASE_URL`, per `UG-R-10`), not a reversal of delivered behavior or an unviable-design finding.

**Safety basis for targeting production:** `UG-DD-4`'s constraints (real login only, no bypass/fabricated JWT) and `design.md` §7's read-only guarantee (no create/submit/delete interaction) apply unchanged. `docs/infrastructure.md`'s "cloud is governed and never deployed by agents" rule is not implicated — nothing is deployed; the script performs a single-pass, 6-route read-only navigation, equivalent in kind to what it would have done against localhost.

**Resolved 2026-09-15 (Leader pre-flight):** `https://clarisa.cgiar.org/landing-page/glossary` is a client-rendered SPA route — the server answers HTTP 404 for the deep link, but a real browser renders the glossary (title "CLARISA", ~27k chars: "Glossary of terms and their definitions used across CLARISA and CGIAR reporting. Filter by portfolio or search any term"). `UG-T-10` must extract via headless browser, not `curl`. Original note kept below for history.

**Separately noted (original, superseded):** a direct fetch of `https://clarisa.cgiar.org/landing-page/glossary` (both `curl` and an isolated fetch tool) returned HTTP 404 during pre-flight. Flagged in `tasks.md`'s `UG-T-10` for the Implementer to re-investigate (likely a moved path or a client-rendered route requiring a real browser) before curating the glossary.

---

### `dist/` location decided (2026-09-15, before `UG-T-12`)

Output directory fixed at `tooling/dist/` (the `UG-T-1` Reviewer's RELIABILITY advisory): the existing ignore rule covers the intermediate `guide-assembled.html`, the PDF is committed from there. `design.md` §2 tree amended in place (spec's own file).

---

## 4. Pending inputs

- **`TEST_TOKEN`** — received from the user 2026-09-15 and stored in gitignored `tooling/.env`. Resolved.

---

## 5. Summary (updated as tasks complete)

**19 of 19 tasks complete** (2026-09-16); `UG-T-5`/`UG-T-6` reviewed PASS on code, `[~]` until `UG-T-7`'s live run closes their visual/live DoD items. Spec execution complete. Follow-ups recorded in `tasks.md` section 7 and the advisories above. Recommended next: `/akili-archive docs/specs/changes/user-guide-pdf` (Kaizen + constitution sync; note the stale Poppins reference in `docs/ux-ui/design.md` section 7 and the dangling 'Section layout pattern' pointer in `tasks.md`). Operational reminder: delete `tooling/.env` (live production JWT) once re-runs are no longer needed. Next eligible: `UG-T-2` (Verify environment and seed data) and `UG-T-8` (Resolve sign-in URL reference) — `UG-T-8` is now effectively pre-resolved by the user's decision (no URL, generic phrasing) and only needs a one-line confirmation note when its turn comes. `UG-T-2` is blocked pending the `TEST_TOKEN` value.
