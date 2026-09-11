# Module Spec — `task.md`

## 1. Scope of this task list

- **Module / feature:** `results` / `unsubmit-button-clarification`
- **Linked spec:** `docs/specs/results/unsubmit-button-clarification/requirements.md` + `docs/specs/results/unsubmit-button-clarification/design.md`.
- **Sprint / target phase (if any):** N/A
- **Owner / driver:** Developer
- **Status:** `shipped`

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md` and `design.md` are all resolved.
- [x] CLARISA dependencies (cache tables, endpoints) confirmed (none).
- [x] No conflicting in-flight spec touching the same entities.
- [x] Migration name and reversibility confirmed (none).

---

## 3. Task list

### `RES-T-1` — Add unsubmitTooltip to ResultSectionsService

- **Type:** `client`
- **Description:** Add a new getter to `ResultSectionsService` to return the tooltip text explaining when to unsubmit.
- **Implements:** `RES-R-2`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-sections-sidebar/result-sections.service.ts`
- **Depends on:** `—`
- **Blocks:** `RES-T-2`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Code added.
  - [x] Lint + format clean.
  - [x] Unit tests updated.

### `RES-T-2` — Bind tooltip in ResultSectionsSidebarComponent

- **Type:** `client`
- **Description:** Add the `prTooltip` directive to the Unsubmit button in the HTML template.
- **Implements:** `RES-R-1`, `RES-AC-1`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-sections-sidebar/result-sections-sidebar.component.html`
- **Depends on:** `RES-T-1`
- **Blocks:** `—`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Code added.
  - [x] Lint + format clean.

---

## 4. Dependency graph

```
RES-T-1 (add getter to service)
   └── RES-T-2 (bind in HTML)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RES-TEST-1` | unit (client) | `RES-R-1`, `RES-R-2` | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-sections-sidebar/result-sections.service.spec.ts` |

---

## 6. Rollout & verification

- [ ] Manual QA on test env.

---

## 7. Cleanup & follow-ups

After the feature is live:
- [x] Move spec status to `shipped`.

---

## 8. Roll-back plan

1. Revert the commit.

---

## Required cross-references

- `docs/specs/results/unsubmit-button-clarification/requirements.md`
- `docs/specs/results/unsubmit-button-clarification/design.md`
