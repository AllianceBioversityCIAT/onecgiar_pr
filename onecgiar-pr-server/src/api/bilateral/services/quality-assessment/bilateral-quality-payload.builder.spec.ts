// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)
import * as fs from 'fs';
import * as path from 'path';
import {
  BilateralQualityPayloadBuilder,
  BilateralResultFormReadError,
  UnresolvableLabelError,
} from './bilateral-quality-payload.builder';
import { QualityPayload } from './bilateral-quality-rules';
import { stripIdentifiers } from './mappers/strip-identifiers';

function loadFixture(name: string): {
  detail: Record<string, unknown>;
  formDetail: Record<string, unknown>;
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
  },
];

describe('BilateralQualityPayloadBuilder', () => {
  // project() is pure — the constructor args are never touched by project(), so a fixture-driven
  // spec can build the class without any Nest DI or real BilateralService/ResultsService.
  const builder = new BilateralQualityPayloadBuilder(
    undefined as never,
    undefined as never,
  );

  describe.each(FIXTURES)('$name fixture', ({ expectedType, fixture }) => {
    let payload: QualityPayload;

    beforeAll(() => {
      payload = builder.project(fixture.detail, fixture.formDetail, OPTS);
    });

    it('carries no identifier-shaped keys in the content (result + sections)', () => {
      // request_id lives at the payload's top level, outside `result`/`sections` — it is the
      // one identifier the contract allows (it names the call, not the result) and is exactly
      // what `stripIdentifiers` is scoped to leave untouched (see mappers/strip-identifiers.ts).
      const serialized = JSON.stringify({
        result: payload.result,
        sections: payload.sections,
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
      expect(payload.contract_version).toBe('0.1');
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
      expect(payload.contract_version).toBe('0.1');
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
