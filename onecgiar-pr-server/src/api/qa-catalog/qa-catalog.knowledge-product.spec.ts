// @akili-spec quality-assurance/qa-field-catalog
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { NOT_FOR_QA } from './definitions/not-for-qa';
import { PENDING_CATALOG } from './definitions/pending-catalog';
import { EXCLUDED_TABLES } from './definitions/excluded-tables';
import { CATALOG_SCOPE } from './definitions/scope';
import { validateCatalogShape } from './definitions/shape-validator';
import {
  CatalogField,
  CatalogSubField,
  PathBinding,
} from './definitions/types';

/**
 * QAC-T-22: knowledge product completed (M-QAP author affiliations, CGSpace/WoS metadata, the CGSpace lock on centers).
 * Expected values come from the 2026 client form (knowledge-product-selector KPS.html, knowledge-product-info KPI.html) and the
 * server reads (results_by_institutions.service.ts mqap_institutions, results-knowledge-products.mapper.ts), not from the catalog.
 */
const get = (
  key: string,
  fields: CatalogField[] = CATALOG_FIELDS,
): CatalogField => {
  const f = fields.find((x) => x.key === key);
  if (!f) throw new Error(`catalog has no field ${key}`);
  return f;
};
const sub = (field: CatalogField, key: string): CatalogSubField => {
  const s = field.subfields?.find((x) => x.key === key);
  if (!s) throw new Error(`${field.key} has no subfield ${key}`);
  return s;
};
const shapeErrors = (fields: CatalogField[]) =>
  validateCatalogShape({
    resultTypes: CATALOG_RESULT_TYPES,
    sections: CATALOG_SECTIONS,
    fields,
    notForQa: NOT_FOR_QA,
  });

const AFF = 'partners.kp_author_affiliations';
const KP = ['knowledge_product'];

describe('QAC-T-22 knowledge product completed', () => {
  it('the catalog is shape-valid', () => {
    expect(
      shapeErrors(CATALOG_FIELDS).map((e) => `${e.rule} ${e.path}`),
    ).toEqual([]);
  });

  describe('partners.kp_author_affiliations (KPS.html)', () => {
    const f = () => get(AFF);

    it('is a KP-only, optional, unconfirmed list keyed by the M-QAP match id of the role 2 rows', () => {
      expect(f().type).toBe('list');
      expect(f().result_types).toEqual(KP);
      expect(f().required).toBe(false);
      expect(f().required_confirmed).toBe(false);
      expect(f().storage).toEqual({
        kind: 'relation',
        table: 'results_by_institution',
        fk_to_result: 'result_id',
        value_column: 'result_kp_mqap_institution_id',
        filter: { institution_roles_id: 2, is_active: 1 },
      });
    });

    it('keeps the inventory names for the partner and roles subfields', () => {
      expect(sub(f(), 'clarisa_partner').control_list).toBe('institutions');
      expect(sub(f(), 'clarisa_partner').required).toBe(false);
      expect(sub(f(), 'roles').control_list).toBe('partner_delivery_types');
      expect(sub(f(), 'roles').required).toBe(false);
    });

    it('reads the affiliation name and the confidence from results_kp_mqap_institutions through the match id', () => {
      for (const [key, column] of [
        ['cgspace_affiliation', 'intitution_name'],
        ['confidence', 'confidant'],
      ]) {
        const st = sub(f(), key).storage as PathBinding;
        expect(st.kind).toBe('path');
        expect(st.steps).toEqual([
          {
            table: 'results_kp_mqap_institutions',
            filter: { is_active: 1 },
            join: [
              {
                from: 'result_kp_mqap_institution_id',
                to: 'result_kp_mqap_institution_id',
              },
            ],
          },
        ]);
        expect(st.value_column).toBe(column);
      }
    });

    it('the match type is the stored is_predicted flag, and the confidence is shown only for a predicted match', () => {
      expect(sub(f(), 'is_predicted').storage).toEqual({
        kind: 'column',
        table: 'results_by_institution',
        column: 'is_predicted',
      });
      expect(sub(f(), 'is_predicted').label).toBe('Predicted by M-QAP AI');
      expect(sub(f(), 'confidence').visible_when).toEqual({
        field: 'is_predicted',
        operator: 'eq',
        value: true,
      });
    });

    it('the partner type is the CLARISA type of the chosen partner, like external partners', () => {
      expect(sub(f(), 'partner_type').storage).toEqual({
        kind: 'lookup',
        source: 'clarisa.institutions',
        keys: [{ from: 'clarisa_partner', to: 'id' }],
        value_column: 'institution_type_code',
      });
    });

    it('the roles use the same delivery rows as the external partners roles', () => {
      expect(sub(f(), 'roles').storage).toEqual(
        sub(get('partners.external_partners'), 'partner_role').storage,
      );
    });

    it('the external partners (role 2, non-KP) and additional partners (role 8, KP) stay as they were', () => {
      const ext = get('partners.external_partners');
      expect(ext.result_types).not.toContain('knowledge_product');
      expect(ext.storage).toMatchObject({
        filter: { institution_roles_id: 2, is_active: 1 },
      });
      const add = get('partners.kp_additional_partners');
      expect(add.result_types).toEqual(KP);
      expect(add.type).toBe('list');
      expect(add.subfields?.map((x) => x.key)).toEqual([
        'institution',
        'partner_type',
        'partner_role',
      ]);
      expect(sub(add, 'institution').required).toBe(true);
      expect(sub(add, 'partner_role').required).toBe(true);
      expect(sub(add, 'partner_role').storage).toEqual(
        sub(ext, 'partner_role').storage,
      );
      expect(add.storage).toMatchObject({
        filter: { institution_roles_id: 8, is_active: 1 },
      });
    });
  });

  describe('classification', () => {
    it('results_kp_mqap_institutions is in scope and no longer excluded', () => {
      expect(
        EXCLUDED_TABLES.find((e) => e.table === 'results_kp_mqap_institutions'),
      ).toBeUndefined();
      expect(
        CATALOG_SCOPE.some(
          (c) => c.name === 'ResultsKnowledgeProductInstitution',
        ),
      ).toBe(true);
    });

    it('is_predicted and the match id are bound, not NOT_FOR_QA; the suggested institution id is NOT_FOR_QA with a reason', () => {
      const nfq = (t: string, c: string) =>
        NOT_FOR_QA.find((n) => n.table === t && n.column === c);
      expect(nfq('results_by_institution', 'is_predicted')).toBeUndefined();
      expect(
        nfq('results_by_institution', 'result_kp_mqap_institution_id'),
      ).toBeUndefined();
      expect(
        nfq('results_kp_mqap_institutions', 'predicted_institution_id')?.reason,
      ).toMatch(/never shows it/);
      expect(
        nfq('results_kp_mqap_institutions', 'intitution_name'),
      ).toBeUndefined();
      expect(nfq('results_kp_mqap_institutions', 'confidant')).toBeUndefined();
    });

    it('only the unshown orcid and journal columns of T-1 are pending; from_cgspace and the author-affiliation partner column are not', () => {
      const pendingT1 = PENDING_CATALOG.filter(
        (p) =>
          p.table.startsWith('results_kp_') ||
          p.table === 'results_knowledge_product',
      ).map((p) => `${p.table}.${p.column}`);
      expect(pendingT1.sort()).toEqual([
        'results_kp_altmetrics.journal',
        'results_kp_authors.orcid',
      ]);
      expect(
        PENDING_CATALOG.some(
          (p) =>
            (p.table === 'results_center' && p.column === 'from_cgspace') ||
            p.reason.includes('kp_author_affiliations'),
        ),
      ).toBe(false);
    });
  });

  describe('results_center.from_cgspace (CP.html:158,162)', () => {
    it('is a KP-only boolean subfield of both centers fields, and no separate field exists', () => {
      expect(
        CATALOG_FIELDS.find((x) => x.key === 'contributors.cgspace_centers'),
      ).toBeUndefined();
      for (const key of [
        'contributors.centers',
        'contributors.other_centers',
      ]) {
        const f = sub(get(key), 'from_cgspace');
        expect(f.type).toBe('boolean');
        expect(f.storage).toEqual({
          kind: 'column',
          table: 'results_center',
          column: 'from_cgspace',
        });
        expect(f.visible_when).toEqual({
          field: '$result_type',
          operator: 'eq',
          value: 'knowledge_product',
        });
      }
    });
  });

  describe('read-only CGSpace / WoS metadata (KPI.html)', () => {
    const metaCols: Record<string, string> = {
      'knowledge_product.online_date': 'online_year',
      'knowledge_product.issue_date_cg': 'year',
      'knowledge_product.issue_date_wos': 'year',
      'knowledge_product.peer_reviewed_cg': 'is_peer_reviewed',
      'knowledge_product.peer_reviewed_wos': 'is_peer_reviewed',
      'knowledge_product.is_isi_cg': 'is_isi',
      'knowledge_product.is_isi_wos': 'is_isi',
      'knowledge_product.doi': 'doi',
      'knowledge_product.accessibility_cg': 'open_access',
      'knowledge_product.repository': 'source',
      'knowledge_product.accessibility_wos': 'accesibility',
    };

    it.each(Object.entries(metaCols))(
      '%s is a read-only KP field reached result -> KP -> metadata row, reading %s',
      (key, column) => {
        const f = get(key);
        const st = f.storage as PathBinding;
        expect(f.result_types).toEqual(KP);
        expect(f.required).toBe(false);
        expect(f.required_confirmed).toBe(false);
        expect(f.description).toBeUndefined();
        expect(st.kind).toBe('path');
        expect(st.steps.map((s) => s.table)).toEqual([
          'results_knowledge_product',
          'results_kp_metadata',
        ]);
        expect(st.value_column).toBe(column);
      },
    );

    it('accessibility_cg is an object of the two stored values the form chooses between; the WoS variant is the single derived value', () => {
      const f = get('knowledge_product.accessibility_cg');
      expect(f.type).toBe('object');
      expect(
        f.subfields?.map((x) => [
          x.key,
          (x.storage as { column: string }).column,
        ]),
      ).toEqual([
        ['open_access', 'open_access'],
        ['accessibility', 'accesibility'],
      ]);
      expect(get('knowledge_product.accessibility_wos').type).toBe('text');
    });

    it('the WoS variants read the WOS row; the CGSpace variants read the first active row', () => {
      for (const key of Object.keys(metaCols)) {
        const row = (get(key).storage as PathBinding).steps[1];
        if (key.endsWith('_wos')) {
          expect(row.filter).toEqual({ is_active: 1, source: 'WOS' });
        } else {
          expect(row.filter).toEqual({ is_active: 1 });
          expect(row.pick).toEqual({
            order_by: 'result_kp_metadata_id',
            direction: 'asc',
          });
        }
      }
    });

    it('keywords and AGROVOC keywords split on is_agrovoc; authors carry the name only', () => {
      const steps = (k: string) => (get(k).storage as PathBinding).steps[1];
      expect(steps('knowledge_product.keywords').filter).toEqual({
        is_active: 1,
        is_agrovoc: 0,
      });
      expect(steps('knowledge_product.agrovoc_keywords').filter).toEqual({
        is_active: 1,
        is_agrovoc: 1,
      });
      expect(
        get('knowledge_product.authors').subfields?.map((s) => s.key),
      ).toEqual(['name']);
      expect(
        NOT_FOR_QA.some(
          (n) => n.table === 'results_kp_authors' && n.column === 'orcid',
        ),
      ).toBe(false);
    });

    it('Altmetric carries the form help text, the details id, the score and the badge', () => {
      const f = get('knowledge_product.altmetric');
      expect(f.type).toBe('object');
      expect(f.description).toMatch(
        /^The Altmetric Attention Score might vary/,
      );
      expect(f.subfields?.map((s) => s.key)).toEqual([
        'details_id',
        'score',
        'badge_image',
      ]);
    });

    it('FAIR lists the current (non-baseline) score rows with name, description and score', () => {
      const f = get('knowledge_product.fair');
      expect(f.type).toBe('list');
      const step = (f.storage as PathBinding).steps[1];
      expect(step.table).toBe('results_kp_fair_scores');
      expect(step.filter).toEqual({ is_baseline: 0, is_active: 1 });
      expect(f.subfields?.map((s) => s.key)).toEqual([
        'fair_field_id',
        'name',
        'description',
        'score',
      ]);
      expect(f.description).toMatch(/CGIAR Open and FAIR Data Assets Policy/);
      expect(f.description).toMatch(/metadata in the repository\./);
      expect(f.description).not.toMatch(/CGSpace/);
    });

    it('"Reference to other knowledge products" has no storage and is not catalogued', () => {
      expect(
        CATALOG_FIELDS.find((x) => x.key === 'knowledge_product.references'),
      ).toBeUndefined();
    });
  });

  describe('falsifier (production shape validator)', () => {
    it('passes on the real catalog and rejects a copy whose confidence still depends on a removed is_predicted subfield', () => {
      expect(shapeErrors(CATALOG_FIELDS)).toEqual([]);
      const mutated = CATALOG_FIELDS.map((f) =>
        f.key === AFF
          ? {
              ...f,
              subfields: f.subfields?.filter((x) => x.key !== 'is_predicted'),
            }
          : f,
      );
      expect(shapeErrors(mutated).map((e) => e.rule)).toContain(
        'UNKNOWN_CONDITION_KEY',
      );
    });

    it('rejects a from_cgspace visibility rule that names an unknown result type pseudo key', () => {
      const mutated = CATALOG_FIELDS.map((f) =>
        f.key === 'contributors.centers'
          ? {
              ...f,
              subfields: f.subfields?.map((x) =>
                x.key === 'from_cgspace'
                  ? {
                      ...x,
                      visible_when: {
                        field: '$nope',
                        operator: 'eq' as const,
                        value: 'knowledge_product',
                      },
                    }
                  : x,
              ),
            }
          : f,
      );
      expect(shapeErrors(mutated).map((e) => e.rule)).toContain(
        'UNKNOWN_HEADER_KEY',
      );
    });
  });
});
