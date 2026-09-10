import { PolicyChangeInfoComponent } from './policy-change-info.component';
import { InnovationUseInfoBody } from './model/innovationUseInfoBody';

/**
 * P2-2932 AC4 — the count that makes the "capacity development of key actors" sub-category
 * comparable against the ToC contribution.
 *
 * ⚠️ In its own file rather than in `policy-change-info.component.spec.ts`, because that spec's
 * TestBed harness fails on the 20th fixture it creates: two tests asserting nothing but
 * `true === true` reproduce it, so the limit is the count of `createComponent` calls, not the
 * content. Pre-existing and unrelated to this ticket; adding five tests there would have made a
 * green suite red for the wrong reason.
 *
 * These need no fixture — both behaviours are plain component logic — so they run without a
 * TestBed at all.
 */
describe('PolicyChangeInfoComponent — number of key actors influenced (P2-2932 AC4)', () => {
  let component: PolicyChangeInfoComponent;

  beforeEach(() => {
    component = Object.create(
      PolicyChangeInfoComponent.prototype,
    ) as PolicyChangeInfoComponent;
    component.innovationUseInfoBody = new InnovationUseInfoBody();
    component.relatedTo = '';
  });

  describe('when the field is shown', () => {
    it('stays hidden for a plain policy change and for no answer', () => {
      component.relatedTo = '50';
      expect(component.showActorsInfluenced()).toBe(false);

      component.relatedTo = '';
      expect(component.showActorsInfluenced()).toBe(false);
    });

    it('appears for the capacity-of-actors sub-category', () => {
      component.relatedTo = '51';

      expect(component.showActorsInfluenced()).toBe(true);
    });

    // The select binds the id as a string; comparing without coercion would never show the field.
    it('matches the answer id whether it arrives as a string or a number', () => {
      component.relatedTo = 51 as unknown as string;

      expect(component.showActorsInfluenced()).toBe(true);
    });
  });

  describe('clearing the count', () => {
    /**
     * A stale count on a result that is no longer about actors would still be compared against the
     * ToC contribution and warn the user about a figure they can no longer see on screen.
     */
    it('clears when the answer moves away from that sub-category', () => {
      component.relatedTo = '51';
      component.innovationUseInfoBody.actors_influenced = 42;

      component.relatedTo = '50';
      component.clearActorsWhenNotApplicable();

      expect(component.innovationUseInfoBody.actors_influenced).toBeNull();
    });

    it('keeps the count while that sub-category is still selected', () => {
      component.relatedTo = '51';
      component.innovationUseInfoBody.actors_influenced = 42;

      component.clearActorsWhenNotApplicable();

      expect(component.innovationUseInfoBody.actors_influenced).toBe(42);
    });

    // A reported zero is a figure someone entered, not an empty field.
    it('keeps a reported zero', () => {
      component.relatedTo = '51';
      component.innovationUseInfoBody.actors_influenced = 0;

      component.clearActorsWhenNotApplicable();

      expect(component.innovationUseInfoBody.actors_influenced).toBe(0);
    });
  });
});
