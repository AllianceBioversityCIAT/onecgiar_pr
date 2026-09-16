import * as fs from 'fs';
import * as path from 'path';
import {
  applyGreyRule,
  contentHash,
  evaluateKpRule,
  hasOutstandingFlags,
  AiAssessmentResponse,
  QualityPayload,
  KpMetadataRow,
  KpRuleInput,
  QualitySectionKey,
  QualityVerdict,
} from './bilateral-quality-rules';
import { BilateralQualityPayloadBuilder } from './bilateral-quality-payload.builder';

const knowledgeProductFixture = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, './fixtures/knowledge-product.fixture.json'),
    'utf8',
  ),
);

/**
 * BIL-QAI-T-3 — pure rules: grey rule, KP decision tree, content hash, outstanding flags.
 *
 * Expected values below are taken literally from
 * docs/specs/bilateral/qa-ai-traffic-light/design.md §5 and requirements.md
 * (BIL-QAI-R-3, R-4, R-6, R-8, R-9), never recomputed by calling the functions under test.
 */

const SECTION_KEYS: QualitySectionKey[] = [
  'general_information',
  'contributors_and_partners',
  'geographic_location',
  'evidence',
  'type_specific',
];

const buildSection = (verdict: QualityVerdict) => ({
  verdict,
  comments: `${verdict} comments`,
  strengths: [] as string[],
  issues: [] as string[],
});

const buildAiResponse = (
  overrides: Partial<AiAssessmentResponse> = {},
): AiAssessmentResponse => ({
  request_id: 'req-1',
  criteria_version: 'QA-2026-v1',
  overall: { verdict: 'green', summary: 'Looks good overall.' },
  sections: {
    general_information: buildSection('green'),
    contributors_and_partners: buildSection('green'),
    geographic_location: buildSection('green'),
    evidence: buildSection('green'),
    type_specific: buildSection('green'),
  },
  evidence: [],
  ...overrides,
});

const buildPayload = (
  evidence: QualityPayload['sections']['evidence'] = [],
): QualityPayload => ({
  contract_version: '0.1',
  request_id: 'req-1',
  result: { type: 'Innovation development' },
  sections: {
    general_information: { title: 'A title' },
    contributors_and_partners: { lead_center: 'AfricaRice' },
    geographic_location: { scope: 'National' },
    evidence,
    type_specific: { type: 'innovation_development', fields: {} },
  },
  constraints: { timeout_seconds: 60 },
});

describe('contentHash', () => {
  it('is the same hash when top-level keys are reordered', () => {
    const payloadA = {
      request_id: 'req-A',
      result: { type: 'Innovation development' },
      sections: { general_information: { title: 'A' } },
    };
    const payloadB = {
      sections: { general_information: { title: 'A' } },
      result: { type: 'Innovation development' },
      request_id: 'req-A',
    };

    expect(contentHash(payloadA)).toBe(contentHash(payloadB));
  });

  it('is the same hash when nested keys are reordered', () => {
    const payloadA = {
      sections: { general_information: { title: 'A', description: 'B' } },
    };
    const payloadB = {
      sections: { general_information: { description: 'B', title: 'A' } },
    };

    expect(contentHash(payloadA)).toBe(contentHash(payloadB));
  });

  it('is the same hash regardless of request_id', () => {
    const base = { result: { type: 'Innovation development' } };
    const payloadA = { ...base, request_id: 'req-A' };
    const payloadB = { ...base, request_id: 'req-B' };

    expect(contentHash(payloadA)).toBe(contentHash(payloadB));
  });

  it('is the same hash regardless of constraints', () => {
    const base = { result: { type: 'Innovation development' } };
    const payloadA = { ...base, constraints: { timeout_seconds: 60 } };
    const payloadB = { ...base, constraints: { timeout_seconds: 30 } };

    expect(contentHash(payloadA)).toBe(contentHash(payloadB));
  });

  it('is a different hash when one label changes', () => {
    const payloadA = {
      sections: { general_information: { title: 'A title' } },
    };
    const payloadB = {
      sections: { general_information: { title: 'A different title' } },
    };

    expect(contentHash(payloadA)).not.toBe(contentHash(payloadB));
  });

  it('keeps array order significant (does not sort array elements)', () => {
    const payloadA = { sections: { evidence: ['first', 'second'] } };
    const payloadB = { sections: { evidence: ['second', 'first'] } };

    expect(contentHash(payloadA)).not.toBe(contentHash(payloadB));
  });

  it('returns a 64-char hex sha256 digest', () => {
    const hash = contentHash({ result: { type: 'Knowledge product' } });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  // BIL-QAI-T-4 forward pointer (from the T-3 review): contentHash(payload: Record<string,
  // unknown>) did not structurally accept a `QualityPayload` (TS2345) — the payload builder's
  // return type. Widened to `QualityPayload | Record<string, unknown>`; this case hashes an
  // actual built payload to prove the widened signature compiles and behaves.
  it('hashes a payload produced by BilateralQualityPayloadBuilder without a type error', () => {
    const builder = new BilateralQualityPayloadBuilder(
      undefined as never,
      undefined as never,
    );
    const payload: QualityPayload = builder.project(
      knowledgeProductFixture.detail,
      knowledgeProductFixture.formDetail,
      { requestId: 'req-hash-test', timeoutSeconds: 60 },
    );

    const hash = contentHash(payload);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);

    // Same content, different request_id/constraints/timeout -> same hash (design.md §5 "Hash").
    const samePayloadDifferentRequest: QualityPayload = builder.project(
      knowledgeProductFixture.detail,
      knowledgeProductFixture.formDetail,
      { requestId: 'req-hash-test-2', timeoutSeconds: 30 },
    );
    expect(contentHash(samePayloadDifferentRequest)).toBe(hash);
  });
});

describe('applyGreyRule', () => {
  it('forces grey on a private repository evidence item, even when the AI said green', () => {
    const payload = buildPayload([
      {
        description: 'Private file',
        link: null,
        source: 'prms_repository',
        visibility: 'private',
        tags: [],
      },
    ]);
    const response = buildAiResponse({
      evidence: [{ index: 0, verdict: 'green', reason: 'Looks fine' }],
    });

    const result = applyGreyRule(response, payload);

    expect(result.evidence[0].verdict).toBe('grey');
    expect(result.evidence[0].reason).toBe(
      'Private repository file — not evaluated',
    );
  });

  it('forces grey on an item whose link is null even if visibility is not private', () => {
    const payload = buildPayload([
      {
        description: 'Odd item',
        link: null,
        source: 'url',
        visibility: 'public',
        tags: [],
      },
    ]);
    const response = buildAiResponse({
      evidence: [{ index: 0, verdict: 'amber', reason: 'Needs more detail' }],
    });

    const result = applyGreyRule(response, payload);

    expect(result.evidence[0].verdict).toBe('grey');
  });

  it('keeps the AI reason when the AI already returned grey for a private item', () => {
    const payload = buildPayload([
      {
        description: 'Private file',
        link: null,
        source: 'prms_repository',
        visibility: 'private',
        tags: [],
      },
    ]);
    const response = buildAiResponse({
      evidence: [
        { index: 0, verdict: 'grey', reason: 'Blocked by robots.txt' },
      ],
    });

    const result = applyGreyRule(response, payload);

    expect(result.evidence[0].verdict).toBe('grey');
    expect(result.evidence[0].reason).toBe('Blocked by robots.txt');
  });

  it('leaves a public evidence item exactly as the AI graded it', () => {
    const payload = buildPayload([
      {
        description: 'Public link',
        link: 'https://example.org/doc',
        source: 'url',
        visibility: 'public',
        tags: [],
      },
    ]);
    const response = buildAiResponse({
      evidence: [{ index: 0, verdict: 'amber', reason: 'Could be clearer' }],
    });

    const result = applyGreyRule(response, payload);

    expect(result.evidence[0]).toEqual({
      index: 0,
      verdict: 'amber',
      reason: 'Could be clearer',
    });
  });

  it('never touches section verdicts or the overall verdict', () => {
    const payload = buildPayload([
      {
        description: 'Private file',
        link: null,
        source: 'prms_repository',
        visibility: 'private',
        tags: [],
      },
    ]);
    const response = buildAiResponse({
      overall: { verdict: 'red', summary: 'Needs work' },
      evidence: [{ index: 0, verdict: 'green', reason: 'Fine' }],
    });

    const result = applyGreyRule(response, payload);

    expect(result.overall).toEqual({ verdict: 'red', summary: 'Needs work' });
    expect(result.sections).toEqual(response.sections);
  });

  it('does not mutate the response or payload it was given', () => {
    const payload = buildPayload([
      {
        description: 'Private file',
        link: null,
        source: 'prms_repository',
        visibility: 'private',
        tags: [],
      },
    ]);
    const response = buildAiResponse({
      evidence: [{ index: 0, verdict: 'green', reason: 'Fine' }],
    });
    const payloadSnapshot = JSON.parse(JSON.stringify(payload));
    const responseSnapshot = JSON.parse(JSON.stringify(response));

    applyGreyRule(response, payload);

    expect(payload).toEqual(payloadSnapshot);
    expect(response).toEqual(responseSnapshot);
  });

  it('returns a new object, not the same reference as the response', () => {
    const payload = buildPayload([]);
    const response = buildAiResponse({ evidence: [] });

    const result = applyGreyRule(response, payload);

    expect(result).not.toBe(response);
  });
});

describe('evaluateKpRule', () => {
  const AGREE_ROW: KpMetadataRow = {
    year: 2024,
    is_isi: true,
    is_peer_reviewed: true,
    accesibility: 'Open access',
  };

  type RowsVariant =
    | 'both_agree'
    | 'mismatch_year'
    | 'mismatch_is_isi'
    | 'mismatch_is_peer_reviewed'
    | 'mismatch_accesibility'
    | 'wos_missing'
    | 'cgspace_missing';

  const buildRows = (
    variant: RowsVariant,
  ): { cgspace: KpMetadataRow | null; wos: KpMetadataRow | null } => {
    const cgspace: KpMetadataRow = { ...AGREE_ROW };
    const wos: KpMetadataRow = { ...AGREE_ROW };
    switch (variant) {
      case 'both_agree':
        return { cgspace, wos };
      case 'mismatch_year':
        return { cgspace, wos: { ...wos, year: 2023 } };
      case 'mismatch_is_isi':
        // Falsifying input from the work order: CGSpace true, WoS null.
        return { cgspace, wos: { ...wos, is_isi: null } };
      case 'mismatch_is_peer_reviewed':
        return { cgspace, wos: { ...wos, is_peer_reviewed: false } };
      case 'mismatch_accesibility':
        return { cgspace, wos: { ...wos, accesibility: 'Restricted' } };
      case 'wos_missing':
        return { cgspace, wos: null };
      case 'cgspace_missing':
        return { cgspace: null, wos };
    }
  };

  // Literal expected verdicts per docs/specs/bilateral/qa-ai-traffic-light/design.md §5:
  //   branch 1: !is_melia && type !== 'Journal Article'            -> green (always, rows irrelevant)
  //   branch 2: type === 'Journal Article' && rows fully agree     -> green (regardless of is_melia)
  //   branch 3: otherwise (MELIA non-JA, or JA mismatch/missing)   -> grey
  const MATRIX: Array<[boolean, string, RowsVariant, QualityVerdict]> = [
    [false, 'Report', 'both_agree', 'green'],
    [false, 'Report', 'mismatch_year', 'green'],
    [false, 'Report', 'mismatch_is_isi', 'green'],
    [false, 'Report', 'mismatch_is_peer_reviewed', 'green'],
    [false, 'Report', 'mismatch_accesibility', 'green'],
    [false, 'Report', 'wos_missing', 'green'],
    [false, 'Report', 'cgspace_missing', 'green'],
    [true, 'Report', 'both_agree', 'grey'],
    [true, 'Report', 'mismatch_year', 'grey'],
    [true, 'Report', 'mismatch_is_isi', 'grey'],
    [true, 'Report', 'mismatch_is_peer_reviewed', 'grey'],
    [true, 'Report', 'mismatch_accesibility', 'grey'],
    [true, 'Report', 'wos_missing', 'grey'],
    [true, 'Report', 'cgspace_missing', 'grey'],
    [false, 'Journal Article', 'both_agree', 'green'],
    [false, 'Journal Article', 'mismatch_year', 'grey'],
    [false, 'Journal Article', 'mismatch_is_isi', 'grey'],
    [false, 'Journal Article', 'mismatch_is_peer_reviewed', 'grey'],
    [false, 'Journal Article', 'mismatch_accesibility', 'grey'],
    [false, 'Journal Article', 'wos_missing', 'grey'],
    [false, 'Journal Article', 'cgspace_missing', 'grey'],
    [true, 'Journal Article', 'both_agree', 'green'],
    [true, 'Journal Article', 'mismatch_year', 'grey'],
    [true, 'Journal Article', 'mismatch_is_isi', 'grey'],
    [true, 'Journal Article', 'mismatch_is_peer_reviewed', 'grey'],
    [true, 'Journal Article', 'mismatch_accesibility', 'grey'],
    [true, 'Journal Article', 'wos_missing', 'grey'],
    [true, 'Journal Article', 'cgspace_missing', 'grey'],
  ];

  it.each(MATRIX)(
    'is_melia=%s type=%s rows=%s => %s',
    (is_melia, type, variant, expected) => {
      const { cgspace, wos } = buildRows(variant);
      const input: KpRuleInput = {
        is_melia,
        knowledge_product_type: type,
        cgspace,
        wos,
      };

      const result = evaluateKpRule(input);

      expect(result.overall.verdict).toBe(expected);
      expect(result.status).toBe('skipped_kp_rule');
      for (const key of SECTION_KEYS) {
        expect(result.sections[key].verdict).toBe(expected);
      }
    },
  );

  it('BIL-QAI-R-9 "Not MELIA, not JA": rationale says auto-validated by repository metadata', () => {
    const input: KpRuleInput = {
      is_melia: false,
      knowledge_product_type: 'Report',
      cgspace: null,
      wos: null,
    };

    const result = evaluateKpRule(input);

    expect(result.overall.verdict).toBe('green');
    expect(result.overall.summary.toLowerCase()).toContain('auto-validated');
    expect(result.status).toBe('skipped_kp_rule');
  });

  it('BIL-QAI-R-9 "Journal Article with matching metadata": rationale lists the four matched fields', () => {
    const input: KpRuleInput = {
      is_melia: false,
      knowledge_product_type: 'Journal Article',
      cgspace: { ...AGREE_ROW },
      wos: { ...AGREE_ROW },
    };

    const result = evaluateKpRule(input);

    expect(result.overall.verdict).toBe('green');
    expect(result.overall.summary).toEqual(expect.stringContaining('year'));
    expect(result.overall.summary).toEqual(expect.stringContaining('is_isi'));
    expect(result.overall.summary).toEqual(
      expect.stringContaining('is_peer_reviewed'),
    );
    expect(result.overall.summary).toEqual(
      expect.stringContaining('accesibility'),
    );
  });

  it('BIL-QAI-R-9 "Fallthrough": grey names the mismatching field (falsifying input: is_isi true vs null)', () => {
    // FALSIFYING INPUT (work order): JA, is_isi true on CGSpace, null on WoS.
    // If this ever returns 'green', the test must fail — it must be grey naming is_isi.
    const input: KpRuleInput = {
      is_melia: false,
      knowledge_product_type: 'Journal Article',
      cgspace: { ...AGREE_ROW, is_isi: true },
      wos: { ...AGREE_ROW, is_isi: null },
    };

    const result = evaluateKpRule(input);

    expect(result.overall.verdict).toBe('grey');
    expect(result.overall.summary.toLowerCase()).toContain(
      'criteria pending confirmation',
    );
    expect(result.overall.summary).toEqual(expect.stringContaining('is_isi'));
  });

  it('BIL-QAI-R-9 "Fallthrough": grey names the missing row when WoS is absent', () => {
    const input: KpRuleInput = {
      is_melia: false,
      knowledge_product_type: 'Journal Article',
      cgspace: { ...AGREE_ROW },
      wos: null,
    };

    const result = evaluateKpRule(input);

    expect(result.overall.verdict).toBe('grey');
    expect(result.overall.summary.toLowerCase()).toContain('wos');
  });

  it('BIL-QAI-R-9 "Fallthrough": grey names the missing row when CGSpace is absent', () => {
    const input: KpRuleInput = {
      is_melia: false,
      knowledge_product_type: 'Journal Article',
      cgspace: null,
      wos: { ...AGREE_ROW },
    };

    const result = evaluateKpRule(input);

    expect(result.overall.verdict).toBe('grey');
    expect(result.overall.summary.toLowerCase()).toContain('cgspace');
  });

  it('BIL-QAI-R-9 "Fallthrough": grey names both rows missing when neither CGSpace nor WoS is present', () => {
    const input: KpRuleInput = {
      is_melia: false,
      knowledge_product_type: 'Journal Article',
      cgspace: null,
      wos: null,
    };

    const result = evaluateKpRule(input);

    expect(result.overall.verdict).toBe('grey');
    expect(result.overall.summary.toLowerCase()).toContain('cgspace');
    expect(result.overall.summary.toLowerCase()).toContain('wos');
  });

  it('BIL-QAI-R-9 "Fallthrough": MELIA (non-JA) is grey with "criteria pending confirmation"', () => {
    const input: KpRuleInput = {
      is_melia: true,
      knowledge_product_type: 'Report',
      cgspace: null,
      wos: null,
    };

    const result = evaluateKpRule(input);

    expect(result.overall.verdict).toBe('grey');
    expect(result.overall.summary.toLowerCase()).toContain(
      'criteria pending confirmation',
    );
  });

  it('lists KP evidence items as grey "not assessed for knowledge products"', () => {
    const input: KpRuleInput = {
      is_melia: false,
      knowledge_product_type: 'Report',
      cgspace: null,
      wos: null,
      evidence_count: 2,
    };

    const result = evaluateKpRule(input);

    expect(result.evidence).toHaveLength(2);
    expect(result.evidence[0]).toEqual({
      index: 0,
      verdict: 'grey',
      reason: 'Not assessed for knowledge products',
    });
    expect(result.evidence[1]).toEqual({
      index: 1,
      verdict: 'grey',
      reason: 'Not assessed for knowledge products',
    });
  });

  it('returns an empty evidence array when no evidence count is given', () => {
    const input: KpRuleInput = {
      is_melia: false,
      knowledge_product_type: 'Report',
      cgspace: null,
      wos: null,
    };

    const result = evaluateKpRule(input);

    expect(result.evidence).toEqual([]);
  });

  it('sets every section to the overall verdict with matching comments (no per-section divergence)', () => {
    const input: KpRuleInput = {
      is_melia: false,
      knowledge_product_type: 'Journal Article',
      cgspace: { ...AGREE_ROW },
      wos: { ...AGREE_ROW },
    };

    const result = evaluateKpRule(input);

    for (const key of SECTION_KEYS) {
      expect(result.sections[key].verdict).toBe('green');
      expect(result.sections[key].comments).toBe(result.overall.summary);
      expect(result.sections[key].strengths).toEqual([]);
      expect(result.sections[key].issues).toEqual([]);
    }
  });
});

describe('hasOutstandingFlags', () => {
  it('is true when the overall verdict is amber', () => {
    expect(
      hasOutstandingFlags({ overall_verdict: 'amber', sections: null }),
    ).toBe(true);
  });

  it('is true when the overall verdict is red', () => {
    expect(
      hasOutstandingFlags({ overall_verdict: 'red', sections: null }),
    ).toBe(true);
  });

  it('is false when the overall verdict is green', () => {
    expect(
      hasOutstandingFlags({ overall_verdict: 'green', sections: null }),
    ).toBe(false);
  });

  it('is false when the overall verdict is grey', () => {
    expect(
      hasOutstandingFlags({ overall_verdict: 'grey', sections: null }),
    ).toBe(false);
  });

  it('is true when overall is green but a section is amber', () => {
    expect(
      hasOutstandingFlags({
        overall_verdict: 'green',
        sections: {
          general_information: { verdict: 'green' },
          evidence: { verdict: 'amber' },
        },
      }),
    ).toBe(true);
  });

  it('is true when overall is grey but a section is red', () => {
    expect(
      hasOutstandingFlags({
        overall_verdict: 'grey',
        sections: {
          general_information: { verdict: 'grey' },
          evidence: { verdict: 'red' },
        },
      }),
    ).toBe(true);
  });

  it('is false when every section is green or grey', () => {
    expect(
      hasOutstandingFlags({
        overall_verdict: 'green',
        sections: {
          general_information: { verdict: 'green' },
          evidence: { verdict: 'grey' },
        },
      }),
    ).toBe(false);
  });

  it('tolerates a null sections object', () => {
    expect(
      hasOutstandingFlags({ overall_verdict: 'green', sections: null }),
    ).toBe(false);
  });

  it('tolerates an empty sections object', () => {
    expect(
      hasOutstandingFlags({ overall_verdict: 'green', sections: {} }),
    ).toBe(false);
  });
});
