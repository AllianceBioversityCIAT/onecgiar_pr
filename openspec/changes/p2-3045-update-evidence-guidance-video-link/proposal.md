## Why

The Result Detail → Evidence section shows a help tip pointing users to a video tutorial on how to create an evidence entry. That tutorial was **re-recorded** to reflect the latest evidence-upload flow — specifically, it now explains that selecting a principal contribution score (2) for an Impact Area in Tab 1 (General Information) requires evidence to be attached.

Santi uploaded the new recording to the OneCGIAR PRMS Repository on SharePoint and QA (María Camila) confirmed the final version. The only remaining task is to point the in-app link at the new video so users are redirected to the up-to-date resource instead of the outdated one (P2-3045).

This is a **frontend-only, one-line copy change**: swap the SharePoint URL. No backend, no behavior, no styling change.

## What Changes

- In the Evidence-section help tip, replace the outdated tutorial video URL with the new one provided by QA:
  - Old: `https://cgiar.sharepoint.com/:v:/s/OneCGIARPRMSRepository/ETb3eWyBPm9FumJV75XyUDABeVD57nTvz9zz1kNzL_Ob9w?e=kvLk2t`
  - New: `https://cgiar.sharepoint.com/:v:/s/OneCGIARPRMSRepository/IQCPCRtUOihDQKJExjQgfIOIAZQAZH4pnHDucy3HX-w14WU?e=Xoy42x`
- No change to the surrounding sentence, the `<a class="open_route" target="_blank">` markup, the tip's placement, or the trigger logic.

## Capabilities

### New Capabilities
- `evidence-guidance-video-link`: The in-app help tip in the Evidence section that links users to the external video tutorial on how to create an evidence entry.

### Modified Capabilities
<!-- None — no existing spec covers this behavior. -->

## Impact

- **Frontend only** — `onecgiar-pr-client`.
- File: `src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts` — the `information` getter (help-tip `<li>` template string).
- No backend, API, entity, DTO, or migration changes.
- SDD baseline: UI copy governed by `docs/system-design/design.md`; no requirement-level change to `docs/prd.md` or `docs/detailed-design/detailed-design.md`.
- Jira: **P2-3045** (Enhancement under epic P2-2338 "Enhancements 2026").
