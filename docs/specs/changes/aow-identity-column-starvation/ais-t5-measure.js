// AIS-T-5 part (2) — real-page measurement for `changes/aow-identity-column-starvation` (AIS-AC-5).
// HOW TO RUN: open http://localhost:4200/result-framework-reporting/entity-details/SP04/overview
// logged in, resize the window to each of 1600 / 1280 / 1100 / 900 / 768 px wide (DevTools device
// toolbar or window resize), wait for the AoW rows to load, paste this whole file into the DevTools
// console and press Enter. Repeat with the scope filter OFF and then ON. Copy each printed table into
// execution.md §2 AIS-T-5. The script double-reads (two animation frames) and refuses to report while
// any skeleton is present, per requirements.md AIS-AC-5.
(async () => {
  const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const read = () => {
    const wrapper = document.querySelector('[data-testid="aow-rows"]');
    if (!wrapper) return { error: 'no [data-testid="aow-rows"] — section collapsed or not rendered' };
    if (document.querySelector('[data-testid="aow-rows-skeleton"]')) return { error: 'skeleton present — wait and re-run' };
    const rows = Array.from(wrapper.children);
    if (!rows.length) return { error: 'rows === 0' };
    const Q = wrapper.clientWidth - 40; // container-query width (p-[20px] × 2)
    return {
      viewport: window.innerWidth,
      Q,
      pageOverflow: document.documentElement.scrollWidth !== document.documentElement.clientWidth,
      rows: rows.map((row, i) => {
        const identity = row.children[0];
        const button = identity.children[0];
        const chip = button.children[1];
        const name = button.children[2].children[0];
        const info = identity.children[1];
        const achv = row.children[3];
        return {
          row: i,
          code: chip.textContent.trim(),
          tracks: getComputedStyle(row).gridTemplateColumns,
          identityPx: Math.round(identity.getBoundingClientRect().width * 10) / 10,
          namePx: name.clientWidth,
          nameTruncated: name.scrollWidth > name.clientWidth,
          chipInside: chip.getBoundingClientRect().right <= identity.getBoundingClientRect().right + 0.5,
          rowOverflow: row.scrollWidth !== row.clientWidth,
          achievementShown: getComputedStyle(achv).display !== 'none',
          infoShown: !!info && getComputedStyle(info).display !== 'none'
        };
      })
    };
  };
  await raf(); const a = read(); await raf(); const b = read();
  if (a.error || b.error) { console.warn('AIS-T-5:', a.error || b.error); return; }
  const stable = JSON.stringify(a.rows.map(r => r.tracks)) === JSON.stringify(b.rows.map(r => r.tracks));
  console.log(`AIS-T-5 @ viewport ${b.viewport}px · Q=${b.Q}px · pageOverflow=${b.pageOverflow} · double-read stable=${stable}`);
  console.table(b.rows);
  const bad = b.rows.filter(r => r.namePx < 80 || !r.chipInside || r.rowOverflow || (Number(r.achievementShown) + Number(r.infoShown)) !== 1);
  console.log(bad.length ? `❌ ${bad.length} row(s) violate AIS-AC-5` : '✅ all rows: name ≥ 80px, chip inside, no overflow, exclusivity holds');
})();
