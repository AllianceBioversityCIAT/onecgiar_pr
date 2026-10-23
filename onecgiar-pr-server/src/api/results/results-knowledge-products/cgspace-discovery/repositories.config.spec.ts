import {
  KP_REPOSITORIES,
  RepositoryAdapter,
  parseProjectProgram,
  resolveProjectScope,
  translateParams,
} from './repositories.config';

/**
 * `KPSF-T-2` — `translateParams` scoped linked/related composition (`design.md` §8.2).
 * Expected strings are written out as literals (not rebuilt with the module under test).
 */

const cgspace = KP_REPOSITORIES.cgspace;
const melspace = KP_REPOSITORIES.melspace;
const worldfish = KP_REPOSITORIES.worldfish;

const AID_I_TITLE =
  'IITA Accelerated Innovation Delivery Initiative (AID-I) for Mozambique';

/** The T-1 clause for T-PJ-003942 on a given project field. */
const aidClause = (field: string) =>
  `${field}:(accelerated AND innovation AND delivery AND initiative AND aid AND mozambique) OR ${field}:"pj 003942" OR ${field}:"pj 3942"`;

const aidProject = {
  projectCode: 'T-PJ-003942',
  projectTitle: AID_I_TITLE,
  projectLeadCenter: 'IITA',
};

describe('translateParams — no project params (KPSF-R-10, pre-change snapshot)', () => {
  it('CGSpace, no user text: dsoType/page/size + the accessioned sort only', () => {
    expect(
      translateParams({ page: 0, size: 10, year: '2026' }, cgspace),
    ).toEqual({
      dsoType: 'item',
      page: 0,
      size: 10,
      sort: 'dc.date.accessioned,DESC',
      'f.dateIssued': '[2026 TO 2026],equals',
    });
  });

  it('CGSpace, user text + type + center: escaped query and the facet params', () => {
    expect(
      translateParams(
        {
          query: 'maize: (yield)',
          page: 2,
          size: 5,
          type: 'Case Study',
          center: 'IITA',
          year: '2026',
        },
        cgspace,
      ),
    ).toEqual({
      dsoType: 'item',
      page: 2,
      size: 5,
      query: 'maize\\: \\(yield\\)',
      'f.itemtype': 'Case Study,equals',
      'f.affiliation': 'IITA,equals',
      'f.dateIssued': '[2026 TO 2026],equals',
    });
  });

  it('MELSpace and WorldFish: center facet is `institute`, still no project param', () => {
    const dto = {
      query: 'rice',
      page: 0,
      size: 10,
      type: 'Brief',
      center: 'IRRI',
    };
    for (const adapter of [melspace, worldfish]) {
      expect(translateParams(dto, adapter)).toEqual({
        dsoType: 'item',
        page: 0,
        size: 10,
        query: 'rice',
        'f.itemtype': 'Brief,equals',
        'f.institute': 'IRRI,equals',
      });
    }
  });
});

describe('translateParams — project scope (KPSF-R-1, R-3, R-7, R-8, R-11)', () => {
  it('linked on CGSpace, no user text: `*:* AND (clause)` on cg.identifier.project, sort kept, year facet kept', () => {
    const params = translateParams(
      {
        ...aidProject,
        projectScope: 'linked',
        year: '2026',
        page: 0,
        size: 10,
      },
      cgspace,
    );

    expect(params.query).toBe(
      `*:* AND (${aidClause('cg.identifier.project')})`,
    );
    expect(params.query).toContain(
      'cg.identifier.project:(accelerated AND innovation AND delivery AND initiative AND aid AND mozambique)',
    );
    expect(params.sort).toBe('dc.date.accessioned,DESC');
    expect(params['f.dateIssued']).toBe('[2026 TO 2026],equals');
  });

  it('linked on MELSpace and WorldFish uses cg.contributor.project, never cg.identifier.project', () => {
    for (const adapter of [melspace, worldfish]) {
      const params = translateParams(
        { ...aidProject, projectScope: 'linked', page: 0, size: 10 },
        adapter,
      );
      expect(params.query).toBe(
        `*:* AND (${aidClause('cg.contributor.project')})`,
      );
      expect(params.query).not.toContain('cg.identifier.project');
    }
  });

  // @akili-spec changes/kp-related-relevance-ranking
  // Supersedes the KPSF expectation: a related request with a usable project now also carries the
  // relevance block and no date sort (`KRR-R-1`, `KRR-DD-6`). The KPSF prefix is unchanged.
  it('related: `AND NOT (clause)` stays the prefix, a user text is AND-combined first, the relevance block follows', () => {
    const block =
      ' AND (*:* OR dcterms.subject:accelerated^4 OR dcterms.subject:innovation^4 OR dcterms.subject:delivery^4 OR dcterms.subject:initiative^4 OR dcterms.subject:aid^4 OR dcterms.subject:mozambique^4)';
    const noText = translateParams(
      { ...aidProject, projectScope: 'related', page: 0, size: 10 },
      cgspace,
    );
    expect(noText.query).toBe(
      `*:* AND NOT (${aidClause('cg.identifier.project')})${block}`,
    );
    expect(noText.sort).toBeUndefined();

    const withText = translateParams(
      {
        ...aidProject,
        projectScope: 'related',
        query: 'seed',
        type: 'Case Study',
        center: 'IITA',
        year: '2026',
      },
      cgspace,
    );
    expect(withText.query).toBe(
      `(seed) AND NOT (${aidClause('cg.identifier.project')}) AND (*:* OR dcterms.subject:accelerated^0.001 OR dcterms.subject:innovation^0.001 OR dcterms.subject:delivery^0.001 OR dcterms.subject:initiative^0.001 OR dcterms.subject:aid^0.001 OR dcterms.subject:mozambique^0.001)`,
    );
    expect(withText.sort).toBeUndefined();
    expect(withText['f.itemtype']).toBe('Case Study,equals');
    expect(withText['f.affiliation']).toBe('IITA,equals');
    expect(withText['f.dateIssued']).toBe('[2026 TO 2026],equals');
  });

  it('linked with user text keeps escapeSolrQuery on the text', () => {
    const params = translateParams(
      { ...aidProject, projectScope: 'linked', query: 'maize: (yield)' },
      cgspace,
    );
    expect(params.query).toBe(
      `(maize\\: \\(yield\\)) AND (${aidClause('cg.identifier.project')})`,
    );
  });

  it('never emits the legacy f.project facet, whatever the inputs', () => {
    const calls = [
      translateParams({ ...aidProject, projectScope: 'linked' }, melspace),
      translateParams({ ...aidProject, projectScope: 'related' }, worldfish),
      translateParams(
        {
          project:
            'T-PJ-003942 - Accelerated Innovation Delivery Initiative for Mozambique',
        },
        melspace,
      ),
    ];
    for (const params of calls) {
      expect(Object.keys(params)).not.toContain('f.project');
      expect(JSON.stringify(params)).not.toContain('f.project');
    }
  });

  it('related with an unusable project sends the base query only', () => {
    const params = translateParams(
      {
        projectTitle: 'Soil',
        projectScope: 'related',
        query: 'seed',
      },
      cgspace,
    );
    expect(params.query).toBe('seed');
    expect(params.query).not.toContain('NOT');
  });

  it('special characters in the project title never reach the query (KPSF-R-9)', () => {
    const params = translateParams(
      {
        projectCode: 'T-PJ-003942',
        projectTitle: 'Soil " : ( ) * ? \\ AND OR carbon storage',
        projectScope: 'linked',
      },
      cgspace,
    );
    expect(params.query).toBe(
      '*:* AND (cg.identifier.project:(soil AND carbon AND storage) OR cg.identifier.project:"pj 003942" OR cg.identifier.project:"pj 3942")',
    );
  });

  it('legacy `project` (<code> - <title>) is mapped to the linked scope', () => {
    const legacy = translateParams(
      {
        project:
          'T-PJ-003942 - Accelerated Innovation Delivery Initiative (AID-I) for Mozambique',
      },
      cgspace,
    );
    const explicit = translateParams(
      {
        projectCode: 'T-PJ-003942',
        projectTitle:
          'Accelerated Innovation Delivery Initiative (AID-I) for Mozambique',
        projectScope: 'linked',
      },
      cgspace,
    );
    expect(legacy).toEqual(explicit);
    expect(legacy.query).toContain('AND (cg.identifier.project:(accelerated');
  });
});

describe('resolveProjectScope', () => {
  it('returns null when no project input is present', () => {
    expect(resolveProjectScope({ query: 'maize', year: '2026' })).toBeNull();
    expect(resolveProjectScope({ projectCode: 'T-PJ-003942' })).toBeNull();
  });

  it('reports applied=true for a usable project and applied=false otherwise', () => {
    expect(
      resolveProjectScope({ ...aidProject, projectScope: 'linked' }),
    ).toEqual(expect.objectContaining({ scope: 'linked', applied: true }));
    expect(
      resolveProjectScope({ projectTitle: 'Soil', projectScope: 'related' }),
    ).toEqual(expect.objectContaining({ scope: 'related', applied: false }));
  });

  it('an explicit scope wins over the legacy `project` param', () => {
    expect(
      resolveProjectScope({
        ...aidProject,
        projectScope: 'related',
        project: 'T-PJ-000001 - Something Else Entirely',
      }),
    ).toEqual(expect.objectContaining({ scope: 'related', applied: true }));
  });
});

// @akili-spec changes/kp-related-relevance-ranking
describe('translateParams — related relevance block (KRR-R-1, R-2, R-3, R-4, R-9, R-10)', () => {
  /** The KPSF related query for T-PJ-003942 on one project field, written out (no rebuilding). */
  const relatedNoText = (field: string) => `*:* AND NOT (${aidClause(field)})`;

  const ranking = {
    ...aidProject,
    projectScope: 'related' as const,
    projectDescription: 'Cassava seed systems',
    projectLeadCenterName: 'International Institute of Tropical Agriculture',
    projectProgram: 'SP03 - Sustainable Farming',
  };

  it('no search text: CGSpace appends the strong-weight block and sends no sort', () => {
    const params = translateParams(
      { ...ranking, year: '2026', page: 0, size: 10 },
      cgspace,
    );

    expect(params.query).toBe(
      `${relatedNoText('cg.identifier.project')} AND (*:* OR dcterms.subject:accelerated^4 OR dcterms.subject:innovation^4 OR dcterms.subject:delivery^4 OR dcterms.subject:initiative^4 OR dcterms.subject:aid^4 OR dcterms.subject:mozambique^4 OR dcterms.subject:cassava^4 OR dcterms.subject:seed^4 OR dcterms.subject:systems^4 OR cg.contributor.affiliation:"international institute of tropical agriculture"^2 OR cg.contributor.programAccelerator:"sustainable farming"^2)`,
    );
    expect(Object.keys(params)).not.toContain('sort');
    expect(params['f.dateIssued']).toBe('[2026 TO 2026],equals');
  });

  it('no search text: MELSpace and WorldFish use dc.subject and their own project/affiliation fields', () => {
    const melspaceParams = translateParams(ranking, melspace);
    expect(melspaceParams.query).toBe(
      `${relatedNoText('cg.contributor.project')} AND (*:* OR dc.subject:accelerated^4 OR dc.subject:innovation^4 OR dc.subject:delivery^4 OR dc.subject:initiative^4 OR dc.subject:aid^4 OR dc.subject:mozambique^4 OR dc.subject:cassava^4 OR dc.subject:seed^4 OR dc.subject:systems^4 OR cg.contributor.center:"international institute of tropical agriculture"^2 OR cg.contributor.programAccelerator:"sustainable farming"^2)`,
    );

    const worldfishParams = translateParams(ranking, worldfish);
    expect(worldfishParams.query).toBe(
      `${relatedNoText('cg.contributor.project')} AND (*:* OR dc.subject:accelerated^4 OR dc.subject:innovation^4 OR dc.subject:delivery^4 OR dc.subject:initiative^4 OR dc.subject:aid^4 OR dc.subject:mozambique^4 OR dc.subject:cassava^4 OR dc.subject:seed^4 OR dc.subject:systems^4 OR cg.contributor.affiliation:"international institute of tropical agriculture"^2 OR cg.contributor.programAccelerator:"sustainable farming"^2)`,
    );
    expect(Object.keys(melspaceParams)).not.toContain('sort');
    expect(Object.keys(worldfishParams)).not.toContain('sort');
  });

  it('with search text: text is AND-combined first and the calibrated weak weights apply (R-2)', () => {
    const params = translateParams({ ...ranking, query: 'potato' }, cgspace);

    expect(params.query).toBe(
      `(potato) AND NOT (${aidClause('cg.identifier.project')}) AND (*:* OR dcterms.subject:accelerated^0.001 OR dcterms.subject:innovation^0.001 OR dcterms.subject:delivery^0.001 OR dcterms.subject:initiative^0.001 OR dcterms.subject:aid^0.001 OR dcterms.subject:mozambique^0.001 OR dcterms.subject:cassava^0.001 OR dcterms.subject:seed^0.001 OR dcterms.subject:systems^0.001 OR cg.contributor.affiliation:"international institute of tropical agriculture"^0.0005 OR cg.contributor.programAccelerator:"sustainable farming"^0.0005)`,
    );
    expect(Object.keys(params)).not.toContain('sort');
  });

  it('no program and no center in the request: only the subject boosts are emitted', () => {
    const params = translateParams(
      { ...aidProject, projectScope: 'related' },
      cgspace,
    );
    expect(params.query).toBe(
      `${relatedNoText('cg.identifier.project')} AND (*:* OR dcterms.subject:accelerated^4 OR dcterms.subject:innovation^4 OR dcterms.subject:delivery^4 OR dcterms.subject:initiative^4 OR dcterms.subject:aid^4 OR dcterms.subject:mozambique^4)`,
    );
    expect(params.query).not.toContain('programAccelerator');
    expect(params.query).not.toContain('affiliation');
  });

  it('an adapter without an affiliation field skips the center boost and keeps the rest', () => {
    const noAffiliation: RepositoryAdapter = {
      ...cgspace,
      fields: { ...cgspace.fields, affiliation: undefined },
    };
    const params = translateParams(ranking, noAffiliation);
    expect(params.query).toContain('dcterms.subject:cassava^4');
    expect(params.query).toContain(
      'cg.contributor.programAccelerator:"sustainable farming"^2',
    );
    expect(params.query).not.toContain('international institute');
  });

  it('the program param is split on the first " - " only and either part may be absent (FP-2)', () => {
    const codeOnly = translateParams(
      { ...aidProject, projectScope: 'related', projectProgram: 'SP13 -' },
      cgspace,
    );
    expect(codeOnly.query).toContain(
      'cg.contributor.programAccelerator:"sp13"^2',
    );

    const hyphenated = translateParams(
      {
        ...aidProject,
        projectScope: 'related',
        projectProgram: 'SP05 - Sustainable Farming - Phase 2',
      },
      cgspace,
    );
    expect(hyphenated.query).toContain(
      'cg.contributor.programAccelerator:"sustainable farming phase 2"^2',
    );
  });

  it('sort is present (newest first) when unranked, absent when ranked', () => {
    const unranked = translateParams(
      { ...aidProject, projectScope: 'linked', year: '2026' },
      cgspace,
    );
    expect(unranked.sort).toBe('dc.date.accessioned,DESC');

    const ranked = translateParams({ ...ranking, year: '2026' }, cgspace);
    expect(ranked.sort).toBeUndefined();
  });

  it('metacharacters in the description never reach the query: only escaped word tokens (R-9)', () => {
    const params = translateParams(
      {
        ...aidProject,
        projectScope: 'related',
        projectDescription:
          '") OR *:* ( AND NOT dc.title:* \\ ^ ~ {x} [y] soil',
      },
      cgspace,
    );
    expect(params.query).toBe(
      `${relatedNoText('cg.identifier.project')} AND (*:* OR dcterms.subject:accelerated^4 OR dcterms.subject:innovation^4 OR dcterms.subject:delivery^4 OR dcterms.subject:initiative^4 OR dcterms.subject:aid^4 OR dcterms.subject:mozambique^4 OR dcterms.subject:title^4 OR dcterms.subject:soil^4)`,
    );
  });

  it('never emits a country boost or factor (R-10 deferred)', () => {
    for (const adapter of [cgspace, melspace, worldfish]) {
      for (const query of [undefined, 'potato']) {
        const params = translateParams({ ...ranking, query }, adapter);
        expect(JSON.stringify(params)).not.toMatch(/country|coverage/i);
      }
    }
  });
});

// @akili-spec changes/kp-related-relevance-ranking
describe('translateParams — byte-identical when no ranking applies (KRR-R-3, R-4)', () => {
  const extras = {
    projectDescription: 'Cassava seed systems',
    projectLeadCenterName: 'International Institute of Tropical Agriculture',
    projectProgram: 'SP03 - Sustainable Farming',
  };

  it('linked ignores the relevance params entirely (R-4)', () => {
    const params = translateParams(
      {
        ...aidProject,
        ...extras,
        projectScope: 'linked',
        query: 'seed',
        year: '2026',
      },
      cgspace,
    );
    expect(params).toEqual({
      dsoType: 'item',
      page: 0,
      size: 10,
      query: `(seed) AND (${aidClause('cg.identifier.project')})`,
      'f.dateIssued': '[2026 TO 2026],equals',
    });
  });

  it('related with an unusable project ignores them and keeps the date sort (R-3)', () => {
    const params = translateParams(
      {
        projectTitle: 'Soil',
        projectScope: 'related',
        ...extras,
        year: '2026',
      },
      cgspace,
    );
    expect(params).toEqual({
      dsoType: 'item',
      page: 0,
      size: 10,
      sort: 'dc.date.accessioned,DESC',
      'f.dateIssued': '[2026 TO 2026],equals',
    });
  });

  it('related with a usable project but no relevance context (code only) is the KPSF request (R-3)', () => {
    const params = translateParams(
      { projectCode: 'T-PJ-003942', projectScope: 'related', year: '2026' },
      cgspace,
    );
    expect(params).toEqual({
      dsoType: 'item',
      page: 0,
      size: 10,
      sort: 'dc.date.accessioned,DESC',
      query:
        '*:* AND NOT (cg.identifier.project:"pj 003942" OR cg.identifier.project:"pj 3942")',
      'f.dateIssued': '[2026 TO 2026],equals',
    });
  });

  it('the non-project browse ignores the relevance params (R-3)', () => {
    const params = translateParams(
      { query: 'maize', page: 1, size: 5, year: '2026', ...extras },
      melspace,
    );
    expect(params).toEqual({
      dsoType: 'item',
      page: 1,
      size: 5,
      query: 'maize',
      'f.dateIssued': '[2026 TO 2026],equals',
    });
  });
});

// @akili-spec changes/kp-related-relevance-ranking
describe('translateParams — project code never becomes a subject boost (KRR-T-6)', () => {
  it('P-1486 context: no 1486 / gcdt subject boost on any adapter, topic words are boosted', () => {
    const input = {
      projectCode: 'P-1486-GCDT',
      projectTitle: 'P-1486-GCDT-Long term grant',
      projectLeadCenter: 'CIP',
      projectScope: 'related' as const,
      projectDescription: 'Genebank of potato and sweetpotato',
    };
    for (const adapter of [cgspace, melspace, worldfish]) {
      const { query } = translateParams(input, adapter);
      expect(query).not.toContain(`${adapter.fields.subject}:1486`);
      expect(query).not.toContain(`${adapter.fields.subject}:gcdt`);
      expect(query).toContain(`${adapter.fields.subject}:genebank^`);
    }
  });
});

describe('translateParams — encoded query length (KRR-NFR-2, FP-1)', () => {
  const letters = 'abcdefghijklmnop';
  const eightWords = (length: number) =>
    Array.from({ length: 8 }, (_, i) => letters[i].repeat(length))
      .join(' ')
      .slice(0, 300);
  const phrase = 'x '.repeat(100).trim();
  const plainText = 'maize '.repeat(40).trim().slice(0, 200);
  /** 200 characters that all need escaping: 6 encoded characters each. */
  const metaText = 'a' + ':'.repeat(199);
  /** Two code phrases (with and without leading zeros), the longest prefix the DTO allows. */
  const longCode = 'T-PJ-0' + '1'.repeat(44);
  const ADAPTERS = [cgspace, melspace, worldfish];
  const BLOCK = ' AND (*:* OR ';

  const worstCase = {
    projectCode: longCode,
    projectTitle: eightWords(30),
    projectLeadCenter: 'IITA',
    projectScope: 'related' as const,
    projectDescription: Array.from({ length: 8 }, (_, i) =>
      letters[i + 8].repeat(30),
    ).join(' '),
    projectLeadCenterName: phrase,
    projectProgram: `${phrase} - ${phrase}`.slice(0, 200),
  };

  const encodedLength = (params: Record<string, any>) =>
    encodeURIComponent(params.query).length;

  const worstInputs: [string, Record<string, any>][] = [
    ['no text', worstCase],
    ['plain 200-char text', { ...worstCase, query: plainText }],
    ['200 characters to escape', { ...worstCase, query: metaText }],
    [
      'title words too long to be keywords, no description, escaped text',
      {
        ...worstCase,
        projectTitle: eightWords(36),
        projectDescription: undefined,
        query: metaText,
      },
    ],
    [
      'same without a center (program only)',
      {
        ...worstCase,
        projectTitle: eightWords(36),
        projectDescription: undefined,
        projectLeadCenterName: undefined,
        query: metaText,
      },
    ],
  ];

  it.each(worstInputs)(
    'worst case (%s): under 2000 on every adapter, the block is still there, no sort, ranked',
    (_label, input) => {
      for (const adapter of ADAPTERS) {
        const params = translateParams(input, adapter);
        expect(encodedLength(params)).toBeLessThan(2000);
        expect(params.query).toContain(BLOCK);
        expect(Object.keys(params)).not.toContain('sort');
      }
      expect(resolveProjectScope(input)?.ranked).toBe(true);
    },
  );

  it('worst case with a 12-word description of 30-char words and 8 title words of 30 chars (T-6 maximum of 20 keywords)', () => {
    const input = {
      ...worstCase,
      projectDescription: Array.from(
        { length: 12 },
        (_, i) => letters[i].repeat(29) + 'z',
      ).join(' '),
    };
    for (const adapter of ADAPTERS) {
      const params = translateParams(input, adapter);
      expect(encodedLength(params)).toBeLessThan(2000);
      expect(params.query).toContain(BLOCK);
    }
    expect(resolveProjectScope(input)?.ranked).toBe(true);
  });

  it('ranked is true exactly when the emitted query carries the block, on every adapter', () => {
    const variants: Record<string, any>[] = [];
    for (const query of [undefined, plainText, metaText]) {
      for (const projectDescription of [
        undefined,
        worstCase.projectDescription,
      ]) {
        for (const projectLeadCenterName of [undefined, phrase]) {
          for (const projectProgram of [undefined, worstCase.projectProgram]) {
            variants.push({
              ...worstCase,
              query,
              projectDescription,
              projectLeadCenterName,
              projectProgram,
            });
          }
        }
      }
    }
    // Also the requests that carry no block at all.
    variants.push(
      { ...worstCase, projectScope: 'linked' },
      { projectCode: longCode, projectScope: 'related', query: metaText },
      { projectTitle: 'Soil', projectScope: 'related' },
    );

    for (const input of variants) {
      const ranked = resolveProjectScope(input)?.ranked;
      for (const adapter of ADAPTERS) {
        const params = translateParams(input, adapter);
        expect(String(params.query ?? '').includes(BLOCK)).toBe(ranked);
        expect(Object.keys(params).includes('sort')).toBe(
          !ranked && !input.query,
        );
      }
    }
  });

  it('keeps every clause when it fits', () => {
    const fits = translateParams(
      { ...worstCase, projectDescription: 'cassava seed' },
      cgspace,
    );
    expect(fits.query).toContain('dcterms.subject:cassava^4');
    expect(fits.query).toContain('cg.contributor.affiliation:');
    expect(fits.query).toContain('cg.contributor.programAccelerator:');
  });

  it('when it does not fit it drops the program, then the center, and keeps keywords', () => {
    const trimmed = translateParams({ ...worstCase, query: metaText }, cgspace);
    expect(trimmed.query).toContain(BLOCK);
    expect(trimmed.query).toContain('dcterms.subject:');
    expect(trimmed.query).not.toContain('programAccelerator');
    expect(trimmed.query).not.toContain('cg.contributor.affiliation');
    // The KPSF filter (text AND NOT linked) is still the prefix of the trimmed request.
    expect(trimmed.query.startsWith(String.raw`(a\:`)).toBe(true);
    expect(trimmed.query).toContain(' AND NOT (cg.identifier.project:');
  });

  // A request whose encoded prefix lands on the limit: the minimal block (one keyword) is 1998
  // characters on MELSpace/WorldFish and 2000 on CGSpace (its subject field name is 5 characters
  // longer, its project field 1 shorter, three times). One gate decides for all hosts.
  it('hosts that disagree on fitting the block: no block, plain KPSF query and ranked=false on every adapter', () => {
    const input = {
      ...aidProject,
      projectScope: 'related' as const,
      query: '€'.repeat(189),
    };
    expect(resolveProjectScope(input)?.ranked).toBe(false);
    for (const adapter of ADAPTERS) {
      const params = translateParams(input, adapter);
      expect(params.query).toBe(
        `(${'€'.repeat(189)}) AND NOT (${aidClause(adapter.fields.project)})`,
      );
      expect(params.query).not.toContain(BLOCK);
      expect(Object.keys(params)).not.toContain('sort');
    }
  });

  it('200 three-byte characters (9 encoded each) leave no room: no block, ranked=false, the KPSF request', () => {
    for (const query of ['€'.repeat(200), '漢'.repeat(200)]) {
      const input = { ...aidProject, projectScope: 'related' as const, query };
      expect(resolveProjectScope(input)?.ranked).toBe(false);
      for (const adapter of ADAPTERS) {
        const params = translateParams(input, adapter);
        expect(params.query).toBe(
          `(${query}) AND NOT (${aidClause(adapter.fields.project)})`,
        );
      }
    }
  });

  it('a real long center name (ICARDA, 63 characters) is cut at a word boundary', () => {
    const params = translateParams(
      {
        ...aidProject,
        projectScope: 'related',
        projectLeadCenterName:
          'International Center for Agricultural Research in the Dry Areas',
      },
      cgspace,
    );
    expect(params.query).toContain(
      'cg.contributor.affiliation:"international center for agricultural research in the dry"^2',
    );
  });

  it('bounds the center and program phrases at a word boundary', () => {
    const params = translateParams(
      {
        projectCode: 'T-PJ-003942',
        projectTitle: AID_I_TITLE,
        projectScope: 'related',
        projectLeadCenterName:
          'The Alliance of Bioversity International and the International Center for Tropical Agriculture',
      },
      cgspace,
    );
    expect(params.query).toContain(
      'cg.contributor.affiliation:"the alliance of bioversity international and the"^2',
    );
  });
});

// @akili-spec changes/kp-related-relevance-ranking
describe('parseProjectProgram (FP-2)', () => {
  it.each([
    ['SP13 - Genebanks', { code: 'SP13', name: 'Genebanks' }],
    [
      'SP05 - Sustainable Farming - Phase 2',
      { code: 'SP05', name: 'Sustainable Farming - Phase 2' },
    ],
    ['  SP13  -  Genebanks  ', { code: 'SP13', name: 'Genebanks' }],
    ['SP13 -', { code: 'SP13', name: undefined }],
    ['- Genebanks', { code: undefined, name: 'Genebanks' }],
    ['Agro-ecology', { name: 'Agro-ecology' }],
    ['Genebanks', { name: 'Genebanks' }],
    ['', {}],
    [undefined, {}],
  ])('%j -> %j', (raw, expected) => {
    expect(parseProjectProgram(raw as string | undefined)).toEqual(expected);
  });
});

// @akili-spec changes/kp-related-relevance-ranking
describe('resolveProjectScope — ranked echo (KRR-R-1)', () => {
  it('related + usable project with keywords is ranked', () => {
    expect(
      resolveProjectScope({ ...aidProject, projectScope: 'related' })?.ranked,
    ).toBe(true);
  });

  it('linked, an unusable related project and a code-only related project are not ranked', () => {
    expect(
      resolveProjectScope({ ...aidProject, projectScope: 'linked' })?.ranked,
    ).toBe(false);
    expect(
      resolveProjectScope({ projectTitle: 'Soil', projectScope: 'related' })
        ?.ranked,
    ).toBe(false);
    expect(
      resolveProjectScope({
        projectCode: 'T-PJ-003942',
        projectScope: 'related',
      })?.ranked,
    ).toBe(false);
  });

  it('a code-only related project becomes ranked when a center name arrives', () => {
    expect(
      resolveProjectScope({
        projectCode: 'T-PJ-003942',
        projectScope: 'related',
        projectLeadCenterName: 'International Potato Center',
      })?.ranked,
    ).toBe(true);
  });
});

// @akili-spec changes/kp-related-strongest-first
describe('translateParams — related-only filter (KRS-R-2, R-3, NFR-1..3)', () => {
  const ADAPTERS = [cgspace, melspace, worldfish];
  const ranking = {
    ...aidProject,
    projectScope: 'related' as const,
    projectDescription: 'Cassava seed systems',
    projectLeadCenterName: 'International Institute of Tropical Agriculture',
    projectProgram: 'SP03 - Sustainable Farming',
  };
  const filtered = { ...ranking, projectRelatedOnly: true };

  it('CGSpace filter form: the related prefix, then the clauses with no *:* arm', () => {
    const params = translateParams(filtered, cgspace);
    expect(params.query).toBe(
      `*:* AND NOT (${aidClause('cg.identifier.project')}) AND (dcterms.subject:accelerated^4 OR dcterms.subject:innovation^4 OR dcterms.subject:delivery^4 OR dcterms.subject:initiative^4 OR dcterms.subject:aid^4 OR dcterms.subject:mozambique^4 OR dcterms.subject:cassava^4 OR dcterms.subject:seed^4 OR dcterms.subject:systems^4 OR cg.contributor.affiliation:"international institute of tropical agriculture"^2 OR cg.contributor.programAccelerator:"sustainable farming"^2)`,
    );
    expect(params.query).toContain('AND NOT (');
    expect(params.query).toContain(' AND (dcterms.subject:');
    expect(params.query).not.toContain('*:* OR');
    expect(Object.keys(params)).not.toContain('sort');
    expect(resolveProjectScope(filtered)?.relatedOnly).toBe(true);
  });

  it('MELSpace and WorldFish use their own field names in the filter form', () => {
    expect(translateParams(filtered, melspace).query).toContain(
      ' AND (dc.subject:accelerated^4 OR',
    );
    expect(translateParams(filtered, worldfish).query).not.toContain('*:* OR');
  });

  it('keeps text, type, affiliation and year filters together with the filter', () => {
    const params = translateParams(
      {
        ...filtered,
        query: 'potato',
        type: 'Case Study',
        center: 'CIP',
        year: '2026',
      },
      cgspace,
    );
    expect(params.query.startsWith('(potato) AND NOT (')).toBe(true);
    expect(params.query).toContain(
      ' AND (dcterms.subject:accelerated^0.001 OR',
    );
    expect(params.query).not.toContain('*:* OR');
    expect(params['f.itemtype']).toBe('Case Study,equals');
    expect(params['f.affiliation']).toBe('CIP,equals');
    expect(params['f.dateIssued']).toBe('[2026 TO 2026],equals');
  });

  it('param absent or false: byte-identical to the KRR request (related, linked, non-project)', () => {
    const inputs: Record<string, any>[] = [
      ranking,
      { ...ranking, query: 'potato', year: '2026' },
      { ...aidProject, projectScope: 'linked' },
      { query: 'maize', year: '2026' },
    ];
    for (const input of inputs) {
      for (const adapter of ADAPTERS) {
        const krr = translateParams(input, adapter);
        expect(
          translateParams({ ...input, projectRelatedOnly: false }, adapter),
        ).toEqual(krr);
        expect(
          translateParams({ ...input, projectRelatedOnly: undefined }, adapter),
        ).toEqual(krr);
      }
    }
    expect(translateParams(ranking, cgspace).query).toContain(' AND (*:* OR ');
  });

  it('linked + projectRelatedOnly=true: the linked query is unchanged and the echo is false', () => {
    const linked = { ...aidProject, projectScope: 'linked' as const };
    for (const adapter of ADAPTERS) {
      expect(
        translateParams({ ...linked, projectRelatedOnly: true }, adapter),
      ).toEqual(translateParams(linked, adapter));
    }
    expect(
      resolveProjectScope({ ...linked, projectRelatedOnly: true })?.relatedOnly,
    ).toBe(false);
  });

  it('unranked (code-only related): requested but not applied', () => {
    const input = {
      projectCode: 'T-PJ-003942',
      projectScope: 'related' as const,
      projectRelatedOnly: true,
    };
    expect(resolveProjectScope(input)?.relatedOnly).toBe(false);
    expect(translateParams(input, cgspace)).toEqual(
      translateParams({ ...input, projectRelatedOnly: undefined }, cgspace),
    );
  });

  describe('gate: the untrimmed block must fit on every adapter', () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const phrase = 'x '.repeat(100).trim();
    const metaText = 'a' + ':'.repeat(199);
    const worstCase = {
      projectCode: 'T-PJ-0' + '1'.repeat(44),
      projectTitle: Array.from({ length: 8 }, (_, i) => letters[i].repeat(30))
        .join(' ')
        .slice(0, 300),
      projectLeadCenter: 'IITA',
      projectScope: 'related' as const,
      projectDescription: Array.from({ length: 8 }, (_, i) =>
        letters[i + 8].repeat(30),
      ).join(' '),
      projectLeadCenterName: phrase,
      projectProgram: `${phrase} - ${phrase}`.slice(0, 200),
    };

    it('a request that forces KRR trimming gets no filter: relatedOnly=false, KRR behavior, no filter form on any adapter', () => {
      const input = { ...worstCase, query: metaText };
      // Trimmed boost block fits (ranked), the untrimmed filter does not (DD-4).
      expect(resolveProjectScope(input)?.ranked).toBe(true);
      const asked = { ...input, projectRelatedOnly: true };
      expect(resolveProjectScope(asked)?.relatedOnly).toBe(false);
      expect(resolveProjectScope(asked)?.ranked).toBe(true);
      for (const adapter of ADAPTERS) {
        const params = translateParams(asked, adapter);
        expect(params).toEqual(translateParams(input, adapter));
        expect(params.query).toContain(' AND (*:* OR ');
      }
    });

    it('multi-byte text (no block fits): unranked, relatedOnly=false, plain KPSF query', () => {
      const input = {
        ...aidProject,
        projectScope: 'related' as const,
        query: '€'.repeat(200),
        projectRelatedOnly: true,
      };
      expect(resolveProjectScope(input)?.relatedOnly).toBe(false);
      for (const adapter of ADAPTERS) {
        const params = translateParams(input, adapter);
        expect(params.query).toBe(
          `(${'€'.repeat(200)}) AND NOT (${aidClause(adapter.fields.project)})`,
        );
      }
    });

    it('whenever relatedOnly is true, every adapter query is the filter form and encodes under 2000', () => {
      const variants = [
        ranking,
        { ...ranking, query: 'potato' },
        { ...worstCase },
        { ...worstCase, projectDescription: 'cassava' },
      ];
      for (const variant of variants) {
        const input = { ...variant, projectRelatedOnly: true };
        const on = resolveProjectScope(input)?.relatedOnly;
        for (const adapter of ADAPTERS) {
          const params = translateParams(input, adapter);
          if (on) {
            expect(params.query).not.toContain('*:* OR');
            expect(encodeURIComponent(params.query).length).toBeLessThan(2000);
          }
        }
      }
    });
  });
});
