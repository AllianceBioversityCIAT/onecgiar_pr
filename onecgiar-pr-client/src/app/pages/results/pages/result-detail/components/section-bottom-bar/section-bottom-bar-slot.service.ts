import { Injectable, signal } from '@angular/core';

/**
 * Where the result-detail layout wants the section bottom bar rendered.
 *
 * The bar is DECLARED by each section (`rd-general-information`, `rd-evidences`, …) because only
 * the section knows its own `(clickSave)`, `[disabled]` and `[editable]`, but it has to be
 * RENDERED as a sibling of the scroll container — the mockup keeps it outside `#pg-scroll`, on
 * the floor of the content column, edge to edge.
 *
 * Those two facts cannot both be satisfied where the bar is declared: nested inside
 * `.section_container` (95% wide) and `.detail_container` (80px of side padding), it is a
 * grandchild, and no CSS turns a grandchild into a flex sibling of its grandparent. Sticky does
 * not help either — it changes when an element paints, never its containing block, so the bar
 * kept the 885px width of its ancestor instead of the column's 1100px.
 *
 * So the layout publishes a slot element here and the bar moves its own host node into it —
 * the same DOM teleport a CDK portal performs. Angular keeps owning the component: inputs,
 * outputs, change detection and destruction are untouched, because it removes a node through
 * its CURRENT parent. Compared with hoisting the bar's state into a service, this keeps every
 * section's bindings exactly as they are, including the two `*ngIf`s.
 */
@Injectable({ providedIn: 'root' })
export class SectionBottomBarSlotService {
  /** Set by the layout while result-detail is mounted; null everywhere else. */
  readonly slot = signal<HTMLElement | null>(null);
}
