import { DataControlService } from './data-control.service';

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
    service = new DataControlService(titleServiceMock, resultsSE); // Add the missing argument here
  });

  describe('getCurrentPhases', () => {
    it('should set the current and previous reporting phases', () => {
      const response = [
        {
          phase_year: '2021',
          phase_name: 'Test Phase',
          id: 1,
          obj_previous_phase: {
            phase_year: '2020',
            phase_name: 'Previous Phase',
            id: 2
          }
        }
      ];
      const spy = jest.spyOn(resultsSE, 'GET_versioning').mockReturnValue({ subscribe: cb => cb({ response }) });

      service.getCurrentPhases();

      expect(spy).toHaveBeenCalled();
      expect(service.reportingCurrentPhase).toEqual({
        phaseYear: '2021',
        phaseName: 'Test Phase',
        phaseId: 1
      });
      expect(service.previousReportingPhase).toEqual({
        phaseYear: '2020',
        phaseName: 'Previous Phase',
        phaseId: 2
      });
    });

    it('should set the previous reporting phase to null if there is no previous phase', () => {
      const response = [
        {
          phase_year: '2021',
          phase_name: 'Test Phase',
          id: 1
        }
      ];
      const spy = jest.spyOn(resultsSE, 'GET_versioning').mockReturnValue({ subscribe: cb => cb({ response }) });

      service.getCurrentPhases();

      expect(spy).toHaveBeenCalled();
      expect(service.previousReportingPhase).toEqual({
        phaseYear: null,
        phaseName: null,
        phaseId: null
      });
    });
  });

  describe('getCurrentIPSRPhase', () => {
    it('should set the current and previous IPSR phases', () => {
      const response = [
        {
          phase_year: '2021',
          phase_name: 'Test Phase',
          obj_previous_phase: {
            phase_year: '2020',
            phase_name: 'Previous Phase'
          }
        }
      ];
      const spy = jest.spyOn(resultsSE, 'GET_versioning').mockReturnValue({ subscribe: cb => cb({ response }) });

      service.getCurrentIPSRPhase();

      expect(spy).toHaveBeenCalled();
      expect(service.IPSRCurrentPhase).toEqual({
        phaseYear: '2021',
        phaseName: 'Test Phase'
      });
      expect(service.previousIPSRPhase).toEqual({
        phaseYear: '2020',
        phaseName: 'Previous Phase'
      });
    });

    it('should set the previous IPSR phase to null if there is no previous phase', () => {
      const response = [
        {
          phase_year: '2021',
          phase_name: 'Test Phase'
        }
      ];
      const spy = jest.spyOn(resultsSE, 'GET_versioning').mockReturnValue({ subscribe: cb => cb({ response }) });

      service.getCurrentIPSRPhase();

      expect(spy).toHaveBeenCalled();
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
      const initiatives = [{ name: 'Initiative' }, { name: 'Another Initiative' }];
      const result = service.myInitiativesListText(initiatives);

      expect(result).toEqual('Initiative, Another Initiative');
    });
    it('should return an empty string if no initiatives are provided', () => {
      const initiatives = [];
      const result = service.myInitiativesListText(initiatives);

      expect(result).toEqual('');
    });
  });

  describe('listenTextTenSeconds', () => {
    it('should resolve with text when text is truthy', async () => {
      const text = 'text';
      const promise = service.listenTextTenSeconds(text);
      jest.runAllTimers();

      await expect(promise).resolves.toBe(text);
    });
    it('should reject with "error" when text is falsy', async () => {
      const text = '';
      const promise = service.listenTextTenSeconds(text);
      jest.runAllTimers();

      await expect(promise).rejects.toStrictEqual(new Error('Timeout after 10 seconds'));
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
  });

  describe('someMandatoryFieldIncompleteResultDetail', () => {
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
  });
});
