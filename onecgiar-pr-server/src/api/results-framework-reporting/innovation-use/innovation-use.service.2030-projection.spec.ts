import { InnovationUseService } from './innovation-use.service';

/**
 * P2-3295 §3 — the previous-phase 2030 projection the review logic needs, and the justification
 * that goes with a revision.
 *
 * The service has a very large constructor, so the unit under test is built off the prototype with
 * just the collaborators these two paths touch — the same shape `results.service.innovation-link.spec.ts`
 * uses for the same reason.
 */
describe('InnovationUseService — previous-phase 2030 projection (P2-3295)', () => {
  const row = (section: number, extra: Record<string, unknown> = {}) => ({
    section_id: section,
    ...extra,
  });

  function makeService(overrides: Partial<Record<string, any>> = {}) {
    const service: any = Object.create(InnovationUseService.prototype);
    service.logger = { error: jest.fn(), warn: jest.fn() };
    service._resultsInnovationsUseRepository = {
      InnovUseExists: jest.fn().mockResolvedValue({
        innov_use_2030_to_be_determined: 0,
      }),
    };
    service.getActorsData = jest
      .fn()
      .mockResolvedValue([
        row(1, { id: 'actor-current' }),
        row(2, { id: 'actor-2030' }),
      ]);
    service.getOrganizationsData = jest
      .fn()
      .mockResolvedValue([row(2, { id: 'org-2030' })]);
    service.getMeasuresData = jest
      .fn()
      .mockResolvedValue([row(1, { id: 'measure-current' })]);
    return Object.assign(service, overrides);
  }

  it('returns null when the result has no previous phase — first-time reporting', async () => {
    const service = makeService();

    await expect(
      service.getPreviousPhase2030Projection(null),
    ).resolves.toBeNull();
    await expect(
      service.getPreviousPhase2030Projection(undefined),
    ).resolves.toBeNull();
    await expect(service.getPreviousPhase2030Projection(0)).resolves.toBeNull();
    expect(service.getActorsData).not.toHaveBeenCalled();
  });

  it('returns only the 2030 rows of the previous result, never the current-phase ones', async () => {
    const service = makeService();

    const previous = await service.getPreviousPhase2030Projection(8090);

    expect(previous.result_id).toBe(8090);
    expect(previous.actors.map((a: any) => a.id)).toEqual(['actor-2030']);
    expect(previous.organization.map((o: any) => o.id)).toEqual(['org-2030']);
    expect(previous.measures).toEqual([]);
    expect(previous.innov_use_2030_to_be_determined).toBe(0);
    expect(service.getActorsData).toHaveBeenCalledWith(8090);
  });

  it('reads the previous result, not the open one', async () => {
    const service = makeService();

    await service.getPreviousPhase2030Projection('8090');

    expect(
      service._resultsInnovationsUseRepository.InnovUseExists,
    ).toHaveBeenCalledWith(8090);
  });

  it('returns null when the previous result has no innovation-use row', async () => {
    const service = makeService();
    service._resultsInnovationsUseRepository.InnovUseExists = jest
      .fn()
      .mockResolvedValue(undefined);

    await expect(
      service.getPreviousPhase2030Projection(8090),
    ).resolves.toBeNull();
  });

  /**
   * Fail-soft is the whole point: the section must load even when the previous phase cannot be
   * read. Falling back to "first-time reporting" leaves the fields editable, which is the safe
   * side — the opposite would lock a reporter out of a section with no way forward.
   */
  it('falls back to null and logs when the previous phase cannot be read', async () => {
    const service = makeService();
    service.getActorsData = jest.fn().mockRejectedValue(new Error('db down'));

    await expect(
      service.getPreviousPhase2030Projection(8090),
    ).resolves.toBeNull();
    expect(service.logger.error).toHaveBeenCalled();
  });
});
