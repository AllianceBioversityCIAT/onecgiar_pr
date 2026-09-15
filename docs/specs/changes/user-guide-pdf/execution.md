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

- **`TEST_TOKEN`** for `https://reporting.cgiar.org` — requested from the user (2026-09-15), not yet received. Blocks `UG-T-2` (env/seed-data verification) and `UG-T-4` (`auth.ts`) from starting.

---

## 5. Summary (updated as tasks complete)

1 of 16 tasks complete (`UG-T-1`). Next eligible: `UG-T-2` (Verify environment and seed data) and `UG-T-8` (Resolve sign-in URL reference) — `UG-T-8` is now effectively pre-resolved by the user's decision (no URL, generic phrasing) and only needs a one-line confirmation note when its turn comes. `UG-T-2` is blocked pending the `TEST_TOKEN` value.
