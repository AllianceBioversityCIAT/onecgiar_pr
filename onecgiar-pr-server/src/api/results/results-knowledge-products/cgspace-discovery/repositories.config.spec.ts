import {
  KP_REPOSITORIES,
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

  it('related: `AND NOT (clause)`, and a user text is AND-combined first', () => {
    const noText = translateParams(
      { ...aidProject, projectScope: 'related', page: 0, size: 10 },
      cgspace,
    );
    expect(noText.query).toBe(
      `*:* AND NOT (${aidClause('cg.identifier.project')})`,
    );
    expect(noText.sort).toBe('dc.date.accessioned,DESC');

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
      `(seed) AND NOT (${aidClause('cg.identifier.project')})`,
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
