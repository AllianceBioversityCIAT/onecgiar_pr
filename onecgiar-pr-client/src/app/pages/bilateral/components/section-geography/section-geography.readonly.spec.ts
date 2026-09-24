import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * P2-3788 — read-only has to reach the SUB-NATIONAL controls too.
 *
 * `app-sub-geoscope` already honours `readOnly` (it hides the country delete icon, the
 * sub-national picker and the per-entry remove icon — `sub-geoscope.component.html:9,27,51`),
 * but this section passed a hard `[readOnly]="false"` to both of its instances since
 * `a3a7156e3` (15-jul-2026). On a result that has left Editing the autosave refuses every write
 * (P2-3520), so the screen offered deletions that could never persist: the reporter removed a
 * country, reloaded, and it was still there.
 *
 * The assertion is on the MARKUP, on purpose: the sibling `section-geography.component.spec.ts`
 * stubs the template with `overrideTemplate(..., '<div></div>')`, which is exactly the hole that
 * let the same class of defect through in `section-contributors` (see its `.readonly.spec.ts`).
 */
describe('SectionGeographyComponent · P2-3788 read-only reaches sub-national controls', () => {
  const rawTemplate = readFileSync(join(__dirname, 'section-geography.component.html'), 'utf8');
  /**
   * Comments are stripped first: this file documents the defect by quoting the very binding the
   * assertions below forbid, and a comment is not markup. Without this the spec fails on its own
   * explanation — which is a false alarm, and a spec that cries wolf gets deleted.
   */
  const template = rawTemplate.replace(/<!--[\s\S]*?-->/g, '');

  /** Every `<app-sub-geoscope …>` opening tag with its attributes. */
  const subGeoscopeTags = template.match(/<app-sub-geoscope[\s\S]*?>/g) ?? [];

  it('renders both sub-geoscope blocks — the main scope and the extra scope', () => {
    // Oracle for the count: losing one silently would make the rest of this spec vacuous.
    expect(subGeoscopeTags).toHaveLength(2);
  });

  it('never hard-codes readOnly to false on a sub-geoscope', () => {
    for (const tag of subGeoscopeTags) {
      expect(tag).not.toMatch(/\[readOnly\]\s*=\s*"false"/);
    }
  });

  it('binds every sub-geoscope to the section read-only gate', () => {
    for (const tag of subGeoscopeTags) {
      // Night sweep 2026-09-23 (R-3 / R-4): the gate is now `locked()` = `readOnly() || not loaded`,
      // a superset of the P2-3788 gate (pinned in the component spec), so a locked result stays locked.
      expect(tag).toMatch(/\[readOnly\]\s*=\s*"locked\(\)"/);
    }
  });

  it('keeps the rest of the section on the same gate — no control is left permanently editable', () => {
    // A `false` literal anywhere in a readOnly binding is the shape this ticket is about.
    const hardFalseBindings = template.match(/\[readOnly\]\s*=\s*"false"/g) ?? [];
    expect(hardFalseBindings).toHaveLength(0);
  });
});
