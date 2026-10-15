@AGENTS.md

# CLAUDE.md — Claude Code shim (root)

> **Why this file is only an import.** `AGENTS.md` is the project's single canonical agent guide (constitutional baseline, branch pins, `## Model Routing`, `## Skill Map`, Module Guides, domain context). When `CLAUDE.md` exists, Claude Code reads **only** `CLAUDE.md` — it never consults `AGENTS.md` on its own — so the `@AGENTS.md` line above is what actually loads the guide. A prose sentence such as "see AGENTS.md" carries no import and would silently drop the whole policy. **Never "simplify" the first line into prose, never replace it with a symlink, and never copy AGENTS.md sections in here.** Converted 2026-10-14 by `/akili-constitution` (Safe Update); the content below is only what `AGENTS.md` does not already carry.

## Domain-specific reference docs

| Document | What it covers |
|---|---|
| `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | **Authoritative payload contract** for `/api/bilateral/*`. Every bilateral payload change MUST update its change log |
| `onecgiar-pr-client/CLAUDE.md` | Frontend ops: custom `auth` header (NOT `Authorization: Bearer`), API base URLs, `HTTP_METHOD_descriptiveName` naming, commit format |
| `onecgiar-pr-client/docs/development-context/notifications-module-unification.md` | Notifications module migration context |
| `.cursorrules` | **Security rule** — never log/echo/print tokens, webhook URLs, API keys, passwords or sensitive env vars, anywhere |

## Test gates

Server Jest (branches 5% / functions 20% / lines 35% / statements 40%) · client Jest + Cypress (50/60/60/60) · `npm run migration:check:ci` blocks pending migrations · SonarCloud. Agent-lean commands live in `AGENTS.md` → *AKILI-SPECS constitutional baseline*.

## When in doubt

Product → `docs/prd.md` · UI → `docs/ux-ui/design.md` · Code/architecture → `docs/trd/trd.md` · Bilateral payloads → `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` · Frontend API/auth header → `onecgiar-pr-client/CLAUDE.md` · About to log a secret → stop, re-read `.cursorrules`.
