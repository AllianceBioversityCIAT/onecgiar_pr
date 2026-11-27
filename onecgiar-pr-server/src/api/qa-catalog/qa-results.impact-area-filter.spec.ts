// @akili-spec changes/qa-impact-area-filter
// IAF-T-1 falsifier (P2-4108). The REAL catalog, the REAL entity keys and the REAL resolvers run through `QaResultsService.details`
// over an in-memory database; the runner evaluates the plan predicates, so a field that reads another area's rows shows in its
// values. The component rows are the 13 of migration 1760113104098 (ids 1..13 in insertion order).
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CLOSED_CONTROL_LISTS } from './definitions/closed-control-lists';
import { QaCatalogService } from './qa-catalog.service';
import { QaResultsRepository } from './qa-results.repository';
import { QaResultsService } from './qa-results.service';
import { FixtureDb, fixtureRunner } from './values/fixtures';
import { entityTableKeys } from './values/table-metadata';

const RESULT = 12627;

/** Migration 1760113104098: [id, name, impact_area]. */
const COMPONENTS: [number, string, string][] = [
  [1, 'Gender equality', 'Gender'],
  [2, 'Youth', 'Gender'],
  [3, 'Social Inclusion', 'Gender'],
  [4, 'Adaptation', 'Climate'],
  [5, 'Mitigation', 'Climate'],
  [6, 'Nutrition', 'Nutrition'],
  [7, 'Health', 'Nutrition'],
  [8, 'Food Security', 'Nutrition'],
  [9, 'Environmental health', 'Environmental'],
  [10, 'Biodiversity', 'Environmental'],
  [11, 'Poverty Reduction', 'Poverty'],
  [12, 'Livelihoods', 'Poverty'],
  [13, 'Jobs', 'Poverty'],
];

/** Field key -> its closed list and the `impact_area` text the form splits on (onecgiar-pr-client/src/app/shared/services/global/get-impact-areas-scores.service.ts:26-30). */
const AREAS = {
  'general.gender_impact_areas': ['impact_area_components_gender', 'Gender'],
  'general.climate_impact_areas': ['impact_area_components_climate', 'Climate'],
  'general.nutrition_impact_areas': [
    'impact_area_components_nutrition',
    'Nutrition',
  ],
  'general.environment_impact_areas': [
    'impact_area_components_environmental',
    'Environmental',
  ],
  'general.poverty_impact_areas': ['impact_area_components_poverty', 'Poverty'],
} as const;
const FIELD_KEYS = Object.keys(AREAS);

let nextId = 1;
const score = (componentId: number, is_active = 1) => ({
  id: nextId++,
  result_id: RESULT,
  impact_area_score_id: componentId,
  is_active,
});

const dbWith = (scores: ReturnType<typeof score>[]): FixtureDb => ({
  result_impact_area_score: scores,
  impact_areas_scores_components: COMPONENTS.map(([id, name, area]) => ({
    id,
    name,
    impact_area: area,
    is_active: 1,
  })),
});

const read = async (db: FixtureDb) => {
  const repository = {
    classify: async (ids: readonly number[]) =>
      ids.map((id) => ({
        result_id: id,
        result_code: 10159,
        reason: null,
        result_type_key: 'policy_change',
      })),
  } as unknown as QaResultsRepository;
  const service = new QaResultsService(
    new QaCatalogService(),
    repository,
    {} as DataSource,
  );
  const res = await service.details(
    { phase_year: 2026, result_ids: [RESULT], field_keys: FIELD_KEYS } as never,
    { run: fixtureRunner(db), keys: entityTableKeys() },
  );
  const r = res.results[0] as {
    values: Record<string, unknown>;
    labels: Record<string, Record<string, string | null>>;
  };
  return { values: r.values, labels: r.labels };
};

describe('P2-4108 impact-area components are read per area (IAF-T-1)', () => {
  beforeEach(() => (nextId = 1));

  it('IAF-AC-0: each closed list holds exactly the component ids of its own area', () => {
    for (const [list, area] of Object.values(AREAS)) {
      expect([list, [...CLOSED_CONTROL_LISTS[list]]]).toEqual([
        list,
        COMPONENTS.filter(([, , a]) => a === area).map(([id]) => id),
      ]);
    }
  });

  it('IAF-AC-1: components in two areas (Climate 5, Poverty 12 and 13) land only in their own fields', async () => {
    const { values } = await read(dbWith([score(5), score(12), score(13)]));
    expect(values).toEqual({
      'general.gender_impact_areas': [],
      'general.climate_impact_areas': [5],
      'general.nutrition_impact_areas': [],
      'general.environment_impact_areas': [],
      'general.poverty_impact_areas': [12, 13],
    });
  });

  it('IAF-AC-1: one component of every area, each field holds only its own', async () => {
    const { values } = await read(
      dbWith([score(2), score(4), score(8), score(10), score(11)]),
    );
    expect(values).toEqual({
      'general.gender_impact_areas': [2],
      'general.climate_impact_areas': [4],
      'general.nutrition_impact_areas': [8],
      'general.environment_impact_areas': [10],
      'general.poverty_impact_areas': [11],
    });
  });

  it('IAF-AC-2: components of a single area appear only in that field; the other four are empty', async () => {
    const { values } = await read(dbWith([score(1), score(3)]));
    expect(values).toEqual({
      'general.gender_impact_areas': [1, 3],
      'general.climate_impact_areas': [],
      'general.nutrition_impact_areas': [],
      'general.environment_impact_areas': [],
      'general.poverty_impact_areas': [],
    });
  });

  it('IAF-AC-3: the labels of each list cover every returned id with its own component name, and nothing else', async () => {
    const { values, labels } = await read(
      dbWith([score(5), score(12), score(13), score(6)]),
    );
    for (const [key, [list]] of Object.entries(AREAS)) {
      const ids = values[key] as number[];
      const expected = Object.fromEntries(
        ids.map((id) => [String(id), COMPONENTS[id - 1][1]]),
      );
      expect([list, labels[list] ?? {}]).toEqual([list, expected]);
    }
    expect(labels.impact_area_components_poverty).toEqual({
      '12': 'Livelihoods',
      '13': 'Jobs',
    });
  });

  it('a deselected (inactive) score row is not read, as in the form', async () => {
    const { values } = await read(dbWith([score(4, 0), score(5)]));
    expect(values['general.climate_impact_areas']).toEqual([5]);
  });
});
