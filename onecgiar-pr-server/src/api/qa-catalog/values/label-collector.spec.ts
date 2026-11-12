// @akili-spec quality-assurance/qa-value-labels
// QVL-R-1 / R-2 / R-6, D-2 / D-3 / D-7: the pairs come from the projected `values`, at every depth, only for the fields returned.
// Fixtures are shaped like `project` output over the REAL catalog entries (`CATALOG_FIELDS`), not hand-built catalog stubs.
import { CATALOG_FIELDS } from '../definitions/sections';
import { CatalogField } from '../definitions/types';
import { QVL_VALUES_A, QVL_VALUES_B } from './fixtures';
import {
  collectLabelPairs,
  collectLabels,
  LabelPairs,
} from './label-collector';
import { project } from './projection';
import { typeScalar } from './value-typing';

const field = (key: string): CatalogField => {
  const f = CATALOG_FIELDS.find((x) => x.key === key);
  if (!f) throw new Error(`no catalog field ${key}`);
  return f;
};
const fields = (...keys: string[]) => keys.map(field);
const ALL = fields(...Object.keys({ ...QVL_VALUES_A, ...QVL_VALUES_B }));
const plain = (pairs: LabelPairs) =>
  Object.fromEntries([...pairs].map(([l, ids]) => [l, [...ids].sort()]));

describe('collectLabelPairs', () => {
  it('walks depth 2: science program ToC results and a country with its subnational areas (D-2)', () => {
    const got = plain(collectLabelPairs(ALL, QVL_VALUES_A));
    expect(got.initiatives).toEqual(['11', '12']);
    expect(got.toc_results).toEqual(['4001', 'TR-A1']);
    expect(got.toc_levels).toEqual(['1', '2']);
    expect(got.countries).toEqual(['170', '4']);
    expect(got.subnational_areas).toEqual(['AAA-1', 'AAA-2']);
  });

  it('keys every id as a string: numeric, text, and text-numeric ids (D-7, R-1)', () => {
    const got = plain(collectLabelPairs(ALL, QVL_VALUES_A));
    expect(got.policy_types).toEqual(['1']);
    expect(got.policy_amount_statuses).toEqual(['2']);
    expect(got.projects).toEqual(['CENTER-02', 'households']);
    for (const ids of Object.values(got)) {
      for (const id of ids) expect(typeof id).toBe('string');
    }
  });

  it('P-19: a stored text "2" for amount_status stays the string "2" through value-typing and project', () => {
    const typed = typeScalar('single_select', '2');
    expect(typed).toBe('2');
    const projected = project(field('policy_change.amount_status'), typed);
    expect(projected).toBe('2');
    const pairs = collectLabelPairs(fields('policy_change.amount_status'), {
      'policy_change.amount_status': projected,
    });
    expect(plain(pairs)).toEqual({ policy_amount_statuses: ['2'] });
    // the same id arriving as a number keys identically
    expect(
      plain(
        collectLabelPairs(fields('policy_change.amount_status'), {
          'policy_change.amount_status': 2,
        }),
      ),
    ).toEqual({ policy_amount_statuses: ['2'] });
  });

  it('skips the text node that names a list: only the directory_user subfield is labelled (R-2 non-select)', () => {
    const got = plain(collectLabelPairs(ALL, QVL_VALUES_A));
    expect(got.directory_users).toEqual(['77']);
    expect(JSON.stringify(got)).not.toContain('Free Text Name');
    const none = collectLabelPairs(fields('general.lead_contact_person'), {
      'general.lead_contact_person': {
        value: 'Only Free Text',
        directory_user: null,
      },
    });
    expect(plain(none)).toEqual({});
  });

  it('reads only the fields returned: person-bearing lists need their field (R-6, D-3)', () => {
    const returned = fields('policy_change.policy_type');
    const got = plain(collectLabelPairs(returned, QVL_VALUES_A));
    expect(got).toEqual({ policy_types: ['1'] });
    expect(got.users).toBeUndefined();
    expect(got.directory_users).toBeUndefined();
    expect(got.policy_amount_statuses).toBeUndefined();
  });

  it('returns an empty map when no option id is returned, and skips null ids', () => {
    expect(collectLabelPairs([], QVL_VALUES_A).size).toBe(0);
    const empty = collectLabelPairs(ALL, {
      'policy_change.policy_type': null,
      'contributors.science_programs': [],
      'geo.countries': [],
      'contributors.bilateral_projects': [],
    });
    expect(empty.size).toBe(0);
  });

  it('does not mutate its input', () => {
    const before = JSON.stringify(QVL_VALUES_A);
    collectLabelPairs(ALL, QVL_VALUES_A);
    expect(JSON.stringify(QVL_VALUES_A)).toBe(before);
  });
});

describe('collectLabels', () => {
  it('each result keeps only its own ids; the union holds both (R-2 only this result, D-3)', () => {
    const { perResult, union } = collectLabels(
      [{ values: QVL_VALUES_A }, { values: QVL_VALUES_B }],
      ALL,
    );
    expect(plain(perResult[0]).countries).toEqual(['170', '4']);
    expect(plain(perResult[1]).countries).toEqual(['840']);
    expect(plain(perResult[1]).toc_results).toEqual(['9009']);
    expect(plain(perResult[1]).directory_users).toBeUndefined();
    expect(plain(union).countries).toEqual(['170', '4', '840']);
    expect(plain(union).projects).toEqual(['CENTER-02', 'households']);
    expect(plain(union).users).toEqual(['501', '502']);
  });
});
