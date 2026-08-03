<!-- ⚠️ SUPERSEDED on 2026-08-03. The current reference is ../prms-shell-CURRENT/ —
     a newer export that also covers the shell and the Overview tab, and whose rendered PNG
     corrects several things this folder left ambiguous (the KPI counter, what the ratio counts,
     the default disclosure state). This folder is kept for history only.
     When the two disagree, prms-shell-CURRENT wins. -->

# ⚠️ LEGACY — superseded by [`../prms-shell-CURRENT/`](../prms-shell-CURRENT/)

# PRMS Reporting Tool — design mockup (reference)

**This is the authoritative visual reference for the PRMS reporting redesign.** It is the source the
violet design-token system was extracted from. Treat it as read-only: never edit these files to
"fix" something — the mockup records what was designed, the repo records what was built.

- **Origin:** Claude Design project, exported by the designer as **Project archive** (`Export → Project archive`) on **2026-07-31**.
- **Received as:** `PRMS Reporting Tool.zip` (4 files, 348 KB unpacked).
- **Related work:** [`../../../onecgiar-pr-client/docs/design-system-violet-migration.md`](../../../onecgiar-pr-client/docs/design-system-violet-migration.md) — the extracted palette, the token plan, and the migration state.

---

## What is in here

| File | What it is |
|---|---|
| `Resultados.dc.html` | The mockup, 3 200 lines. All styling is **inline** on each element, so every colour, size, radius and shadow is readable directly from the markup. |
| `support.js` | The Claude Design client runtime, 1 911 lines. Also contains the mock **data model** (`CYCLE`, `SUBMITTERS`, the cycle-chip threshold logic at ~line 2689, …). |
| `screenshots/reporting-table.png` | Rendered reference of the reporting table + sidebar, as the designer saw it. |

---

## ⚠️ It does NOT render in a browser

**Verified on 2026-07-31** (served over `http://127.0.0.1` and opened in Chrome via Playwright):
the static markup and inline styles paint, but every dynamic binding stays literal — the console
reports `<path> attribute d: Expected moveto path command, "{{ ov.areaPath }}"` and similar for
7 SVG attributes, and `{{ placeholders }}` appear as text.

**Why:** the export is in Claude Design's own template format, not plain HTML — `<x-dc>`, `<sc-if>`,
`<sc-for>` and `{{ expression }}` bindings. `support.js` does not resolve them standalone.

**So use it as a spec, not as a prototype.** Read the markup; do not judge the design from an
unrendered screenshot of it. For the visual truth, use `screenshots/reporting-table.png`.

**If you need a navigable prototype**, ask the designer for `Export → Standalone HTML` instead
(that variant renders offline, but it costs the designer a Claude session and it only captures the
*one* state that happened to be rendered — see below).

---

## Why the archive beats a rendered export, for our purposes

Counter-intuitive but true: the unrendered template is **more** useful for porting to Angular.

- Every conditional state is **explicit and readable** — `<sc-if>` blocks expose the collapsed vs
  expanded sidebar, tooltips, empty lists, badges with and without counts. A rendered export shows
  only the state that happened to be active and silently drops the rest.
- Those conditionals map almost one-to-one onto Angular's `@if` / `@for`.
- Colours are inline hex, so they can be counted and ranked by real usage frequency.

---

## What the archive does NOT contain

The **project chat** — i.e. the design rationale, the discarded alternatives, the edge cases that
were discussed. No HTML export carries it. Only `Export → Hand off to Claude Code` bundles the
design files **plus the chat plus a README**.

**Consequence:** the *what* is fully documented here; the *why* is not. If a design decision looks
arbitrary, it may simply be undocumented — ask before "correcting" it.

---

## Useful anchors inside the files

| What | Where |
|---|---|
| Global type + base colours + focus ring | `Resultados.dc.html:14-24` (the `<style>` in `<helmet>`) |
| Sidebar (dark, `#271862`) — collapsed and expanded variants | `Resultados.dc.html:28-180` |
| User account button + avatar chip (`#EDE9FE` on `#5733C4`) | `Resultados.dc.html:266-273` |
| Cycle-chip threshold logic and its 4 colour pairs | `support.js` region around `Resultados.dc.html:2687-2693` |
| Primary buttons (`#6B46E5` + `rgba(25,21,36,.08)` shadow) | `Resultados.dc.html:333, 358, 569` |

---

## Fonts used by the mockup

`Instrument Sans`, `Inter`, `JetBrains Mono` (loaded from Google Fonts at `Resultados.dc.html:13`).

⚠️ The app currently ships **Manrope** (`onecgiar-pr-client/src/styles/fonts.scss`). The typography
side of this redesign is **not** decided yet — the token work covers colour only. Do not assume
these three families are approved.
