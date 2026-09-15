# Proposal: Bilateral Manual Create — Report Drawer Reuse (W3)

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `bilateral/manual-create-drawer` |
| **Slug** | `manual-create-drawer` — derived from intent: reuse W1/W2 report drawer for W3 manual bilateral creation |
| **Type** | Change |
| **Approval Mode** | gated |
| **Parent Spec** | none |
| **Depends on** | none (parallel-safe with AI-assisted bilateral work) |
| **Parallel-safe** | yes — AI path continues on same page; manual drawer is an isolated branch (coordination required) |
| **Author** | AKILI propose (session) |
| **Date** | 2026-09-14 |

---

## Intent

After a Center user selects **Complete the Form Manually** on `/bilateral/:centerAcronym/create`, replace the current inline “Result level → Result type → Repository handle + Sync” block with the same **side drawer + repository browse** experience already used when reporting against an indicator in W1/W2 (`indicator-drawer` + `kp-cgspace-browse`).

The user keeps project and Science Program context on the page; identity and Knowledge Product selection move into a drawer that matches the Reporting tab UX (screenshots provided in the proposal session).

---

## Problem / Current Behavior

Today the bilateral create wizard (`bilateral-result-creator`) works like this:

1. **Reporting project** and **Primary contributing Science Program** — full-width page steps (correct; must stay).
2. **Reporting way** — two cards: AI-Assisted vs Complete the Form Manually (`bilateral-reporting-way-selector`).
3. **Manual path only** — continues on the same page with:
   - Outcome / Output level cards
   - Result type dropdown
   - For Knowledge Product (type 6): a single text input + **Sync** button calling `GET_mqapValidation` (no repository search, no multi-repo toggles)
   - **Next** → `BilateralCreationService.createResult()` → `POST api/bilateral/center/create-header` → navigate to the bilateral editor

In W1/W2 Reporting, the equivalent KP step lives inside **`indicator-drawer`** → **`lab-report-form`**, which offers **Browse repositories** (CGSpace / MELSpace / WorldFish via `kp-cgspace-browse`, including search, filters, and retry logic) and **Manual entry** (handle + sync). That UX is richer, already aligned with `docs/ux-ui/design.md` §8 PRMS Form UX Pattern (`changes/report-result-form-ux`), and is what stakeholders expect when “reporting a Knowledge Product.”

**Gap:** W3 manual creation duplicates a subset of the KP flow (handle-only) on a full page, without browse, while W1/W2 already solved the problem in a drawer. Users perceive inconsistency between “reporting” and “creating bilateral results.”

---

## Proposed Outcome

1. After selecting **Complete the Form Manually**, the user opens a **right-side drawer** via an explicit control (reporting-way cards stay visible; no auto-open).
2. The drawer hosts **Result identity** for the manual path:
   - Result level (Outcome / Output)
   - Result type
   - For **Knowledge Product**: **Browse repositories** / **Manual entry** tabs reusing `kp-cgspace-browse` and shared `kp-handle.validator` / MQAP sync — not a bespoke bilateral input.
   - For other output/outcome types: level + type only (no repository block).
3. Drawer includes **Result title** with word-count and duplicate validation (same API pattern as `report-result-form`); KP titles populate from repository sync.
4. Primary action in the drawer footer: **Create and continue** calls **`POST api/bilateral/center/create-header`** with additive optional **`title`** (response/summary shapes unchanged).
5. On success, behavior unchanged: navigate to `/bilateral/:center/result/:codeOrId` and load the existing section editor.
6. **AI-Assisted** and **Manual Entry** both ship; AI upload flow must not regress (shared file coordination).

---

## Scope

| In scope | Out of scope |
|---|---|
| Manual reporting way only, after project + primary SP are selected | Bulk import path |
| Drawer shell + context header + responsive layout | AI-Assisted feature work (coordination only — no regressions) |
| Title + duplicate validation; KP browse/manual parity with W1/W2 | Changing bilateral **response** payloads or summaries contract |
| Reuse `kp-cgspace-browse`, `kp-handle.validator`, MQAP sync patterns | Additive `title` on `create-header` request is in scope |
| Level + type selection inside the drawer for all manual types | Replacing the post-create bilateral editor (sections rail) |
| Client tests for the new drawer host + manual create path | Full Jest suite / Cypress E2E unless requested in `/akili-specify` |
| Accessibility: Escape to close, focus trap, sticky footer per UI rules | Secondary contributing SPs (“Coming soon”) |

---

## Non-Goals

- Unifying AI and manual flows into one drawer.
- Porting full `lab-report-form` W1/W2 fields (TOC contribution, contributing centers multiselect, bilateral project picker inside the form) — W3 already fixed project/SP on the page; the create-header body stays minimal.
- Moving project/SP selectors into the drawer.
- Backend search API for CGSpace (P2-3231 remains the server-side browse epic; client reuses existing search integration from `kp-cgspace-browse`).

---

## Affected Users, Systems, And Specs

| Actor | Impact |
|---|---|
| **Center bilateral submitter** | Manual create feels like W1/W2 reporting; faster KP discovery via browse |
| **Science Program reviewer** | No change — still receives same bilateral result shape after create |
| **AI bilateral workstream** | Must not regress; manual branch is isolated behind `selectedReportingWay === 'manual'` |

| Area | Files / modules (indicative) |
|---|---|
| Bilateral create wizard | `pages/bilateral/pages/bilateral-result-creator/` |
| New or adapted drawer | e.g. `pages/bilateral/components/bilateral-create-drawer/` (name TBD in design) |
| Shared KP UX | `kp-cgspace-browse/`, `shared/report-result/kp-handle.validator.ts` |
| Reference implementation | `indicator-drawer/`, `lab-report-form/` (patterns only — not direct import of W1/W2 TOC coupling) |
| Backend | `bilateral-center.controller.ts` `create-header` (unchanged) |
| UX baseline | `docs/ux-ui/design.md` §8; `docs/specs/changes/report-result-form-ux/` |
| Prior bilateral epic | `docs/specs/archive/2026-07-31-bilateral-ai-workflow/` (P2-3100 context) |

**Constraint (from `bilateral-result-creator/CLAUDE.md`):** Do not import W1/W2 **result-detail** or **result-creator** modules. Reuse **shared** KP primitives and **copy the drawer shell pattern** from `result-framework-reporting`, same as `lab-report-form` was copied from `aow-hlo-create-modal`.

---

## Visual Reference

- **Source:** User-provided session screenshots (no Figma link in this request)
- **Location:**
  - W3 current: `/bilateral/AfricaRice/create` — project/SP cards, manual path with inline level/type/handle (Images #1–2, #4–5)
  - W1/W2 target: Reporting tab → Report result drawer with Browse repositories (Image #3)
- **Notes:** Drawer should match `indicator-drawer` chrome (title, close, sticky footer, single vertical scroll). Browse tab should mirror live W1/W2 behavior (`kpBrowseEnabled = true` in `lab-report-form`). No new mockup generated in this propose step — `/akili-specify` may add `docs/specs/bilateral/manual-create-drawer/mockup/` if needed.

---

## Requirement Delta Preview

### ADDED Requirements

- When the user selects **Complete the Form Manually**, the manual identity step opens in a **side drawer** instead of expanding inline on the create page.
- The drawer exposes **Browse repositories** and **Manual entry** for Knowledge Product creation, reusing the same repository set (CGSpace, MELSpace, WorldFish) and search UX as W1/W2.
- Drawer footer shows aggregated missing-field feedback and a primary **Create and continue** action wired to `create-header`.

### MODIFIED Requirements

- The inline `#bcr-level-section` block (level, type, KP handle row) is **removed or demoted** — replaced by the drawer entry point (e.g. “Set up result” opens drawer, or drawer opens automatically after manual way selection).
- KP handle validation uses the **shared validator** and browse selection path, not a bilateral-only regex duplicate (`KP_HANDLE_REGEX` in `bilateral-result-creator` should converge on shared rules).

### REMOVED Requirements

- None at API level. Inline-only KP Sync UI on the create page is removed in favor of drawer UX.

---

## Approach Options

| Option | Summary | Pros | Cons |
|---|---|---|---|
| **A — Bilateral drawer + shared KP block (recommended)** | New `bilateral-create-drawer` copying `indicator-drawer` shell; embed shared `kp-cgspace-browse` + level/type cards; call existing `createResult()` | Smallest backend risk; clear module boundary; matches user ask | Some shell duplication unless later extracted |
| **B — Extend `lab-report-form` with `fundingSource='w3bilateral'`** | Host full `lab-report-form` in drawer on create page | Maximum UI reuse | Form is TOC/indicator-centric (contribution, centers, POST `results-framework-reporting/create`); wrong endpoint and field set for W3 create-header |
| **C — Inline browse only (no drawer)** | Add `kp-cgspace-browse` to current page | Fastest diff | Does not match W1/W2 drawer UX; user explicitly asked for lateral panel reuse |

### Recommended Approach

**Option A** — bilateral-specific drawer that **reuses KP components and UX rules**, not the entire W1/W2 form or API. Implementation sketch:

```text
create page (project, SP, way cards)
  └─ manual selected → open bilateral-create-drawer
       ├─ header: project + SP summary (read-only context)
       ├─ body: level + type + (KP) browse|manual
       └─ footer: missing fields + Create and continue
            → BilateralCreationService.createResult(level, type, handle?)
            → router → bilateral editor (unchanged)
```

Extract a shared **`kp-identity-panel`** (browse + manual tabs) in a follow-up only if A and W1/W2 diverge during implementation — avoid premature abstraction in v1.

---

## Risks, Dependencies, And Open Questions

| Risk / question | Mitigation / note |
|---|---|
| **OQ-1:** Jira ticket / BA acceptance criteria? | **Resolved:** none at specify time |
| **OQ-2:** Auto-open drawer vs explicit control? | **Resolved:** no auto-open; explicit CTA after manual card selection |
| **OQ-3:** Non-KP types — same drawer or stay inline? | Recommend same drawer for consistency; only KP gets browse tabs |
| **OQ-4:** AI colleague overlap on `bilateral-result-creator.html` | Coordinate merges; manual path is a separate `@if` branch |
| Drawer + page scroll lock | Follow `indicator-drawer` / `document.body` overflow pattern; ref-count if both could open (unlikely) |
| `kp-cgspace-browse` search reliability | Recent retry work applies automatically if component is reused — include cancel/stale-query tests in bilateral drawer spec |
| Module boundary | Do not import `pages/results/*`; shared KP + reporting utilities only |

**Kaizen:** When reusing `kp-cgspace-browse`, require tests for stale query cancellation (lesson from `changes/kp-cgspace-search-retry` kaizen) in the new drawer host spec.

---

## Success Criteria

1. From `/bilateral/:center/create`, manual path opens a drawer that visually matches the W1/W2 “Report result” drawer pattern (user screenshots #3).
2. Knowledge Product manual create supports **Browse repositories** and **Manual entry** with the same three repositories as W1/W2.
3. Successful create still lands on the existing bilateral editor with the same navigation and alerts (lead center warning, missing result code, etc.).
4. AI-Assisted path unchanged.
5. Scoped unit tests pass for touched modules (`bilateral-result-creator`, new drawer component, KP integration points).

---

## Next Step

After approval:

```text
/akili-specify bilateral/manual-create-drawer
```

Use standard depth for a client UX feature spanning 2–3 components; cite `docs/ux-ui/design.md` §8 (RFUX patterns) and P2-3100 family context where relevant.
