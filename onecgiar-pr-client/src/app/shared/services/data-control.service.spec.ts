import { DataControlService } from './data-control.service';
import { of } from 'rxjs';

jest.useFakeTimers();

describe('DataControlService', () => {
  let service: DataControlService;
  let titleServiceMock: any;
  let resultsSE: any;

  beforeEach(() => {
    titleServiceMock = {
      setTitle: jest.fn()
    };
    resultsSE = {
      GET_versioning: jest.fn()
    };
    service = new DataControlService(titleServiceMock, resultsSE);
  });

  describe('getCurrentPhases', () => {
    let mockApiResponse: any;

    beforeEach(() => {
      mockApiResponse = {
        response: [
          {
            phase_year: '2021',
            phase_name: 'Test Phase',
            id: 1,
            obj_portfolio: { acronym: 'TEST-PORT' },
            obj_previous_phase: {
              phase_year: '2020',
              phase_name: 'Previous Phase',
              id: 2
            }
          }
        ]
      };
    });

    it('should return an Observable and set current reporting phase properties correctly', () => {
      const mockObservable = { pipe: jest.fn().mockReturnValue({ subscribe: jest.fn() }) };
      const getVersioningSpy = jest.spyOn(resultsSE, 'GET_versioning').mockReturnValue(mockObservable);

      const result = service.getCurrentPhases();

      expect(getVersioningSpy).toHaveBeenCalledWith('open', 'reporting');
      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    it('should set current reporting phase with all properties when API returns complete data', () => {
      jest.spyOn(resultsSE, 'GET_versioning').mockReturnValue(of(mockApiResponse));

      service.getCurrentPhases().subscribe();

      expect(service.reportingCurrentPhase).toEqual({
        phaseYear: '2021',
        phaseName: 'Test Phase',
        phaseId: 1,
        portfolioAcronym: 'TEST-PORT'
      });
    });

    it('should set previous reporting phase when obj_previous_phase exists', () => {
      jest.spyOn(resultsSE, 'GET_versioning').mockReturnValue(of(mockApiResponse));

      service.getCurrentPhases().subscribe();

      expect(service.previousReportingPhase).toEqual({
        phaseYear: '2020',
        phaseName: 'Previous Phase',
        phaseId: 2
      });
    });

    it('should set previous reporting phase to null when obj_previous_phase is undefined', () => {
      const responseWithoutPreviousPhase = {
        response: [
          {
            phase_year: '2021',
            phase_name: 'Test Phase',
            id: 1,
            obj_portfolio: { acronym: 'TEST-PORT' }
          }
        ]
      };

      jest.spyOn(resultsSE, 'GET_versioning').mockReturnValue(of(responseWithoutPreviousPhase));

      service.getCurrentPhases().subscribe();

      expect(service.previousReportingPhase).toEqual({
        phaseYear: null,
        phaseName: null,
        phaseId: null
      });
    });

    it('should handle empty response array gracefully', () => {
      const emptyResponse = { response: [] };
      jest.spyOn(resultsSE, 'GET_versioning').mockReturnValue(of(emptyResponse));

      service.getCurrentPhases().subscribe();

      expect(service.reportingCurrentPhase).toEqual({
        phaseYear: undefined,
        phaseName: undefined,
        phaseId: undefined,
        portfolioAcronym: undefined
      });
      expect(service.previousReportingPhase).toEqual({
        phaseYear: null,
        phaseName: null,
        phaseId: null
      });
    });
  });

  describe('getCurrentIPSRPhase', () => {
    let mockApiResponse: any;

    beforeEach(() => {
      mockApiResponse = {
        response: [
          {
            phase_year: '2021',
            phase_name: 'Test Phase',
            obj_portfolio: { acronym: 'TEST-PORT' },
            obj_previous_phase: {
              phase_year: '2020',
              phase_name: 'Previous Phase'
            }
          }
        ]
      };
    });

    it('should return an Observable and set current IPSR phase properties correctly', () => {
      const mockObservable = { pipe: jest.fn().mockReturnValue({ subscribe: jest.fn() }) };
      const getVersioningSpy = jest.spyOn(resultsSE, 'GET_versioning').mockReturnValue(mockObservable);

      const result = service.getCurrentIPSRPhase();

      expect(getVersioningSpy).toHaveBeenCalledWith('open', 'ipsr');
      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    it('should set current IPSR phase with all properties when API returns complete data', () => {
      jest.spyOn(resultsSE, 'GET_versioning').mockReturnValue(of(mockApiResponse));

      service.getCurrentIPSRPhase().subscribe();

      expect(service.IPSRCurrentPhase).toEqual({
        phaseYear: '2021',
        phaseName: 'Test Phase',
        portfolioAcronym: 'TEST-PORT'
      });
    });

    it('should set previous IPSR phase when obj_previous_phase exists', () => {
      jest.spyOn(resultsSE, 'GET_versioning').mockReturnValue(of(mockApiResponse));

      service.getCurrentIPSRPhase().subscribe();

      expect(service.previousIPSRPhase).toEqual({
        phaseYear: '2020',
        phaseName: 'Previous Phase'
      });
    });

    it('should set previous IPSR phase to null when obj_previous_phase is undefined', () => {
      const responseWithoutPreviousPhase = {
        response: [
          {
            phase_year: '2021',
            phase_name: 'Test Phase',
            obj_portfolio: { acronym: 'TEST-PORT' }
          }
        ]
      };

      jest.spyOn(resultsSE, 'GET_versioning').mockReturnValue(of(responseWithoutPreviousPhase));

      service.getCurrentIPSRPhase().subscribe();

      expect(service.previousIPSRPhase).toEqual({
        phaseYear: null,
        phaseName: null
      });
    });

    it('should handle empty response array gracefully', () => {
      const emptyResponse = { response: [] };
      jest.spyOn(resultsSE, 'GET_versioning').mockReturnValue(of(emptyResponse));

      service.getCurrentIPSRPhase().subscribe();

      expect(service.IPSRCurrentPhase).toEqual({
        phaseYear: undefined,
        phaseName: undefined,
        portfolioAcronym: undefined
      });
      expect(service.previousIPSRPhase).toEqual({
        phaseYear: null,
        phaseName: null
      });
    });
  });

  describe('validateBody', () => {
    it('should return true if all properties have values', () => {
      const validBody = { prop1: 'value1', prop2: 'value2' };
      expect(service.validateBody(validBody)).toBeTruthy();
    });
    it('should return false if any property is missing a value', () => {
      const invalidBody = { prop1: '', prop2: 'value2' };
      expect(service.validateBody(invalidBody)).toBeFalsy();
    });
  });

  describe('myInitiativesListText', () => {
    it('should generate initiatives list text correctly', () => {
      const initiatives = [{ official_code: 'INIT-001' }, { official_code: 'INIT-002' }];
      const result = service.myInitiativesListText(initiatives);

      expect(result).toEqual('INIT-001, INIT-002');
    });
    it('should return an empty string if no initiatives are provided', () => {
      const initiatives = [];
      const result = service.myInitiativesListText(initiatives);

      expect(result).toEqual('');
    });
  });

  describe('findClassTenSeconds', () => {
    it('should resolve with element when element is found', async () => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
        <div class="container"></div>`,
        'text/html'
      );
      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      const promise = service.findClassTenSeconds('container');
      jest.runAllTimers();

      await expect(promise).resolves.toBeTruthy();
      await expect(promise).resolves.toEqual(dom.querySelector('.container'));
    });
  });

  describe('getLastWord', () => {
    it('should return the last word with the first letter capitalized', () => {
      const inputText = 'String test';
      const result = service.getLastWord(inputText);
      expect(result).toBe('Test');
    });
    it('should return an empty string for empty input', () => {
      const inputText = '';
      const result = service.getLastWord(inputText);

      expect(result).toBe('');
    });
    it('should handle undefined input', () => {
      const inputText = undefined;
      const result = service.getLastWord(inputText);

      expect(result).toBe('');
    });
  });
  describe('isKnowledgeProduct', () => {
    it('should return true when result_type_id is 6', () => {
      service.currentResult = { result_type_id: 6 };
      const spy = jest.spyOn(service, 'isKnowledgeProduct', 'get');
      const result = service.isKnowledgeProduct;

      expect(spy).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });
    it('should return false when result_type_id is not 6', () => {
      service.currentResult = { result_type_id: 5 };
      const spy = jest.spyOn(service, 'isKnowledgeProduct', 'get');

      const result = service.isKnowledgeProduct;

      expect(result).toBeFalsy();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('someMandatoryFieldIncomplete', () => {
    let parser;
    let dom;
    beforeEach(() => {
      parser = new DOMParser();
      dom = parser.parseFromString(
        `
      <div class="container">
        <div class="pr-input mandatory">
          <input/>
        </div>
        <div class="pr-select mandatory">
        </div>
      </div>`,
        'text/html'
      );
    });
    it('should return true if htmlContainer is not found', () => {
      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      const result = service.someMandatoryFieldIncomplete('.class');
      expect(result).toBeTruthy();
    });
    it('should return true if mandatory input has empty value', () => {
      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));
      jest.spyOn(document, 'querySelectorAll').mockImplementation(selector => dom.querySelectorAll(selector));

      const result = service.someMandatoryFieldIncomplete('.container');
      expect(result).toBe(true);
    });
    it('should return true if mandatory select is not complete', () => {
      dom = parser.parseFromString(
        `
      <div class="container">
        <div class="pr-select mandatory">
        </div>
      </div>`,
        'text/html'
      );
      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));
      jest.spyOn(document, 'querySelectorAll').mockImplementation(selector => dom.querySelectorAll(selector));

      const result = service.someMandatoryFieldIncomplete('.container');
      expect(result).toBe(true);
    });
  });

  describe('someMandatoryFieldIncompleteResultDetail', () => {
    let parser;
    let dom;
    beforeEach(() => {
      parser = new DOMParser();
      dom = parser.parseFromString(
        `
      <div>
        <span class="pr_label"></span>
        <div class="container">
          <div class="pr-input mandatory">
            <div class="input-validation"></div>
          </div>
        </div>
      </div>`,
        'text/html'
      );
    });
    it('should return true if htmlContainer is not found', () => {
      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      const result = service.someMandatoryFieldIncompleteResultDetail('.class');
      expect(result).toBeTruthy();
    });
    it('should return true if inputs have missing values and populate fieldFeedbackList', () => {
      dom.querySelector('.pr_label').innerText = 'tag';
      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));
      jest.spyOn(document, 'querySelectorAll').mockImplementation(selector => dom.querySelectorAll(selector));

      const result = service.someMandatoryFieldIncompleteResultDetail('.container');
      expect(result).toBe(true);
      expect(service.fieldFeedbackList).toContain('tag');
    });
    it('should return true if selects are incomplete and populate fieldFeedbackList', () => {
      dom = parser.parseFromString(
        `
      <div>
        <div class="container">
          <span class="pr_label"></span>
          <div class="pr-field mandatory"></div>
        </div>
      </div>`,
        'text/html'
      );
      dom.querySelector('.pr_label').innerText = 'tag';
      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));
      jest.spyOn(document, 'querySelectorAll').mockImplementation(selector => dom.querySelectorAll(selector));

      const result = service.someMandatoryFieldIncompleteResultDetail('.container');
      expect(result).toBe(true);
      expect(service.fieldFeedbackList).toContain('tag');
    });

    it('should set the title and currentSectionName', () => {
      const sectionName = 'Test Section';
      const title = 'Test Title';
      const spy = jest.spyOn(titleServiceMock, 'setTitle');
      service.detailSectionTitle(sectionName, title);

      expect(spy).toHaveBeenCalled();
      expect(service.currentSectionName).toBe(title);
    });
    it('should set the title and currentSectionName to sectionName if title is not provided', () => {
      const sectionName = 'Test Section';
      const spy = jest.spyOn(titleServiceMock, 'setTitle');
      service.detailSectionTitle(sectionName);

      expect(spy).toHaveBeenCalled();
      expect(service.currentSectionName).toBe(sectionName);
    });

    it('should log an error if there is an error', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const error = new Error('Test error');

      console.error(error);

      expect(spy).toHaveBeenCalledWith(error);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('isInnoDev', () => {
    it('should return true when result_type_id is 7', () => {
      service.currentResult = { result_type_id: 7 };
      const spy = jest.spyOn(service, 'isInnoDev', 'get');
      const result = service.isInnoDev;

      expect(result).toBeTruthy();
      expect(spy).toHaveBeenCalled();
    });

    it('should return false when result_type_id is not 7', () => {
      service.currentResult = { result_type_id: 5 };
      const spy = jest.spyOn(service, 'isInnoDev', 'get');
      const result = service.isInnoDev;

      expect(result).toBeFalsy();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('isInnoUse', () => {
    it('should return true when result_type_id is 2', () => {
      service.currentResult = { result_type_id: 2 };
      const spy = jest.spyOn(service, 'isInnoUse', 'get');
      const result = service.isInnoUse;

      expect(result).toBeTruthy();
      expect(spy).toHaveBeenCalled();
    });

    it('should return false when result_type_id is not 2', () => {
      service.currentResult = { result_type_id: 5 };
      const spy = jest.spyOn(service, 'isInnoUse', 'get');
      const result = service.isInnoUse;

      expect(result).toBeFalsy();
      expect(spy).toHaveBeenCalled();
    });
  });
});
