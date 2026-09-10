# Proposal — Smart Back on the Science Program shell must exit to a catalog, not a sibling SP

The Back button on Overview / Reporting / Results is supposed to return the user to the catalog they entered from (Science programs, Portfolio overview, or Results list). Today, hopping between Science Programs in the sidebar produces a generic **Back** that points at the previous SP and then ping-pongs.

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/smart-back-button` |
| Slug | `smart-back-button` — user argument; routed to `bugfix/` (Bug Track) |
| Type | Bug |
| Approval Mode | gated |
| Ticket | none (not provided) |
| Depends on | none |
| Parallel-safe | yes — client navigation only; no API, migration, or shared contract |
| Parent Spec | — |
| Baseline | `US-S1` (`docs/prd.md`); Results Framework Reporting IA (`docs/ux-ui/design.md` §2); `W1` (`docs/trd/trd.md`) |
| Related specs | Archived `changes/result-submitter-back-link` and `changes/result-indicator-back-link` (hierarchical return, not `history.back()`); `KZ-changes--kp-report-modal-auto-create-1` (name the live surface) |
| Live surface | `app-reporting-program-band` on `dashboard-lab` / `programme-results` (`/entity-details/:id/overview`). Shared resolver: `SmartNavigationService`. Also consumed by `bilateral-page-header`. |

## Intent

From any Science Program shell tab, one click on Back must leave the program and land on the last **catalog** the user came from. It must never bounce them to another Science Program they browsed in the sidebar.

## Problem / Current Behavior

On `…/entity-details/SP01/overview` the band shows a button labeled **Back** (not “Back to Science programs”). Clicking it follows in-session history, so a sidebar hop SP08 → SP01 sends the user back to SP08, and the next click returns to SP01.

Existing unit tests only cover the happy catalog entries (home, portfolio, results list) and same-program tab switches. They do not cover sidebar hops between programs.

## Proposed Outcome

On the Science Program shell (Overview, Reporting grouped, Results):

| Arrival | Back label | Destination |
|---|---|---|
| Science programs home / galaxy | Back to Science programs | `/result-framework-reporting/home` |
| Portfolio overview | Back to Portfolio overview | that URL |
| Results Center list | Back to Results list | that URL |
| Another SP via sidebar (or any `/entity-details/*` sibling) | same as the catalog above, or the home fallback | **not** the sibling SP |
| Direct land / refresh / empty history | Back to Science programs | `/result-framework-reporting/home` |

Drill-down Back (By-AOW → Overview / all Areas of Work) stays as it is today.

## Scope

- `SmartNavigationService.getBackTarget` section 4 (Science Program shell) and `back()`.
- Regression tests in `smart-navigation.service.spec.ts` (sibling-SP hop + no ping-pong after `back()`).
- Label on `reporting-program-band` must show the resolved catalog string (existing binding). Touch the band only if the label computed must read a reactive history signal.
- Keep `bilateral-page-header` section 2–3 behavior unchanged unless a shared helper change forces a spec update there.

## Non-Goals

- Redesigning the Back control (icon, placement, “Where to report”).
- Browser `history.back()` as the only return (rejected by the archived Submitter / indicator back-link specs; breaks refresh and deep links).
- Changing Result Detail **Submitter** / **Area of Work** / **Back to results** links.
- Galaxy hub-stack Back (`.cf-hubback`).
- i18n of the English labels if the band still hardcodes them.
- New design tokens or visual patterns.

## Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Result submitter / SP focal | Back exits the program instead of looping sibling SPs |
| `SmartNavigationService` | Resolver + history bookkeeping |
| `reporting-program-band` | Label / click already call the service |
| `bilateral-page-header` | Same singleton; must keep Center back labels |
| Sidebar `programLink` | Unchanged (`/entity-details/:code` → Reporting tab) |

## Visual Reference

- Source: User screenshot (no Figma)
- Location: `docs/specs/bugfix/smart-back-button/visual/`
- Notes: no new mockup needed — the control already exists; the bug is destination + label.

| File | Role |
|---|---|
| `sp01-overview-generic-back.jpg` | Today: SP01 Overview, button reads **Back**, URL `…/entity-details/SP01/overview` |

## Bug Diagnosis

### Observed Symptom

- The program-band Back control on Overview shows the generic label **Back**.
- It does not return to Science programs / Portfolio / Results list when the user reached the page by clicking another Science Program in the sidebar.
- A second click reverses the first hop (SP01 ⇄ previous SP).

### Reproduction Steps

Environment: QA Orca (`qa-development-2026.orca.localhost`), logged-in session.

1. Open Science programs home (`/result-framework-reporting/home`).
2. Click **SP08** in Other science programs.
3. Click **SP01** in the same sidebar.
4. Open the **Overview** tab (`…/entity-details/SP01/overview`).
5. Read the Back button.

| | Expected | Actual |
|---|---|---|
| Label | Back to Science programs | **Back** |
| Click | `/result-framework-reporting/home` | previous SP (`…/entity-details/SP08/…`) |
| Second click | stay on the catalog | return to SP01 (ping-pong) |

Direct land / refresh on Overview (history = current URL only) still shows the correct fallback label — that path is not this bug.

### Root Cause (confirmed)

One resolver rule, two symptoms. Not a styling miss.

`SmartNavigationService.getBackTarget` section 4 (`smart-navigation.service.ts` ~186–226) walks `history` newest-first and **skips only the same program** (`prev.includes('/entity-details/${code}')`). The first other URL wins. Known catalogs get a named label; everything else falls through to `{ url: prev, label: 'Back' }`.

The sidebar’s `programLink` is `/result-framework-reporting/entity-details/:code` (`reporting-nav-sidebar.component.ts` ~382–385). A hop SP08 → SP01 therefore records:

```text
[…, /entity-details/SP08/overview, /entity-details/SP01, /entity-details/SP01/overview]
```

On SP01, SP08 is “not the same program” and is not home / portfolio / results-list → generic **Back** to SP08.

`back()` then `navigateByUrl(target)` **without popping** the current URL. NavigationEnd appends the destination. The next Back inverts the pair (SP01 ⇄ SP08).

Existing specs never exercise this hop (`smart-navigation.service.spec.ts` covers home, portfolio, results-list, same-program tabs, By-AOW drilldown only).

**Related, not primary:** `reporting-program-band.backLabel` is a `computed()` that reads a plain `history[]`, so it does not update unless `programCode` / `backLabelOverride` change. On a sidebar hop `programCode` *does* change, so the stale computed is not what painted **Back** in the screenshot — the resolver did.

### Impact & Scope

- Every Science Program shell tab that uses the band (Overview, Reporting, Results).
- Any unmatched previous URL also gets generic **Back** (module-level `/overview`, `/planned-toc`, `/emerging`, QA, Type-One, Whats New). Sibling SP is the common case because the sidebar is always visible.
- Bilateral header shares the singleton. Section 2–3 (create / center shell) must keep skipping only the same center, not all `/entity-details/*`.
- No data, API, auth, or payload impact.

### Fix Strategy

`/akili-specify bugfix/smart-back-button` in **Bug Mode** (Lite) with a red-then-green regression test. Not `/akili-quick` — this is resolver logic.

Smallest safe correction: in section 4, treat **any** `/entity-details/` URL as a same-level sibling and skip it (same way same-program tabs are skipped today). Then resolve the last catalog parent, or fall back to Science programs home. When executing `back()`, do not leave a breadcrumb that retargets the page just left (pop current, or do not record the Back navigation).

## Approach Options

| Option | What it does | Trade-off |
|---|---|---|
| **A — Skip sibling SPs + no Back breadcrumb** | Section 4 skips every `/entity-details/*`. `back()` does not re-record the hop. Catalog parents and drilldown unchanged. | Smallest change that matches today’s tests and the intended labels. |
| **B — Hierarchical only** | Shell Back always goes to `/result-framework-reporting/home`. Ignore portfolio / results-list entry. | Simpler, but loses “Back to Portfolio overview” / “Back to Results list” already specified and tested. |
| **C — `history.back()` + fallback** | Use the browser stack; home if there is no in-app history. | Refresh / deep link / Orca open-at-URL break. Rejected by the archived Submitter and indicator back-link specs. |

## Recommended Approach

**Option A.** It keeps the catalog-aware labels the service already implements, fixes the sidebar hop that produces generic **Back**, and stops the ping-pong. Cite `KZ-changes--kp-report-modal-auto-create-1`: the live control is `app-reporting-program-band`, not `entity-details.component`.

## Risks, Dependencies, And Open Questions

| Item | Notes |
|---|---|
| Bilateral shared service | A sloppy “skip all entity-details” applied outside section 4 could break Center back. Specify must keep section 2–3 as-is. |
| Unmatched module routes | `/emerging`, `/planned-toc`, top-level `/overview` also miss named labels. Option A falls through to home if they are the only previous URL — acceptable. Naming them is out of scope unless specify wants a one-line allowlist. |
| Jira | No ticket provided. |
| Open | Confirm whether a hop **Center → SP** should keep “Back to Bilateral results” (today’s section 4 label). Recommend yes — that is a catalog, not a sibling SP. |

## Success Criteria

- [ ] Sidebar SP08 → SP01 → Overview: label is **Back to Science programs** (or Portfolio / Results list if that was the entry); click lands there.
- [ ] Second click does not return to SP01.
- [ ] Same-program Overview ⇄ Reporting ⇄ Results still skips internals and exits to the catalog.
- [ ] By-AOW drilldown still returns to Overview / all Areas of Work.
- [ ] Direct land / refresh on Overview still falls back to Science programs home.
- [ ] Existing `smart-navigation.service.spec.ts` catalog cases stay green.
- [ ] New regression: sibling-SP hop + `back()` does not invert.

## Next Step

```text
/akili-specify bugfix/smart-back-button
```

Bug Mode, Lite depth: convert the confirmed root cause into a fix plan and a mandatory red-then-green regression test.
