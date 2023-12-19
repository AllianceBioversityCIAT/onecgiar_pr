import { TestBed } from '@angular/core/testing';

import { InnovationDevInfoUtilsService } from './innovation-dev-info-utils.service';

describe('InnovationDevInfoUtilsService', () => {
  let service: InnovationDevInfoUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InnovationDevInfoUtilsService);
  });

  describe('mapBoolean', () => {
    it('should map boolean values based on result_question_id and radioButtonValue', () => {
      const body = {
        options: [
          { result_question_id: 1, answer_boolean: null, saved: false },
          { result_question_id: 2, answer_boolean: null, saved: false },
          { result_question_id: 3, answer_boolean: null, saved: false },
        ],
        radioButtonValue: 2,
      };

      service.mapBoolean(body);

      expect(body.options[0].answer_boolean).toBeNull();
      expect(body.options[1].answer_boolean).toBeTruthy()
      expect(body.options[2].answer_boolean).toBeNull();
    });

    it('should set answer_boolean to false for saved options', () => {
      const body = {
        options: [
          { result_question_id: 1, answer_boolean: null, saved: true },
          { result_question_id: 2, answer_boolean: null, saved: false },
          { result_question_id: 3, answer_boolean: null, saved: true },
        ],
        radioButtonValue: 2,
      };

      service.mapBoolean(body);

      expect(body.options[0].answer_boolean).toBeFalsy()
      expect(body.options[1].answer_boolean).toBeTruthy()
      expect(body.options[2].answer_boolean).toBeFalsy()
    });
  });

  describe('mapRadioButtonBooleans', () => {
    it('should map radioButtonValue based on the option with answer_boolean set to true', () => {
      const body = {
        options: [
          { result_question_id: 1, answer_boolean: false, saved: false },
          { result_question_id: 2, answer_boolean: true, saved: false },
          { result_question_id: 3, answer_boolean: false, saved: false },
        ],
        radioButtonValue: null,
      };

      service.mapRadioButtonBooleans(body);

      expect(body.radioButtonValue).toBe(2);
      expect(body.options[0].saved).toBeFalsy();
      expect(body.options[1].saved).toBeTruthy();
      expect(body.options[2].saved).toBeFalsy();
    });

    it('should not update radioButtonValue if no option has answer_boolean set to true', () => {
      const body = {
        options: [
          { result_question_id: 1, answer_boolean: false, saved: false },
          { result_question_id: 2, answer_boolean: false, saved: false },
          { result_question_id: 3, answer_boolean: false, saved: false },
        ],
        radioButtonValue: 2,
      };

      service.mapRadioButtonBooleans(body);

      expect(body.radioButtonValue).toBe(2);
      expect(body.options[0].saved).toBeFalsy();
      expect(body.options[1].saved).toBeFalsy();
      expect(body.options[2].saved).toBeFalsy();
    });
  });
});
