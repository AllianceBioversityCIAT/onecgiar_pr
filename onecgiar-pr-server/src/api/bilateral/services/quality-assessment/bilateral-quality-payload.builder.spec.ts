// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4, amended v0.2 BIL-QAI-T-4b)
import * as fs from 'fs';
import * as path from 'path';
import {
  BilateralQualityPayloadBuilder,
  BilateralResultFormReadError,
  UnresolvableLabelError,
} from './bilateral-quality-payload.builder';
import { QualityPayload, contentHash } from './bilateral-quality-rules';
import { stripIdentifiers } from './mappers/strip-identifiers';
import {
  POLICY_CHANGE_FIELD_LABELS,
  INNOVATION_USE_FIELD_LABELS,
  CAPACITY_SHARING_FIELD_LABELS,
  INNOVATION_DEVELOPMENT_FIELD_LABELS,
} from './field-labels';

function loadFixture(name: string): {
  detail: Record<string, unknown>;
  formDetail: Record<string, unknown>;
  // Innovation use only (BIL-QAI-T-4b gate fix): the un-post-processed `result_actors` rows
  // `build()` would fetch directly via `DataSource` — the "raw" counterpart to
  // `formDetail.resultTypeResponse[0].actors`, which `getActorsData` has already overwritten by
  // the time it reaches `formDetail` (see `RawInnovationUseActorHowMany` in
  // `./mappers/type-specific.mapper.ts`).
  rawInnovationUseActors?: Array<{
    result_actors_id: number;
    how_many: number | null;
  }>;
} {
  return JSON.parse(
    fs.readFileSync(
      path.join(__dirname, `./fixtures/${name}.fixture.json`),
      'utf8',
    ),
  );
}

const knowledgeProductFixture = loadFixture('knowledge-product');
const capacitySharingFixture = loadFixture('capacity-sharing');
const innovationDevelopmentFixture = loadFixture('innovation-development');
const innovationUseFixture = loadFixture('innovation-use');
const policyChangeFixture = loadFixture('policy-change');
const otherOutputFixture = loadFixture('other-output');

/**
 * BIL-QAI-T-4 — definitions-only payload builder, fixture-driven per result type.
 *
 * Expected values are taken from the fixture content itself (real labels the fixtures declare,
 * e.g. `obj_result_type.name`, `clarisa_institution.acronym`) and from
 * docs/bilateral-module/integration-contracts.md "Quality assessment (outbound)" /
 * design.md §5 — never recomputed the way the builder computes them.
 */

const OPTS = {
  requestId: 'a1b2c3d4-0000-4000-8000-000000000000',
  timeoutSeconds: 60,
};

const SECTION_KEYS = [
  'general_information',
  'contributors_and_partners',
  'geographic_location',
  'evidence',
  'type_specific',
] as const;

const ID_KEY_PATTERN = /"[a-zA-Z_]*_id"|"id"|"[a-z_]*_code"/;
const SHAREPOINT_LEAK_PATTERN = /sharepoint|sp_|document_id|folder_path/i;

type Fixture = {
  detail: Record<string, unknown>;
  formDetail: Record<string, unknown>;
};

const FIXTURES: Array<{
  name: string;
  expectedType: string;
  fixture: Fixture;
  /**
   * Passed as `project()`'s 4th arg. Only the "other output" fixture carries a populated
   * `indicators[]` (`BIL-QAI-T-4b` — "one fixture" carries `indicators[]`, carried over from the
   * `T-4` advisory); every other fixture needs no lookup entries.
   */
  indicatorDescriptions?: Record<string, string | null>;
}> = [
  {
    name: 'knowledge product',
    expectedType: 'knowledge_product',
    fixture: knowledgeProductFixture as Fixture,
  },
  {
    name: 'capacity sharing',
    expectedType: 'capacity_sharing',
    fixture: capacitySharingFixture as Fixture,
  },
  {
    name: 'innovation development',
    expectedType: 'innovation_development',
    fixture: innovationDevelopmentFixture as Fixture,
  },
  {
    name: 'innovation use',
    expectedType: 'innovation_use',
    fixture: innovationUseFixture as Fixture,
  },
  {
    name: 'policy change',
    expectedType: 'policy_change',
    fixture: policyChangeFixture as Fixture,
  },
  {
    name: 'other output',
    expectedType: 'other_output',
    fixture: otherOutputFixture as Fixture,
    indicatorDescriptions: {
      'IND-20123-1':
        'Number of regional partners sharing standardized agroclimatic data',
    },
  },
];

describe('BilateralQualityPayloadBuilder', () => {
  // project() is pure — the constructor args are never touched by project(), so a fixture-driven
  // spec can build the class without any Nest DI or real BilateralService/ResultsService.
  const builder = new BilateralQualityPayloadBuilder(
    undefined as never,
    undefined as never,
  );

  describe.each(FIXTURES)(
    '$name fixture',
    ({ expectedType, fixture, indicatorDescriptions }) => {
      let payload: QualityPayload;

      beforeAll(() => {
        payload = builder.project(
          fixture.detail,
          fixture.formDetail,
          OPTS,
          indicatorDescriptions ?? {},
        );
      });

      it('carries no identifier-shaped keys in the content (result + sections + impact_areas)', () => {
        // request_id lives at the payload's top level, outside `result`/`sections` — it is the
        // one identifier the contract allows (it names the call, not the result) and is exactly
        // what `stripIdentifiers` is scoped to leave untouched (see mappers/strip-identifiers.ts).
        // `impact_areas` is a sibling of `sections`, deliberately NOT run through
        // `stripIdentifiers` (builder.ts comment: its values are frozen pillar/score labels and
        // seeded sub-component names, none id-shaped) — included here so a future mapper that
        // starts carrying a catalogue id is still caught (BIL-QAI-T-4b advisory).
        const serialized = JSON.stringify({
          result: payload.result,
          sections: payload.sections,
          impact_areas: payload.impact_areas,
        });
        expect(ID_KEY_PATTERN.test(serialized)).toBe(false);
      });

      it('never leaks SharePoint-specific fields', () => {
        const serialized = JSON.stringify(payload);
        expect(SHAREPOINT_LEAK_PATTERN.test(serialized)).toBe(false);
      });

      it('carries all five section keys', () => {
        for (const key of SECTION_KEYS) {
          expect(payload.sections).toHaveProperty(key);
        }
      });

      it('stamps the frozen contract version and the caller-provided timeout', () => {
        expect(payload.contract_version).toBe('0.2');
        expect(payload.constraints).toEqual({
          timeout_seconds: OPTS.timeoutSeconds,
        });
        expect(payload.request_id).toBe(OPTS.requestId);
      });

      it("sets type_specific.type to the fixture's type", () => {
        expect(payload.sections.type_specific.type).toBe(expectedType);
      });

      it('marks the private evidence item link null and public/url items with their link', () => {
        const evidenceRows = payload.sections.evidence;
        const privateItems = evidenceRows.filter(
          (row) => row.visibility === 'private',
        );
        const publicItems = evidenceRows.filter(
          (row) => row.visibility === 'public',
        );

        expect(privateItems.length).toBeGreaterThan(0);
        for (const item of privateItems) {
          expect(item.link).toBeNull();
          expect(item.source).toBe('prms_repository');
        }

        expect(publicItems.length).toBeGreaterThan(0);
        for (const item of publicItems) {
          expect(typeof item.link).toBe('string');
        }
      });

      it('never emits the closed evidence-tag vocabulary\'s excluded bare climate tag anywhere in the payload (BIL-QAI-R-3; the pillar label "Climate adaptation and mitigation" is fine — only the bare quoted tag is forbidden). Built via string concatenation, not a literal, so the repo-wide grep gate for that forbidden tag only ever matches a real regression, never this assertion.', () => {
        const serialized = JSON.stringify(payload);
        const forbiddenEvidenceTag = '"' + 'Cli' + 'mate' + '"';
        expect(serialized.includes(forbiddenEvidenceTag)).toBe(false);
      });
    },
  );

  // Reviewer gate (BIL-QAI-T-4b): the generic FIXTURES loop above only checks
  // `type_specific.type`; nothing asserted `fields` itself for Other output / Other outcome, so
  // a regression in `mapTypeSpecific`'s `default` branch could ship green. `design.md` §4.5
  // pins `fields: {}` for these two types with no frozen constant to compare against (unlike the
  // four typed result types), so this asserts the payload directly.
  it('Other output: type_specific.fields is the empty object (design.md §4.5)', () => {
    const payload = builder.project(
      otherOutputFixture.detail as Record<string, unknown>,
      otherOutputFixture.formDetail as Record<string, unknown>,
      OPTS,
      // Same lookup entry the FIXTURES table passes for this fixture above — it carries a
      // populated `indicators[]` (BIL-QAI-T-4b), so `mapContributorsAndPartners` needs it
      // resolved or it throws `UnresolvableLabelError` before `type_specific` is even reached.
      {
        'IND-20123-1':
          'Number of regional partners sharing standardized agroclimatic data',
      },
    );
    expect(payload.sections.type_specific.fields).toEqual({});
  });

  it('marks a public repository (SharePoint) evidence item public and keeps its link (knowledge product fixture)', () => {
    // is_sharepoint: 1 && is_public_file: 1 — visibility must be `public`, not the default
    // `private` a SharePoint row otherwise gets (mappers/evidence.mapper.ts).
    const payload = builder.project(
      knowledgeProductFixture.detail as Record<string, unknown>,
      knowledgeProductFixture.formDetail as Record<string, unknown>,
      OPTS,
    );

    const publicRepositoryItem = payload.sections.evidence.find(
      (row) => row.source === 'prms_repository' && row.visibility === 'public',
    );

    expect(publicRepositoryItem).toBeDefined();
    expect(publicRepositoryItem?.link).toBe(
      'https://prms.internal/repository/public-brief',
    );
  });

  it('resolves the result header from the enriched detail (knowledge product fixture)', () => {
    const payload = builder.project(
      knowledgeProductFixture.detail as Record<string, unknown>,
      knowledgeProductFixture.formDetail as Record<string, unknown>,
      OPTS,
    );

    expect(payload.result).toEqual({
      type: 'Knowledge Product',
      reporting_phase: 'Reporting 2026',
      reporting_center: 'CIAT',
      primary_science_program: 'Sustainable Farming',
    });
  });

  it('resolves theory_of_change.result from the ToC mapping title (knowledge product fixture)', () => {
    const payload = builder.project(
      knowledgeProductFixture.detail as Record<string, unknown>,
      knowledgeProductFixture.formDetail as Record<string, unknown>,
      OPTS,
    );

    const toc = payload.sections.contributors_and_partners
      .theory_of_change as Record<string, unknown>;
    expect(toc.result).toBe(
      'Striga-resistant maize varieties adopted by smallholder farmers',
    );
    expect(toc.planned).toBe(true);
    expect(toc.level).toBe('High Level Output');
    expect(toc.contribution).toBe(
      'This result directly evidences adoption of striga-resistant maize under AOW1.',
    );
  });

  // Falsifying input (BIL-QAI-T-4 brief): a ToC node present only as `toc_result_id`, with no
  // title anywhere the builder reads, must fail loudly rather than emit an empty `result`.
  it('throws when a ToC mapping carries only toc_result_id and no title anywhere', () => {
    const detail = {
      ...(knowledgeProductFixture.detail as Record<string, any>),
      obj_results_toc_result: [
        {
          official_code: 'SP01',
          name: 'Sustainable Farming',
          initiative_role: 'Owner',
          toc_mappings: [
            {
              toc_result_id: 999999,
              official_code: 'SP01',
              name: 'Sustainable Farming',
              aow: 'AOW1',
              planned_result: 'Yes',
              level: 'High Level Output',
              // no `title` — the falsifying input.
            },
          ],
        },
      ],
    };

    expect(() =>
      builder.project(
        detail,
        knowledgeProductFixture.formDetail as Record<string, unknown>,
        OPTS,
      ),
    ).toThrow(UnresolvableLabelError);
  });

  it('does not throw and reports an empty theory_of_change when there is no ToC mapping at all', () => {
    const detail = {
      ...(knowledgeProductFixture.detail as Record<string, any>),
      obj_results_toc_result: [],
    };

    const payload = builder.project(
      detail,
      knowledgeProductFixture.formDetail as Record<string, unknown>,
      OPTS,
    );
    const toc = payload.sections.contributors_and_partners
      .theory_of_change as Record<string, unknown>;
    expect(toc).toEqual({
      planned: false,
      level: null,
      result: null,
      indicator: null,
      contribution: null,
      why_reported: null,
    });
  });

  // Falsifying input distinct from "no mapping at all" above: `getTocMappingsByResultId`'s
  // LEFT JOIN inside a JSON_ARRAYAGG (result.repository.ts:3956-3987) yields one truthy mapping
  // object with every field null when the owning initiative has no active ToC row. That must
  // fall through to the same empty branch, not throw UnresolvableLabelError.
  it('does not throw and reports an empty theory_of_change for a null-object mapping row (LEFT JOIN, no active ToC row)', () => {
    const detail = {
      ...(knowledgeProductFixture.detail as Record<string, any>),
      obj_results_toc_result: [
        {
          official_code: 'SP01',
          name: 'Sustainable Farming',
          initiative_role: 'Owner',
          toc_mappings: [
            {
              toc_result_id: null,
              official_code: null,
              name: null,
              aow: null,
              planned_result: 'No',
              level: null,
              title: null,
            },
          ],
        },
      ],
    };

    const payload = builder.project(
      detail,
      knowledgeProductFixture.formDetail as Record<string, unknown>,
      OPTS,
    );
    const toc = payload.sections.contributors_and_partners
      .theory_of_change as Record<string, unknown>;
    expect(toc).toEqual({
      planned: false,
      level: null,
      result: null,
      indicator: null,
      contribution: null,
      why_reported: null,
    });
  });

  describe('theory_of_change.indicator (indicator description lookup)', () => {
    // `getTocByResultV2`'s `result_toc_results[].indicators[]` carries only
    // `toc_results_indicator_id` (results-toc-results.service.ts:729-741) — the description
    // comes from a lookup `build()` assembles separately and passes into `project()`.
    const formDetailWithIndicator = {
      ...(knowledgeProductFixture.formDetail as Record<string, any>),
      tocMetadata: {
        ...(knowledgeProductFixture.formDetail as any).tocMetadata,
        result_toc_results: [
          {
            ...(knowledgeProductFixture.formDetail as any).tocMetadata
              .result_toc_results[0],
            indicators: [
              {
                result_toc_result_indicator_id: 5501,
                toc_results_indicator_id: 'IND-20031-1',
                indicator_contributing: 'Yes',
                status_id: 1,
                indicator_result_type_id: null,
                targets: [],
              },
            ],
          },
        ],
      },
    };

    it('resolves the indicator label from the lookup passed into project()', () => {
      const payload = builder.project(
        knowledgeProductFixture.detail as Record<string, unknown>,
        formDetailWithIndicator,
        OPTS,
        {
          'IND-20031-1': 'Number of striga-resistant maize varieties released',
        },
      );

      const toc = payload.sections.contributors_and_partners
        .theory_of_change as Record<string, unknown>;
      expect(toc.indicator).toBe(
        'Number of striga-resistant maize varieties released',
      );
    });

    it('throws UnresolvableLabelError when an indicator is mapped but the lookup has no entry for it', () => {
      expect(() =>
        builder.project(
          knowledgeProductFixture.detail as Record<string, unknown>,
          formDetailWithIndicator,
          OPTS,
          {},
        ),
      ).toThrow(UnresolvableLabelError);
    });
  });

  describe('build()', () => {
    it('delegates to project() with the responses unwrapped from both reads', async () => {
      const bilateralServiceStub = {
        findOne: jest.fn().mockResolvedValue({
          response: knowledgeProductFixture.detail,
          message: 'ok',
          status: 200,
        }),
      };
      const resultsServiceStub = {
        getBilateralResultById: jest.fn().mockResolvedValue({
          response: knowledgeProductFixture.formDetail,
          message: 'ok',
          status: 200,
        }),
      };

      const nestedBuilder = new BilateralQualityPayloadBuilder(
        bilateralServiceStub as never,
        resultsServiceStub as never,
      );

      const payload = await nestedBuilder.build(4101, OPTS);

      expect(bilateralServiceStub.findOne).toHaveBeenCalledWith(4101);
      expect(resultsServiceStub.getBilateralResultById).toHaveBeenCalledWith(
        4101,
      );
      expect(payload.sections.type_specific.type).toBe('knowledge_product');
      expect(payload.contract_version).toBe('0.2');
    });

    it('throws a typed error when the form detail read reports a non-2xx status', async () => {
      const bilateralServiceStub = {
        findOne: jest.fn().mockResolvedValue({
          response: knowledgeProductFixture.detail,
          message: 'ok',
          status: 200,
        }),
      };
      const resultsServiceStub = {
        // The shape results.service.ts `getBilateralResultById` returns when the result row
        // does not exist: `{ response: {}, message: 'Bilateral result not found', status:
        // HttpStatus.NOT_FOUND }`.
        getBilateralResultById: jest.fn().mockResolvedValue({
          response: {},
          message: 'Bilateral result not found',
          status: 404,
        }),
      };

      const nestedBuilder = new BilateralQualityPayloadBuilder(
        bilateralServiceStub as never,
        resultsServiceStub as never,
      );

      await expect(nestedBuilder.build(999999, OPTS)).rejects.toThrow(
        BilateralResultFormReadError,
      );
    });

    it('resolves indicator descriptions through the injected resolver before projecting', async () => {
      const formDetailWithIndicator = {
        ...(knowledgeProductFixture.formDetail as Record<string, any>),
        tocMetadata: {
          ...(knowledgeProductFixture.formDetail as any).tocMetadata,
          result_toc_results: [
            {
              ...(knowledgeProductFixture.formDetail as any).tocMetadata
                .result_toc_results[0],
              indicators: [
                {
                  result_toc_result_indicator_id: 5501,
                  toc_results_indicator_id: 'IND-20031-1',
                  indicator_contributing: 'Yes',
                  status_id: 1,
                  indicator_result_type_id: null,
                  targets: [],
                },
              ],
            },
          ],
        },
      };

      const bilateralServiceStub = {
        findOne: jest.fn().mockResolvedValue({
          response: knowledgeProductFixture.detail,
          message: 'ok',
          status: 200,
        }),
      };
      const resultsServiceStub = {
        getBilateralResultById: jest.fn().mockResolvedValue({
          response: formDetailWithIndicator,
          message: 'ok',
          status: 200,
        }),
      };
      const indicatorDescriptionResolverStub = {
        resolveIndicatorDescriptions: jest.fn().mockResolvedValue({
          'IND-20031-1': 'Number of striga-resistant maize varieties released',
        }),
      };

      const nestedBuilder = new BilateralQualityPayloadBuilder(
        bilateralServiceStub as never,
        resultsServiceStub as never,
        indicatorDescriptionResolverStub as never,
      );

      const payload = await nestedBuilder.build(4101, OPTS);

      expect(
        indicatorDescriptionResolverStub.resolveIndicatorDescriptions,
      ).toHaveBeenCalledWith(['IND-20031-1']);
      const toc = payload.sections.contributors_and_partners
        .theory_of_change as Record<string, unknown>;
      expect(toc.indicator).toBe(
        'Number of striga-resistant maize varieties released',
      );
    });
  });

  // BIL-QAI-T-4b carryover from the T-4 advisory: one fixture carries a populated
  // `indicators[]` so the owner's T-11 review finally sees a resolved indicator label. The
  // "other output" fixture's toc mapping now carries `IND-20123-1`; the generic FIXTURES loop
  // above already supplies its resolved label via `indicatorDescriptions`, so this only asserts
  // the resolution actually took effect on that specific fixture.
  it('resolves the indicator label populated on the other-output fixture (BIL-QAI-T-4b)', () => {
    const payload = builder.project(
      otherOutputFixture.detail as Record<string, unknown>,
      otherOutputFixture.formDetail as Record<string, unknown>,
      OPTS,
      {
        'IND-20123-1':
          'Number of regional partners sharing standardized agroclimatic data',
      },
    );

    const toc = payload.sections.contributors_and_partners
      .theory_of_change as Record<string, unknown>;
    expect(toc.indicator).toBe(
      'Number of regional partners sharing standardized agroclimatic data',
    );
  });
});

/**
 * BIL-QAI-T-4b — contract v0.2 type-specific typed values, label-constant parity, and the
 * impact-areas mapper.
 *
 * Disqualifier (task brief): a parity test that reads the constant to build BOTH the
 * expectation and the payload proves nothing — one side must be a literal. Every `*_FIELD_LABELS`
 * constant is first asserted against literal strings (never against itself), and only THEN is
 * the payload's `Object.keys(fields)` asserted against the constant. A label rename in a
 * constant with the fixture left untouched must fail this suite (falsifying input, task brief).
 */
describe('type-specific v0.2 label parity (BIL-QAI-T-4b, BIL-QAI-AC-16)', () => {
  const builder = new BilateralQualityPayloadBuilder(
    undefined as never,
    undefined as never,
  );

  // Leg 1 — the constant against literals copied verbatim from
  // docs/bilateral-module/integration-contracts.md:638-641 (see field-labels.ts for the exact
  // per-line citation). This is the independent source of truth the disqualifier demands.
  it('POLICY_CHANGE_FIELD_LABELS matches the frozen literal labels (integration-contracts.md:638)', () => {
    expect(POLICY_CHANGE_FIELD_LABELS).toEqual({
      POLICY_TYPE: 'Policy type',
      POLICY_STAGE: 'Policy stage',
      IMPLEMENTING_ORGANIZATIONS: 'Implementing organizations',
      USD_AMOUNT: 'USD amount',
    });
  });

  it('INNOVATION_USE_FIELD_LABELS matches the frozen literal labels (integration-contracts.md:639)', () => {
    expect(INNOVATION_USE_FIELD_LABELS).toEqual({
      USER_TYPES: 'User types',
      NUMBER_OF_PEOPLE_USING: 'Number of people using',
      OTHER_QUANTITATIVE_MEASURES: 'Other quantitative measures',
      INVESTMENT_USD: 'Investment (USD)',
    });
  });

  it('CAPACITY_SHARING_FIELD_LABELS matches the frozen literal labels (integration-contracts.md:640)', () => {
    expect(CAPACITY_SHARING_FIELD_LABELS).toEqual({
      NUMBER_OF_PEOPLE_TRAINED: 'Number of people trained',
      LENGTH_OF_TRAINING: 'Length of training',
      DELIVERY_METHOD: 'Delivery method',
      IMPLEMENTING_ORGANIZATIONS: 'Implementing organizations',
    });
  });

  it('INNOVATION_DEVELOPMENT_FIELD_LABELS matches the frozen literal labels (integration-contracts.md:641)', () => {
    expect(INNOVATION_DEVELOPMENT_FIELD_LABELS).toEqual({
      INNOVATION_TYPOLOGY: 'Innovation typology',
      READINESS_LEVEL: 'Readiness level',
      INNOVATION_DEVELOPERS: 'Innovation developers',
    });
  });

  // Leg 2 — the payload against the constant (now itself proven against literals above), in
  // BOTH directions: no extra key, no missing mandatory key (AC-16).
  const PARITY_CASES: Array<{
    name: string;
    fixture: Fixture;
    labels: Record<string, string>;
  }> = [
    {
      name: 'policy change',
      fixture: policyChangeFixture as Fixture,
      labels: POLICY_CHANGE_FIELD_LABELS,
    },
    {
      name: 'innovation use',
      fixture: innovationUseFixture as Fixture,
      labels: INNOVATION_USE_FIELD_LABELS,
    },
    {
      name: 'capacity sharing',
      fixture: capacitySharingFixture as Fixture,
      labels: CAPACITY_SHARING_FIELD_LABELS,
    },
    {
      name: 'innovation development',
      fixture: innovationDevelopmentFixture as Fixture,
      labels: INNOVATION_DEVELOPMENT_FIELD_LABELS,
    },
  ];

  it.each(PARITY_CASES)(
    '$name: type_specific.fields keys equal the label constant exactly (both directions)',
    ({ fixture, labels }) => {
      const payload = builder.project(fixture.detail, fixture.formDetail, OPTS);
      const fieldKeys = Object.keys(
        payload.sections.type_specific.fields,
      ).sort();
      const constantValues = Object.values(labels).sort();
      expect(fieldKeys).toEqual(constantValues);
    },
  );

  // Falsifying input (task brief): a builder that falls back to the lead contact person must
  // make this FAIL. The fixture's cleared column stays null; the fixture's lead contact person
  // (`formDetail.commonFields.lead_contact_person_data.display_name`) stays non-empty.
  it('Innovation developers stays null when the column is cleared, even though the lead contact person is non-empty (BIL-QAI-R-15)', () => {
    const detail = innovationDevelopmentFixture.detail as Record<
      string,
      unknown
    >;
    const formDetail = innovationDevelopmentFixture.formDetail as any;
    const clearedFormDetail: any = {
      ...formDetail,
      resultTypeResponse: [
        { ...formDetail.resultTypeResponse[0], innovation_developers: null },
      ],
    };

    expect(
      clearedFormDetail.commonFields.lead_contact_person_data.display_name,
    ).toBeTruthy();

    const payload = builder.project(detail, clearedFormDetail, OPTS);
    expect(
      payload.sections.type_specific.fields[
        INNOVATION_DEVELOPMENT_FIELD_LABELS.INNOVATION_DEVELOPERS
      ],
    ).toBeNull();
  });
});

describe('type-specific v0.2 typed values (BIL-QAI-T-4b, BIL-QAI-AC-16)', () => {
  const builder = new BilateralQualityPayloadBuilder(
    undefined as never,
    undefined as never,
  );

  it('Capacity sharing: "Number of people trained" is an object of numbers, computed total, single "Length of training" string', () => {
    const payload = builder.project(
      capacitySharingFixture.detail as Record<string, unknown>,
      capacitySharingFixture.formDetail as Record<string, unknown>,
      OPTS,
    );
    const fields = payload.sections.type_specific.fields;
    const trained = fields[
      CAPACITY_SHARING_FIELD_LABELS.NUMBER_OF_PEOPLE_TRAINED
    ] as Record<string, number>;

    expect(typeof trained).toBe('object');
    for (const value of Object.values(trained)) {
      expect(typeof value).toBe('number');
    }
    // female:7, male:4, non_binary:1, unknown:0 (capacity-sharing.fixture.json) — computed, not
    // a stored column.
    expect(trained).toEqual({
      total: 12,
      female: 7,
      male: 4,
      non_binary: 1,
      unknown: 0,
    });

    const lengthOfTraining =
      fields[CAPACITY_SHARING_FIELD_LABELS.LENGTH_OF_TRAINING];
    expect(
      typeof lengthOfTraining === 'string' || lengthOfTraining === null,
    ).toBe(true);
    expect(lengthOfTraining).toBe('Short-term');
  });

  it('Innovation use: a row with sex_and_age_disaggregation false contributes how_many to total only', () => {
    // The fixture's `formDetail.resultTypeResponse[0].actors[1]` is the shape the real read
    // path (`getBilateralInnovationUseData` → `getActorsData`) actually emits for a
    // non-disaggregated row: `how_many: 0` (recomputed as `women + men` = `0 + 0`), NOT the raw
    // `9` the reporter entered. Without `rawInnovationUseActors` (the un-post-processed
    // `result_actors` row `build()` fetches separately — see `RawInnovationUseActorHowMany`),
    // this test would get `total: 580` and FAIL, proving the mapper no longer trusts the
    // corrupted `container.actors[i].how_many`.
    const payload = builder.project(
      innovationUseFixture.detail as Record<string, unknown>,
      innovationUseFixture.formDetail as Record<string, unknown>,
      OPTS,
      {},
      innovationUseFixture.rawInnovationUseActors ?? [],
    );
    const numberUsing = payload.sections.type_specific.fields[
      INNOVATION_USE_FIELD_LABELS.NUMBER_OF_PEOPLE_USING
    ] as Record<string, number>;

    // Disaggregated row: women 300, men 280, women_youth 50, men_youth 40 (total 580).
    // Non-disaggregated row: raw how_many 9, no sex/age split.
    expect(numberUsing).toEqual({
      total: 589,
      women: 300,
      men: 280,
      women_youth: 50,
      men_youth: 40,
    });
  });

  it('Innovation use: without rawInnovationUseActors, a non-disaggregated row contributes 0 rather than trusting the post-processed how_many (falsifying input for the gate fix above)', () => {
    const payload = builder.project(
      innovationUseFixture.detail as Record<string, unknown>,
      innovationUseFixture.formDetail as Record<string, unknown>,
      OPTS,
    );
    const numberUsing = payload.sections.type_specific.fields[
      INNOVATION_USE_FIELD_LABELS.NUMBER_OF_PEOPLE_USING
    ] as Record<string, number>;

    // formDetail's actor[1].how_many is already 0 (the real getActorsData recompute) — total
    // must come out 580 (the disaggregated row only), never 589, when no raw source is supplied.
    expect(numberUsing.total).toBe(580);
  });

  it('Innovation use: "User types" carries the free-text actor as "Other: <text>" and "Other quantitative measures" is the whole list', () => {
    const payload = builder.project(
      innovationUseFixture.detail as Record<string, unknown>,
      innovationUseFixture.formDetail as Record<string, unknown>,
      OPTS,
    );
    const fields = payload.sections.type_specific.fields;

    expect(fields[INNOVATION_USE_FIELD_LABELS.USER_TYPES]).toEqual([
      'Farmers/ (agro)pastoralist/ herders/ fishers',
      'Other: Cooperative extension agents',
    ]);
    expect(
      fields[INNOVATION_USE_FIELD_LABELS.OTHER_QUANTITATIVE_MEASURES],
    ).toEqual([
      {
        unit_of_measure: 'Hectares under drought-tolerant sorghum',
        quantity: 3400,
      },
      { unit_of_measure: 'Farmer field days conducted', quantity: 12 },
    ]);
  });

  // Advisory fix (BIL-QAI-T-4b review): an actor_type_id 5 row with no free text must never
  // emit the empty "Other: " label — fall back to the catalogue name.
  it('Innovation use: "User types" falls back to the catalogue name "Other" when actor_type_id is 5 and other_actor_type is empty', () => {
    const formDetail = innovationUseFixture.formDetail as any;
    const formDetailWithBlankOtherActor: any = {
      ...formDetail,
      resultTypeResponse: [
        {
          ...formDetail.resultTypeResponse[0],
          actors: [
            {
              ...formDetail.resultTypeResponse[0].actors[1],
              other_actor_type: null,
            },
          ],
        },
      ],
    };

    const payload = builder.project(
      innovationUseFixture.detail as Record<string, unknown>,
      formDetailWithBlankOtherActor,
      OPTS,
    );

    expect(
      payload.sections.type_specific.fields[
        INNOVATION_USE_FIELD_LABELS.USER_TYPES
      ],
    ).toEqual(['Other']);
  });

  it('Innovation use: "Investment (USD)" sums kind_cash across initiative/bilateral-project/partner budgets', () => {
    const payload = builder.project(
      innovationUseFixture.detail as Record<string, unknown>,
      innovationUseFixture.formDetail as Record<string, unknown>,
      OPTS,
    );
    expect(
      payload.sections.type_specific.fields[
        INNOVATION_USE_FIELD_LABELS.INVESTMENT_USD
      ],
    ).toEqual({ total: 12000 });
  });

  it('Innovation use: "Investment (USD)".total is null when all three budget arrays are empty', () => {
    const detail = {
      ...(innovationUseFixture.detail as Record<string, any>),
      innovation_use_summary: {
        ...(innovationUseFixture.detail as any).innovation_use_summary,
        initiative_budget: [],
        bilateral_project_budget: [],
        partner_budget: [],
      },
    };
    const payload = builder.project(
      detail,
      innovationUseFixture.formDetail as Record<string, unknown>,
      OPTS,
    );
    expect(
      payload.sections.type_specific.fields[
        INNOVATION_USE_FIELD_LABELS.INVESTMENT_USD
      ],
    ).toEqual({ total: null });
  });

  it('Policy change: "USD amount" is a typed object read from policy_change_summary, never the invented "Committed" literal', () => {
    const payload = builder.project(
      policyChangeFixture.detail as Record<string, unknown>,
      policyChangeFixture.formDetail as Record<string, unknown>,
      OPTS,
    );
    const usdAmount = payload.sections.type_specific.fields[
      POLICY_CHANGE_FIELD_LABELS.USD_AMOUNT
    ] as Record<string, unknown>;

    expect(usdAmount).toEqual({ amount: 250000, status: 'Confirmed' });
    // The three real form values (policy-change-info.component.html:29-31); "Committed" is not
    // one of them and must never appear.
    expect(['Confirmed', 'Estimated', 'Unknown', null]).toContain(
      usdAmount.status,
    );
  });
});

describe('impact_areas mapper (BIL-QAI-T-4b, BIL-QAI-R-2)', () => {
  const builder = new BilateralQualityPayloadBuilder(
    undefined as never,
    undefined as never,
  );

  it('Principal pillar carries non-empty subcomponents; Significant carries []; an untagged pillar is omitted', () => {
    const payload = builder.project(
      capacitySharingFixture.detail as Record<string, unknown>,
      capacitySharingFixture.formDetail as Record<string, unknown>,
      OPTS,
    );

    const gender = payload.impact_areas?.find(
      (a) => a.name === 'Gender equality, youth and social inclusion',
    );
    expect(gender).toEqual({
      name: 'Gender equality, youth and social inclusion',
      score: '(2) Principal',
      subcomponents: ['Gender equality', 'Youth'],
    });

    const poverty = payload.impact_areas?.find(
      (a) => a.name === 'Poverty reduction, livelihoods and jobs',
    );
    expect(poverty).toEqual({
      name: 'Poverty reduction, livelihoods and jobs',
      score: '(1) Significant',
      subcomponents: [],
    });

    // nutrition is tagged "(0) Not Targeted" — answered, so it IS present, with [] subcomponents.
    const nutrition = payload.impact_areas?.find(
      (a) => a.name === 'Nutrition, health and food security',
    );
    expect(nutrition).toEqual({
      name: 'Nutrition, health and food security',
      score: '(0) Not Targeted',
      subcomponents: [],
    });

    // climate_change and environmental_biodiversity are untagged (`tag_title: null`) in this
    // fixture — omitted entirely, not an empty-string placeholder entry.
    expect(
      payload.impact_areas?.some(
        (a) => a.name === 'Climate adaptation and mitigation',
      ),
    ).toBe(false);
    expect(
      payload.impact_areas?.some(
        (a) => a.name === 'Environmental health and biodiversity',
      ),
    ).toBe(false);
  });

  it('emits [] when the result tags no pillar at all', () => {
    const payload = builder.project(
      innovationUseFixture.detail as Record<string, unknown>,
      innovationUseFixture.formDetail as Record<string, unknown>,
      OPTS,
    );
    expect(payload.impact_areas).toEqual([]);
  });

  it('normalises a lowercase "(0) Not targeted" tag_title to the frozen "(0) Not Targeted" enum (T-1b forward pointer)', () => {
    const detail = {
      ...(capacitySharingFixture.detail as Record<string, any>),
      dac_scores: {
        ...(capacitySharingFixture.detail as any).dac_scores,
        // Real captured payload casing (bilateral-result-summaries.en.md:154) — lowercase "t".
        climate_change: {
          tag_title: '(0) Not targeted',
          impact_area_names: [],
        },
      },
    };
    const payload = builder.project(
      detail,
      capacitySharingFixture.formDetail as Record<string, unknown>,
      OPTS,
    );
    const climate = payload.impact_areas?.find(
      (a) => a.name === 'Climate adaptation and mitigation',
    );
    expect(climate?.score).toBe('(0) Not Targeted');
  });

  it('is included in the content hash: two payloads differing only in a pillar tag level hash differently', () => {
    const detailPrincipal = capacitySharingFixture.detail as Record<
      string,
      any
    >;
    const detailNoGender = {
      ...detailPrincipal,
      dac_scores: {
        ...detailPrincipal.dac_scores,
        gender: { tag_title: null, impact_area_names: [] },
      },
    };

    const payloadA = builder.project(
      detailPrincipal,
      capacitySharingFixture.formDetail as Record<string, unknown>,
      OPTS,
    );
    const payloadB = builder.project(
      detailNoGender,
      capacitySharingFixture.formDetail as Record<string, unknown>,
      OPTS,
    );

    expect(contentHash(payloadA)).not.toBe(contentHash(payloadB));
  });
});

describe('stripIdentifiers (denylist pass)', () => {
  it('drops every id-like key and bare integer outside the numeric allowlist', () => {
    const input = {
      result_id: 4101,
      id: 1,
      policy_type_code: 'X1',
      title: 'A clean label',
      nested: {
        toc_result_id: 20031,
        institution_id: 8801,
        year: 2025,
        quantity: 12,
        random_number: 7,
        keep: 'value',
      },
      list: [
        { evidence_id: 1, description: 'ok' },
        { result_kp_metadata_id: 2, source: 'CGSpace' },
      ],
    };

    const stripped = stripIdentifiers(input) as Record<string, any>;

    const serialized = JSON.stringify(stripped);
    expect(serialized).not.toMatch(/_id"|"id"|_code"/);
    expect(stripped.title).toBe('A clean label');
    expect(stripped.nested.year).toBe(2025);
    expect(stripped.nested.quantity).toBe(12);
    expect(stripped.nested.random_number).toBeUndefined();
    expect(stripped.nested.keep).toBe('value');
    expect(stripped.list).toEqual([
      { description: 'ok' },
      { source: 'CGSpace' },
    ]);
  });

  it('keeps request_id/constraints untouched when the caller applies the pass selectively', () => {
    // The builder never runs stripIdentifiers over the whole payload — only over `result` and
    // `sections` — so request_id (the one identifier the contract allows) is never a candidate.
    const contentOnly = stripIdentifiers({ evidence_id: 1, label: 'x' });
    expect(contentOnly).toEqual({ label: 'x' });
  });
});
