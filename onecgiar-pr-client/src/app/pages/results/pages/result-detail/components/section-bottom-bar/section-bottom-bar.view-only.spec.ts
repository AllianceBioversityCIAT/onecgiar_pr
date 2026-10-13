import { readFileSync } from 'fs';
import { join } from 'path';
import { SectionBottomBarComponent } from './section-bottom-bar.component';

/** Read-only users see a neutral "View only" chip instead of the missing-fields counter and list. */
describe('SectionBottomBarComponent — View only chip for read-only users', () => {
  const build = (rolesSE: any, currentResult: any = {}) => {
    const c: any = Object.create(SectionBottomBarComponent.prototype);
    Object.defineProperty(c, 'rolesSE', { value: rolesSE });
    Object.defineProperty(c, 'dataControlSE', { value: { currentResult } });
    c.editable = false;
    return c;
  };

  describe('behaviour', () => {
    it('read-only user cannot save, so the bar shows View only', () => {
      expect(build({ readOnly: true }).canSave).toBe(false);
    });
    it('editor keeps the counter (canSave true)', () => {
      expect(build({ readOnly: false }).canSave).toBe(true);
    });
    it('reason: closed phase', () => {
      expect(build({ readOnly: true, platformIsClosed: true }).viewOnlyReason()).toMatch(/phase is closed/);
    });
    it('reason: not a member of the result program', () => {
      const c = build({ readOnly: true, isAdmin: false, validateInitiative: () => false }, { initiative_id: 5 });
      expect(c.viewOnlyReason()).toMatch(/not a member/);
    });
    it('reason unknown: generic sentence', () => {
      expect(build({ readOnly: true }).viewOnlyReason()).toBe('You can view this result but not edit it.');
    });
  });

  describe('markup', () => {
    const html = readFileSync(join(__dirname, 'section-bottom-bar.component.html'), 'utf8');
    it('the chip is the first branch, ahead of the complete / missing-fields branches', () => {
      const chip = html.indexOf('@if (!canSave) {');
      expect(chip).toBeGreaterThan(-1);
      expect(chip).toBeLessThan(html.indexOf('@else if (isComplete())'));
      expect(chip).toBeLessThan(html.indexOf('data-testid="section-bottom-bar-pending"'));
      expect(html).toContain('data-testid="section-bottom-bar-view-only"');
    });
    it('chip has no red/amber styling', () => {
      const chip = html.slice(html.indexOf('@if (!canSave) {'), html.indexOf('@else if (isComplete())'));
      expect(chip).not.toMatch(/(orange|red|amber)-\d/);
    });
  });
});
