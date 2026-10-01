/**
 * ICM-T-1 fallback probe (P-9 refuted — design.md P-9, `UNVERIFIED — confirm at source before
 * relying on it`). Paste into the browser DevTools console on an authenticated PRMS session, on
 * an IPSR page, AFTER manually opening any `app-pr-dialog` panel (Step 2.1 "New complementary
 * innovation" or a Step 4 sibling such as "Add partner" — ICM-AC-6). Run it once before `ICM-T-2`
 * and once after; paste both `console.table` outputs + verdict lines into `execution.md`.
 *
 * Generic over any open `.pr-dialog` panel (ICM-AC-6): it reads the live panel/sidebar/header
 * rects at run time, never hard-coded pixels. Probe points are derived from rect intersections —
 * when an intersection is empty (e.g. the sidebar is hidden below the `md` breakpoint, or a panel
 * has no `.pr-dialog__close` at all), that probe is reported `n/a`, never `PASS`. Before `ICM-T-3`
 * every Step 4 "Add ..." modal rendered `[showHeader]="false"` with no close control at all; after
 * `ICM-T-3` (`ICM-DD-2`) the 6 header-less IPSR modals (including every Step 4 "Add ..." modal) set
 * `[floatingClose]="true"` and DO render a `.pr-dialog__close`, so probe (c) now applies there too.
 *
 * Probes (requirements.md ICM-AC-1..6, design.md §10):
 *   (a) a panel point that also lies inside the sidebar's rect       → must resolve inside the panel
 *   (b) a panel top-row point that also lies inside the header's rect → must resolve inside the panel
 *   (c) the × center (`.pr-dialog__close`, or its icon)               → must resolve to the × itself
 *   (d) a sidebar point OUTSIDE the panel                             → must resolve to `.pr-dialog-mask`
 *   + centering: |left gap − right gap| <= 2 CSS px
 *
 * REWORK (attempt 2, `execution-reviews/icm-t1-a1.md` item 1, required fix):
 *  - The overall verdict is never a pass resting on zero stacking probes: if (a), (b) AND (c) are
 *    all `n/a` (e.g. a panel that overlaps neither the sidebar nor the header and has no ×), the
 *    run prints `ICM-PROBE INCONCLUSIVE`, never `ICM-PROBE PASS`.
 *  - Reliability (advisory, applied): before probing, checks that every `.section_container` in the
 *    DOM has finished animating (`getAnimations()` empty or all `finished`, design §13) — if one is
 *    still playing, it reports the precondition failure and returns instead of probing a moving
 *    target. The sidebar rect is read from the painted fixed box `[data-slot="sidebar-container"]`
 *    (`hlm-sidebar.ts:47,81`), falling back to the `hlm-sidebar` host if that slot is absent. Probe
 *    (b)'s "top row" is the `.pr-dialog__header` rect when the panel has one, else the whole panel
 *    rect (panel∩header) — no more hard-coded pixel height.
 */
(function icmProbe() {
  const toRect = domRect => ({ left: domRect.left, right: domRect.right, top: domRect.top, bottom: domRect.bottom });

  const intersectionCenter = (a, b) => {
    const left = Math.max(a.left, b.left);
    const right = Math.min(a.right, b.right);
    const top = Math.max(a.top, b.top);
    const bottom = Math.min(a.bottom, b.bottom);
    if (left >= right || top >= bottom) return null;
    return { x: (left + right) / 2, y: (top + bottom) / 2 };
  };

  const pointInsideRect = (p, r) => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;

  const describeEl = el => {
    if (!el) return '(none)';
    const id = el.id ? `#${el.id}` : '';
    const cls = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 80);
  };

  // All open dialogs are `.pr-dialog` rendered inside `.pr-dialog-mask` (pr-dialog.component.html).
  // If more than one is somehow open, the last in DOM order is the most recently opened.
  const masks = Array.from(document.querySelectorAll('.pr-dialog-mask'));
  const mask = masks[masks.length - 1];
  const panel = mask ? mask.querySelector('.pr-dialog') : document.querySelector('.pr-dialog');

  const rows = [];
  const fails = [];
  const evaluated = { a: false, b: false, c: false };

  if (!panel || panel.getBoundingClientRect().width === 0) {
    console.log('ICM-PROBE FAIL: precondition — no visible .pr-dialog found. Open the modal first, then re-run this snippet.');
    return;
  }

  // Reliability (design §13): a `.section_container` ancestor's retained fade keeps its element a
  // stacking context, but while the animation is STILL PLAYING the probe can go red for the wrong
  // reason. This snippet is a single paste-and-run, not a retry loop, so it checks once and reports
  // instead of probing a moving target — re-run after the animation settles.
  const stillPlaying = Array.from(document.querySelectorAll('.section_container')).some(el =>
    el.getAnimations().some(a => a.playState !== 'finished')
  );
  if (stillPlaying) {
    console.log('ICM-PROBE FAIL: precondition — a .section_container animation is still playing. Re-run this snippet after it settles.');
    return;
  }

  const sidebarEl = document.querySelector('hlm-sidebar');
  const headerEl = document.querySelector('.app-shell-header');
  const closeEl = panel.querySelector('.pr-dialog__close');

  const context = {
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    sidebarState: sidebarEl ? sidebarEl.getAttribute('data-state') : '(no hlm-sidebar found)',
    panel: describeEl(panel)
  };

  if (!sidebarEl) {
    console.log('ICM-PROBE FAIL: precondition — no hlm-sidebar found in the DOM.');
    return;
  }
  if (!headerEl) {
    console.log('ICM-PROBE FAIL: precondition — no .app-shell-header found in the DOM.');
    return;
  }

  // Painted fixed box, not the in-flow host (hlm-sidebar.ts:47,81, `data-slot="sidebar-container"`).
  // The two only match while the page is unscrolled — fall back to the host if the slot is absent
  // (older markup / a harness mirror).
  const sidebarContainerEl = sidebarEl.querySelector('[data-slot="sidebar-container"]');
  const sidebarRect = toRect((sidebarContainerEl || sidebarEl).getBoundingClientRect());
  const headerRect = toRect(headerEl.getBoundingClientRect());
  const panelRect = toRect(panel.getBoundingClientRect());

  // Centering: |left gap - right gap| <= 2 CSS px (ICM-R-3 / AC-3).
  const leftGap = panelRect.left;
  const rightGap = window.innerWidth - panelRect.right;
  const gapDelta = Math.abs(leftGap - rightGap);
  const centeringPass = gapDelta <= 2;
  rows.push({
    probe: 'centering',
    point: `leftGap=${leftGap.toFixed(1)} rightGap=${rightGap.toFixed(1)}`,
    topmost: `delta=${gapDelta.toFixed(1)}px`,
    result: centeringPass ? 'PASS' : 'FAIL'
  });
  if (!centeringPass) fails.push('centering');

  // Probe (a): panel point inside the sidebar rect.
  const pointA = intersectionCenter(panelRect, sidebarRect);
  if (!pointA) {
    rows.push({ probe: '(a) panel∩sidebar', point: 'n/a (no overlap)', topmost: 'n/a', result: 'n/a' });
  } else {
    evaluated.a = true;
    const elA = document.elementFromPoint(pointA.x, pointA.y);
    const passA = !!elA && panel.contains(elA);
    rows.push({ probe: '(a) panel∩sidebar', point: `${pointA.x.toFixed(0)},${pointA.y.toFixed(0)}`, topmost: describeEl(elA), result: passA ? 'PASS' : 'FAIL' });
    if (!passA) fails.push('a');
  }

  // Probe (b): panel top row inside the header rect. The "top row" is the `.pr-dialog__header` rect
  // when the panel has one; otherwise fall back to the whole panel rect (panel∩header) — never a
  // hard-coded pixel height (execution-reviews/icm-t1-a1.md advisory).
  const headerRowEl = panel.querySelector('.pr-dialog__header');
  const panelTopRow = headerRowEl ? toRect(headerRowEl.getBoundingClientRect()) : panelRect;
  const pointB = intersectionCenter(panelTopRow, headerRect);
  if (!pointB) {
    rows.push({ probe: '(b) panelTopRow∩header', point: 'n/a (no overlap)', topmost: 'n/a', result: 'n/a' });
  } else {
    evaluated.b = true;
    const elB = document.elementFromPoint(pointB.x, pointB.y);
    const passB = !!elB && panel.contains(elB);
    rows.push({ probe: '(b) panelTopRow∩header', point: `${pointB.x.toFixed(0)},${pointB.y.toFixed(0)}`, topmost: describeEl(elB), result: passB ? 'PASS' : 'FAIL' });
    if (!passB) fails.push('b');
  }

  // Probe (c): the × center (or its icon). n/a when this panel has no close button at all. Before
  // `ICM-T-3` this was every Step 4 "Add ..." modal ([showHeader]="false"); after `ICM-T-3` those
  // 6 modals set [floatingClose]="true" and DO render a .pr-dialog__close.
  if (!closeEl) {
    rows.push({ probe: '(c) × center', point: 'n/a (no .pr-dialog__close in this panel)', topmost: 'n/a', result: 'n/a' });
  } else {
    evaluated.c = true;
    const r = closeEl.getBoundingClientRect();
    const pointC = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const elC = document.elementFromPoint(pointC.x, pointC.y);
    const passC = !!elC && (elC === closeEl || closeEl.contains(elC));
    rows.push({ probe: '(c) × center', point: `${pointC.x.toFixed(0)},${pointC.y.toFixed(0)}`, topmost: describeEl(elC), result: passC ? 'PASS' : 'FAIL' });
    if (!passC) fails.push('c');
  }

  // Probe (d): a sidebar point OUTSIDE the panel must resolve to the mask.
  const outsidePoint = { x: sidebarRect.left + 4, y: sidebarRect.top + 4 };
  if (pointInsideRect(outsidePoint, panelRect)) {
    rows.push({ probe: '(d) sidebar\\panel → mask', point: 'n/a (panel covers this sidebar corner)', topmost: 'n/a', result: 'n/a' });
  } else {
    const elD = document.elementFromPoint(outsidePoint.x, outsidePoint.y);
    const passD = !!elD && !!elD.closest('.pr-dialog-mask');
    rows.push({
      probe: '(d) sidebar\\panel → mask',
      point: `${outsidePoint.x.toFixed(0)},${outsidePoint.y.toFixed(0)}`,
      topmost: describeEl(elD),
      result: passD ? 'PASS' : 'FAIL'
    });
    if (!passD) fails.push('d');
  }

  console.log(`ICM-PROBE context: viewport=${context.viewport} sidebarState=${context.sidebarState} panel=${context.panel}`);
  console.table(rows);

  if (fails.length > 0) {
    console.log(`ICM-PROBE FAIL: ${fails.join(', ')}`);
  } else if (!evaluated.a && !evaluated.b && !evaluated.c) {
    // A pass resting on zero stacking probes is not a pass (execution-reviews/icm-t1-a1.md item 2).
    console.log('ICM-PROBE INCONCLUSIVE: no stacking probe — (a), (b) and (c) were all n/a');
  } else {
    console.log('ICM-PROBE PASS');
  }
})();
