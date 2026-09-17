/**
 * Whether an inline `.custom_select` panel should open ABOVE its trigger (P2-3737).
 *
 * The panel hangs from the field (`top: 100%`), so a field near the floor of the screen paints its
 * options under the floating bottom bar and past the window edge — the last partners could not be
 * seen or clicked. The PrimeNG dropdown this replaced flipped upwards when it did not fit; this is
 * that rule.
 *
 * The floor is the scroll container's bottom MINUS its bottom padding: the result-detail and
 * bilateral scrollers reserve exactly the zone their floating bottom bar covers there (88px), so
 * the padding is the honest "where the visible form ends". Without a scroller, the window.
 *
 * Opens upwards only when the panel does not fit below AND fits ENTIRELY above. A panel that fits
 * nowhere keeps opening downwards, as it always did: flipping it would only move the cut to the top
 * edge, where the search box — the one thing needed to find the option — is the part that gets lost.
 */
export function shouldOpenUpward(trigger: HTMLElement, panel: HTMLElement, gap = 8): boolean {
  const panelHeight = panel.offsetHeight;
  if (!panelHeight) return false;

  const field = trigger.getBoundingClientRect();
  const scroller = scrollParent(trigger);
  let floor = window.innerHeight;
  let ceiling = 0;
  if (scroller) {
    const box = scroller.getBoundingClientRect();
    floor = Math.min(floor, box.bottom - (parseFloat(getComputedStyle(scroller).paddingBottom) || 0));
    ceiling = Math.max(ceiling, box.top);
  }

  const below = floor - field.bottom - gap;
  const above = field.top - ceiling - gap;
  return panelHeight > below && panelHeight <= above;
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}
