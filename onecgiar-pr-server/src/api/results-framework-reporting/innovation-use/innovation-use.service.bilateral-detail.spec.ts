import { InnovationUseService } from './innovation-use.service';

/**
 * Night sweep 2026-09-23, BIL-2 — the bilateral detail the review drawer reads
 * (`GET results/bilateral/:id` → `getBilateralInnovationUseData`).
 *
 * Rows a reporter adds in the W3/bilateral form are written with `section_id = NULL` for current use
 * (`results/summary/innovation_dev.service.ts` `saveAnticipatedInnoUser` stamps only the 2030
 * projection); rows from the ingest API carry 1. Measured on prtest (result 9519): the form's actor
 * "Extension agents" and measure "zz-night-sweep farms" were stored with NULL and missing from this
 * detail. Control negative: with the filter back to `Number(section_id) === 1`, the NULL rows below
 * disappear and the first two tests fail.
 *
 * Built off the prototype, same as `innovation-use.service.2030-projection.spec.ts`.
 */
describe('InnovationUseService — bilateral detail reads current use from NULL and 1 (BIL-2)', () => {
  const row = (section: number | null | undefined, id: string) => ({
    section_id: section,
    id,
  });

  function makeService() {
    const service: any = Object.create(InnovationUseService.prototype);
    service.logger = { error: jest.fn(), warn: jest.fn() };
    service.getActorsData = jest
      .fn()
      .mockResolvedValue([
        row('1' as any, 'actor-ingest'),
        row(null, 'actor-form'),
        row(2, 'actor-2030'),
      ]);
    service.getOrganizationsData = jest
      .fn()
      .mockResolvedValue([row(undefined, 'org-form'), row(2, 'org-2030')]);
    service.getMeasuresData = jest
      .fn()
      .mockResolvedValue([
        row(1, 'measure-ingest'),
        row(null, 'measure-form'),
        row(2, 'measure-2030'),
      ]);
    service.getInvestmentPartners = jest.fn().mockResolvedValue([]);
    service.getInvestmentProjects = jest.fn().mockResolvedValue([]);
    return service;
  }

  it('lists the rows written by the W3 form (section_id NULL) next to the ingest ones (1)', async () => {
    const [detail] = await makeService().getBilateralInnovationUseData(11987);

    expect(detail.actors.map((a: any) => a.id)).toEqual([
      'actor-ingest',
      'actor-form',
    ]);
    expect(detail.measures.map((m: any) => m.id)).toEqual([
      'measure-ingest',
      'measure-form',
    ]);
  });

  it('treats an absent section_id like NULL', async () => {
    const [detail] = await makeService().getBilateralInnovationUseData(11987);

    expect(detail.organizations.map((o: any) => o.id)).toEqual(['org-form']);
  });

  it('never mixes the 2030 projection (section 2) into current use', async () => {
    const [detail] = await makeService().getBilateralInnovationUseData(11987);

    const ids = [
      ...detail.actors,
      ...detail.organizations,
      ...detail.measures,
    ].map((r: any) => r.id);
    expect(ids).not.toEqual(expect.arrayContaining(['actor-2030']));
    expect(ids.some((id: string) => id.endsWith('-2030'))).toBe(false);
  });
});
