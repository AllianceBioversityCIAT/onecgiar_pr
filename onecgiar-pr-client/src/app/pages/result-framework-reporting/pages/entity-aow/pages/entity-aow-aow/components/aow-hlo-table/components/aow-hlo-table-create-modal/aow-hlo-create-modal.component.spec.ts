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

  describe('preselectTocCenters logic (P2-3114)', () => {
    const deriveTocCenters = (indicator: any, centersList: any[]) => {
      const tocAcronyms = (indicator?.targets_by_center?.centers ?? []).map((c: any) => c?.center_acronym).filter(Boolean);
      if (!tocAcronyms.length) return [];
      return centersList.filter((c: any) => tocAcronyms.includes(c.acronym)).map((c: any) => ({ ...c, from_toc: true }));
    };

    it('should preselect the ToC-mapped centers tagged from_toc:true', () => {
      const indicator = { targets_by_center: { centers: [{ center_acronym: 'ABC' }, { center_acronym: 'CIP' }] } };
      const centersList = [
        { code: 'ABC', acronym: 'ABC', name: 'Alliance' },
        { code: 'CIP', acronym: 'CIP', name: 'CIP' },
        { code: 'IRRI', acronym: 'IRRI', name: 'IRRI' }
      ];

      const preselected = deriveTocCenters(indicator, centersList);

      expect(preselected.map(c => c.acronym)).toEqual(['ABC', 'CIP']);
      expect(preselected.every(c => c.from_toc === true)).toBe(true);
    });

    it('should preselect nothing when the indicator has no mapped centers', () => {
      const indicator = { targets_by_center: { centers: [] } };
      const centersList = [{ code: 'ABC', acronym: 'ABC', name: 'Alliance' }];

      expect(deriveTocCenters(indicator, centersList)).toEqual([]);
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

    it('should open dropdown 2 and drop the sentinel when "Other(s)" is picked', () => {
      const showOtherCenters = signal(false);
      const contributing_center = signal<any[]>([{ code: 'IRRI', from_toc: true }, { code: OTHER }]);

      // onContributingCenterSelect logic
      const event = { option: { code: OTHER } };
      if (event?.option?.code === OTHER) {
        showOtherCenters.set(true);
        contributing_center.set(contributing_center().filter((c: any) => c?.code !== OTHER));
      }

      expect(showOtherCenters()).toBe(true);
      expect(contributing_center().some(c => c.code === OTHER)).toBe(false);
      expect(contributing_center().map(c => c.code)).toEqual(['IRRI']);
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

    it('should auto-open dropdown 2 when the ToC returns no centers (AC4)', () => {
      const tocCenters: any[] = [];
      const showOtherCenters = signal(tocCenters.length === 0);
      expect(showOtherCenters()).toBe(true);
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

    it('should open dropdown 2 and drop the sentinel when "Other(s)" is picked', () => {
      const showOtherScience = signal(false);
      const selectedEntities = signal<any[]>([{ id: 51 }, { id: OTHER_SP }]);

      if (selectedEntities().some(sp => sp?.id === OTHER_SP)) {
        showOtherScience.set(true);
        selectedEntities.set(selectedEntities().filter(sp => sp?.id !== OTHER_SP));
      }

      expect(showOtherScience()).toBe(true);
      expect(selectedEntities().map(s => s.id)).toEqual([51]);
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
