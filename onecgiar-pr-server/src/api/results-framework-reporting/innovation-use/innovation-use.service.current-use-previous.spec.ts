import { InnovationUseService } from './innovation-use.service';

/**
 * P2-3537 §4 — the "Previous reported use" figure the Current Use Update block shows.
 *
 * Two decisions of 3 Sep 2026 are pinned here, and both have a cost if they drift:
 *
 * - The figure counts **actors only**. If organisations or other measures ever get added to it,
 *   next year's "previous use" becomes a number nobody can decompose ("523 users" made of people,
 *   organisations and hectares).
 * - `null` means the block is NOT rendered. That is what keeps a reporter who legitimately files
 *   only organisations from facing a reconciliation error they can never satisfy.
 *
 * Built off the prototype for the same reason as the 2030 sibling: the constructor is enormous.
 */
describe('InnovationUseService — previous-phase current use (P2-3537)', () => {
  const actor = (section: number, extra: Record<string, unknown> = {}) => ({
    section_id: section,
    ...extra,
  });

  function makeService(actors: any[] = []) {
    const service: any = Object.create(InnovationUseService.prototype);
    service.logger = { error: jest.fn(), warn: jest.fn() };
    service.getActorsData = jest.fn().mockResolvedValue(actors);
    return service;
  }

  it('returns null when there is no previous phase — first-time reporting', async () => {
    const service = makeService([actor(1, { how_many: 10 })]);

    await expect(
      service.getPreviousPhaseCurrentUse(null, 2025),
    ).resolves.toBeNull();
    await expect(
      service.getPreviousPhaseCurrentUse(undefined, 2025),
    ).resolves.toBeNull();
    await expect(
      service.getPreviousPhaseCurrentUse(0, 2025),
    ).resolves.toBeNull();
    expect(service.getActorsData).not.toHaveBeenCalled();
  });

  it('sums the actors of the previous phase current-use section', async () => {
    const service = makeService([
      actor(1, { how_many: 500 }),
      actor(1, { how_many: 120 }),
    ]);

    const previous = await service.getPreviousPhaseCurrentUse(41, 2025);

    expect(previous.total_actors).toBe(620);
    expect(previous.result_id).toBe(41);
    expect(previous.phase_year).toBe(2025);
    expect(previous.actors).toHaveLength(2);
  });

  it('ignores the 2030 projection rows, which live in the same table', async () => {
    // section_id 2 is the 2030 projection. Counting it would inflate "previous use" with a figure
    // that was never reported as actual use.
    const service = makeService([
      actor(1, { how_many: 500 }),
      actor(2, { how_many: 9000 }),
    ]);

    const previous = await service.getPreviousPhaseCurrentUse(41, 2025);

    expect(previous.total_actors).toBe(500);
    expect(previous.actors).toHaveLength(1);
  });

  it('returns null when the previous phase reported organisations but no actors', async () => {
    // Yeck's decision (Q4, 3 Sep 2026): no actors -> no block. Rendering it would show a
    // reconciliation against zero actors that the reporter could never resolve.
    const service = makeService([actor(2, { how_many: 12 })]);

    await expect(
      service.getPreviousPhaseCurrentUse(41, 2025),
    ).resolves.toBeNull();
  });

  it('counts a row whose disaggregation does not apply, where how_many was typed', async () => {
    // `getActorsData` recomputes how_many as women+men for disaggregated rows and leaves the typed
    // value on the others. Summing the gender columns instead would drop this second kind.
    const service = makeService([
      actor(1, { how_many: 300, sex_and_age_disaggregation: true }),
      actor(1, { how_many: 200, women: 120, men: 80 }),
    ]);

    const previous = await service.getPreviousPhaseCurrentUse(41, 2025);

    expect(previous.total_actors).toBe(500);
  });

  it('treats a missing or unparseable how_many as zero, never NaN', async () => {
    const service = makeService([
      actor(1, { how_many: null }),
      actor(1, {}),
      actor(1, { how_many: 'abc' }),
      actor(1, { how_many: 40 }),
    ]);

    const previous = await service.getPreviousPhaseCurrentUse(41, 2025);

    expect(previous.total_actors).toBe(40);
    expect(Number.isNaN(previous.total_actors)).toBe(false);
  });

  it('reports a null phase year rather than guessing one', async () => {
    // The label reads "1,200 users (FY2025)". With no year known, the screen must omit the year,
    // not print the open phase minus one — a result can sit in a phase that is not the open one.
    const service = makeService([actor(1, { how_many: 10 })]);

    const previous = await service.getPreviousPhaseCurrentUse(41, undefined);

    expect(previous.phase_year).toBeNull();
    expect(previous.total_actors).toBe(10);
  });

  it('fails soft: an unreadable previous phase behaves as first-time reporting', async () => {
    // The safe side. Losing the block costs the reporter nothing; blocking the section they came to
    // fill in does.
    const service = makeService();
    service.getActorsData = jest.fn().mockRejectedValue(new Error('db down'));

    await expect(
      service.getPreviousPhaseCurrentUse(41, 2025),
    ).resolves.toBeNull();
    expect(service.logger.error).toHaveBeenCalled();
  });
});
