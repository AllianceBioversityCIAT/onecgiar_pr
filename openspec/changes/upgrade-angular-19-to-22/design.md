## Context

`onecgiar-pr-client` is Angular **19.2.14** with ~50 deps, PrimeNG 19 as the UI library (193 `.ts` importers, 120 templates), `@angular/cdk@19`, and `@ncstate/sat-popover@14.5.0`. The build uses the esbuild `@angular/build:application` builder; Cypress CT uses the webpack `@angular-devkit/build-angular` builder (dev dep). Tests: Jest (unit) + Cypress (e2e + CT).

The upgrade is a **hard prerequisite for Spartan UI** (needs Angular 21+). It is inherently **stepwise** — Angular blocks skipping majors — and inherently **lockstep** — a lone `@angular/core@20` bump fails `ERESOLVE` against `primeng@19`.

**Verified dependency ladder (npm peer data, 2026-07-10):**

| Dep | Ang 19 | Ang 20 | Ang 21 | Ang 22 |
|---|---|---|---|---|
| `@angular/*` | 19.2.x | 20.3.x | 21.2.x | 22.0.x |
| `primeng` + `@primeng/themes` | 19.1.x | 20.4.x | 21.1.x | (21 supports Ang ≤? — verify at step) |
| `@angular/cdk` | 19.2.x | 20.2.x | 21.x | 22.x |
| `@ncstate/sat-popover` | 14.5.x | 15.0.x (peer `~20`) | 16.0.x (peer `^21`) | verify |

Spartan `@spartan-ng/brain@1.1.0` peer = Angular `>=21 <23` + Tailwind `>=4`. So the **minimum viable target is Angular 21**; Angular 22 is the current `latest` and also within Spartan's range. Decision: go to **22** (latest, stays in Spartan's `<23` window) unless a dep blocks at 21 — then stop at 21 (still unblocks Spartan).

## Goals / Non-Goals

**Goals:**
- Reach Angular **21 or 22** with the app building and all three test suites green.
- Keep PrimeNG functional throughout (upgrade, don't remove).
- Zero product-behaviour change; only framework/tooling migration codemods.
- Land each major as an independently-verified, revertible step.

**Non-Goals:**
- Installing Tailwind or Spartan (next change).
- Removing PrimeNG or migrating any component off it (later changes).
- Refactoring app code beyond what `ng update` codemods and peer-API renames require.
- Touching the server.

## Decisions

- **Stepwise majors via `ng update`, one commit per major.** Run `ng update @angular/core@N @angular/cli@N` for each N in 20,21,22. `ng update` runs the framework migration schematics (control-flow, standalone, DI, effect timing) automatically. Rationale: schematics are the supported path; hand-editing is error-prone. Alternative (jump straight to 22) rejected — Angular refuses multi-major jumps and schematics must run per major.
- **Lockstep UI/tooling deps in the same `ng update` invocation / commit.** Add `@angular/cdk@N`, and bump `primeng@N`, `@primeng/themes@N`, `@ncstate/sat-popover@<matching>`, `@angular-eslint/*@N`, build tooling to the matching major **before** installing, so the peer tree resolves. Rationale: proven `ERESOLVE` otherwise. `ng update` can take `@angular/cdk` directly; PrimeNG/sat-popover are bumped explicitly (they publish their own majors).
- **Verification gate between every major** — build:dev + Jest + Cypress CT must all pass before starting the next major. A broken major is fixed or reverted before proceeding; never stack two unverified majors.
- **PrimeNG API drift handled per major, minimally.** PrimeNG 20/21 renamed some inputs/removed some modules. Fix only what the compiler/tests flag; do not opportunistically refactor. Capture each fix in the QA doc.
- **Node engine bump if required.** Angular 20+ raises min Node. If the local/CI Node is too old, flag it (do not silently change CI). Local dev Node is checked first; Docker/CI Node bump is called out as a task needing the user's infra sign-off.
- **Isolated worktree.** All work in `.claude/worktrees/angular-upgrade-19-22` (branch off `staging`) with its own `node_modules`. Keeps the signals-refactor branch and the main checkout untouched.

## Risks / Trade-offs

- **PrimeNG major API breaks (v19→20→21)** → Mitigation: fix compiler/test-flagged usages only; PrimeNG publishes migration notes per major; CT + Jest catch regressions early.
- **`@ncstate/sat-popover` is a smaller community lib** → it does track Angular (14/15/16 per major), but verify each step resolves; if it stalls at some major, that becomes a blocker to surface (candidate for replacement with CDK Overlay). Flag, don't force.
- **esbuild vs webpack builder drift across majors** (CT uses the webpack builder) → run `test:ct` at every major, not just build.
- **Node/CI engine mismatch** → surface as an explicit task; do not edit CI without sign-off.
- **Large diff from codemods** → keep one commit per major so each is reviewable and revertible; the QA doc logs what each `ng update` changed.
- **Tests themselves may need updates** for renamed testing APIs → allowed, minimal, logged.

## Migration Plan

Per major N (20, then 21, then 22):
1. Ensure worktree `node_modules` installed and tree clean.
2. `ng update @angular/core@N @angular/cli@N @angular/cdk@N` (let schematics run).
3. Bump lockstep deps to major N: `primeng`, `@primeng/themes`, `@ncstate/sat-popover` (matching), `@angular-eslint/*`, build tooling; `npm install`.
4. Resolve compiler + peer errors (minimal PrimeNG/API fixes).
5. Gate: `npm run build:dev` → `npm run test` → `npm run test:ct` all green.
6. Smoke-test key screens on `npm start`.
7. Commit `chore(deps): upgrade Angular 19→N …`; log changes in the QA doc.
8. Repeat for N+1. Stop at 21 if a dep blocks 22 (21 already unblocks Spartan).

Rollback: each major is its own commit on an isolated branch — revert the commit (or discard the worktree) with zero impact on other branches.

## Open Questions

- **Final target 21 or 22?** Default 22 (latest, within Spartan `<23`); fall back to 21 if a lockstep dep (PrimeNG/sat-popover) has no 22-compatible release yet — verify at the 21→22 step.
- **CI/Docker Node bump** — needs the user's infra sign-off when Angular 20+ raises the floor; surfaced as a task, not auto-applied.
