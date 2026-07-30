## Context

P2-3045 is a copy-only adjustment to an existing help tip in the Result Detail → Evidence section (`rd-evidences`). The tip is a static HTML string returned by the `information` getter in `rd-evidences.component.ts` and rendered as a bulleted list; one `<li>` links to an external SharePoint video tutorial via `<a class="open_route" target="_blank">`.

The video content itself lives on SharePoint (OneCGIAR PRMS Repository) and was re-recorded outside the codebase. The app only stores the link, so the entire scope of this change in the repository is the URL string.

## Goals / Non-Goals

**Goals:**
- Point the existing tutorial link at the new SharePoint recording.

**Non-Goals:**
- No change to the tip wording, its `<a>` markup/attributes, its position in the list, or any Evidence-section logic.
- No change to how or when the tip is rendered.
- No backend, API, or data-contract change.

## Decisions

- **Edit the URL literal in place.** The link appears in exactly one location (verified by grep for the old URL and for "video tutorial" across `onecgiar-pr-client/src`). Swapping the string is the minimal, complete change.
- **No unit test added.** The link is a static string with no branching logic to assert; the value is verified by grep (no old occurrence remains) and by manual click-through. This matches the low-risk, copy-only nature of the change.

## Risks / Trade-offs

- [Hardcoded SharePoint URL, not sourced from config] → Accepted: this matches the existing implementation and every other help link in the app; externalizing tutorial links is out of scope for a link swap.
- [Link could go stale again if the video is re-recorded] → Accepted: same operational process (QA provides the new link) applies; no code mitigation warranted.
