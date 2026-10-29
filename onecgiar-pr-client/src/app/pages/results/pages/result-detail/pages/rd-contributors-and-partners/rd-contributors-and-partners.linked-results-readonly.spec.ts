import { readFileSync } from 'fs';
import { join } from 'path';
import { RdContributorsAndPartnersComponent } from './rd-contributors-and-partners.component';

/**
 * R2-1 — the hand-made "Please select a result" linked-results panel ignored read-only: a user who can only
 * look at the result could open it, tick/untick, "Clear selection" and remove the linked result, and the
 * "N fields missing" counter jumped. Same guard the sibling lists use: `this.api.rolesSE.readOnly`.
 */
describe('RdContributorsAndPartnersComponent — linked-results selector is locked for read-only users (R2-1)', () => {
  const build = (readOnly: boolean) => {
    const c: any = Object.create(RdContributorsAndPartnersComponent.prototype);
    c.api = { rolesSE: { readOnly } };
    c.rdPartnersSE = { partnersBody: { linked_results: [11, 22] } };
    c.isLinkedResultsPanelExpanded = false;
    return c;
  };

  describe('behaviour', () => {
    it('read-only: the panel does not open', () => {
      const c = build(true);
      c.toggleLinkedResultsPanel();
      expect(c.isLinkedResultsPanelExpanded).toBe(false);
    });

    it('read-only: selecting / unselecting does nothing', () => {
      const c = build(true);
      c.toggleResultSelection(11);
      c.toggleResultSelection(33);
      expect(c.rdPartnersSE.partnersBody.linked_results).toEqual([11, 22]);
    });

    it('read-only: Clear selection keeps the stored linked results', () => {
      const c = build(true);
      c.clearLinkedResultsSelection();
      expect(c.rdPartnersSE.partnersBody.linked_results).toEqual([11, 22]);
    });

    it('editor: opens, toggles and clears exactly as before', () => {
      const c = build(false);
      c.toggleLinkedResultsPanel();
      expect(c.isLinkedResultsPanelExpanded).toBe(true);
      c.toggleResultSelection(11);
      expect(c.rdPartnersSE.partnersBody.linked_results).toEqual([22]);
      c.toggleResultSelection(33);
      expect(c.rdPartnersSE.partnersBody.linked_results).toEqual([22, 33]);
      c.clearLinkedResultsSelection();
      expect(c.rdPartnersSE.partnersBody.linked_results).toEqual([]);
    });
  });

  describe('markup', () => {
    const html = readFileSync(join(__dirname, 'rd-contributors-and-partners.component.html'), 'utf8');
    const start = html.indexOf('data-testid="cp-field-linked_results"');
    const end = html.indexOf('labelText="Please select a result"');
    const block = html.slice(start, end);

    it('the whole selector (toggle, checkboxes, Clear selection) sits inside a not-readOnly guard', () => {
      const guard = block.indexOf('@if (!this.api.rolesSE.readOnly)');
      expect(guard).toBeGreaterThan(-1);
      expect(guard).toBeLessThan(block.indexOf('toggleLinkedResultsPanel()'));
      expect(guard).toBeLessThan(block.indexOf('clearLinkedResultsSelection()'));
      expect(guard).toBeLessThan(block.indexOf('(click)="toggleResultSelection(r.id)"'));
    });

    it('the remove icon of each selected chip is guarded, the chips themselves stay visible', () => {
      const chips = block.slice(block.indexOf('selected_container'));
      expect(chips).toContain('formatResultLabel(getResultById(id))');
      const guard = chips.indexOf('@if (!this.api.rolesSE.readOnly)');
      expect(guard).toBeGreaterThan(-1);
      expect(guard).toBeLessThan(chips.indexOf('remove_circle'));
    });

    it('the missing-field validator stays outside the guard (counter unchanged for everyone)', () => {
      expect(html).toContain('<div appFeedbackValidation labelText="Please select a result" [isComplete]="!!this.rdPartnersSE.partnersBody.linked_results?.length"></div>');
    });
  });
});
