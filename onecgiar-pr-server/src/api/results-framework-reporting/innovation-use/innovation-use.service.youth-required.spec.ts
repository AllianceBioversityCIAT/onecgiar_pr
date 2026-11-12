import { InnovationUseService } from './innovation-use.service';

/**
 * bugfix/innovation-use-youth-required (IUY-R-3, P2-4049 / INC-167167).
 *
 * The P25 Innovation Use form loads through THIS read (`GET v2/api/innovation-use/get/result/:id`
 * → `getActorsData`), not through `summary.service.getInnovationUse`. It derived Non-youth as
 * `total - (youth || 0)`, so an empty Youth showed the whole total as Non-youth (PROD result 18805:
 * women 14 / youth NULL → Non-youth 14). An empty Youth is unknown, never "0 youth": Non-youth is null.
 *
 * Built off the prototype, same shape as the sibling `innovation-use.service.*.spec.ts` files.
 */
describe('InnovationUseService — Non-youth with an empty Youth (IUY-R-3)', () => {
  function makeService(rows: any[]) {
    const service: any = Object.create(InnovationUseService.prototype);
    service._resultActorRepository = {
      find: jest.fn().mockResolvedValue(rows),
    };
    return service;
  }

  const row = (over: Record<string, unknown>) => ({
    sex_and_age_disaggregation: false,
    women: '14',
    women_youth: null,
    men: '26',
    men_youth: null,
    ...over,
  });

  it('returns null Non-youth when Youth is empty, never the total (PROD 18805 shape)', async () => {
    const [actor] = await makeService([row({})]).getActorsData(32503);

    expect(actor.women_non_youth).toBeNull();
    expect(actor.men_non_youth).toBeNull();
    expect(actor.how_many).toBe(40);
  });

  it('still derives Non-youth when Youth is filled, 0 included, and keeps the clamp at 0', async () => {
    const [filled, zero, over] = await makeService([
      row({ women: '10', women_youth: '4', men: '20', men_youth: '3' }),
      row({ women: '10', women_youth: '0', men: '20', men_youth: '0' }),
      row({ women: '5', women_youth: '8', men: '2', men_youth: '2' }),
    ]).getActorsData(1);

    expect([filled.women_non_youth, filled.men_non_youth]).toEqual([6, 17]);
    expect([zero.women_non_youth, zero.men_non_youth]).toEqual([10, 20]);
    expect([over.women_non_youth, over.men_non_youth]).toEqual([0, 0]);
  });

  it('only nulls the side whose Youth is empty', async () => {
    const [actor] = await makeService([row({ men_youth: '6' })]).getActorsData(
      1,
    );

    expect(actor.women_non_youth).toBeNull();
    expect(actor.men_non_youth).toBe(20);
  });

  it('leaves "does not apply" rows untouched', async () => {
    const [actor] = await makeService([
      row({ sex_and_age_disaggregation: true, how_many: '12' }),
    ]).getActorsData(1);

    expect(actor.women_non_youth).toBeUndefined();
    expect(actor.how_many).toBe('12');
  });
});
