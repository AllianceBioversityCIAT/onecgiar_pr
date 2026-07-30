## Context

The results list table (`results-list.component.html`) renders the **Center** column from each result's `lead_center` field. The current binding (line 124) is:

```html
column.attr === 'lead_center' ? (subResult.lead_center || 'Undefined') : ...
```

When `lead_center` is falsy (null / empty — which happens when the result is led by an external partner, not a CGIAR center), the `|| 'Undefined'` branch renders the literal string `"Undefined"`. QA reported this as P2-3049.

## Goals / Non-Goals

**Goals:**
- The Center cell renders **blank** (empty string) when a result has no lead center.
- Document, in code, the future intent to display the lead partner when no center exists.

**Non-Goals:**
- Resolving and displaying the actual lead partner name when `lead_center` is absent (future change).
- Any backend / API / payload changes.
- Touching the IPSR list (it has no `lead_center` column — verified).

## Decisions

- **Minimal template fix:** change the fallback `'Undefined'` to `''` in the existing ternary. No new component logic, no pipe, no service change — keeps the fix quirurgical and low-risk.
- **Document future scope inline:** add a `TODO (P2-3049)` HTML comment next to the binding so the next developer knows the empty cell is intentional and that the long-term behavior is to fall back to the lead partner.

## Risks / Trade-offs

- **Empty cell vs. placeholder:** showing a blank cell (instead of e.g. a dash) is the explicitly requested behavior. Trade-off accepted: a blank cell reads as "no center" rather than a broken value.
- Very low risk: single-line template change, no behavioral change for results that *do* have a lead center.
