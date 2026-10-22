// @akili-spec changes/kp-related-relevance-ranking
import {
  buildRelevanceBlock,
  MAX_PHRASE_LENGTH,
  evaluateProjectMatch,
  extractRelevanceKeywords,
  pluralForms,
  samePluralWord,
  matchesTaggedMetadata,
  ProjectProgram,
  RelevanceAdapter,
  RelevanceWeights,
} from './project-relevance';

/**
 * `KRR-T-1` — relevance block, factors and tier (`design.md` §7.1, `KRR-R-5`, `KRR-R-6`,
 * `KRR-R-9`, `KRR-NFR-2`). Expected values come from `requirements.md` scenarios and are written
 * as literals, never rebuilt with the helpers under test. Program vectors are copied from the
 * client spec (`kp-cgspace-browse.component.spec.ts`, "KPAM ... matchesProgram") so the two
 * implementations cannot drift silently (`KRR-DD-4`).
 */

const CGSPACE: RelevanceAdapter = {
  fields: {
    subject: 'dcterms.subject',
    affiliation: 'cg.contributor.affiliation',
    program: 'cg.contributor.programAccelerator',
  },
};

const MELSPACE: RelevanceAdapter = {
  fields: {
    subject: 'dc.subject',
    affiliation: 'cg.contributor.center',
    program: 'cg.contributor.programAccelerator',
  },
};

const NO_AFFILIATION: RelevanceAdapter = {
  fields: {
    subject: 'dc.subject',
    program: 'cg.contributor.programAccelerator',
  },
};

const W_NO_TEXT: RelevanceWeights = { subject: 4, center: 2, program: 2 };
const W_TEXT: RelevanceWeights = { subject: 0.3, center: 0.15, program: 0.15 };

const CIP = 'International Potato Center';
const SP13: ProjectProgram = { code: 'SP13', name: 'Genebank' };

describe('project-relevance', () => {
  describe('plural matching (KRR-R-5, design §7.1)', () => {
    it.each([
      ['genebanks', 'genebank'],
      ['nematodes', 'nematode'],
      ['crops', 'crop'],
      ['boxes', 'box'],
      ['classes', 'class'],
      ['genes', 'gene'],
      ['potatoes', 'potato'],
      ['diseases', 'disease'],
      ['responses', 'response'],
      ['tomatoes', 'tomato'],
      ['statuses', 'status'],
      ['boxes', 'box'],
    ])('%s matches %s (both directions)', (a, b) => {
      expect(samePluralWord(a, b)).toBe(true);
      expect(samePluralWord(b, a)).toBe(true);
    });

    it.each([
      ['gene', 'genebanks'],
      ['gene', 'genebank'],
      ['potat', 'potatoes'],
      ['gas', 'ga'],
      ['bus', 'bu'],
      ['class', 'clas'],
      ['rat', 'rates'],
      ['cod', 'codes'],
      ['pins', 'pines'],
      ['plans', 'planes'],
      ['tub', 'tubes'],
      ['rates', 'rats'],
    ])('%s does not match %s', (a, b) => {
      expect(samePluralWord(a, b)).toBe(false);
    });

    it('lists the candidate forms; words under 4 letters and ss words are not stripped', () => {
      expect([...pluralForms('potatoes')].sort()).toEqual(
        ['potato', 'potatoe', 'potatoes'].sort(),
      );
      expect([...pluralForms('class')]).toEqual(['class']);
      expect([...pluralForms('gas')]).toEqual(['gas']);
      expect([...pluralForms('rice')]).toEqual(['rice']);
    });
  });

  describe('extractRelevanceKeywords (KRR-R-9, KRR-R-5)', () => {
    it('takes title words first, then description words, KPSF rules applied', () => {
      expect(
        extractRelevanceKeywords({
          title: 'Long term grant',
          description: 'Genebank conservation of plant genetic resources',
          leadCenter: 'CIP',
        }),
      ).toEqual(['genebank', 'conservation', 'plant', 'genetic', 'resources']);
    });

    it('caps at 8 title words and 12 description words', () => {
      expect(
        extractRelevanceKeywords({
          title:
            'alpha beta gamma delta epsilon zeta theta kappa lambda sigma omega',
          description:
            'one1 two2 three3 four4 five5 six6 seven7 eight8 nine9 ten10 eleven11 twelve12 thirteen13',
        }),
      ).toEqual([
        'alpha',
        'beta',
        'gamma',
        'delta',
        'epsilon',
        'zeta',
        'theta',
        'kappa',
        'one1',
        'two2',
        'three3',
        'four4',
        'five5',
        'six6',
        'seven7',
        'eight8',
        'nine9',
        'ten10',
        'eleven11',
        'twelve12',
      ]);
    });

    // KRR-T-6: real P-1486 input as the PRTest client sends it (execution.md KRR-T-5, OI-5).
    it('real P-1486 input keeps genebank/potato/sweetpotato and drops code tokens and boilerplate', () => {
      expect(
        extractRelevanceKeywords({
          title: 'P-1486-GCDT-Long term grant',
          code: 'P-1486-GCDT',
          leadCenter: 'CIP',
          description:
            "Global Crop Diversity Trust Long-Term Grant providing dedicated funding for the long-term operation of CIP's ex situ genebank (potato, sweetpotato, Andean roots & tubers) to international standards: storage, curation, safety duplication, characterization, documentation and Treaty-compliant germplasm distribution.",
        }),
      ).toEqual([
        'global',
        'crop',
        'diversity',
        'trust',
        'situ',
        'genebank',
        'potato',
        'sweetpotato',
        'andean',
        'roots',
        'tubers',
        'storage',
      ]);
    });

    it('iSPARK-like code: excludes the code tokens t, pj and the numeric part', () => {
      expect(
        extractRelevanceKeywords({
          title: 'T-PJ-003936 sorghum pjx resilience',
          code: 'T-PJ-003936',
          description: 'pj 003936 sorghum breeding 2024',
        }),
      ).toEqual(['sorghum', 'pjx', 'resilience', 'breeding']);
    });

    it('excludes any purely numeric token even without a code', () => {
      expect(extractRelevanceKeywords({ title: '2024 1486 alpha' })).toEqual([
        'alpha',
      ]);
    });

    it('excludes funding/administrative boilerplate words', () => {
      expect(
        extractRelevanceKeywords({
          title: 'Grant funding support',
          description:
            'projects programme phase activities implementation international standards operations alpha',
        }),
      ).toEqual(['alpha']);
    });

    it('excludes the lead-center acronym', () => {
      expect(
        extractRelevanceKeywords({
          title: 'CIP potato',
          description: 'cip genebank',
          leadCenter: 'CIP',
        }),
      ).toEqual(['potato', 'genebank']);
    });

    it('dedupes across title and description, including plural forms', () => {
      expect(
        extractRelevanceKeywords({
          title: 'Genebank',
          description: 'genebanks and genebank alpha',
        }),
      ).toEqual(['genebank', 'alpha']);
      expect(
        extractRelevanceKeywords({
          title: 'Potatoes diseases',
          description: 'potato disease tomato tomatoes',
        }),
      ).toEqual(['potatoes', 'diseases', 'tomato']);
    });

    it('does not spend the description cap on words already taken from the title', () => {
      expect(
        extractRelevanceKeywords({
          title: 'alpha',
          description: 'alpha beta',
        }),
      ).toEqual(['alpha', 'beta']);
    });

    it('yields nothing for stop words, roman numerals and short tokens', () => {
      expect(
        extractRelevanceKeywords({
          title: 'The Project of Phase II',
          description: 'and or not an ab XII',
        }),
      ).toEqual([]);
    });

    it('yields nothing for an empty or missing context', () => {
      expect(extractRelevanceKeywords({})).toEqual([]);
      expect(
        extractRelevanceKeywords({ title: null, description: null }),
      ).toEqual([]);
    });

    it('drops tokens longer than 30 characters (query budget, KRR-NFR-2)', () => {
      expect(
        extractRelevanceKeywords({
          title: `${'a'.repeat(31)} ${'b'.repeat(30)}`,
        }),
      ).toEqual(['b'.repeat(30)]);
    });
  });

  describe('buildRelevanceBlock (KRR-R-9, design §2/§7.1)', () => {
    it('emits keywords, center and program boosts with the no-text weights', () => {
      expect(
        buildRelevanceBlock(
          CGSPACE,
          ['genebank', 'conservation'],
          CIP,
          SP13,
          W_NO_TEXT,
        ),
      ).toBe(
        '*:* OR dcterms.subject:genebank^4 OR dcterms.subject:conservation^4' +
          ' OR cg.contributor.affiliation:"international potato center"^2' +
          ' OR cg.contributor.programAccelerator:"genebank"^2',
      );
    });

    it('uses the with-text weights and the adapter field names of another host', () => {
      expect(
        buildRelevanceBlock(MELSPACE, ['nematode'], CIP, SP13, W_TEXT),
      ).toBe(
        '*:* OR dc.subject:nematode^0.3' +
          ' OR cg.contributor.center:"international potato center"^0.15' +
          ' OR cg.contributor.programAccelerator:"genebank"^0.15',
      );
    });

    it('emits only the clauses that have a value', () => {
      expect(
        buildRelevanceBlock(CGSPACE, ['genebank'], null, null, W_NO_TEXT),
      ).toBe('*:* OR dcterms.subject:genebank^4');
      expect(buildRelevanceBlock(CGSPACE, [], CIP, null, W_NO_TEXT)).toBe(
        '*:* OR cg.contributor.affiliation:"international potato center"^2',
      );
    });

    it('falls back to the program code when the program has no name', () => {
      expect(
        buildRelevanceBlock(
          CGSPACE,
          [],
          null,
          { code: 'SP13', name: '' },
          W_NO_TEXT,
        ),
      ).toBe('*:* OR cg.contributor.programAccelerator:"sp13"^2');
    });

    it('skips the center boost when the adapter has no affiliation field', () => {
      expect(
        buildRelevanceBlock(NO_AFFILIATION, ['genebank'], CIP, null, W_NO_TEXT),
      ).toBe('*:* OR dc.subject:genebank^4');
      expect(
        buildRelevanceBlock(NO_AFFILIATION, [], CIP, null, W_NO_TEXT),
      ).toBeNull();
    });

    it('returns null when there is no usable context', () => {
      expect(
        buildRelevanceBlock(CGSPACE, [], null, null, W_NO_TEXT),
      ).toBeNull();
      expect(
        buildRelevanceBlock(
          CGSPACE,
          [],
          '  ',
          { code: ' ', name: null },
          W_NO_TEXT,
        ),
      ).toBeNull();
      expect(
        buildRelevanceBlock(CGSPACE, [], undefined, undefined, W_NO_TEXT),
      ).toBeNull();
      expect(buildRelevanceBlock(CGSPACE, [], '"', null, W_NO_TEXT)).toBeNull();
    });

    describe('injection (KRR-R-9)', () => {
      it('turns Solr syntax in the description into plain escaped word tokens only', () => {
        const keywords = extractRelevanceKeywords({
          title: 'Genebanks',
          description: '") OR *:* ( \\ " ^ ~ AND NOT',
        });
        expect(keywords).toEqual(['genebanks']);
        expect(
          buildRelevanceBlock(CGSPACE, keywords, null, null, W_NO_TEXT),
        ).toBe('*:* OR dcterms.subject:genebanks^4');
      });

      it('keeps metacharacters out of words glued to them', () => {
        const keywords = extractRelevanceKeywords({
          title: 'x',
          description:
            'soil\\") OR title:secret^99 genebank~2 -negated +must {a TO b}',
        });
        expect(keywords).toEqual([
          'soil',
          'title',
          'secret',
          'genebank',
          'negated',
          'must',
        ]);
        expect(
          buildRelevanceBlock(CGSPACE, keywords, null, null, W_NO_TEXT),
        ).toBe(
          '*:* OR dcterms.subject:soil^4 OR dcterms.subject:title^4' +
            ' OR dcterms.subject:secret^4 OR dcterms.subject:genebank^4' +
            ' OR dcterms.subject:negated^4' +
            ' OR dcterms.subject:must^4',
        );
      });

      it('normalizes center and program phrases, so no quote or operator survives', () => {
        expect(
          buildRelevanceBlock(
            CGSPACE,
            [],
            'Evil") OR *:* (\\',
            { code: 'SP"1', name: 'x") OR title:a^9 ~' },
            W_NO_TEXT,
          ),
        ).toBe(
          '*:* OR cg.contributor.affiliation:"evil or"^2' +
            ' OR cg.contributor.programAccelerator:"x or title a 9"^2',
        );
      });

      it('takes field names from the adapter only', () => {
        const block = buildRelevanceBlock(
          CGSPACE,
          extractRelevanceKeywords({
            title: 'title subject affiliation',
            description: 'dc.subject:hack',
          }),
          'cg.contributor.affiliation:hack',
          { name: 'dcterms.subject:hack' },
          W_NO_TEXT,
        );
        expect(block).toBe(
          '*:* OR dcterms.subject:title^4 OR dcterms.subject:subject^4' +
            ' OR dcterms.subject:affiliation^4 OR dcterms.subject:hack^4' +
            ' OR cg.contributor.affiliation:"cg contributor affiliation hack"^2' +
            ' OR cg.contributor.programAccelerator:"dcterms subject hack"^2',
        );
      });
    });

    describe('length (KRR-NFR-2)', () => {
      it('keeps the worst-case block under 2000 encoded characters', () => {
        const letters = 'abcdefghijklmnop';
        const word = (i: number) => letters[i].repeat(30);
        const keywords = extractRelevanceKeywords({
          title: Array.from({ length: 8 }, (_, i) => word(i)).join(' '),
          description: Array.from({ length: 8 }, (_, i) => word(i + 8)).join(
            ' ',
          ),
        });
        expect(keywords).toHaveLength(16);
        const longName = 'x '.repeat(100).trim();
        const block = buildRelevanceBlock(
          CGSPACE,
          keywords,
          longName,
          { code: 'SP13', name: longName },
          W_TEXT,
        );
        expect(block).not.toBeNull();
        expect(encodeURIComponent(block as string).length).toBeLessThan(2000);
      });

      it('bounds the center and program phrases at a word boundary (MAX_PHRASE_LENGTH)', () => {
        const block = buildRelevanceBlock(
          CGSPACE,
          [],
          'The Alliance of Bioversity International and the International Center for Tropical Agriculture',
          { name: 'abcdefghij '.repeat(10).trim() },
          W_NO_TEXT,
        );
        expect(block).toBe(
          '*:* OR cg.contributor.affiliation:"the alliance of bioversity international and the"^2' +
            ' OR cg.contributor.programAccelerator:"abcdefghij abcdefghij abcdefghij abcdefghij abcdefghij"^2',
        );
      });

      it('keeps a phrase of exactly MAX_PHRASE_LENGTH and cuts a single long word hard', () => {
        const sixty = `${'a'.repeat(29)} ${'b'.repeat(30)}`;
        expect(sixty).toHaveLength(MAX_PHRASE_LENGTH);
        expect(buildRelevanceBlock(CGSPACE, [], sixty, null, W_NO_TEXT)).toBe(
          `*:* OR cg.contributor.affiliation:"${sixty}"^2`,
        );
        expect(
          buildRelevanceBlock(CGSPACE, [], 'z'.repeat(90), null, W_NO_TEXT),
        ).toBe(
          `*:* OR cg.contributor.affiliation:"${'z'.repeat(MAX_PHRASE_LENGTH)}"^2`,
        );
      });
    });
  });

  describe('matchesTaggedMetadata — vectors copied from the client KPAM spec (KRR-DD-4)', () => {
    const tagsFor = (tag: string) => [tag];

    it.each([
      'Sustainable Farming',
      'SP01 - Sustainable Farming',
      'SP01',
      'sustainable farming',
      '  Sustainable Farming  ',
      'Sustainable-Farming',
      'SP01: Sustainable Farming',
      'Sustainable Farming (SP01)',
    ])('matches naming variation "%s"', (tag) => {
      expect(
        matchesTaggedMetadata(tagsFor(tag), 'SP01', 'Sustainable Farming'),
      ).toBe(true);
    });

    it('matches when at least one tag in several matches', () => {
      expect(
        matchesTaggedMetadata(
          ['Agroecology', 'SP01 - Sustainable Farming', 'Policy'],
          'SP01',
          'Sustainable Farming',
        ),
      ).toBe(true);
    });

    it('does not match missing, empty or other-program tags', () => {
      expect(matchesTaggedMetadata([], 'SP01', 'Sustainable Farming')).toBe(
        false,
      );
      expect(
        matchesTaggedMetadata(undefined, 'SP01', 'Sustainable Farming'),
      ).toBe(false);
      expect(
        matchesTaggedMetadata(
          ['SP02 - Climate Resilience'],
          'SP01',
          'Sustainable Farming',
        ),
      ).toBe(false);
      expect(
        matchesTaggedMetadata(
          ['Gender Equality'],
          'SP01',
          'Sustainable Farming',
        ),
      ).toBe(false);
    });

    it('does not match when the program inputs are empty', () => {
      expect(matchesTaggedMetadata(['Sustainable Farming'], '', '')).toBe(
        false,
      );
    });
  });

  describe('evaluateProjectMatch — factors (KRR-R-5)', () => {
    const KEYWORDS = ['genebank'];

    it('keywords: genebank matches subject genebanks (plural folded)', () => {
      expect(
        evaluateProjectMatch({ subjects: ['genebanks'] }, KEYWORDS, null, null)
          .factors,
      ).toEqual(['keywords']);
    });

    it('keywords: nematode matches the MELSpace subject "root-lesion nematode"', () => {
      expect(
        evaluateProjectMatch(
          { subjects: ['root-lesion nematode'] },
          ['nematode'],
          null,
          null,
        ).factors,
      ).toEqual(['keywords']);
    });

    it('keywords: is case-insensitive and folds the project keyword too', () => {
      expect(
        evaluateProjectMatch(
          { subjects: ['GENEBANK'] },
          ['genebanks'],
          null,
          null,
        ).factors,
      ).toEqual(['keywords']);
    });

    it('keywords: gene is NOT matched inside genebanks (whole words only)', () => {
      expect(
        evaluateProjectMatch({ subjects: ['genebanks'] }, ['gene'], null, null),
      ).toEqual({ tier: 'none', factors: [] });
    });

    it.each([
      ['potatoes', 'potato'],
      ['diseases', 'disease'],
      ['responses', 'response'],
      ['tomatoes', 'tomato'],
    ])(
      'keywords: subject %s matches keyword %s (-oes/-ses plurals)',
      (subject, keyword) => {
        expect(
          evaluateProjectMatch({ subjects: [subject] }, [keyword], null, null),
        ).toEqual({ tier: 'weak', factors: ['keywords'] });
      },
    );

    it('keywords: a keyword only in the title does not count (subjects are the only source)', () => {
      const item = {
        title: 'Genebank conservation report',
        subjects: ['wheat'],
        affiliations: [],
        programAccelerators: [],
      };
      expect(evaluateProjectMatch(item, KEYWORDS, null, null).factors).toEqual(
        [],
      );
    });

    it('keywords: a KP with no subjects never satisfies it', () => {
      expect(evaluateProjectMatch({}, KEYWORDS, null, null).factors).toEqual(
        [],
      );
      expect(
        evaluateProjectMatch({ subjects: [] }, KEYWORDS, null, null).factors,
      ).toEqual([]);
      expect(
        evaluateProjectMatch({ subjects: null }, KEYWORDS, null, null).factors,
      ).toEqual([]);
    });

    it('keywords: stop words or the acronym alone never satisfy it', () => {
      const keywords = extractRelevanceKeywords({
        title: 'The Project of CIP',
        description: 'and for the CIP',
        leadCenter: 'CIP',
      });
      expect(keywords).toEqual([]);
      expect(
        evaluateProjectMatch(
          { subjects: ['the', 'project', 'CIP', 'for'] },
          keywords,
          null,
          null,
        ).factors,
      ).toEqual([]);
    });

    it('center: the lead center name among the affiliations satisfies it', () => {
      expect(
        evaluateProjectMatch(
          { affiliations: ['CGIAR', 'International Potato Center'] },
          [],
          CIP,
          null,
        ).factors,
      ).toEqual(['center']);
    });

    it('center: case and accents are ignored', () => {
      expect(
        evaluateProjectMatch(
          { affiliations: ['UNIVERSITE DE MONTREAL'] },
          [],
          'Université de Montréal',
          null,
        ).factors,
      ).toEqual(['center']);
    });

    it('center: an acronym-only context never satisfies it', () => {
      expect(
        evaluateProjectMatch({ affiliations: ['CIP'] }, [], null, null).factors,
      ).toEqual([]);
      expect(
        evaluateProjectMatch({ affiliations: ['CIP'] }, [], '', null).factors,
      ).toEqual([]);
      expect(
        evaluateProjectMatch({ affiliations: ['CIP'] }, [], '   ', null)
          .factors,
      ).toEqual([]);
    });

    it('center: the acronym does not equal the full name', () => {
      expect(
        evaluateProjectMatch({ affiliations: [CIP] }, [], 'CIP', null).factors,
      ).toEqual([]);
    });

    it('center: a KP with no affiliations never satisfies it', () => {
      expect(evaluateProjectMatch({}, [], CIP, null).factors).toEqual([]);
      expect(
        evaluateProjectMatch({ affiliations: [] }, [], CIP, null).factors,
      ).toEqual([]);
    });

    it('program: uses the client KPAM rule on the programAccelerators labels', () => {
      expect(
        evaluateProjectMatch(
          { programAccelerators: ['SP13 - Genebank'] },
          [],
          null,
          SP13,
        ).factors,
      ).toEqual(['program']);
      expect(
        evaluateProjectMatch(
          { programAccelerators: ['SP02 - Climate'] },
          [],
          null,
          SP13,
        ).factors,
      ).toEqual([]);
      expect(evaluateProjectMatch({}, [], null, SP13).factors).toEqual([]);
      expect(
        evaluateProjectMatch(
          { programAccelerators: ['SP13 - Genebank'] },
          [],
          null,
          { code: '', name: '' },
        ).factors,
      ).toEqual([]);
    });
  });

  describe('evaluateProjectMatch — tier table (KRR-R-6)', () => {
    const SUBJECT_ON = ['genebanks'];
    const SUBJECT_OFF = ['wheat'];
    const CENTER_ON = [CIP];
    const CENTER_OFF = ['ILRI'];
    const PROGRAM_ON = ['SP13 - Genebank'];
    const PROGRAM_OFF = ['SP02 - Climate'];

    it.each([
      [true, true, true, ['keywords', 'center', 'program'], 'strong'],
      [true, true, false, ['keywords', 'center'], 'partial'],
      [true, false, true, ['keywords', 'program'], 'partial'],
      [false, true, true, ['center', 'program'], 'partial'],
      [true, false, false, ['keywords'], 'weak'],
      [false, true, false, ['center'], 'weak'],
      [false, false, true, ['program'], 'weak'],
      [false, false, false, [], 'none'],
    ])(
      'keywords=%s center=%s program=%s -> %j, %s',
      (kw, center, program, factors, tier) => {
        expect(
          evaluateProjectMatch(
            {
              subjects: kw ? SUBJECT_ON : SUBJECT_OFF,
              affiliations: center ? CENTER_ON : CENTER_OFF,
              programAccelerators: program ? PROGRAM_ON : PROGRAM_OFF,
            },
            ['genebank'],
            CIP,
            SP13,
          ),
        ).toEqual({ tier, factors });
      },
    );
  });
});
