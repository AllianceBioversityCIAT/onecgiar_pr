// @akili-spec quality-assurance/qa-results-feed
// QRF-T-9 falsifier (T-8 golden findings G-1 / G-2, QRF-DD-13). The REAL catalog, the REAL entity keys and the REAL resolvers run
// through `QaResultsService.details` over an in-memory database; the runner evaluates the plan predicates, so a binding that reads
// the wrong rows shows in the values. Fixtures are shaped like result 8799 (prtest): 17 active answered `result_answers` rows
// across questions 78-138, none of them an option of the GESI / risk / IPR questions. SQL semantics are the golden re-run (QRF-T-8).
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { QaCatalogService } from './qa-catalog.service';
import { QaResultsRepository } from './qa-results.repository';
import { QaResultsService } from './qa-results.service';
import { FixtureDb, fixtureRunner } from './values/fixtures';
import { entityTableKeys } from './values/table-metadata';

const RESULT = 8799;

const answer = (
  id: number,
  question: number,
  extra: Record<string, unknown> = {},
) => ({
  result_answer_id: id,
  result_id: RESULT,
  result_question_id: question,
  answer_boolean: 1,
  answer_text: null,
  is_active: 1,
  ...extra,
});

/** The 17 answered rows of 8799: questions 78..138, team diversity 113 with actions 116 and 117, nothing of GESI / risk / IPR. */
const ANSWERED_8799 = [
  78, 79, 80, 84, 90, 91, 101, 102, 103, 104, 113, 116, 117, 125, 126, 136, 138,
];

const QUESTIONS = [
  [80, 'Option of question 78'],
  [113, 'Yes, concrete actions'],
  [153, 'Foundational'],
  [165, 'No'],
].map(([id, text]) => ({ result_question_id: id, question_text: text }));

const dbWith = (
  answers: ReturnType<typeof answer>[],
  extra: FixtureDb = {},
): FixtureDb => ({
  result_answers: answers,
  result_questions: QUESTIONS,
  ...extra,
});

const answered8799 = () => ANSWERED_8799.map((q, i) => answer(i + 1, q));

const FEED_FIELDS = [
  'innovation_dev.gesi_stage',
  'innovation_dev.risk_stage',
  'innovation_dev.ipr_consideration',
  'innovation_dev.team_diversity',
  'contributors.lead_center',
  'partners.lead_partner',
];

const read = async (db: FixtureDb, fieldKeys = FEED_FIELDS) => {
  const repository = {
    classify: async (ids: readonly number[]) =>
      ids.map((id) => ({
        result_id: id,
        result_code: 9000,
        reason: null,
        result_type_key: 'innovation_development',
      })),
  } as unknown as QaResultsRepository;
  const service = new QaResultsService(
    new QaCatalogService(),
    repository,
    {} as DataSource,
  );
  const res = await service.details(
    { phase_year: 2026, result_ids: [RESULT], field_keys: fieldKeys } as never,
    { run: fixtureRunner(db), keys: entityTableKeys() },
  );
  return res.results[0].values as Record<string, any>;
};

/** The element id of a scalar field, whether the value is bare or `{ value, ...subfields }`. */
const valueOf = (v: unknown) =>
  v !== null && typeof v === 'object' && 'value' in (v as object)
    ? (v as { value: unknown }).value
    : v;

describe('QRF-T-9 golden bindings (G-1 / G-2, QRF-DD-13)', () => {
  describe('G-2 answer-bound fields of innovation development', () => {
    it('result 8799 (17 answered rows, none of GESI / risk / IPR): the three stage questions are empty, team diversity is 113', async () => {
      const values = await read(dbWith(answered8799()));
      expect(valueOf(values['innovation_dev.gesi_stage'])).toBeNull();
      expect(valueOf(values['innovation_dev.risk_stage'])).toBeNull();
      expect(valueOf(values['innovation_dev.ipr_consideration'])).toBeNull();
      expect(valueOf(values['innovation_dev.team_diversity'])).toBe(113);
    });

    it('team diversity actions are the ticked children of 113 only: [116, 117]', async () => {
      const values = await read(dbWith(answered8799()), [
        'innovation_dev.team_diversity',
      ]);
      expect(values['innovation_dev.team_diversity'].actions).toEqual([
        116, 117,
      ]);
    });

    it('answered GESI 153 (Foundational) and IPR 165 (No) are read; the others stay empty', async () => {
      const values = await read(
        dbWith([...answered8799(), answer(90, 153), answer(91, 165)]),
      );
      expect(valueOf(values['innovation_dev.gesi_stage'])).toBe(153);
      expect(values['innovation_dev.gesi_stage'].option_label).toBe(
        'Foundational',
      );
      expect(valueOf(values['innovation_dev.ipr_consideration'])).toBe(165);
      expect(valueOf(values['innovation_dev.risk_stage'])).toBeNull();
      expect(valueOf(values['innovation_dev.team_diversity'])).toBe(113);
    });

    it('team diversity with an answered 80 and an answered 113 reads 113 (not 80, not both)', async () => {
      const values = await read(dbWith([answer(1, 80), answer(2, 113)]), [
        'innovation_dev.team_diversity',
      ]);
      expect(valueOf(values['innovation_dev.team_diversity'])).toBe(113);
    });

    it('an inactive or unticked answer of the own question is not read', async () => {
      const values = await read(
        dbWith([
          answer(1, 153, { is_active: 0 }),
          answer(2, 157, { answer_boolean: 0 }),
        ]),
      );
      expect(valueOf(values['innovation_dev.gesi_stage'])).toBeNull();
      expect(valueOf(values['innovation_dev.risk_stage'])).toBeNull();
    });
  });

  describe('G-1 lead center and lead partner are the entity, not the flag', () => {
    const base = { result_id: RESULT, is_active: 1, from_toc: 0 };

    it('lead_center is the center_id of the active row with is_leading_result = 1', async () => {
      const values = await read(
        dbWith([], {
          results_center: [
            { id: 1, ...base, center_id: 'CENTER-03', is_leading_result: 0 },
            { id: 2, ...base, center_id: 'CENTER-02', is_leading_result: 1 },
            {
              id: 3,
              ...base,
              is_active: 0,
              center_id: 'CENTER-09',
              is_leading_result: 1,
            },
          ],
        }),
      );
      expect(values['contributors.lead_center']).toBe('CENTER-02');
    });

    it('lead_center is null when no active row leads', async () => {
      const values = await read(
        dbWith([], {
          results_center: [
            { id: 1, ...base, center_id: 'CENTER-03', is_leading_result: 0 },
          ],
        }),
      );
      expect(values['contributors.lead_center']).toBeNull();
    });

    it('lead_partner is the institutions_id of the active row with is_leading_result = 1', async () => {
      const values = await read(
        dbWith([], {
          results_by_institution: [
            { id: 1, ...base, institutions_id: 11, is_leading_result: 0 },
            { id: 2, ...base, institutions_id: 22, is_leading_result: 1 },
          ],
        }),
      );
      expect(values['partners.lead_partner']).toBe(22);
    });
  });
});
