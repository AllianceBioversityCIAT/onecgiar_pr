# Design — End-User PDF Guide for the Reporting Tool

## 1. Summary

This design adds a **standalone, dev-only documentation pipeline** — not an application feature — that produces one branded PDF: Playwright logs into the running client, navigates the 6 target routes, captures annotated screenshots, and an HTML/CSS assembler (also rendered to PDF via Playwright) combines them with authored narrative and a curated glossary. The biggest constraint the design accepts: **zero changes to `onecgiar-pr-client`/`onecgiar-pr-server` source** — the tooling lives entirely inside this spec folder so it can't regress coverage thresholds, bundle size, or CI, and so `/akili-archive` never needs to sync it into a package guide.

Requirements: `docs/specs/changes/user-guide-pdf/requirements.md` (`UG-R-1..12`, `UG-AC-1..6`). Project baseline: `docs/prd.md`, `docs/ux-ui/design.md` §2/§7, `docs/trd/trd.md` §2/§6, `onecgiar-pr-client/CLAUDE.md`.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **New, isolated location:** `docs/specs/changes/user-guide-pdf/tooling/` — a self-contained Node/TypeScript package with its own `package.json` (Playwright as the only meaningful devDependency). Not wired into `onecgiar-pr-client`'s or `onecgiar-pr-server`'s `package.json`, build, lint, or coverage config.
- **Server modules touched:** none.
- **Client modules touched:** none (read-only navigation only — no `src/` edits).
- **External integrations touched:** the running client at `CLIENT_BASE_URL` as a read-only target (see `UG-DD-6` — capture target changed from local dev to production, `https://reporting.cgiar.org`, per explicit user decision), and `https://clarisa.cgiar.org/landing-page/glossary` as a one-time content source during authoring (not fetched at PDF-build time; this URL returned HTTP 404 on a direct fetch during execution — see `UG-T-10` note).

### Extended Directory Structure

```
docs/specs/changes/user-guide-pdf/
├── proposal.md
├── requirements.md
├── design.md
├── tasks.md                      # (Phase 3)
├── tooling/
│   ├── package.json              # devDependency: playwright (or @playwright/test)
│   ├── .env.example               # CLIENT_BASE_URL, TEST_USER_EMAIL/PASSWORD (or TEST_TOKEN)
│   ├── routes.config.json         # 6 routes: url, target selector, click-target selector, caption
│   ├── src/
│   │   ├── auth.ts                # localStorage token+user injection (see UG-DD-4)
│   │   ├── tokens.ts               # reads live --pr-color-*/--font-* custom properties (UG-DD-2)
│   │   ├── capture.ts              # navigates + asserts loaded + screenshots each route
│   │   ├── annotate.ts             # injects a DOM highlight overlay before each screenshot
│   │   ├── assemble.ts             # renders cover+intro+TOC+6 sections+glossary to one HTML doc
│   │   ├── pdf.ts                  # Playwright page.pdf() → dist/reporting-tool-user-guide.pdf
│   │   └── verify-structure.ts     # asserts the 6 section headings exist, in order (UG-AC-1 gate)
│   ├── content/
│   │   ├── intro.md
│   │   ├── sections/
│   │   │   ├── 01-landing.md … 06-innovation-packages.md
│   │   └── glossary.json           # [{ term, definition, sourceUrl, accessedOn }]
│   └── template/
│       ├── guide.html              # skeleton the assembler injects content into
│       └── guide.css               # layout rules; color/font values come from tokens.ts at build time
└── dist/
    └── reporting-tool-user-guide.pdf   # the committed deliverable
```

> **Amendment 2026-09-15 (execution, `UG-T-12`–`UG-T-14`):** `dist/` lives at `tooling/dist/` (inside the tooling package), not as a sibling of `tooling/`. Reason: `tooling/.gitignore`'s `dist/*.html` rule (from `UG-T-1`) only matches that location, and it keeps the pipeline self-contained. The committed deliverable is therefore `docs/specs/changes/user-guide-pdf/tooling/dist/reporting-tool-user-guide.pdf`.

### 2.2 Pipeline (sequence)

```
[capture.ts]
  └── launch Chromium (Playwright)
        ├── auth.ts: open CLIENT_BASE_URL, then page.evaluate() to set
        │     localStorage['token'] AND localStorage['user']   ← both required, see UG-DD-4
        ├── tokens.ts: getComputedStyle(document.documentElement) for
        │     --pr-color-primary-300/400, --pr-color-secondary-400,
        │     --pr-color-orange-500, --font-* → tokens.json
        └── for each of the 6 routes (routes.config.json):
              ├── page.goto(route.url)
              ├── wait for route.readySelector (fails loudly if absent/timeout — UG-R-2)
              ├── annotate.ts: page.evaluate() injects a fixed, high-z-index
              │     <div> highlight ring/arrow at route.clickTarget's boundingBox()
              ├── page.screenshot({ fullPage: true }) → raw/<route-id>.png
              └── page.evaluate() removes the injected overlay

[assemble.ts]
  └── reads tokens.json + content/*.md + content/glossary.json + raw/*.png
        └── renders template/guide.html → dist/guide-assembled.html

[verify-structure.ts]
  └── parses dist/guide-assembled.html, asserts the 6 section <h2> headings
        exist and are in the specified order → exits non-zero if not (UG-AC-1 gate)

[pdf.ts]
  └── Chromium loads dist/guide-assembled.html, page.pdf({ format: 'Letter', ... })
        → dist/reporting-tool-user-guide.pdf
```

---

## 3. Data Model Changes

**N/A.** No entities, tables, or migrations. This spec touches no persistence layer.

---

## 4. API Surface

**N/A.** No new or changed endpoints. The capture script is an HTTP/browser *client* of the existing app, not a new API.

---

## 5. Server Workflow / Business Rules

**N/A.** No server-side business rules are added or changed (`onecgiar-pr-server/` is untouched).

---

## 6. Frontend Plan

*(Repurposed for this spec: there is no application-frontend change; this section covers the guide-tooling's own "component" breakdown, and how it consumes the real client's design tokens.)*

### 6.1 Routes / modules touched

- Application routes touched: **read-only navigation only** to the 6 routes named in `requirements.md` §4. No route, guard, or component in `onecgiar-pr-client/src/app/` is modified.
- `routes.config.json` is the single source of truth mapping each of the 6 URLs to: a `readySelector` (proves the real view rendered, not a login/empty/error state), a `clickTarget` selector (the element the annotation points at), and a `captionKey` (which content file's callout text to render under that figure).

### 6.2 Components & services (tooling-internal)

| Piece | Responsibility |
|---|---|
| `auth.ts` | Logs Playwright's browser context in by writing `token` **and** `user` to `localStorage`, exactly as documented in `onecgiar-pr-client/CLAUDE.md` §9 ("Verifying in a REAL browser" — two-key trap). Reusing the project's own documented pattern instead of inventing a new login flow (see `UG-DD-4`). |
| `tokens.ts` | Reads the **live** CSS custom properties (`--pr-color-primary-300/400`, `--pr-color-secondary-400`, `--pr-color-orange-500`, the Manrope/JetBrains Mono `font-family` stacks) from the running app via `getComputedStyle`, and writes them to `tokens.json` for the template — see `UG-DD-2`. |
| `capture.ts` | Orchestrates navigation, ready-state assertion, and full-page screenshots. |
| `annotate.ts` | Injects/removes a DOM overlay (not an external image-processing step) to mark the click target before each screenshot — see `UG-DD-3`. |
| `assemble.ts` | Pure template rendering: content + tokens + images → one HTML document. |
| `verify-structure.ts` | Automated structural gate for `UG-AC-1` (§10 below). |

### 6.3 Design system usage

- **Colors:** consumed live via `tokens.ts` (§6.2) — never hand-copied hex values in `guide.css`, so a future token change in `colors.scss` propagates automatically the next time the pipeline runs. This directly satisfies `UG-R-4`.
- **Typography:** Manrope for headings/body (loaded from Google Fonts in the guide's own `<head>`, matching the client's actual current face per `onecgiar-pr-client/CLAUDE.md` §5 — **not** Poppins, correcting the stale `docs/ux-ui/design.md` §7 reference per `UG-OQ-5`); JetBrains Mono for any figure/code-like text (e.g., route URLs quoted in the guide).
- **Annotation marker color:** the existing semantic **orange token** (`--pr-color-orange-500`, `#f97316` — "highlight / phase rollover accents" per `docs/ux-ui/design.md` §7) is reused for the click-target ring/arrow, precisely because it is *not* the brand violet used throughout the app's own UI — satisfying the requirement scenario's "must NOT blend into brand violet" clause without inventing a new color.
- **Responsive/a11y:** N/A in the web-app sense (static PDF, not a served page); accessibility is addressed via `UG-R-12` (alt-text/captions per figure) and 4.5:1 minimum text contrast (dark ink on white section backgrounds; white text only on the navy-carbon cover/section-header bands).
- **i18n:** N/A — U.S. English only, not routed through `src/app/internationalization/` since it is not in-app UI (`UG-R-1`, Non-Goals).

### 6.4 Real-time / notification UX

**N/A.** The capture script does not consume sockets/Pusher; it reads whatever the Notifications page renders on load.

---

## 7. Security & Authorization

- **Auth:** the capture script authenticates through the *real* login state shape (`token` + `user` in `localStorage`, per `onecgiar-pr-client/CLAUDE.md` §9) — it does not call any bypass/test-only endpoint and does not fabricate a JWT; the token must come from a real login (env var, never hardcoded).
- **Credential handling:** `CLIENT_BASE_URL`, and either `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` (real login form flow) or a pre-obtained `TEST_TOKEN`, are read from a local `.env` (gitignored) via `.env.example` as the committed template. **Never** logged, printed, or embedded in the guide/output (`.cursorrules`, `UG-AC-6`).
- **Read-only guarantee:** the script only performs `page.goto()` and read-oriented DOM queries; it must not click any create/submit/delete control. Enforced by code review (no POST/PATCH/DELETE-triggering interactions in `capture.ts`/`annotate.ts`) rather than a runtime guard, since Playwright has no built-in "read-only" mode.
- **Throttling/Helmet/CORS:** unaffected — this is a browser client, not a new server surface.

---

## 8. Performance & Capacity

- **Expected runtime:** full 6-route capture + annotate + assemble + PDF render should complete in well under 5 minutes on a typical dev machine (`UG-R` non-functional target in `requirements.md` §8) — dominated by client page-load time, not the tooling itself.
- **Production capacity impact:** minimal and explicitly accepted — see `UG-DD-6`. The script performs at most 6 read-only page loads (one per route) in a single manual run; it is not a load-generating or repeated-polling tool, and `UG-R-10`'s configurable base URL is what makes pointing at `https://reporting.cgiar.org` possible without hardcoding it.

---

## 9. Observability

- `capture.ts` logs one line per route (`[capture] <route-id>: navigating… / ready / screenshot saved`) and exits non-zero with the specific route + selector that failed, satisfying the "fail loudly" clause in `UG-R-2`'s scenario.
- No production logging, DynamoDB, or CloudWatch touchpoints — this is local, ephemeral tooling output (console only).

---

## 10. Testing Plan (forward-looking)

Mapped to the defect-class → gate table in `requirements.md` §8:

| Check | Type | Catches | Where |
|---|---|---|---|
| `verify-structure.ts` | Automated script | Missing/misordered sections (`UG-AC-1`) | `tooling/src/verify-structure.ts`, run after `assemble.ts` |
| Ready-selector assertion in `capture.ts` | Automated (built into the capture step) | Wrong/stale/empty UI state captured (`UG-AC-2`) | `tooling/src/capture.ts` |
| Credential grep | Automated (`grep`/simple regex over `tooling/` and script stdout) | Leaked test credentials (`UG-AC-6`) | Run as part of task DoD, mirrors `.cursorrules` practice |
| Human review: click-target accuracy | Manual (no automated substitute — see `requirements.md` §8) | Marker pointing at the wrong element, or obscuring its label (`UG-AC-3`) | `/akili-validate` HITL checkpoint; optionally a **T6 Multimodal** pass per the model-routing registry |
| Human review: glossary fidelity | Manual (no automated substitute) | Definition drift from CLARISA, out-of-scope terms (`UG-AC-5`) | `/akili-validate` HITL checkpoint, cross-checked live against https://clarisa.cgiar.org/landing-page/glossary |

No server/client Jest or Cypress coverage thresholds apply — this spec adds no code under `onecgiar-pr-server/` or `onecgiar-pr-client/`.

---

## 11. Backwards Compatibility & Migration Plan

**N/A** — no database, API, or contract change. "Migration" for this spec means *re-running the pipeline* after a UI redesign: update `routes.config.json` selectors and re-run `capture.ts` → `assemble.ts` → `pdf.ts`; no data backfill, no feature flag, nothing to communicate to downstream consumers (there are none).

---

## 12. Design Decisions (ADRs)

### `UG-DD-1` — Isolate the tooling in the spec folder, not in either app package

- **Context:** Playwright is not currently a dependency anywhere in the repo; the guide is a one-off deliverable, not a recurring product feature.
- **Decision:** New standalone package at `docs/specs/changes/user-guide-pdf/tooling/` with its own `package.json`.
- **Alternatives considered:** (a) add Playwright as a devDependency of `onecgiar-pr-client` — rejected: bloats the client's install/build surface and blurs the "no application code change" boundary this spec commits to. (b) a root-level `/tools/` folder — rejected for v1: premature generalization before a second use case exists.
- **Consequences:** the tooling is fully disposable and easy to `/akili-archive` without touching either package's `CLAUDE.md`; if a future spec wants a general "docs screenshot pipeline," it can promote this folder to `/tools/` then.

### `UG-DD-2` — Read design tokens live from the running app, never hand-copy hex values

- **Context:** `UG-R-4` requires the guide to match the *real current* tokens, and `docs/ux-ui/design.md` §7 is already known to be stale on typography (`UG-OQ-5`).
- **Decision:** `tokens.ts` reads `getComputedStyle(document.documentElement)` on the live page for every CSS custom property the template needs, at capture time, and writes `tokens.json` for the assembler to consume.
- **Alternatives considered:** hardcode the hex/font values found in `colors.scss`/`fonts.scss` into `guide.css` — rejected: guaranteed to drift the next time those files change, which is exactly the failure this spec's own investigation just uncovered against the baseline doc.
- **Consequences:** the guide self-updates its palette/type on every re-run; if a token is renamed, `tokens.ts` fails loudly (missing property) rather than silently falling back to a wrong default.

### `UG-DD-3` — Annotate with a DOM overlay before screenshot, not post-processing

- **Context:** the click-target marker needs pixel-accurate placement relative to real, responsive-rendered UI.
- **Decision:** `annotate.ts` injects a temporary `<div>` (highlight ring/arrow) at `document.body` with a very high `z-index`, positioned from `locator.boundingBox()`, immediately before `page.screenshot()`, then removes it.
- **Alternatives considered:** post-process the saved PNG with an image library (e.g., `sharp` + hand-computed coordinates) — rejected: requires a second coordinate system (image pixels vs. viewport), native binary dependency, and duplicated positioning logic already available for free via Playwright's own `boundingBox()`.
- **Consequences:** the overlay must be appended at `document.body` (not inside an app-internal stacking context) to avoid the "stacking context" trap called out during design research — a nested z-index would not guarantee top-most rendering.

> **Amendment 2026-09-15 (execution, `UG-T-7`):** the overlay is `position: absolute` with `boundingBox()` + `window.scrollX/Y` offsets, not `position: fixed` — a fixed ring rendered at the top of the full-page capture surface for below-the-fold targets. Still a direct `document.body` child with max `z-index`; the stacking-context reasoning above is unchanged. Recorded in `execution.md` (`UG-T-6` closure).

### `UG-DD-4` — Reuse the project's own documented auth-injection pattern for automation

- **Context:** all 6 target routes are behind login (`AC-3`); a real login-form flow is slower and more brittle (2FA/session redirects) than the pattern the client team has already documented for exactly this purpose.
- **Decision:** `auth.ts` sets `localStorage['token']` **and** `localStorage['user']` (rebuilt from the JWT payload: `{id, email, first_name, last_name}`), per `onecgiar-pr-client/CLAUDE.md` §9's documented trap ("Automating this app needs TWO localStorage keys, not one").
- **Alternatives considered:** drive the actual login form with Playwright — rejected as the default for v1 because it is slower per run and couples the script to Cognito/AD flow details; may be revisited if the token-injection path stops working.
- **Consequences:** `TEST_TOKEN` (and the user id it encodes) must be a real, valid JWT obtained by an actual login — the script does not fabricate one.

### `UG-DD-5` — Clickable in-PDF table of contents instead of literal page numbers

- **Context:** producing exact page numbers in a single-pass HTML→PDF render requires a two-pass build (measure, then re-render) that this spec's smallest-safe-path does not need for v1.
- **Decision:** TOC entries are `<a href="#section-id">` anchors; Chromium's print-to-PDF preserves these as clickable internal links.
- **Alternatives considered:** two-pass render to inject real page numbers — deferred as a follow-up (§13), not required by any `UG-R` requirement.
- **Consequences:** the PDF's TOC is navigable on-screen (most PDF readers) but does not show printed page numbers next to entries; acceptable since the guide is expected to be read digitally, not printed.

### `UG-DD-6` — Capture target changed from local dev to production (`https://reporting.cgiar.org`)

- **Context:** the local dev backend's database is unreachable from the execution machine (`ETIMEDOUT` connecting to the dev MySQL host), so `localhost:4200` cannot currently render non-empty data for 5 of the 6 target routes. Separately, the user confirmed during `/akili-execute` (2026-09-15) that the shipped changes and representative data already exist on production (`https://reporting.cgiar.org`), with an authenticated Chrome session already open there, and explicitly directed capture against that origin instead of local.
- **Decision:** `CLIENT_BASE_URL` (already a configurable env var per `UG-R-10`) is set to `https://reporting.cgiar.org` for this spec's actual capture run, superseding the "local dev only in v1" framing originally stated in `requirements.md` §8/§10 and this section's earlier text. All other constraints from `UG-DD-4`/§7 (Security & Authorization) hold unchanged and are the reason this is acceptable against a governed/production target: real login only (no bypass, no fabricated JWT), strictly read-only navigation (no create/submit/delete interaction), and no secret/token logged or committed.
- **Alternatives considered:** (a) wait for local DB/VPN access to be restored — rejected by the user as unnecessary since production already has the correct, shipped UI state; (b) fix local DB connectivity as a prerequisite — deferred indefinitely, not worth blocking the spec on an environment issue when a governed-but-read-only alternative was explicitly authorized.
- **Consequences:** `docs/infrastructure.md`'s local/cloud boundary rule ("cloud is governed and never deployed by agents") is not violated — this spec deploys nothing to production, it only performs read-only, single-pass browser navigation against it, exactly as it would have against localhost. `.env` (gitignored, never committed) holds the production `CLIENT_BASE_URL` and the real `TEST_TOKEN` sourced from the user's own authenticated session; neither value is hardcoded into any committed file. The guide's body text still does not reference this or any origin (`UG-OQ-4` resolved as "no environment reference at all," per the user).

**Step 2.3 reversion challenge:** none of the above decisions revert any already-delivered behavior — all are net-new, isolated additions. `UG-DD-6` changes an execution-time target value, not a delivered behavior. The challenge is not applicable to this design.

### `UG-DD-7` — Labelled feature callouts driven by `routes.config.json` (added 2026-09-16)

- **Context:** after the first HITL look the user judged the guide complete but asked for more orange markers per image, each labelled, over the main functionalities of every screen (example: a ring around a Program card with an arrow to a chip reading "Click to go SP"). `UG-R-3` allowed "at least one" marker; `UG-R-21` now requires 2–5 labelled callouts per screenshot.
- **Decision:** extend the per-route config with `annotations: [{ selector, label, role: "primary" | "feature", placement?: "left" | "right" | "above" | "below" }]`. `annotate.ts` draws, for every entry, the existing ring geometry plus a **label chip** (small rounded box, background `--pr-color-secondary-400`, white text, orange 2 px border) and a **connector** (short line with an arrowhead, orange) from the chip to the ring. Chips are placed on the requested side and auto-flipped when they would fall outside the captured frame; every injected node is a direct `document.body` child tagged `data-ug-annotation`, `pointer-events: none`, `aria-hidden`, so the existing residual-node gate covers them. `capture.ts` iterates `annotations` (the legacy `clickTarget` is kept as the `primary` entry's selector for backward compatibility) and applies the same `count() === 1` rule to every selector. Labels are content, so they live in `routes.config.json` next to the selector, never in code.
- **Alternatives considered:** post-processing PNGs with an image library (rejected, same reasons as `UG-DD-3`); hand-annotating in a design tool (rejected — `UG-R-7` re-runnability).
- **Consequences:** one more colour surface (chip text white) — white is an already-accepted neutral (overlay halo); the orange/secondary tokens still come from `tokens.json`. Captions and section copy may name the labelled features but are not required to change. Budget: ≈ +200 LOC in `annotate.ts`/`capture.ts`, ≈ +60 config lines, one review round.

### Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Expected tasks | ~10 (scaffold, routes config, auth, tokens, capture, annotate, assemble+template, pdf render, structure-verify script, content authoring) |
| Expected LOC | ~650–850 (mostly `tooling/src/*.ts` + `template/guide.css`; content markdown/JSON not counted as code) |
| Expected review rounds | ~2 (initial implementation review + one fix pass after the HITL click-target/glossary check) |

These numbers **match the declared Standard depth** — no risk indicators (migration, auth surface, API contract) push this toward Full, and the tooling is substantial enough that Lite would have under-scoped it. No depth change recommended. `/akili-execute` should treat a large overshoot of the LOC or task count above as a stop-and-escalate signal, not something to push through silently.

---

## 13. Open Gaps & Follow-ups

- **Two-pass page numbering** (see `UG-DD-5`) is a reasonable v2 enhancement if the guide is ever meant to be printed rather than read on-screen.
- **`UG-OQ-4`** (what real deployed origin the guide's body text should reference instead of `localhost`) is still open and blocks finalizing the guide's *copy* — it does not block building the pipeline itself; `tasks.md` should surface this as a required input before the content-authoring task closes.
- **`UG-OQ-1`/`UG-OQ-2`** (persona wording confirmation; who owns test credentials/seed data) remain working assumptions per `requirements.md` §11 — `tasks.md`'s pre-flight checklist should re-surface them.
- No CGIAR/OneCGIAR logo asset was available during this design pass; the cover page uses text-only branding. If an official logo file exists, a follow-up task can add it.
- `docs/ux-ui/design.md` §7's stale Poppins reference is not corrected here (shared-file write discipline) — recommend a small, separate doc-sync change.

---

## Required cross-references

- `docs/specs/changes/user-guide-pdf/requirements.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md` §2/§7, `docs/trd/trd.md` §2/§6.
- `onecgiar-pr-client/CLAUDE.md` §5 (tokens/typography), §9 (auth-injection automation pattern — directly reused by `UG-DD-4`).
