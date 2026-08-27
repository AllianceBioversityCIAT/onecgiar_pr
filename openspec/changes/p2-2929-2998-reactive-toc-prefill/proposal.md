# Proposal: P2-2929/P2-2998 — Reactive ToC prefill for Science Programs & Centers

## Why

QA (Santi, 2026-07-03) reported three defects in the 2026 C&P section, all sharing one root cause: the ToC prefill effects (`preselectScienceEffect`, `preselectCentersEffect`) only run when the selection is **empty** (`sel.length === 0`). Consequences: (1) removing/changing the ToC Output/Outcome leaves the previous node's SP/Centers stuck as selected until a full page reload; (2) selecting a second Outcome does not preselect its synergy programs (they only appear as options); (3) Centers behave identically. Worse (DEV-ORACLE F3): stale items get saved with `from_toc: true`, corrupting persistence with centers/SP that no longer belong to the mapped node.

## What Changes

- Replace both "prefill only when empty" effects with a **reconciliation** driven by the resolved ToC reference signature:
  - When the resolved refs change (node added/changed/removed), remove the session-preloaded items (`new: true`) that no longer belong to the refs, and add the missing refs (union + dedup across multiple nodes).
  - Never touch: the "Other(s)" sentinel + manual Other selections, persisted/accepted/pending items (no `new` flag / tracked in `loadedAcceptedScienceIds`/`loadedPendingScience`), or user-added items.
  - Keep the P2-3115 guard (`sectionHydratedFromToc && !tocSelectionTouched`) so a deliberately-emptied saved selection never resurrects on cold load; a genuine in-session node change marks `tocSelectionTouched` (via `markUserTocSelection`) and therefore reconciles.
  - Remove the early-return on `userTouchedScience`/`userTouchedCenters` from the effects (DEV-ORACLE F2: it permanently disabled any future prefill once the user touched the dropdown); protection now comes from the signature comparison + the `new: true`-only removal rule.
- Centers path additionally re-runs `setPossibleLeadCenters(true)` after reconciling (auto-lead consistency).
- Fix a stale comment ("SAVE NOT ADDRESSED YET") next to `contributingCentersInfoNote`.

## Capabilities

### New Capabilities
- `reactive-toc-prefill`: reconciliation of the from-ToC preselection of Contributing Science Programs and CGIAR Centers when the mapped ToC node(s) change, across Output/Outcome/2030 Outcome, preserving manual/persisted selections and the P2-3115 anti-resurrection contract.

### Modified Capabilities
<!-- none — toc-centers-reactive-preload spec covers the load-time preload, not in-session node changes; behavior added here is new -->

## Impact

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts` (both effects, ~L145 and ~L220).
- Jest specs for the component effects.
- No service/template/save changes; save payload shape untouched.
- Out of scope: the popup surface (P2-3114, Juanda), bilateral dropdown (P2-3001 — SP-level list, node-independent by design).
