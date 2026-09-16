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

### `UG-T-11` — Build `template/guide.html` + `guide.css` — IN PROGRESS (`[~]`)

- **Attempt 1 (2026-09-15):** Implementer `akili-implementer` (sonnet), skill `frontend-design`, effort medium. Files: `tooling/template/guide.html` (199 L), `tooling/template/guide.css` (355 L). Implementer evidence: grep shows no literal colour/font in `guide.css`; dummy render in headless system Chrome — no leftover `{{...}}`, 7 TOC anchors resolve, 6 `<h2>` in order, intro contrast 17.33:1, cover "Built 2026-09-15", `page.pdf` Letter → 23 pages. Placeholder contract: `{{TOKENS_CSS}}`, `{{BUILD_DATE}}`, `{{INTRO}}`, `{{SECTIONS}}`, `{{GLOSSARY}}`; section ids `section-landing … section-innovation-packages`.
- **Leader check before review:** opened the Implementer's own dummy-render PDF — contract prose printed above the cover title, pages 2–3 full-bleed dark chrome, uppercase/italic body text. Root cause located in `guide.html`: nested `<!-- 01 -->`…`<!-- 06 -->` markers inside the header comment (L45–50) close it early. Evidence forwarded to the Reviewer.
- **Reviewer verdict (attempt 1): FAIL** — `akili-reviewer` (opus). Issues, verbatim in substance:
  1. **Discovered Issue:** header "placeholder contract" is not a single HTML comment — the first `-->` (L45) closes it; L46–69 parse as live content in `<head>`, forcing an implicit `<body>`: 5 empty stray `<section class="ug-section">` with the real section ids (duplicate ids → TOC anchors resolve to the empty strays), a second `<nav id="toc">` and `<section id="glossary">`, a stray unclosed `<h2>` (poisons `UG-T-13`), a live `<img src="..." alt="...">`, and a **live `{{GLOSSARY}}` placeholder at L64 outside any comment**. The Implementer's "7 anchors resolve" evidence passed *because* of the strays, on a corrupt DOM. **Violated Rule:** `requirements.md` `UG-R-1`, `UG-AC-1`; `design.md` `UG-DD-5`; `tasks.md` `UG-T-11` DoD 3. **Remediation:** delete the six inner `<!-- NN -->` markers (use `01:`…`06:` prose) — no `-->` anywhere between L8 and L69 (the `--pr-color-*` double hyphens are NOT a parser risk); preferably move the whole contract to `tooling/template/README.md` with a one-line pointer in the HTML. New evidence required from the re-run dummy render: (a) zero duplicate ids, (b) `document.body.firstElementChild` is `#cover`, (c) zero `<img>` in the un-assembled template, (d) exactly 3 `<h2>` in the un-assembled template, (e) the 7 TOC hrefs resolve *after* injecting dummy sections.
  2. **Discovered Issue:** `--ug-color-ink: #1a1a1f` and `--ug-color-ink-muted: #53535f` (guide.html L92–93) are invented hex for the body ink while the live token `--pr-color-secondary-400` ("neutral ink" in `colors.scss` L43) is already in `TokensJson`. **Violated Rule:** `requirements.md` `UG-R-4`; `design.md` `UG-DD-2`, §6.3. **Remediation:** `--ug-color-ink: var(--pr-color-secondary-400); --ug-color-ink-muted: color-mix(in srgb, var(--pr-color-secondary-400) 72%, white);` then re-measure contrast (estimate ≈13.9:1 / ≈5.6:1; DoD wants a measured number). Scope note: the other `--ug-*` neutrals (`page-bg`, `surface-alt`, `border`, `on-chrome`, `on-chrome-muted`, `shadow`) have no live counterpart and explicitly PASS — do not churn them.
  - Explicitly PASSED audit points (not to be re-litigated): no literal colour/font or `var()` fallback in `guide.css` (`color: transparent` on the title is a functional keyword); `color-mix()` fine in Chromium print; `@page` Letter present; `print-color-adjust: exact` on `html`; `<img alt>` carried as contract; TOC hrefs/ids wiring correct once strays are gone; a11y basics good; palette clears 4.5:1 throughout; Implementer assumptions (1)–(5) all accepted.
- **ADVISORY (attempt 1, non-gating, recorded):** RELIABILITY-1 `@page` margins are dead unless `UG-T-14` calls `page.pdf({ preferCSSPageSize: true })` or passes identical `margin` → *forward to `UG-T-14`*; RELIABILITY-2 `.ug-section { break-inside: avoid }` will overflow with real screenshots — drop it, keep `.ug-figure { break-inside: avoid }` → *forward to `UG-T-14` visual check*; RESILIENCE-1 malformed token → invalid `color-mix` → white-on-white cover; `assemble.ts` should assert colour-ish token shapes → *forward to `UG-T-12`*; RESILIENCE-2 Google Fonts fetched at render time; offline build silently falls back → *forward to `UG-T-14`* (`document.fonts.check()`); READABILITY-1 un-assembled template has 3 `<h2>` outside `#sections` → assembled total is 9; `UG-T-13` must count within `#sections` → *forward to `UG-T-13`*; RISK-1 `background-clip: text` title — add `-webkit-text-fill-color` + plain colour fallback (recorded).
- **Attempt 2:** dispatched with the two FAIL issues verbatim, effort bumped to high.

---

## 3b. Runtime note — HTTP 429 session limits (2026-09-15 ~21:00, reset 21:10 America/Bogota)

- `UG-T-3`+`UG-T-7` Implementer (`akili-implementer`, sonnet) killed mid-task. Tree probe afterwards: `tooling/routes.config.json` drafted (6 entries, count claims unverified), `tooling/src/_probefold.ts` (its below-the-fold probe) left behind, `capture.ts` absent, no `raw/`/`tokens.json`. No rework attempt consumed (runtime failure). Re-briefed with "the working tree wins".
- `UG-T-11` Reviewer (`akili-reviewer`, opus) killed **after** delivering its FAIL report via hand-back — the verdict stands.
- Limits reset at 21:10; both roles re-spawned on their default tier models.

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

## 4. Pending inputs

- **`TEST_TOKEN`** — received from the user 2026-09-15 and stored in gitignored `tooling/.env`. Resolved.

---

## 5. Summary (updated as tasks complete)

5 of 16 tasks complete (`UG-T-1`, `UG-T-2`, `UG-T-4`, `UG-T-8`, `UG-T-10`); `UG-T-5`/`UG-T-6` reviewed PASS on code, `[~]` until `UG-T-7`'s live run closes their visual/live DoD items. In flight: `UG-T-3`+`UG-T-7` (Implementer, re-spawned after 429), `UG-T-11` attempt 2 (Implementer). Next eligible: `UG-T-2` (Verify environment and seed data) and `UG-T-8` (Resolve sign-in URL reference) — `UG-T-8` is now effectively pre-resolved by the user's decision (no URL, generic phrasing) and only needs a one-line confirmation note when its turn comes. `UG-T-2` is blocked pending the `TEST_TOKEN` value.
