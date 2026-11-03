import { InnovationUseService } from './innovation-use.service';
import {
  FARMERS_ACTOR_TYPE_ID,
  toCountUnit,
  toUseNature,
} from '../../results/result-actors/farmer-follow-up.constant';

/**
 * IFC-T-2 — IFC-R-7: only the four codes are ever stored; anything else is saved as NULL
 * without failing the section save (design IFC-DD-3).
 *
 * The service has a very large constructor, so the unit is built off the prototype
 * (same shape as `innovation-use.service.2030-projection.spec.ts`).
 */
describe('InnovationUseService — Farmers count unit / use nature (IFC-R-7)', () => {
  const service: any = Object.create(InnovationUseService.prototype);
  const build = (el: any) => service.buildActorData(el, 7, 100, 1);

  it('pins the Farmers actor type id verified by IFC-T-1', () => {
    expect(FARMERS_ACTOR_TYPE_ID).toBe(1);
  });

  describe('buildActorData', () => {
    it.each(['households', 'individuals'])(
      'stores count_unit %s as sent',
      (code) => {
        expect(build({ count_unit: code }).count_unit).toBe(code);
      },
    );

    it.each(['information_received', 'innovation_applied'])(
      'stores use_nature %s as sent',
      (code) => {
        expect(build({ use_nature: code }).use_nature).toBe(code);
      },
    );

    it('keeps both answers on the same row', () => {
      const data = build({
        actor_type_id: 1,
        count_unit: 'households',
        use_nature: 'innovation_applied',
      });
      expect(data.count_unit).toBe('households');
      expect(data.use_nature).toBe('innovation_applied');
    });

    it.each([
      undefined,
      null,
      '',
      'people',
      'Households',
      'households ',
      5,
      {},
    ])('saves an unusable count_unit (%p) as NULL', (value) => {
      expect(build({ count_unit: value }).count_unit).toBeNull();
    });

    it.each([undefined, null, '', 'reach', 'INNOVATION_APPLIED', 0, []])(
      'saves an unusable use_nature (%p) as NULL',
      (value) => {
        expect(build({ use_nature: value }).use_nature).toBeNull();
      },
    );

    it('saves NULL for both when the element is missing', () => {
      const data = build(undefined);
      expect(data.count_unit).toBeNull();
      expect(data.use_nature).toBeNull();
    });

    it('does not change the other actor fields', () => {
      const data = build({ actor_type_id: 2, women: 3, how_many: 9 });
      expect(data).toMatchObject({
        actor_type_id: 2,
        women: 3,
        how_many: 9,
        result_id: 100,
        section_id: 1,
        created_by: 7,
      });
    });
  });

  describe('whitelist helpers', () => {
    it('toCountUnit accepts only the two codes', () => {
      expect(toCountUnit('households')).toBe('households');
      expect(toCountUnit('individuals')).toBe('individuals');
      expect(toCountUnit('people')).toBeNull();
      expect(toCountUnit(undefined)).toBeNull();
    });

    it('toUseNature accepts only the two codes', () => {
      expect(toUseNature('information_received')).toBe('information_received');
      expect(toUseNature('innovation_applied')).toBe('innovation_applied');
      expect(toUseNature('households')).toBeNull();
      expect(toUseNature(null)).toBeNull();
    });
  });
});
