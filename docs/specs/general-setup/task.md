# Module Spec — `task.md` Template

> This file is a **methodology template**, not a feature spec. Every module spec produced by `/sdd-specify` MUST start from this template and live at `docs/specs/<module>/task.md` (or `docs/specs/<module>/<feature>/task.md`).
>
> The `task.md` answers **WHO does WHAT, in WHAT ORDER, and how do we know it's done**.

---

## How to use this template

1. Copy this file to `docs/specs/<module>/task.md`. Replace placeholders.
2. Tasks MUST be small (target: under one working day each, never more than two).
3. Every task MUST cite the requirement(s) it satisfies (`<MOD>-R-n`) and/or the acceptance criterion (`<MOD>-AC-n`).
4. Every task MUST have a definition of done. "Code merged" is not enough.
5. Number tasks `<MOD>-T-<n>` (e.g., `RES-T-1`). Sub-tasks: `<MOD>-T-<n>.<m>`.
6. `/sdd-execute` consumes this file; keep the format strict.

---

## 1. Scope of this task list

- **Module / feature:** `<...>`
- **Linked spec:** `docs/specs/<module>/requirements.md` + `docs/specs/<module>/design.md`.
- **Sprint / target phase (if any):** `<...>`
- **Owner / driver:** `<role / person>`
- **Status:** `not-started | in-progress | blocked | done`

---

## 2. Pre-flight checklist

Block execution until every box is ticked.

- [ ] `requirements.md` is approved (status `approved`).
- [ ] `design.md` is approved.
- [ ] Open questions in `requirements.md` and `design.md` are all resolved.
- [ ] CLARISA dependencies (cache tables, endpoints) confirmed.
- [ ] No conflicting in-flight spec touching the same entities (search `docs/specs/`).
- [ ] Migration name and reversibility confirmed (`npm run migration:check` passes locally on a clean branch).

---

## 3. Task list

Use the exact field set below per task so `/sdd-execute` can parse it.

### `<MOD>-T-1` — Short imperative title

- **Type:** `db | server | client | infra | tests | docs | rollout`
- **Description:** What is delivered. One paragraph.
- **Implements:** `<MOD>-R-1`, `<MOD>-R-2.1`, `<MOD>-AC-1`
- **Files (expected):** `onecgiar-pr-server/src/api/<...>`, `onecgiar-pr-client/src/app/pages/<...>`
- **Depends on:** `—` or `<MOD>-T-0`
- **Blocks:** `<MOD>-T-2`
- **Estimate:** `S | M | L` (S ≤ 0.5d, M ≤ 1d, L ≤ 2d — split anything larger)
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`<emoji> <type>(<scope>) [ticket]: <description>` per root `CLAUDE.md`).
  - [ ] Lint + format clean.
  - [ ] Unit tests added/updated; coverage thresholds met (server 5/20/35/40 minimum, client 50/60/60/60 minimum — aim higher).
  - [ ] Migration up/down verified locally and `migration:check` is green.
  - [ ] No secret or token leaked in logs or messages (`.cursorrules`).
  - [ ] If API surface changed: Swagger / DTOs updated.
  - [ ] If UX changed: i18n keys added under `src/app/internationalization/`; PrimeNG/`reportingTheme` patterns respected.
  - [ ] If bilateral / platform-report changed: change log entry in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.

### `<MOD>-T-2` — …

Repeat the block.

---

## 4. Dependency graph

A simple textual DAG so the order is unambiguous (and `/sdd-execute` can parallelize).

```
<MOD>-T-1
   └── <MOD>-T-2 (DB schema must land first)
         ├── <MOD>-T-3 (server service)
         │     └── <MOD>-T-4 (controller + DTOs)
         │           └── <MOD>-T-7 (client integration)
         └── <MOD>-T-5 (repository tests)
               └── <MOD>-T-6 (workflow tests)
                     └── <MOD>-T-8 (bilateral payload test)
```

Parallel-friendly branches MUST be called out explicitly. Tasks SHOULD be small enough that branches stay short.

---

## 5. Test plan

Tests are not optional. Each acceptance criterion needs at least one test reference.

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `<MOD>-TEST-1` | unit (server) | `<MOD>-R-1`, `<MOD>-AC-1` | `onecgiar-pr-server/src/api/<...>/<file>.spec.ts` |
| `<MOD>-TEST-2` | integration (server) | `<MOD>-R-2`, `<MOD>-AC-2` | `onecgiar-pr-server/test/<file>.e2e-spec.ts` |
| `<MOD>-TEST-3` | unit (client) | `<MOD>-R-3` | `onecgiar-pr-client/src/app/pages/<...>/<file>.spec.ts` |
| `<MOD>-TEST-4` | cypress (client) | `<MOD>-AC-3` | `onecgiar-pr-client/cypress/<...>` |
| `<MOD>-TEST-5` | payload fixture (bilateral) | `<MOD>-AC-4` | `onecgiar-pr-server/src/api/bilateral/<...>.spec.ts` |

Server coverage MUST stay above the thresholds in `package.json` (branches 5%, functions 20%, lines 35%, statements 40%) — and SHOULD trend upward. Client coverage MUST stay above 50/60/60/60.

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention (`<emoji> <type>(<scope>) [ticket]: <description>`).
- [ ] CI green (lint, tests, build, `migration:check:ci`, SonarCloud).
- [ ] Manual QA on staging / test env per the `requirements.md` happy paths.
- [ ] If bilateral / platform-report changed: notify downstream consumers, point to the change log entry.
- [ ] If admin / role / phase change: update operational runbook (out of repo if necessary) and let admins know.
- [ ] Telemetry verified post-deploy (logs flowing, no error spike, throttler exclusions still intact for bilateral).

---

## 7. Cleanup & follow-ups

After the feature is live:

- [ ] Move spec status to `shipped`.
- [ ] Promote any new cross-cutting decision into `docs/system-design/design.md` (§12) or `docs/detailed-design/detailed-design.md` (§11).
- [ ] File follow-up tasks for any deferred work captured in the `design.md` "Open Gaps & Follow-ups".
- [ ] Update `docs/prd.md` Open Questions (`OQ-#`) if the spec resolved any.

---

## 8. Roll-back plan

State the **exact** steps to undo this change if production needs it.

1. Revert PR `#<number>` (or list of PRs in order).
2. Run `npm run migration:revert` to undo schema changes (or describe a forward fix).
3. Disable any feature flag / global parameter introduced.
4. Verify bilateral / platform-report payload returns to the prior shape (compare against pre-change fixtures).
5. Notify downstream consumers.

---

## Required cross-references

Every approved `task.md` MUST link to:

- `docs/specs/<module>/requirements.md` and `design.md` in the same folder.
- `docs/prd.md`, `docs/system-design/design.md`, `docs/detailed-design/detailed-design.md`.
- Any authoritative module doc whose contract is touched (e.g., `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`).
