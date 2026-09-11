# Proposal — Evidence modal loses its title/close and action buttons at laptop viewport heights

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `evidence-modal-sticky-actions` — derived from free-text argument |
| Spec Path | `bugfix/evidence-modal-sticky-actions` |
| Type | Bug |
| Approval Mode | gated |
| Detected by | User report (screenshot, Result Detail → Evidences, "Add/Edit Evidence" popup) |
| Date | 2026-09-03 |

## 2. Intent

Keep the "Add/Edit Evidence" popup's title bar (with the close ✕) and its footer action buttons (Cancel / Add evidence / Save changes) permanently visible, so only the form fields scroll — matching the app's own hard UI rule that a drawer/modal has one scrolling body with a sticky header and footer.

## 3. Problem / Current Behavior

On the Result Detail → Evidences section, opening "Add evidence" (or editing one) shows a popup that, on a common laptop-class viewport (~1350px wide, ≤~800px tall — reported on a Lenovo T14s, "the PC most people use"), renders with **no visible title, no close button, and no Cancel/Add-evidence buttons**. The user only sees a slice of the form fields (Source of the evidence, Link, Impact Area checkboxes, description textarea) floating with the dimmed background page visible above and below it. The popup looks broken/unfinished, and the primary actions (save or cancel the evidence) are not reachable without first discovering that the *fields themselves* are the only scrollable area.

## 4. Proposed Outcome

The evidence popup keeps a fixed header (title + close ✕) and a fixed footer (Cancel / Add evidence or Save changes) at every supported viewport size; only the form fields between them scroll. This matches the existing hard rule already documented for this app ("the drawer's header and footer are sticky; only its body scrolls").

## 5. Scope

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.scss` — `.evidence_modal` (lines 210-247): currently a single `flex-direction: column; max-height: 85vh; overflow-y: auto` block containing `.modal_header`, the embedded `<app-evidence-item>` form, and `.buttons` together, so all three scroll as one unit.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.html` (lines 112-139) — the `evidence_modal` markup structure (`modal_header` / form / `buttons`), to add scroll-region wrapping if the fix needs a dedicated scrollable body element.
- `onecgiar-pr-client/src/app/shared/components/pr-dialog/pr-dialog.component.scss` — `.pr-dialog` (`max-height: 90vh; overflow: auto`) is a second, outer scroll container wrapping `.evidence_modal`'s own `85vh` scroll; the two nested "max-height + overflow" rules are what let the header/footer travel with the scroll instead of staying pinned. Any fix must resolve this double-scroll nesting, not just add `position: sticky` on top of it.
- Verification at 1350×800 and other common laptop viewports (with browser chrome accounted for), per `onecgiar-pr-client/CLAUDE.md`'s responsive rule (desktop-first, tablet must work).

## 6. Non-Goals

- No redesign of the evidence form fields themselves (Source of evidence, Link, Impact Area checkboxes, description) — this is a modal-chrome/layout fix, not a content change.
- No change to the "All indicators"/reporting-table bug already tracked separately in `bugfix/reporting-table-actions-clipped` — unrelated component.
- No introduction of a second scroll container beyond the one the fix intentionally keeps (per the app's "one vertical scroll per view" rule, the end state should have exactly one scrolling region: the form body).

## 7. Affected Users, Systems, And Specs

- **Users:** anyone adding or editing evidence on a Result Detail page from a laptop-class screen (the reported case: ~1350px-wide viewport, common on a 14" laptop at typical Windows display scaling).
- **Component:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/` (has its own `CLAUDE.md` — must be re-stamped in the same commit per `docs/COMPONENT-DOCS.md`) and the shared `onecgiar-pr-client/src/app/shared/components/pr-dialog/` primitive it's built on (used by other dialogs across the app — any fix touching `pr-dialog.component.scss` itself, rather than just the evidence-specific override, must be checked against other `app-pr-dialog` consumers).
- **Related rule:** `onecgiar-pr-client/CLAUDE.md` "Hard UI rules (redesign surfaces)" §Structure, rule 3: *"One vertical scroll per view. The drawer's header and footer are sticky; only its body scrolls."* This popup currently violates that rule.

## 8. Visual Reference

- Source: None (bug fix; the reported screenshot shows the *broken* state, not a target design)
- Location: user-provided screenshot, Result Detail (`result/result-detail/9023/evidences?phase=36`), "Add New Evidence" popup
- Notes: no new visual design needed — outcome is "existing modal chrome (header/footer) stays visible," not a new layout. The target behavior (sticky header/footer, scrolling body) already exists as a documented pattern elsewhere in the app.

## 9. Bug Diagnosis

### Observed Symptom
On Result Detail → Evidences, opening the "Add evidence" (or edit) popup at a ~1350px-wide, ~800px-tall (or shorter) browser viewport shows only a middle slice of the form — no popup title, no close ✕, and no Cancel/Add-evidence footer buttons are visible. The dimmed background page is visible above and below the visible form fields.

### Reproduction Steps
1. Open a result's Evidences section (`/result/result-detail/:id/evidences`).
2. Click "Add evidence" (or edit an existing one) to open the popup.
3. Resize/observe the browser at a laptop-class viewport — ~1350px wide and a limited height (a 14" laptop like the Lenovo T14s commonly renders at reduced effective height due to display scaling). Expected: the popup shows its title bar and Cancel/Add-evidence buttons fixed in place, with only the fields scrolling if they don't fit. Observed: title bar and footer buttons are absent from view; only a portion of the fields is shown, sandwiched between visible background page content.

### Root Cause (confirmed, via static code analysis — see caveat below)
Two nested "shrink + scroll" containers wrap the same content instead of separating chrome from body:

1. `pr-dialog.component.scss:17-27` — `.pr-dialog { max-height: 90vh; overflow: auto; display: flex; flex-direction: column; }`. This is the generic dialog shell used by every `app-pr-dialog` consumer.
2. `rd-evidences.component.scss:210-216` — `.evidence_modal { display: flex; flex-direction: column; gap: 24px; padding: 32px 40px; max-height: 85vh; overflow-y: auto; }`, rendered *inside* `.pr-dialog__body` (itself inside `.pr-dialog`). `.evidence_modal` contains `.modal_header` (title + close ✕), the embedded `<app-evidence-item>` form, and `.buttons` (Cancel / Add evidence) as three flex children of the **same** scrolling flex column — nothing marks the header or the buttons as `position: sticky`, so all three scroll together as one unit.

At a reduced viewport height (a laptop screen, especially one running at increased Windows display scaling, which shrinks the effective CSS viewport height well below the physical 1080px), the combined content of header + evidence-item form (Source-of-evidence radio, Link field, up to 10 impact-area checkboxes, description textarea) comfortably exceeds `85vh`. Because the header and footer are ordinary flex children of the same scrollable box as the fields — not sticky — scrolling to reach the fields (or the popup simply opening already past its own scroll top on a shorter viewport) carries the title/close and Cancel/Add-evidence buttons out of view along with them. This reproduces the screenshot exactly: mid-form fields visible, no header, no footer, dimmed background bleeding in at top and bottom.

This directly violates the documented hard rule in `onecgiar-pr-client/CLAUDE.md` ("One vertical scroll per view. The drawer's header and footer are sticky; only its body scrolls.") — the popup was never built to that rule; it uses a single scrolling column for everything.

**Caveat:** `prtest.ciat.cgiar.org` is not reachable from this session's sandboxed browser (network-gated / VPN-only), so this root cause is confirmed by static code inspection against the exact reported symptom, not by live reproduction in this session. The match between the code (no sticky header/footer, a scroll cap well within reach of the form's real height) and the screenshot (fields visible, chrome missing, background bleeding above/below) is precise enough to proceed, but QA/the user should do one live check at `/akili-test` time to close the loop.

### Impact & Scope
- Affects only the evidence create/edit popup (`rd-evidences.component.scss`'s `.evidence_modal` override of `app-pr-dialog`). Other `app-pr-dialog` consumers are not automatically affected unless the fix changes the shared `pr-dialog.component.scss` base rather than just the evidence-specific override — this needs to be decided in `/akili-specify`.
- No data-integrity or security implications — purely a modal-layout/reachability defect. Functionally it can block users from finding Cancel/Add-evidence at all on a laptop screen, which is a real workflow blocker (users may resize the OS window, zoom out, or give up), not merely cosmetic.
- The nested-scroll pattern (dialog shell `max-height:90vh` + content block `max-height:85vh`, both `overflow`) may exist in other `app-pr-dialog` usages across the codebase; worth a quick grep in `/akili-specify` to see if this is a one-off in `rd-evidences` or a shared anti-pattern.

### Fix Strategy
This needs a real layout decision (splitting a single scrolling flex column into a fixed header + scrolling body + fixed footer, and resolving the double `max-height`/`overflow` nesting against `pr-dialog`), not a one-line tweak — not `/akili-quick` material. Route to `/akili-specify` in **Bug Mode** with a regression test asserting the modal's header (close ✕) and footer (Cancel/Add-evidence buttons) remain visible/in-viewport at a constrained-height popup (e.g. Cypress or Jest+jsdom bounding-box/visibility assertion at a viewport height small enough to force scrolling in the form body).

Two candidate approaches (to be finalized in `/akili-specify`):
1. **Split `.evidence_modal` into header / scrollable body / footer**, with `.modal_header` and `.buttons` taken out of the scrolling flow (e.g. the scrollable region becomes only the `<app-evidence-item>` wrapper, sized to fill the remaining space between header and footer) — and drop the outer `.pr-dialog`'s own `overflow: auto` height cap in favor of letting the inner layout own the scroll, so there is exactly one scroll region (per the app's "one vertical scroll per view" rule). Smallest, most consistent fix — matches the pattern the app's own hard UI rules already prescribe for drawers.
2. **Keep both containers scrollable but pin header/footer with `position: sticky`** (`top: 0` on `.modal_header`, `bottom: 0` on `.buttons`, each with a background so content doesn't show through while scrolling underneath) inside the existing `.evidence_modal` scroll box, without touching `pr-dialog.component.scss`. Lower risk to the shared `pr-dialog` primitive (no other consumers affected), but keeps the double-scroll-container nesting as latent risk and is a smaller conceptual fix.

Recommended: Option 2 first (sticky header/footer, scoped entirely to `rd-evidences.component.scss`), because it fixes the reported symptom without touching the shared `pr-dialog` primitive that other dialogs across the app depend on — lowest blast radius. Option 1 (real header/body/footer split, potentially touching `pr-dialog.component.scss`) is the more thorough fix and should be considered if `/akili-specify` finds other `app-pr-dialog` consumers with the same nested-scroll anti-pattern.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Sticky header/footer inside `.evidence_modal` (recommended)** | Add `position: sticky; top: 0` (with background) to `.modal_header` and `position: sticky; bottom: 0` (with background) to `.buttons`, both still inside the existing `.evidence_modal` scroll box. | Smallest change, scoped to one component file, zero risk to other `app-pr-dialog` consumers. Leaves the double `max-height`/`overflow` nesting with `pr-dialog` in place (cosmetic redundancy, not a new bug), but resolves the actual reported symptom. |
| **B — Restructure into header / scrollable body / footer, drop the outer dialog's own height cap** | Move header and footer out of the scrolling flex column entirely; scroll only the fields. May also touch `pr-dialog.component.scss` if the outer `max-height: 90vh; overflow: auto` needs to change so it doesn't double up with the inner scroll region. | Cleanest, most rule-compliant fix and removes the nested-scroll anti-pattern outright, but has a wider blast radius if `pr-dialog.component.scss` changes (other dialogs across the app use it) — needs a scan of other `app-pr-dialog` consumers before touching the shared file. |
| **C — Do nothing, document as known limitation** | Leave as-is. | Not viable — this blocks discovering/reaching the save/cancel actions on a common laptop viewport, which is a real workflow blocker, not a cosmetic nit. |

## 11. Recommended Approach

**Option A.** Add `position: sticky` (with a solid background) to `.modal_header` and `.buttons` inside the existing `.evidence_modal` scroll container in `rd-evidences.component.scss`. This is the smallest safe path: it fixes the exact reported symptom (header/footer disappearing while scrolling the form), stays entirely inside the one component file already in scope, and does not touch the shared `pr-dialog` primitive that other dialogs across the app depend on. If `/akili-specify` finds the same nested-scroll pattern elsewhere in the app (a quick grep of other `app-pr-dialog` consumers), escalate to Option B as a separate, broader follow-up rather than bundling it here.

## 12. Risks, Dependencies, And Open Questions

- **Risk:** a `position: sticky` header/footer needs an opaque background (not just `background: var(--pr-color-white)` on the element, but confirmation there's no transparency/blur bleeding the scrolling fields through underneath it) — needs visual QA at the target viewport, not just a DOM-presence assertion.
- **Risk:** the outer `.pr-dialog`'s own `max-height: 90vh; overflow: auto` still wraps `.evidence_modal`'s `85vh` scroll region. Option A doesn't remove this double-scroll nesting — worth confirming in `/akili-specify` that this doesn't itself produce an outer scrollbar that also hides the sticky elements (sticky only works within its own nearest scrolling ancestor, and here that's `.evidence_modal`, not `.pr-dialog` — should be fine, but must be verified live).
- **Dependency:** `rd-evidences/CLAUDE.md` must be updated and re-stamped in the same commit (component-doc convention, `docs/COMPONENT-DOCS.md`), since this changes documented modal-chrome behavior.
- **Open question:** does the same nested-scroll / non-sticky-chrome pattern exist in other `app-pr-dialog` consumers across the codebase? Recommend a quick grep during `/akili-specify` to decide whether this fix should also become a `pr-dialog` shared-component enhancement (Option B) rather than a one-off override.
- **Open question / caveat:** root cause was confirmed via static code analysis only — `prtest.ciat.cgiar.org` was unreachable from this session's sandboxed browser. Recommend one live check (the reported Lenovo T14s viewport, or an equivalent ~1350×800 emulated viewport) before or during `/akili-test` to close the loop between code analysis and the actual rendered defect.

## 13. Success Criteria

- At 1350×800 (and other common laptop heights down to ~700px tall), opening "Add evidence" or editing an evidence keeps the popup's title + close ✕ and the Cancel/Add-evidence (or Save changes) buttons visible at all times; only the form fields between them scroll.
- No regression to other `app-pr-dialog` consumers elsewhere in the app (verified if Option B's shared-file path is taken; not applicable if Option A stays scoped to `rd-evidences.component.scss`).
- A regression test (Jest/Cypress, per the fix's actual mechanism) asserts the modal header and footer buttons have a non-zero, in-viewport bounding box at a constrained popup height that forces the form body to scroll.

## 14. Next Step

```text
/akili-specify bugfix/evidence-modal-sticky-actions
```

Run in **Bug Mode** — `/akili-specify` will convert this confirmed root cause into a fix plan (Option A, sticky header/footer) and a mandatory regression test.
