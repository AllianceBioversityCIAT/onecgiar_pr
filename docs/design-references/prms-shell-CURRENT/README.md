# PRMS Shell — authoritative design reference

**This is the only design reference we use.** Delivered **2026-08-04** from Claude Design.
Older exports (`legacy-prms-reporting-tool-mockup/`, previous CURRENT snapshots) were removed.

| | |
|---|---|
| **Claude Design (live)** | https://claude.ai/design/p/b6234307-e82b-43d0-b4c4-a2bb13b12242?file=PRMS+Shell.dc.html&via=share |
| **Local export** | this folder |
| **Source zip** | `PRMS Reporting Tool interface (2).zip` (2026-08-04) |
| **Markup** | `PRMS-Shell.dc.html` (**4 768** lines; all styles inline) |
| **Runtime / mock data** | `support.js` — **not for porting**; app data comes from our API |

Specs that implement against this folder:

- `onecgiar-pr-client/docs/reporting-redesign/UI-RULES.md`
- `onecgiar-pr-client/docs/reporting-redesign/SIDEBAR-SPEC.md`
- `onecgiar-pr-client/docs/reporting-redesign/PROGRAM-SHELL-SPEC.md`
- `onecgiar-pr-client/docs/reporting-redesign/MIGRATION-CONTEXT.md`

---

## What’s in here

| File | Role |
|---|---|
| `PRMS-Shell.dc.html` | Full shell: sidebar, topbar, program band, Overview, Reporting table, drawers. Read px/hex from the markup. |
| `support.js` | Claude Design runtime + mock model. Structure/thresholds only — never copy as app data. |
| `uploads/pasted-1785766366426-0.png` | ⭐ Rendered **Reporting** tab (primary visual truth). |
| `uploads/pasted-1785716279276-0.png` | Additional render (AoW / row detail). |
| `uploads/pasted-1785773813131-0.png` | Table header fragment. |
| `uploads/pasted-1785774165129-0.png` | Column fragment. |
| `uploads/pasted-1785789778275-0.png` | New strip from this export (band / toolbar region). |

---

## How to use it

1. **Visual truth** → PNGs in `uploads/`.
2. **Exact values** (px, hex, gaps, weights) → inline styles in `PRMS-Shell.dc.html`.
3. **App code** → implement in Angular; do not ship `support.js` or mock arrays.

⚠️ The HTML **does not render standalone** in a normal browser (`<x-dc>`, `{{ }}`, Claude Design template). Open the live share link or read markup + PNGs.

---

## When this and the app disagree

1. Live Claude Design link (above) if it still matches this export.  
2. This folder’s **PNG** for ambiguous layout.  
3. This folder’s **markup** for numeric tokens.  
4. `UI-RULES.md` for stack decisions (Manrope, 12px root, tokens, etc.).

Specs under `reporting-redesign/` may still cite old line numbers; re-anchor when editing them. Values should be re-checked against **this** export.

---

## Replace procedure (next designer drop)

```bash
# From repo root
rm -rf docs/design-references/prms-shell-CURRENT
mkdir -p docs/design-references/prms-shell-CURRENT
unzip -q "/path/to/PRMS Reporting Tool interface.zip" -d /tmp/prms-shell-new
cp "/tmp/prms-shell-new/PRMS Shell.dc.html" docs/design-references/prms-shell-CURRENT/PRMS-Shell.dc.html
cp /tmp/prms-shell-new/support.js docs/design-references/prms-shell-CURRENT/
cp -R /tmp/prms-shell-new/uploads docs/design-references/prms-shell-CURRENT/
# Update the date + share URL in this README.
```

Keep **one** folder. Do not reintroduce a `legacy-*` tree unless product explicitly archives a historical mock.
