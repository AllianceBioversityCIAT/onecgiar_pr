import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InnovationDevInfoUtilsService {
  constructor() {}

  mapBoolean(body) {
    const { options, radioButtonValue } = body;
    options.forEach(option => {
      option.answer_boolean = option.result_question_id == radioButtonValue ? true : null;
      if (option.saved) option.answer_boolean = false;
    });
    //(options);
  }

  mapRadioButtonBooleans(body) {
    // find in body.options the one that has answer_boolean = true
    // get de id of that option and set it to body.radioButtonValue
    const { options } = body;
    const option = options.find(option => option?.answer_boolean);
    if (!option) return;
    body.radioButtonValue = option.result_question_id;
    option.saved = true;
    //(options);
  }

  isMegatrendsComplete(options: any[]): boolean {
    if (!options || !options.length) return false;
    return options.some(option => option?.answer_boolean === true);
  }
}
