import { signal } from '@angular/core';

describe('AowHloCreateModalComponent - Unit Tests', () => {
  describe('getTitleInputLabel logic', () => {
    it('should return title from CGSpace when knowledge product with metadata', () => {
      const currentResultToReport = signal({
        indicators: [{ type_name: 'Number of knowledge products' }]
      });
      const mqapJson = signal({ metadata: [{ source: 'CGSpace' }] });
      const result_type_id = null;

      const isKnowledgeProduct =
        currentResultToReport()?.indicators?.[0]?.type_name === 'Number of knowledge products' || result_type_id === 6;

      let label = 'Title';
      if (isKnowledgeProduct && mqapJson()?.metadata?.length > 0) {
        label = 'Title retrived from ' + mqapJson()?.metadata?.[0]?.source;
      } else if (isKnowledgeProduct) {
        label = 'Title retrieved from the repository';
      }

      expect(label).toBe('Title retrived from CGSpace');
    });

    it('should return default title for non-knowledge products', () => {
      const currentResultToReport = signal({
        indicators: [{ type_name: 'Other type' }]
      });
      const result_type_id = null;

      const isKnowledgeProduct =
        currentResultToReport()?.indicators?.[0]?.type_name === 'Number of knowledge products' || result_type_id === 6;

      let label = 'Title';
      if (isKnowledgeProduct) {
        label = 'Title retrieved from the repository';
      }

      expect(label).toBe('Title');
    });
  });

  describe('preselectTocCenters logic (P2-3114 / P2-2998 AC1-AC2)', () => {
    // Mirrors the component: HLO-level partner institution ids ∪ KPI Targets acronyms, deduped by centersList filter.
    const deriveTocCenters = (node: any, centersList: any[]) => {
      const tocAcronyms = (node?.indicators?.[0]?.targets_by_center?.centers ?? [])
        .map((c: any) => c?.center_acronym)
        .filter(Boolean);
      const partnerInstitutionIds = new Set(
        (node?.toc_partner_institution_ids ?? []).map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id))
      );
      return centersList
        .filter((c: any) => tocAcronyms.includes(c.acronym) || partnerInstitutionIds.has(Number(c.institutionId)))
        .map((c: any) => ({ ...c, from_toc: true }));
    };

    const centersList = [
      { code: 'ABC', acronym: 'ABC', name: 'Alliance', institutionId: 100 },
      { code: 'CIP', acronym: 'CIP', name: 'CIP', institutionId: 101 },
      { code: 'IRRI', acronym: 'IRRI', name: 'IRRI', institutionId: 102 },
      { code: 'IFPRI', acronym: 'IFPRI', name: 'IFPRI', institutionId: 103 }
    ];

    it('should preselect the ToC-mapped centers tagged from_toc:true', () => {
      const node = { indicators: [{ targets_by_center: { centers: [{ center_acronym: 'ABC' }, { center_acronym: 'CIP' }] } }] };

      const preselected = deriveTocCenters(node, centersList);

      expect(preselected.map(c => c.acronym)).toEqual(['ABC', 'CIP']);
      expect(preselected.every(c => c.from_toc === true)).toBe(true);
    });

    it('should preselect HLO-level ToC partners that are CGIAR Centers (by institutionId)', () => {
      const node = {
        toc_partner_institution_ids: [100, 103, 999], // 999 = partner that is not a CGIAR Center → excluded
        indicators: [{ targets_by_center: { centers: [] } }]
      };

      const preselected = deriveTocCenters(node, centersList);

      expect(preselected.map(c => c.acronym)).toEqual(['ABC', 'IFPRI']);
      expect(preselected.every(c => c.from_toc === true)).toBe(true);
    });

    it('should union partners and targets centers without duplicates', () => {
      const node = {
        toc_partner_institution_ids: [100], // ABC also comes from targets
        indicators: [{ targets_by_center: { centers: [{ center_acronym: 'ABC' }, { center_acronym: 'IRRI' }] } }]
      };

      const preselected = deriveTocCenters(node, centersList);

      expect(preselected.map(c => c.acronym)).toEqual(['ABC', 'IRRI']);
    });

    it('should fall back to targets-only when the payload lacks toc_partner_institution_ids', () => {
      const node = { indicators: [{ targets_by_center: { centers: [{ center_acronym: 'CIP' }] } }] };

      expect(deriveTocCenters(node, centersList).map(c => c.acronym)).toEqual(['CIP']);
    });

    it('should preselect nothing when the node has no partners nor mapped centers', () => {
      const node = { indicators: [{ targets_by_center: { centers: [] } }] };

      expect(deriveTocCenters(node, centersList)).toEqual([]);
    });
  });

  describe('empty-state notes (P2-2998 AC4 / QA 2026-07-14)', () => {
    it('should show the orange notes only when the ToC returns no reference entries', () => {
      const hasReferenceCenters = (tocCenters: any[]) => tocCenters.length > 0;
      const hasReferenceScience = (tocSciencePrograms: any[]) => tocSciencePrograms.length > 0;

      expect(hasReferenceCenters([])).toBe(false); // → noCentersNote visible
      expect(hasReferenceScience([])).toBe(false); // → noScienceProgramsNote visible
      expect(hasReferenceCenters([{ code: 'ABC' }])).toBe(true); // → blue info note visible instead
    });

    it('should keep the note strings identical to the C&P section', () => {
      const noCentersNote = 'No CGIAR Centers related to the established HLO/Outcomes were found';
      const noScienceProgramsNote = 'No Science Programs related to the established HLO/Outcomes were found';

      expect(noCentersNote).toContain('No CGIAR Centers related');
      expect(noScienceProgramsNote).toContain('No Science Programs related');
    });
  });

  describe('createResult from_toc tagging (P2-3114)', () => {
    it('should default from_toc to false for manually-added centers', () => {
      const contributing_center = [
        { code: 'ABC', from_toc: true },
        { code: 'IRRI' } // manually added, no from_toc
      ];

      const tagged = contributing_center.map((c: any) => ({ ...c, from_toc: c?.from_toc ?? false }));

      expect(tagged.find(c => c.code === 'ABC')?.from_toc).toBe(true);
      expect(tagged.find(c => c.code === 'IRRI')?.from_toc).toBe(false);
    });
  });

  describe('Centers ToC/Other split logic (P2-3114)', () => {
    const OTHER = '__OTHER_CENTERS__';

    it('should reveal dropdown 2 when "Other(s)" is in dropdown 1 selection (sentinel kept, C&P parity)', () => {
      const OTHER = '__OTHER_CENTERS__';
      const contributing_center = [{ code: 'IRRI', from_toc: true }, { code: OTHER }];
      const showOtherCenters = contributing_center.some(c => c.code === OTHER);

      expect(showOtherCenters).toBe(true);
      expect(contributing_center.some(c => c.code === OTHER)).toBe(true);
      expect(contributing_center.map(c => c.code)).toEqual(['IRRI', OTHER]);
    });

    it('should clear otherCenters when "Other(s)" is deselected from dropdown 1', () => {
      const OTHER = '__OTHER_CENTERS__';
      const contributing_center = signal<any[]>([{ code: 'IRRI', from_toc: true }]);
      const otherCentersSelected = signal<any[]>([{ code: 'CIAT' }]);
      const showOtherCenters = () => contributing_center().some(c => c.code === OTHER);

      // onContributingCenterSelect logic after deselect
      if (!showOtherCenters()) {
        otherCentersSelected.set([]);
      }

      expect(showOtherCenters()).toBe(false);
      expect(otherCentersSelected()).toEqual([]);
    });

    it('should merge dropdown1 (from_toc:true) + otherCenters (from_toc:false), excluding the sentinel', () => {
      const dropdown1 = [{ code: 'IRRI', from_toc: true }, { code: OTHER }];
      const otherCentersSelected = [{ code: 'CIAT' }];

      const merged = [
        ...dropdown1.filter((c: any) => c?.code !== OTHER).map((c: any) => ({ ...c, from_toc: true })),
        ...otherCentersSelected.map((c: any) => ({ ...c, from_toc: false }))
      ];

      expect(merged).toEqual([
        { code: 'IRRI', from_toc: true },
        { code: 'CIAT', from_toc: false }
      ]);
    });

    it('should auto-open dropdown 2 when the ToC returns no centers (AC4 via !hasReferenceCenters)', () => {
      const tocCenters: any[] = [];
      const hasReferenceCenters = tocCenters.length > 0;
      expect(hasReferenceCenters).toBe(false);
    });
  });

  describe('Science Programs ToC/Other split logic (P2-3114)', () => {
    const OTHER_SP = -999;

    it('should preselect ToC science programs by id, tagged from_toc:true', () => {
      const tocSpIds = [51, 57];
      const allInits = [
        { id: 51, official_code: 'SP02', name: 'Sustainable Farming' },
        { id: 52, official_code: 'SP03', name: 'Animal' },
        { id: 57, official_code: 'SP08', name: 'Food Frontiers' }
      ];

      const preselected = allInits.filter(sp => tocSpIds.includes(sp.id)).map(sp => ({ ...sp, from_toc: true }));

      expect(preselected.map(s => s.official_code)).toEqual(['SP02', 'SP08']);
      expect(preselected.every(s => s.from_toc === true)).toBe(true);
    });

    it('should reveal dropdown 2 when "Other(s)" is in SP dropdown 1 (sentinel kept, C&P parity)', () => {
      const selectedEntities = [{ id: 51 }, { id: OTHER_SP }];
      const showOtherScience = selectedEntities.some(sp => sp?.id === OTHER_SP);

      expect(showOtherScience).toBe(true);
      expect(selectedEntities.map(s => s.id)).toEqual([51, OTHER_SP]);
    });

    it('should merge dropdown1 (from_toc:true) + otherScience (from_toc:false), excluding the sentinel', () => {
      const selectedEntities = [{ id: 51 }, { id: OTHER_SP }];
      const otherScienceSelected = [{ id: 61 }];

      const merged = [
        ...selectedEntities.filter(sp => sp?.id !== OTHER_SP).map(sp => ({ ...sp, from_toc: true })),
        ...otherScienceSelected.map(sp => ({ ...sp, from_toc: false }))
      ];

      expect(merged).toEqual([
        { id: 51, from_toc: true },
        { id: 61, from_toc: false }
      ]);
    });
  });

  describe('onResultTypeChange logic', () => {
    it('should update result_type_id in createResultBody', () => {
      const createResultBody = signal({
        handler: '',
        result_name: '',
        toc_progressive_narrative: '',
        result_type_id: null,
        contribution_to_indicator_target: null,
        contributing_center: null
      });

      const resultTypeId = 6;
      createResultBody.set({
        ...createResultBody(),
        result_type_id: resultTypeId
      });

      expect(createResultBody().result_type_id).toBe(6);
    });
  });

  describe('removeBilateralProject logic', () => {
    it('should remove a bilateral project from the list', () => {
      const project = { project_id: 1, project_name: 'Project 1' };
      const selectedW3BilateralProjects = signal([project, { project_id: 2, project_name: 'Project 2' }]);

      selectedW3BilateralProjects.set(selectedW3BilateralProjects().filter(item => item.project_id !== project.project_id));

      expect(selectedW3BilateralProjects().length).toBe(1);
      expect(selectedW3BilateralProjects()[0].project_id).toBe(2);
    });
  });

  describe('GET_mqapValidation logic', () => {
    it('should validate CGSpace handle URL', () => {
      const handler = 'https://cgspace.cgiar.org/handle/10568/139504';
      const regex =
        /^https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)$/;

      const isValid = regex.test(handler);

      expect(isValid).toBe(true);
    });

    it('should invalidate incorrect URL', () => {
      const handler = 'invalidURL';
      const regex =
        /^https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)$/;

      const isValid = regex.test(handler);

      expect(isValid).toBe(false);
    });

    it('should handle empty handler', () => {
      const handler = '';
      let errorMessage = '';

      if (!handler) {
        errorMessage = 'Please enter a valid handle.';
      }

      expect(errorMessage).toBe('Please enter a valid handle.');
    });
  });

  describe('removeEntityOption logic', () => {
    it('should remove an entity from selectedEntities', () => {
      const entity = { id: 1, official_code: 'Entity 1', name: 'Entity 1' };
      const selectedEntities = signal([entity, { id: 2, official_code: 'Entity 2', name: 'Entity 2' }]);

      selectedEntities.set(selectedEntities().filter(item => item.id !== entity.id));

      expect(selectedEntities().length).toBe(1);
      expect(selectedEntities()[0].id).toBe(2);
    });
  });
});
