# SAV-T-5 — Real-browser probe readings

Environment: Orca embedded browser, root zoom ×1.2 (confirmed: requested `W×H` reads back as
`innerWidth/innerHeight = 1.2·W × 1.2·H`, `devicePixelRatio ≈ 0.8333`). Dev server `ng serve`
already running on the T-3/T-4 committed code; no server was started/restarted.

**SP used:** SP01 for all pages. Reporting's default "aows" grouped browse view is short for
SP01 (and SP02–SP05 checked, all ~555–567px — the disqualifier's suggested SPs did **not**
produce longer content). A genuinely long Reporting reading (needed for `SAV-AC-1`) was
obtained instead via `?tocView=indicators` (the same page's flat "Indicators" browse mode,
`plannedBrowseView() === 'indicators'`), which renders **56536px** of content for SP01 — this
is a legitimate alternate state of the same Reporting page/component, not a different SP.

**Selectors used:** host `app-dashboard-lab` (Overview/Reporting) or `app-programme-results`
(Results); work area `host.querySelector('article > div.custom_scroll')` (falls back to
`section.box-border` in AOW-rail mode); header `.app-shell-header`; band sticky box
`app-reporting-program-band > div`; **tabs = `document.querySelector('nav')`** — `[role=tablist]`
(as suggested) does **not** match the Reporting/Overview/Results tab strip; it matched an
unrelated chart-type toggle. The real tab strip is a bare `<nav>` containing three `<a>`
children with `.pr-tab-label` spans ("Overview"/"Reporting"/"Results") — confirmed unique
per page via `document.querySelectorAll('nav').length === 1`.

---

## 1. Base geometry — three pages × four viewports

All rects below are raw (post-zoom) `getBoundingClientRect()` values; `innerW/innerH` are raw
`window.innerWidth/innerHeight`.

### Reporting (`entity-details/SP01`, default `aows` grouped view — short content)

| Viewport (requested) | innerW×innerH (×1.2 check) | docScrollH/docClientH | wa scrollH/clientH | header.height | band.top/height | hostDisplay/Position | bandPosition |
|---|---|---|---|---|---|---|---|
| 1280×800 | 1536×960 (✓ ×1.2) | 960/960 | 555/555 | 108.50 | 107.50/111.99 | flex/absolute | static |
| 1440×900 | 1728×1080 (✓) | 1080/1080 | 675/675 | 108.50 | 107.50/111.99 | flex/absolute | static |
| 1600×900 | 1920×1080 (✓) | 1080/1080 | 694/694 | **89.56** (banner unwrapped, shorter) | 88.57/111.99 | flex/absolute | static |
| 800×1100 | 960×1320 (✓) | 1320/1320 | 679/679 | 141.57 (banner wrapped, taller) | 140.58/111.99 | flex/absolute | static |

`wa.scrollH === wa.clientH` at every width: SP01's "aows" grouped view is legitimately shorter
than the viewport (matches the task's own caveat) — no scroll-lock claim can be tested on this
state; see §2 for the long-content ("indicators" view) reading used for `SAV-AC-1`.

**⚠️ 800×1100 disqualifier (new, not in the original list):** raw `innerW=960 ≥ 900`. The
Tailwind breakpoint utilities (`min-[900px]:...`) are gated on `window.matchMedia('(min-width:
900px)')`, which evaluates against the **already-zoomed** viewport. `window.devicePixelRatio ≈
0.833` and `innerWidth` read 960 confirm the zoom is implemented by inflating the CSS-pixel
viewport, not by browser page-zoom on top of a real 800px layout viewport. So **the requested
"800px" case never crosses the 900px breakpoint it is meant to test** — `hostDisplay`,
`hostPosition`, and `bandPosition` all read the ≥900px (desktop) values, not the mobile ones.

Confirmed by a diagnostic at **700×1100** (raw `innerW=840`, `matchMedia('(min-width:900px)')
=== false`): `hostDisplay: "block"`, `hostPosition: "static"`, `bandPosition: "sticky"`,
`waOverflowY: "visible"`, `docScrollH(1740) > docClientH(1320)` — i.e. the code **does**
correctly implement the sub-900px branch; it is just unreachable at the literal 800px viewport
under this environment's ×1.2 zoom. This affects every "800×1100" reading below the same way —
flagged once here, not repeated per-page.

### Overview (`entity-details/SP01/overview` — long content, 3566–4884px)

| Viewport | innerW×innerH | docScrollH/docClientH | wa scrollH/clientH | header.height | band.top/height | hostDisplay/Position |
|---|---|---|---|---|---|---|
| 1280×800 | 1536×960 | 960/960 | 3566/741 | 108.50 | 107.50/111.99 | flex/absolute |
| 1440×900 | 1728×1080 | 1080/1080 | 3566/861 | 108.50 | 107.50/111.99 | flex/absolute |
| 1600×900 | 1920×1080 | 1080/1080 | 3566/879 | 89.56 | 88.57/111.99 | flex/absolute |
| 800×1100 | 960×1320 | 1320/1320 | 4884/1067 | 141.57 | 140.58/111.99 | flex/absolute (same 900px-breakpoint caveat as above) |

`wa.scrollH ≫ 2×clientH` at every viewport — Overview is long for every SP checked (SP01–SP05
all ~3566–3686px), so it never presents the `SAV-AC-2` "content < viewport" precondition — see
the AC table.

### Results (`entity-details/SP01/results` — very long content, 7933–8025px)

| Viewport | innerW×innerH | docScrollH/docClientH | wa scrollH/clientH | header.height | band.top/height | hostDisplay/Position |
|---|---|---|---|---|---|---|
| 1280×800 | 1536×960 | 960/960 | 7933/741 | 108.50 | 107.50/111.99 | flex/absolute |
| 1440×900 | 1728×1080 | 1080/1080 | 7933/861 | 108.50 | 107.50/111.99 | flex/absolute |
| 1600×900 | 1920×1080 | 1080/1080 | 7933/879 | 89.56 | 88.57/111.99 | flex/absolute |
| 800×1100 | 960×1320 | 1320/1320 | 8025/1067 | 141.57 | 140.58/111.99 | flex/absolute (same caveat) |

Matches Leader's earlier baseline (`docSH 960 docCH 960, host flex/absolute, wa sh 7933 ch
741, band static`) exactly.

---

## 2. Scroll-to-bottom → band/tabs re-read (per page, 1280×800)

| Page | before wa.scrollTop | after wa.scrollTop | band top/bottom before→after | nav(tabs) top/bottom before→after | window.scrollY after |
|---|---|---|---|---|---|
| Reporting (short, "aows") | 0 | 0 (content ≤ viewport, cannot scroll — expected) | 107.50/219.50 → unchanged | n/a (checked band only) | 0 |
| **Reporting (long, "indicators", 56536px)** | 0 | 55849.8 | 107.50/219.50 → **unchanged** | 171.50/219.50 → **unchanged** | 0 |
| Overview (3566px) | 0 | 2825.4 | 107.50/219.50 → **unchanged** | (checked band only) | 0 |
| Results (7933px) | 0 | 7192.8 | 107.50/219.50 → **unchanged** | (checked band only) | 0 |

Frame (band/tabs) rects are bit-identical before and after in every case where real scrolling
occurred — clean evidence for the viewport-lock claim.

---

## 3. Tab-switch test (`SAV-AC-4`)

**Reporting (short, SP01 "aows") → Results**, after attempting a 1200px work-area scroll:
`wa.scrollTop` stayed `0` both before and after (content ≤ viewport, so no real scroll — the
0-to-0 comparison is not strong evidence on its own). band/nav rects unchanged; new page
`wa.scrollTop === 0`.

**Overview (long, real 1200px scroll) → Results** — the load-bearing version of this test:

```
before (Overview, scrolled): wa.scrollTop = 1200, band {top:107.50,bottom:219.50}, nav {top:171.50,bottom:219.50}
after  (Results, fresh):     wa.scrollTop = 0,    band {top:107.50,bottom:219.50}, nav {top:171.50,bottom:219.50}, window.scrollY = 0
```

Band/nav rects bit-identical; new page's work area starts at `scrollTop = 0`. Clean PASS.

**Band shadow toggle** (extra, supports `SAV-AC-4`'s "band shadow off"): the sticky wrapper's
class list carries `shadow-none` at `scrollTop = 0` and `shadow-[0_2px_8px_rgba(25,21,36,0.08)]`
once a real `scroll` event fires with `scrollTop > 0` (confirmed via `dispatchEvent(new
Event('scroll'))` — programmatic `scrollTop` assignment alone does not flip the class, a real
scroll event is required, as expected for an RxJS/`(scroll)`-bound listener). After the
Reporting(long, scrolled+shadow-on) → Results tab switch: new page reads `shadow-none` — shadow
correctly resets off on the fresh page.

---

## 4. Modal test (`SAV-AC-10`) — Overview, 1280×800

"explore Where to report" CTA → `[role=dialog]` opens.

| | band rect | nav rect | docScrollH/docClientH | docScrollW/docClientW |
|---|---|---|---|---|
| Before | 107.50/219.50 | 171.50/219.50 | 960/960 | 1536/1536 |
| Modal open | **107.50/219.50 (identical)** | (not re-read, unaffected) | 960/960 | (not re-read) |
| After Escape close | **107.50/219.50 (identical)** | **171.50/219.50 (identical)** | 960/960 | n/a |

No document overflow appears while the modal is open or after close. Clean PASS.

---

## 5. AOW-mode / rail test (`SAV-AC-7`) — ⚠️ important reachability finding

**No UI click path to `viewMode() === 'aow'` (the state that renders `aside.pr-panel`) could be
found from the SP01 Reporting page.** Investigated and ruled out:

- The "AOW01 …" summary cards and their "Open this Area of Work in the By-AOW view" buttons
  (`onOpenAow` / `openAowFocused` in `dashboard-lab.component.ts`) only ever set
  `plannedBrowseView` to `'byAow'` and push `?tocView=byAow&tocAow=<code>` — a **different**,
  unrelated signal from `viewMode`.
- `tocView=aows` (the URL this tab redirected to on every navigation) drives the same
  `plannedBrowseView` concept (`'aows'` = grouped view) — also unrelated to `viewMode`.
- Grep of `dashboard-lab.component.ts` shows exactly two `viewMode.set(...)` call sites:
  `openAow()` → `'aow'` and `backToHome()` → `'home'`. All five template call sites of
  `openAow(...)` live **inside** the `@if (viewMode() === 'aow' ...)` block itself (switching
  between AoWs once already in that mode) or a hover flyout — there is no template binding that
  calls `openAow()` from the `'home'` state on this page.

To still obtain the geometry the task asks for, I drove the state directly via Angular
DevTools' exposed `window.ng.getComponent(hostEl)` → `comp.openAow('AOW01')` (a real call to the
component's own public method, not a DOM/CSS hack). Result:

```
viewMode() → 'aow'
aside.pr-panel:  top 0, bottom 960.00006, height 960.00006 === innerH (960)   ✓ matches spec
host.contains(rail): true                                                     ✓ matches spec
app-reporting-program-band (the whole element, not just its inner div): ABSENT from the DOM
```

**`app-reporting-program-band` is not merely hidden — it is entirely removed from the DOM** in
this state (confirmed with `document.querySelector('app-reporting-program-band')` directly, not
just the `> div` selector). So while the rail's own geometry matches the spec exactly, **"band
visible" (part of `SAV-AC-7`'s expected result) fails** in the one state where I could produce
a rail at all.

Given the reachability gap, this reads to me as: `viewMode`/`pr-panel` is either (a) legacy code
from an earlier iteration of this surface (the in-file comment calls it "the old entity-aow
sidebar", and the current AoW browsing is now the `reporting-aow-table` card-in-card hierarchy
+ `plannedBrowseView`), or (b) wired to a different route/screen than `entity-details/SP01`'s
Reporting tab that I did not find. Either way: **`SAV-AC-7` as literally specified could not be
exercised through the UI**, and the one state I could force fails the "band visible" clause.
Flagging for the Leader/user rather than guessing further.

Screenshot: `aow-rail-1280x800.png` (rail open, band absent, forced via `openAow()`).

---

## 6. Row-focus / heading-jump test (`SAV-AC-5`, non-tour half)

**Results page**, row 104/148 (~70th percentile), `scrollIntoView({block:'center'})`:
`target.rect {top:563.2, bottom:615.8}` ⊂ `wa.rect {top:219.5, bottom:960.0}` ✓; `window.scrollY
=== 0` ✓.

**Overview page** (AC-5 names Overview explicitly), heading/button 41/67 (~60th percentile):
`target.rect {top:571.1, bottom:608.6}` ⊂ `wa.rect {top:219.5, bottom:960.0}` ✓; `window.scrollY
=== 0` ✓.

## 7. Guided tour (`SAV-AC-5`, tour half)

"Start guided tour" button found and started successfully from the Results page (driver.js,
`class="driver-active driver-fade"`). Walked all 6 steps via the popover's "Next" button
(`Step 6 of 6` progress text confirms total). Steps in order targeted: `sp-identity`,
`sp-tour-trigger`, `sp-tabs`, `tab-results-view`, (Overview/Reporting shell elements as the tour
navigated pages), and finally the Filters & Quick Actions toolbar strip on Reporting. **None of
the 6 steps targets a below-fold element** — every target was inside the header/band/toolbar
band, always in-fold regardless of scroll position. This is not a failure of the frame-lock
behavior; the tour script itself has no below-fold step to test with in this build/session
state. Screenshot of the final step: `tour-step-6of6-1280x800.png`.

---

## 8. AC-by-AC verdicts

| AC | Scenario | Verdict | Deciding reading |
|---|---|---|---|
| `SAV-AC-1` | Reporting, 1280×800, content > 2× viewport, scrolled to bottom | **PASS** | `tocView=indicators` state: `docScrollH(960)===docClientH(960)`, `wa.scrollH(56536) > wa.clientH(686)`, band {107.50/219.50} and nav {171.50/219.50} bit-identical before/after scroll (§1, §2). SP01's default "aows" view is too short (555px) — the disqualifier's SP02–SP05 suggestion did not help (all ≤567px); the "indicators" browse mode of the *same* Reporting page supplied the needed length. |
| `SAV-AC-2` | Overview, 1280×800, content < viewport | **INCONCLUSIVE** | Checked SP01–SP05: `wa.scrollH` is 3566–4884px vs `wa.clientH` 741–1067px at every one of the 4 viewports — Overview content is consistently *longer* than the viewport for every SP available in this environment. Could not produce the "content < viewport" precondition, so the "no scrollbar / wa bottom = viewport bottom" claim was never actually exercised. |
| `SAV-AC-3` | Any tab, TEST banner on, 1100px (wraps) and 1440px | **PASS** (core claim) / **INCONCLUSIVE** (wrap-specific sub-case) | `band.top === header.bottom` (±1px, consistently ≈0.99px overlap) held at every viewport measured — 800(raw)/1100(raw)/1280/1440/1600, i.e. across both header heights seen (89.56 unwrapped, 108.50 and 141.57 wrapped states) — §1. But the literal "1100px, banner wraps" case is unreachable: requested 1100 reads back as raw `innerW=1320` (≥900 zoom-inflated), and that state shows the *unwrapped* 108.50 header, not a wrapped one — same root-zoom artifact as the 800×1100 case. |
| `SAV-AC-4` | Reporting work area scrolled 1200px → click Results | **PASS** | Overview(long)→Results: band/nav rects bit-identical, new `wa.scrollTop===0`, shadow flips from on (real `scroll` event fired at scrollTop 1200) to `shadow-none` on the new page (§3). |
| `SAV-AC-5` | Overview, tour running / row-focus, below-fold target | **PASS** (row-focus) / **not exercised** (tour) | Row-focus on Overview and Results both: target rect ⊂ wa rect, `scrollY===0` (§6). Guided tour ran to completion (6/6 steps) but has no below-fold step in this build to test against (§7) — not a defect, just nothing to assert on that axis. |
| `SAV-AC-7` | Reporting AOW mode, rail open, scrolled | **FAIL** ("band visible") / rail geometry itself **PASS** — **reachability caveat** | Rail: `top 0, height 960.00006 === innerH`, `host.contains(rail)===true` — matches spec. But `app-reporting-program-band` is entirely absent from the DOM in this state (not just repositioned), so "band visible" fails. More importantly: **no UI click path into `viewMode()==='aow'` was found** from the real Reporting page — I had to invoke `comp.openAow()` directly via `ng.getComponent()`. See §5 for the full trace; recommend the Leader/user confirm whether this surface is still meant to be reachable at all. |
| `SAV-AC-8` | Overview 800×1100, long content | **INCONCLUSIVE** (at literal 800×1100) / **PASS** (confirmed via diagnostic) | At requested 800×1100, raw `innerW=960 ≥ 900` — the min-900px breakpoint never fires, so `hostPosition` stays `absolute`/desktop and `docScrollH===docClientH` (no document scroll) — the *opposite* of AC-8's expectation, purely because of the ×1.2 zoom pushing effective width over 900. At a genuinely sub-900 raw width (700×1100 → raw `innerW=840`), Overview shows exactly what AC-8 expects: `hostPosition:"static"`, `docScrollH(5451) > docClientH(1320)`, `waOverflowY:"visible"` (no work-area scrollbar) — code is correct; the literal 800px viewport just can't reach the branch under local zoom. |
| `SAV-AC-9` | Results, 1280/1440/1600 | **PASS** (doc/wa containment) / **not exercised** (table-wrapper horizontal scroll) | At all three widths: `docScrollW===docClientW` and `waScrollW===waClientW` (1536/1536, 1728/1728, 1920/1920 and 1269/1269, 1461/1461, 1653/1653) — no horizontal overflow leaks to the document or work area. Did not specifically toggle an "all columns" state to force the inner table wrapper itself to overflow — no wide-enough table state was found/tried, so that specific sub-claim is untested. |
| `SAV-AC-10` | Overview ≥ md, open/close "Where to report" modal | **PASS** | band/nav rects bit-identical before open, while open, and after Escape-close; `docScrollH===docClientH` and `docScrollW===docClientW` throughout (§4). |

---

## 9. Screenshots saved

All under `docs/specs/changes/sp-shell-app-viewport/visual-reference/`:

- `after-reporting-1280x800.png` — Reporting, default "aows" view, 1280×800
- `after-reporting-indicators-1280x800-scrolled.png` — Reporting, "indicators" long-content view, scrolled to bottom (`SAV-AC-1` evidence)
- `after-reporting-800x1100.png` — Reporting, 800×1100
- `after-overview-1280x800.png` — Overview, scrolled ~2825px, 1280×800
- `after-results-1280x800.png` — Results, scrolled ~7193px, 1280×800
- `aow-rail-1280x800.png` — AOW rail open (forced via `openAow()`), band absent — §5 evidence
- `tour-step-6of6-1280x800.png` — final guided-tour step (Filters & Quick Actions), for the human review

---

## 10. Not done / limitations

- `SAV-AC-2` precondition (Overview content shorter than viewport) not reproducible with any of
  SP01–SP05 at any of the 4 required viewports.
- `SAV-AC-3`'s literal "1100px, banner wraps" state and the whole "800×1100" viewport's
  sub-900px branch are **unreachable under this environment's ×1.2 root zoom** (requested width
  × 1.2 lands at or above the 900px breakpoint the CSS media query itself checks). This is a
  methodology limitation of testing with root zoom active locally, not a product defect —
  confirmed correct behavior once via a 700×1100 diagnostic that genuinely lands below 900px raw.
  Recommend the Leader/user be aware that reproducing true sub-900px behavior locally requires
  requesting a width below `900/1.2 ≈ 750px`, not the nominal target width.
- `SAV-AC-7`: could not find a real UI trigger for `viewMode()==='aow'`; used
  `ng.getComponent()` + direct method call as a diagnostic substitute. This is a reachability
  finding, not just a measurement gap — flagged for the Leader/user's judgment on whether this
  surface should still exist/be wired up.
- `SAV-AC-9`'s "table wrapper scrolls horizontally" sub-claim (a wide, many-column table
  state) was not specifically forced/tested — no "show all columns" control was found in the
  time available.
- D9 HITL (user's own visual pass) not attempted — out of scope for this task per the brief.
