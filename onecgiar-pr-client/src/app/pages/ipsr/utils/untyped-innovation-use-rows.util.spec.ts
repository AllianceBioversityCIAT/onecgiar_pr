import { actorMissingType, untypedInnovationUseRowsMessage } from './untyped-innovation-use-rows.util';

// Night sweep 2026-09-23, IPSR-3 / IPSR-5 (prtest 11172 / 12037). Control negative: with
// actorMissingType returning false, the refusal test fails. Organizations: review room 24-Sep (NS-08).
describe('untyped IPSR innovation-use rows (IPSR-3 / IPSR-5)', () => {
  it('flags an actor with figures and no type', () => {
    expect(actorMissingType({ women_youth: 7 })).toBe(true);
    expect(untypedInnovationUseRowsMessage({ actors: [{ women_youth: 7 }] })).toContain('1 actor row(s)');
  });

  it('never refuses the save for an organization without a type (NS-08 business rule)', () => {
    expect(untypedInnovationUseRowsMessage({ actors: [], organization: [{ how_many: 4 }] } as any)).toBeNull();
    expect(untypedInnovationUseRowsMessage({ actors: [{ women: 1 }], organization: [{ how_many: 4 }] } as any)).not.toContain('organization');
  });

  it('flags a Step-3 actor that only has an evidence link', () => {
    expect(actorMissingType({ evidence_link: 'https://example.org/zz' })).toBe(true);
  });

  it('leaves blank placeholder rows, deleted rows and typed rows alone', () => {
    expect(actorMissingType({})).toBe(false);
    expect(actorMissingType({ women: 3, is_active: false })).toBe(false);
    expect(actorMissingType({ actor_type_id: 2, women: 3 })).toBe(false);
    expect(untypedInnovationUseRowsMessage({ actors: [{}] })).toBeNull();
  });
});
