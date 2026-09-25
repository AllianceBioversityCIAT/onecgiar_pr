import {
  buildIpsrStep3SavePayload,
  ipsrStep3ComponentEvidenceCount,
  ipsrStep3MissingPrincipalImpactAreas,
  isValidIpsrStep3EvidenceLink,
  normalizeIpsrStep3Component,
  normalizeIpsrStep3Evidences
} from './ipsr-step3-evidence.util';

const ev = (tags: Record<string, boolean> = {}) => ({ id: 1, link: 'https://example.org', description: null, is_sharepoint: false, is_public_file: null, ...tags });

describe('ipsr-step3-evidence.util (P2-3824)', () => {
  describe('normalize', () => {
    it('turns tinyint flags into booleans and keeps an unanswered public question as null', () => {
      const [a, b] = normalizeIpsrStep3Evidences([
        { id: 3, link: 'x', is_sharepoint: 1, is_public_file: 0, gender_related: 1, youth_related: 0 },
        { id: null, link: 'y', legacy: true, is_sharepoint: 0, is_public_file: null }
      ]);
      expect(a.is_sharepoint).toBe(true);
      expect(a.is_public_file).toBe(false);
      expect(a.gender_related).toBe(true);
      expect(a.youth_related).toBe(false);
      expect(b.is_public_file).toBeNull();
      expect(b.legacy).toBe(true);
    });

    it('gives a component both lists even when the server sent neither', () => {
      const item: any = normalizeIpsrStep3Component({ readinees_evidence_link: 'old' } as any);
      expect(item.readiness_evidences).toEqual([]);
      expect(item.use_evidences).toEqual([]);
      expect(normalizeIpsrStep3Evidences(undefined)).toEqual([]);
    });
  });

  it('counts readiness + use of one component', () => {
    expect(ipsrStep3ComponentEvidenceCount({ readiness_evidences: [ev()], use_evidences: [ev(), ev()] } as any)).toBe(3);
    expect(ipsrStep3ComponentEvidenceCount(null)).toBe(0);
  });

  describe('principal Impact Area alerts', () => {
    const body = (principal: any, core: any = {}, complementary: any[] = []) =>
      ({ principal_impact_areas: principal, result_ip_result_core: core, result_ip_result_complementary: complementary }) as any;

    it('lists every area scored 2 with no tagged evidence, in General information order', () => {
      expect(ipsrStep3MissingPrincipalImpactAreas(body(['poverty', 'gender']))).toEqual(['gender', 'poverty']);
    });

    it('clears an area once ANY list of the step (an enabler use list here) is tagged with it', () => {
      const b = body(['gender', 'climate'], { readiness_evidences: [ev()], use_evidences: [] }, [
        { readiness_evidences: [], use_evidences: [ev({ gender_related: true })] }
      ]);
      expect(ipsrStep3MissingPrincipalImpactAreas(b)).toEqual(['climate']);
    });

    it('reads climate from youth_related', () => {
      const b = body(['climate'], { readiness_evidences: [ev({ youth_related: true })] });
      expect(ipsrStep3MissingPrincipalImpactAreas(b)).toEqual([]);
    });

    it('shows nothing when the server sent no areas, or unknown ones', () => {
      expect(ipsrStep3MissingPrincipalImpactAreas(body(undefined))).toEqual([]);
      expect(ipsrStep3MissingPrincipalImpactAreas(body(['something-else']))).toEqual([]);
    });
  });

  describe('save payload', () => {
    it('sends the arrays and drops the legacy single-link fields, UI flags, File objects and principal areas', () => {
      const pending = new File(['x'], 'a.pdf');
      const body: any = {
        principal_impact_areas: ['gender'],
        innovatonUse: { actors: [] },
        result_ip_result_core: {
          readiness_level_evidence_based: 2,
          readinees_evidence_link: 'old',
          readiness_details_of_evidence: 'old',
          use_evidence_link: 'old',
          use_details_of_evidence: 'old',
          showDetailsOfReadiness: true,
          readiness_evidences: [{ ...ev(), is_sharepoint: true, file: pending, percentage: 100 }],
          use_evidences: []
        },
        result_ip_result_complementary: [{ readinees_evidence_link: 'old', readiness_evidences: [ev()], use_evidences: [ev()] }]
      };

      const payload: any = buildIpsrStep3SavePayload(body);

      expect(payload.principal_impact_areas).toBeUndefined();
      [payload.result_ip_result_core, payload.result_ip_result_complementary[0]].forEach(item => {
        ['readinees_evidence_link', 'readiness_details_of_evidence', 'use_evidence_link', 'use_details_of_evidence', 'showDetailsOfReadiness'].forEach(field =>
          expect(item).not.toHaveProperty(field)
        );
        expect(Array.isArray(item.readiness_evidences)).toBe(true);
        expect(Array.isArray(item.use_evidences)).toBe(true);
      });
      expect(payload.result_ip_result_core.readiness_evidences[0]).not.toHaveProperty('file');
      expect(payload.result_ip_result_core.readiness_evidences[0]).not.toHaveProperty('percentage');
      expect(payload.result_ip_result_core.readiness_level_evidence_based).toBe(2);
      expect(payload.innovatonUse).toBe(body.innovatonUse);

      // The body on screen is untouched.
      expect(body.result_ip_result_core.readinees_evidence_link).toBe('old');
      expect(body.result_ip_result_core.readiness_evidences[0].file).toBe(pending);
      expect(body.principal_impact_areas).toEqual(['gender']);
    });

    it('sends a legacy item back as a normal new item (id null, no special handling)', () => {
      const payload: any = buildIpsrStep3SavePayload({
        result_ip_result_core: { readiness_evidences: [{ ...ev(), id: null, legacy: true }], use_evidences: [] },
        result_ip_result_complementary: []
      } as any);
      expect(payload.result_ip_result_core.readiness_evidences[0]).toEqual(expect.objectContaining({ id: null, link: 'https://example.org' }));
      expect(payload.result_ip_result_core.readiness_evidences[0]).not.toHaveProperty('legacy');
    });
  });

  it('validates links with the Results rule', () => {
    expect(isValidIpsrStep3EvidenceLink('https://example.org/x')).toBe(true);
    expect(isValidIpsrStep3EvidenceLink('example.org')).toBe(true);
    expect(isValidIpsrStep3EvidenceLink('not a link')).toBe(false);
    expect(isValidIpsrStep3EvidenceLink('')).toBe(false);
  });
});
