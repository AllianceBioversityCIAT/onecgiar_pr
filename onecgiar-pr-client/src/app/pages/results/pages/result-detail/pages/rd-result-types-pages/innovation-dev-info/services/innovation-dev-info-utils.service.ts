import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InnovationDevInfoUtilsService {
  constructor() {}

  mapBoolean(body) {
    const { options, radioButtonValue } = body;
    options.forEach(option => {
      option.answer_boolean = option.result_question_id === radioButtonValue;
    });
  }
}
