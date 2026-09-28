# Proposal — A platform admin sees every CGIAR centre in the sidebar, not only the ones assigned to them

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/admin-sees-all-centers` |
| Slug | `admin-sees-all-centers` — given as a kebab-case argument, used verbatim |
| Type | **Change** |
| Approval Mode | `gated` |
| Status | **approved** — user, 2026-09-28 ("Continue") |
| Author (session) | Proposed on behalf of j.delgado@cgiar.org |
| Date | 2026-09-28 |
| Jira | **none** — user-originated, no ticket yet |
| Branch base | `performance-refactor` @ `f37e1c728` — every citation below read at this SHA |
| Depends on | none |
| Parallel-safe | **no** — touches `shared/services` and the shared nav sidebar, which the constitution's directory-boundary table says to serialise |
| Related | `docs/specs/archive/2026-09-18-auth--center-user` (epic **P2-3096**, the spec that created this surface) |
| Model note | Registry pins T1 → `opus`; this session runs Opus 5. No downgrade needed |

## 2. Intent

A platform admin opening PRMS should be able to reach **any** CGIAR centre from the sidebar, not just the centres someone happened to assign to their own user.

## 3. Problem / Current Behavior

- The sidebar's *My CGIAR centers* block renders `getMyCenters()` (`reporting-nav-sidebar.component.html:114` collapsed rail, `:253` expanded) — as run: `grep -rn "getMyCenters" src/app`.
- `getMyCenters()` returns the user's own assignments and **has no admin branch** (`roles.service.ts:196`): `return this.roles?.center ?? [];`. That array is the `center[]` of `GET role-by-user/get/user/:id`.
- Therefore an admin with no centre assignments sees an **empty** block, and an admin with two assignments sees exactly those two. The `@if (getMyCenters().length > 0)` guard hides the whole section at zero.
- **An admin short-circuit for centres does exist — and nothing calls it.** `validateCenterAccess()` (`roles.service.ts:200`) opens with `if (this.isAdmin) return true;`, but a whole-history search for call sites (`git log --all -S"validateCenterAccess"`, then `grep -rn "validateCenterAccess("`) finds only its definition, two comments, and three assertions in `roles.service.spec.ts:471-479`. **No production caller, on any branch.** Someone modelled "an admin reaches any centre", wrote it, and never wired it.
- The governing spec never promised this. `docs/specs/archive/2026-09-18-auth--center-user/requirements.md:48,57` casts the platform admin as the person who **assigns** users to centres (`AUTH-US-1`), not as someone who browses them.
- The PRD agrees: the Platform admin persona's surfaces are `admin-section`, `init-admin-section`, `manage-data`, `versioning`, `user-notification-settings` (`docs/prd.md:43`), and **bilateral/centres is not among them**. `US-A1`..`US-A5` (`:143-147`) contain no centre-browsing story.

**So this is not a regression.** Nothing broke; the behaviour was never specified. It is a new expectation, which is why this is a `Change` and not a bug.

## 4. Proposed Outcome

When the signed-in user is a platform admin, the sidebar lists **every centre in the CLARISA catalogue**, each navigating to that centre's bilateral home exactly as an assigned centre does today. A non-admin sees precisely what they see now.

## 5. Scope

- The *My CGIAR centers* block of `reporting-nav-sidebar`, both collapsed (`:114`) and expanded (`:253`) states.
- A read-only source of all centres for that block.
- The visual treatment that keeps an admin's list legible and distinguishes "assigned to me" from "all".

## 6. Non-Goals

- **Changing what `getMyCenters()` returns.** See `Approach A` — rejected.
- Granting an admin new *permissions*. Admins already pass the two centre permission gates through their own `isAdmin` checks (`api.service.ts:295`, `bilateral-results-list.component.ts:409`). This change is about **navigation and visibility**, not authorisation.
- Wiring up the dead `validateCenterAccess()`. Recorded as `OQ-2`; a separate decision.
- The topbar (`shell-topbar.component.html:261`) and header-panel (`header-panel.component.html:349`) centre lists. They read the same method and have the same gap — deliberately left out to keep this bounded. Recorded as `OQ-3`.
- Any server change. The catalogue endpoint already exists.

## 7. Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| Platform admin | Gains every centre in the sidebar |
| Every other role | **No change** — this is the property the design must protect |
| `reporting-nav-sidebar` | The only component that changes |
| `RolesService` | Gains a read-only accessor **or** is left untouched, depending on the approach chosen |
| `archive/2026-09-18-auth--center-user` | Extends its model; does not contradict it |

**Consumers of `getMyCenters()` — 12 production sites across 5 modules**, as run (`grep -rn "getMyCenters" src/app | grep -v "\.spec\."`): `reporting-nav-sidebar.component.ts:638` · `shell-topbar.component.ts:207` · `header-panel.component.ts:202` · `api.service.ts:297` · `results-center-reporting-guide.component.ts:82` · `platform-reporting-guide.service.ts:89` · `bilateral.component.ts:41,45,50` · `bilateral-results-list.component.ts:412` · `bilateral-result-creator.component.ts:489` · `result-framework-reporting-home.component.ts:48` · `dashboard-lab.component.ts:729` · `where-to-report-modal.component.ts:63`.

**Two of them are permission decisions**, which is what makes the method untouchable:

```ts
// api.service.ts:297 — whether an action appears at all
return (this.rolesSE.getMyCenters() ?? []).some(c => c?.center_acronym === leadCenterAcronym);

// bilateral-results-list.component.ts:412 — canManageW3: edit/delete W3 results
return this.rolesService.getMyCenters().some(c => ...);
```

## 8. Visual Reference

- Source: **None** — user declined a mockup (2026-09-28) and asked that the existing pattern be followed.
- Location: n/a.
- Notes: the design reuses the existing centre card (`pr-nav-center-card`: diamond + name, `reporting-nav-sidebar.component.html:259-266`) and the existing `programDotColor()` swatch. `/akili-specify` decides the "mine vs all" treatment within that vocabulary; no new token is introduced. If it turns out one is needed, that routes back through `/akili-propose` per the token rule.

## 9. Requirement Delta Preview

### ADDED

- When `isAdmin`, the sidebar's centre block lists the full CLARISA centre catalogue.
- A visual distinction between a centre assigned to the admin and one they merely administer.
- A degradation path for the catalogue call failing: the admin still sees their assigned centres.

### MODIFIED

- `@if (getMyCenters().length > 0)` becomes a condition that an admin with zero assignments also satisfies — otherwise the block stays hidden for exactly the user this change is for.
- The card tooltip `center.center_name + ' · ' + center.role_name` (`:124`, `:265`): a catalogue centre **has no role**, so this must stop rendering the string `"undefined"`.

### REMOVED

- Nothing.

## 10. Approach Options

### Option A — Add an `isAdmin` branch inside `getMyCenters()`

Return the full catalogue from the existing method when the user is an admin.

- ✅ One-line change at the source; every surface (sidebar, topbar, header-panel) gains it at once.
- ❌ **Rejected.** It silently redefines "my centres" for all 12 consumers, two of which are permission gates. Even where an `isAdmin` short-circuit already sits above the call and would mask the change, the method's *meaning* becomes wrong, and the next person to read `canManageW3` is misled. It also turns a synchronous property read into something that must await an HTTP response — `getMyCenters()` is called from templates on every change detection.

### Option B — The sidebar composes its own list *(recommended)*

`getMyCenters()` is untouched. `reporting-nav-sidebar` already wraps it in its own `getMyCenters()` (`:638`) for the acronym/id filter. That wrapper becomes the composition point: assigned centres always, plus the catalogue when `isAdmin`, fetched once and held in a signal.

- ✅ Blast radius is one component. The 11 other consumers keep the method's current meaning, and the two permission gates are provably untouched.
- ✅ The wrapper, the filter and the "why" already live there — the change lands where the concern already is.
- ✅ Fails soft: catalogue call fails → the admin still sees assigned centres.
- ❌ The topbar and header-panel keep the old behaviour, so the surfaces disagree until `OQ-3` is settled.
- ❌ Needs a shape mapping (below).

### Option C — Backend returns every centre in `role_by_user` for admins

- ✅ Every client surface gains it with no client change.
- ❌ **Rejected.** It changes the meaning of an **auth payload**, which the server's own permission checks also read, and makes an admin indistinguishable from a user assigned to 15 centres. That is a security-shaped change proposed to solve a navigation problem.

## 11. Recommended Approach

**Option B.** It is the only one that gets the admin their list without redefining a symbol that two permission gates read. The smallest safe path: the sidebar already owns a wrapper around this exact data, so the change has a natural home and a one-component blast radius.

**The shape mismatch is the real work, and it is worth naming now.** The two sources do not agree:

| Source | Shape | Citation |
|---|---|---|
| `roles.center[]` | `{ center_id, center_name, center_acronym, role_name }` | `roles.service.spec.ts:456-462`; rendered at `:124`, `:265` |
| `clarisa/centers/get/all` | `{ code, acronym, name, lead_center, full_name }` | `results-api.service.ts:263-274` |

Nothing lines up by name, and `role_name` has no counterpart at all. `centerHomeLink()` (`:648`) builds `['/bilateral', center.center_acronym || String(center.center_id), 'home']`, so an unmapped catalogue row would route to `/bilateral/undefined/home` — precisely the failure the existing filter at `:638` was written to prevent, re-entering through the other door.

## 12. Risks, Dependencies, And Open Questions

| # | Risk / Question | Note |
|---|---|---|
| `R-1` | **A sidebar with the whole catalogue is a different UI problem.** CGIAR has on the order of a dozen-plus centres (**UNVERIFIED — confirm at source before relying on it**; count not queried this session). The block renders a flat `@for` with no scroll, search or collapse (`:257-266`) | Drives the "mine vs all" treatment; may need a collapsed group |
| `R-2` | Shape mismatch routes to `/bilateral/undefined/home` if mapping is missed | Mitigated by the existing `:638` filter, but only if the mapping feeds through it |
| `R-3` | `role_name` is absent for catalogue centres → tooltip renders `"undefined"` | Must be handled; reuse `shouldShowAssignmentRole()` (`shell-topbar.component.ts:216`) |
| `R-4` | A bilateral home for a centre with no data may not degrade gracefully | **UNVERIFIED — confirm at source before relying on it.** Settle in `/akili-specify` before committing to the navigation |
| `R-5` | `roles` is a plain property, invisible to the signal graph (`roles.service.ts:27`), and `dashboard-lab.component.ts:1989` already records being bitten by it on a cold load | An admin list built on a signal must not inherit that staleness |
| `OQ-1` | Does the PRD's admin persona (`prd.md:43`) get extended, or is this an operational convenience outside it? | **Owner: the user / PO.** Affects whether the PRD needs a delta |
| `OQ-2` | Wire up the dead `validateCenterAccess()`, or delete it? | **Owner: the user.** Out of scope here; leaving it is leaving a trap |
| `OQ-3` | Do the topbar and header-panel follow? | **Owner: the user.** Left out to keep this bounded |

## 13. Success Criteria

- A platform admin with **zero** centre assignments opens PRMS and sees every CGIAR centre in the sidebar.
- A platform admin **with** assignments can tell which centres are theirs.
- A non-admin's sidebar is **byte-identical** to today.
- No change to what any of the 12 `getMyCenters()` consumers receives.
- Both permission gates (`api.service.ts:297`, `bilateral-results-list.component.ts:412`) behave exactly as before.
- The catalogue call failing leaves the admin with their assigned centres, not an empty block.

## 14. Next Step

```text
/akili-specify changes/admin-sees-all-centers
```

Lite depth. `OQ-1` and `R-4` should be settled at the specify gate — `R-4` by a bounded probe, not an assumption.
