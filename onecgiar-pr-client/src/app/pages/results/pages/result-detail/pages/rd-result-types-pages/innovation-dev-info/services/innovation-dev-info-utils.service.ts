import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InnovationDevInfoUtilsService {
  constructor() {}

  /**
   * P2-3467: from the 2026 phase a "Responsible innovation and scaling" slot can legitimately come
   * back empty — `q4` has no replacement, and the two stage questions are matched by text, so an
   * unmatched one resolves to `undefined`. Destructuring that threw and aborted the whole restore
   * loop, leaving team diversity, IP rights and Megatrends showing blank radios over saved answers.
   */
  mapBoolean(body) {
    if (!body?.options?.length) return;
    const { options, radioButtonValue } = body;
    options.forEach(option => {
      option.answer_boolean = option.result_question_id == radioButtonValue ? true : null;
      if (option.saved) option.answer_boolean = false;
    });
    //(options);
  }

  /** Same empty-slot guard as {@link mapBoolean}; see the note there. */
  mapRadioButtonBooleans(body) {
    // find in body.options the one that has answer_boolean = true
    // get de id of that option and set it to body.radioButtonValue
    if (!body?.options?.length) return;
    const { options } = body;
    const option = options.find(option => option?.answer_boolean);
    if (!option) return;
    body.radioButtonValue = option.result_question_id;
    option.saved = true;
    //(options);
  }

  isMegatrendsComplete(options: any[]): boolean {
    if (!options?.length) return false;
    return options.some(option => option?.answer_boolean === true);
  }
}
