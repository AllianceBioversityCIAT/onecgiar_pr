import { actorMissingType, organizationMissingType, untypedInnovationUseRowsMessage } from './untyped-innovation-use-rows.util';

// Night sweep 2026-09-23, IPSR-3 / IPSR-5 (prtest 11172 / 12037). Control negative: with
// actorMissingType / organizationMissingType returning false, the refusal tests fail.
describe('untyped IPSR innovation-use rows (IPSR-3 / IPSR-5)', () => {
  it('flags an actor with figures and no type, and an organization with a count and no type', () => {
    expect(actorMissingType({ women_youth: 7 })).toBe(true);
    expect(organizationMissingType({ how_many: 4 })).toBe(true);
    expect(untypedInnovationUseRowsMessage({ actors: [{ women_youth: 7 }], organization: [{ how_many: 4 }] })).toContain('Nothing was saved');
  });

  it('flags a Step-3 actor that only has an evidence link', () => {
    expect(actorMissingType({ evidence_link: 'https://example.org/zz' })).toBe(true);
  });

  it('leaves blank placeholder rows, deleted rows and typed rows alone', () => {
    expect(actorMissingType({})).toBe(false);
    expect(actorMissingType({ women: 3, is_active: false })).toBe(false);
    expect(actorMissingType({ actor_type_id: 2, women: 3 })).toBe(false);
    expect(organizationMissingType({ institution_sub_type_id: 11, how_many: 2 })).toBe(false);
    expect(untypedInnovationUseRowsMessage({ actors: [{}], organization: [{}] })).toBeNull();
  });
});
