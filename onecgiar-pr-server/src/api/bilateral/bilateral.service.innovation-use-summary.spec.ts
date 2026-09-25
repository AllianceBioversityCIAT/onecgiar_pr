import { FindOperator } from 'typeorm';
import { BilateralService } from './bilateral.service';
import { ResultActor } from '../results/result-actors/entities/result-actor.entity';
import { ResultsByInstitutionType } from '../results/results_by_institution_types/entities/results_by_institution_type.entity';
import { ResultIpMeasure } from '../ipsr/result-ip-measures/entities/result-ip-measure.entity';

/**
 * Night sweep 2026-09-23, BIL-2 — `buildInnovationUseBilateralSummary` (bilateral summary / AI
 * quality payload) read current use as `section_id = 1` only. Rows added in the W3/bilateral form are
 * stored with `section_id = NULL` for current use (`results/summary/innovation_dev.service.ts`
 * `saveAnticipatedInnoUser` stamps only the 2030 projection), so they never reached this summary
 * (measured on prtest, result 9519: form actor and measure missing, only the ingest row left).
 *
 * The repository is an in-memory fake that EVALUATES the `where` the service builds (equal / isNull /
 * or), so the assertion is on which rows come back, not on the operator's shape. Control negative:
 * with `section_id: INNOVATION_USE_SECTION_CURRENT` (plain 1) back in the three current-use queries,
 * the NULL rows are filtered out and the first test fails.
 *
 * Built off the prototype with only the collaborators this path touches.
 */
describe('BilateralService — Innovation Use summary reads current use from NULL and 1 (BIL-2)', () => {
  const matches = (condition: unknown, value: unknown): boolean => {
    if (condition instanceof FindOperator) {
      switch (condition.type) {
        case 'or':
          return (condition.value as unknown as unknown[]).some((child) =>
            matches(child, value),
          );
        case 'equal':
          return value === condition.value;
        case 'isNull':
          return value === null || value === undefined;
        default:
          throw new Error(
            `fake repository: unhandled operator ${condition.type}`,
          );
      }
    }
    return value === condition;
  };

  const fakeRepository = (rows: Record<string, unknown>[]) => ({
    find: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
      rows.filter((row) =>
        Object.entries(where).every(([key, condition]) =>
          matches(condition, row[key]),
        ),
      ),
    ),
  });

  const tables = () => {
    const actors = fakeRepository([
      {
        result_id: 11987,
        is_active: true,
        section_id: 1,
        actor_type_id: 2,
        women: 8,
      },
      {
        result_id: 11987,
        is_active: true,
        section_id: null,
        actor_type_id: 3,
        women: 2,
      },
      {
        result_id: 11987,
        is_active: true,
        section_id: 2,
        actor_type_id: 4,
        women: 9,
      },
    ]);
    const organizations = fakeRepository([
      {
        results_id: 11987,
        institution_roles_id: 5,
        is_active: true,
        section_id: null,
        institution_types_id: 10,
        how_many: 1,
      },
      {
        results_id: 11987,
        institution_roles_id: 5,
        is_active: true,
        section_id: 2,
        institution_types_id: 20,
        how_many: 4,
      },
    ]);
    const measures = fakeRepository([
      {
        result_id: 11987,
        is_active: true,
        section_id: 1,
        unit_of_measure: 'zz-night-sweep hectares',
        quantity: 1300,
      },
      {
        result_id: 11987,
        is_active: true,
        section_id: null,
        unit_of_measure: 'zz-night-sweep farms',
        quantity: 5,
      },
      {
        result_id: 11987,
        is_active: true,
        section_id: 2,
        unit_of_measure: 'zz-night-sweep 2030',
        quantity: 7,
      },
    ]);
    return { actors, organizations, measures };
  };

  function makeService(repos = tables()) {
    const service: any = Object.create(BilateralService.prototype);
    service.dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === ResultActor) return repos.actors;
        if (entity === ResultsByInstitutionType) return repos.organizations;
        if (entity === ResultIpMeasure) return repos.measures;
        throw new Error('fake dataSource: unexpected repository');
      }),
    };
    service.buildInnovationSharedBudgetAndEvidenceExtras = jest
      .fn()
      .mockResolvedValue({});
    service.buildInnovationUseLinkedResultsList = jest
      .fn()
      .mockResolvedValue([]);
    service.resolveInnovationUseLevelForSummary = jest
      .fn()
      .mockResolvedValue(null);
    return service;
  }

  const filtered = {
    id: 11987,
    results_innovations_use_object: {
      is_active: true,
      innov_use_to_be_determined: false,
      innov_use_2030_to_be_determined: false,
    },
  };

  it('lists the rows the W3 form wrote (section_id NULL) next to the ingest rows (1)', async () => {
    const summary =
      await makeService().buildInnovationUseBilateralSummary(filtered);

    expect(summary.current_section.actors).toHaveLength(2);
    expect(summary.current_section.organizations).toHaveLength(1);
    expect(
      summary.current_section.other_quantitative.map(
        (m: any) => m.unit_of_measure,
      ),
    ).toEqual(['zz-night-sweep hectares', 'zz-night-sweep farms']);
  });

  it('keeps the 2030 projection to section 2 only — NULL rows are never read as 2030', async () => {
    const summary =
      await makeService().buildInnovationUseBilateralSummary(filtered);

    expect(summary.innovation_use_2030_section.actors).toHaveLength(1);
    expect(summary.innovation_use_2030_section.organizations).toHaveLength(1);
    expect(
      summary.innovation_use_2030_section.other_quantitative.map(
        (m: any) => m.unit_of_measure,
      ),
    ).toEqual(['zz-night-sweep 2030']);
    expect(
      summary.current_section.other_quantitative.map(
        (m: any) => m.unit_of_measure,
      ),
    ).not.toContain('zz-night-sweep 2030');
  });
});
