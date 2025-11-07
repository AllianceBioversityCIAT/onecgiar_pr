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
