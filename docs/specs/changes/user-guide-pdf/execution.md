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
- **Observation for `UG-OQ-1`/`UG-T-16`:** the supplied session is an **admin** user — the sidebar shows `Quality Assurance`, `My Admin`, `Admin module`, which a plain P/A end user does not see. Screenshots will include those menu items unless a non-admin token is supplied or the sections are cropped/annotated around them. Flagged to the user; not blocking capture.
- **Requirements covered:** `UG-R-2` (precondition), resolves `UG-OQ-2` in practice.
- **Decisions made:** system-Chrome channel workaround (above). Pre-flight checklist boxes for requirements/design approval ticked per the user's approved-as-written confirmation already recorded in Document Control.
- **Issues encountered:** Chromium CDN download failure (see above). CLARISA glossary URL 404 still open for `UG-T-10`.
- **Final verification result:** PASS — both DoD items satisfied (6 routes render representative content; valid `TEST_TOKEN` available locally, never committed).

---

## 3a. Reconciliation note — unrecorded work landed in commit `b885c5f18` (2026-09-15)

`git log` shows commit `b885c5f18` ("add auth and annotation utilities for Playwright testing") landed `tooling/src/auth.ts` (`UG-T-4`), `tooling/src/tokens.ts` (`UG-T-5`) and `tooling/src/annotate.ts` (`UG-T-6`) **without** an execution entry, without a Reviewer verdict, without the `[SPEC:changes/user-guide-pdf]` commit tag, and with two stray inclusions: `tooling/src/_scratch-verify.ts` (self-described throwaway) and 26 `"dev": true` normalisation lines in `onecgiar-pr-client/package-lock.json` (which the `UG-T-1` entry had explicitly excluded).

**Leader action:** (1) a Reviewer is spawned over the committed diff of the three utilities (diff saved to the session scratchpad, 574 lines) so `author ≠ auditor` is restored before those tasks can be marked `[x]`; (2) the scratch file is deleted and the client lockfile restored to its pre-commit content in a housekeeping commit; (3) live DoD items for `UG-T-5`/`UG-T-6` that need a running capture are carried into `UG-T-7`'s run.

---

## 3. Design Decisions Recorded Mid-Execution

### Capture target changed: local dev → production (`UG-DD-6`, added to `design.md` 2026-09-15)

Before starting `UG-T-2`, pre-flight environment verification found:

- Local backend (`localhost:3000`) fails to start against its dev database: `TypeOrmModule` error `connect ETIMEDOUT` reaching the configured MySQL host. Local client (`:4200`) itself was reachable, but 5 of 6 target routes need backend data to render non-empty content.
- The user confirmed (2026-09-15) that production (`https://reporting.cgiar.org`) already has the shipped changes and representative data, with an authenticated Chrome session already open there, and explicitly directed the capture script at that origin instead of local.
- The user also resolved `UG-OQ-4` explicitly: the guide's body text must not reference **any** environment/URL — generic phrasing only ("sign in to the Reporting Tool").

**Action taken:** `design.md` (`UG-DD-6`), `requirements.md` (`UG-R-2`, Dependencies, `UG-OQ-4`), and `tasks.md` (`UG-T-2`, `UG-T-10` note, pre-flight checklist) were updated in place to record this — these are the spec's own deliverable files, not shared constitutional docs, so this is within normal spec-branch write discipline (not a shared-file violation). No Pivot Protocol invocation was needed: this is a target-environment substitution within the already-approved architecture (read-only browser automation via a configurable `CLIENT_BASE_URL`, per `UG-R-10`), not a reversal of delivered behavior or an unviable-design finding.

**Safety basis for targeting production:** `UG-DD-4`'s constraints (real login only, no bypass/fabricated JWT) and `design.md` §7's read-only guarantee (no create/submit/delete interaction) apply unchanged. `docs/infrastructure.md`'s "cloud is governed and never deployed by agents" rule is not implicated — nothing is deployed; the script performs a single-pass, 6-route read-only navigation, equivalent in kind to what it would have done against localhost.

**Separately noted (not yet resolved, tracked for `UG-T-10`):** a direct fetch of `https://clarisa.cgiar.org/landing-page/glossary` (both `curl` and an isolated fetch tool) returned HTTP 404 during pre-flight. Flagged in `tasks.md`'s `UG-T-10` for the Implementer to re-investigate (likely a moved path or a client-rendered route requiring a real browser) before curating the glossary.

---

## 4. Pending inputs

- **`TEST_TOKEN`** — received from the user 2026-09-15 and stored in gitignored `tooling/.env`. Resolved.

---

## 5. Summary (updated as tasks complete)

2 of 16 tasks complete (`UG-T-1`, `UG-T-2`); `UG-T-4`/`UG-T-5`/`UG-T-6` code landed unreviewed in `b885c5f18` — Reviewer pending (see §3a). Next eligible: `UG-T-2` (Verify environment and seed data) and `UG-T-8` (Resolve sign-in URL reference) — `UG-T-8` is now effectively pre-resolved by the user's decision (no URL, generic phrasing) and only needs a one-line confirmation note when its turn comes. `UG-T-2` is blocked pending the `TEST_TOKEN` value.
