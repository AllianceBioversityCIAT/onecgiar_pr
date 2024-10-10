export class InnovationDevelopmentQuestions {
  responsible_innovation_and_scaling: Responsibleinnovationandscaling = new Responsibleinnovationandscaling();
  intellectual_property_rights: Intellectualpropertyrights = new Intellectualpropertyrights();
  innovation_team_diversity: Innovationteamdiversity = new Innovationteamdiversity();
  megatrends: Megatrends = new Megatrends();
}

export class Megatrends {
  result_question_id: string = '';
  question_text: string = '';
  question_description?: any;
  result_type_id: number = 0;
  parent_question_id?: any;
  question_type_id: string = '';
  question_level: string = '';
  options: Option[] = [];
}

export class Innovationteamdiversity {
  result_question_id: string = '';
  question_text: string = '';
  question_description: string = '';
  result_type_id: number = 0;
  parent_question_id?: any;
  question_type_id: string = '';
  question_level: string = '';
  options: Option3[] = [];
}

export class Option3 {
  result_question_id: string = '';
  question_text: string = '';
  question_description?: any;
  result_type_id: number = 0;
  parent_question_id: string = '';
  question_type_id: string = '';
  question_level: string = '';
  subOptions: Option2[] = [];
}

export class Intellectualpropertyrights {
  result_question_id: string = '';
  question_text: string = '';
  question_description?: any;
  result_type_id: number = 0;
  parent_question_id?: any;
  question_type_id: string = '';
  question_level: string = '';
  q1: Q12 = new Q12();
  q2: Q12 = new Q12();
  q3: Q3 = new Q3();
}

export class Q3 {
  result_question_id: string = '';
  question_text: string = '';
  question_description: string = '';
  result_type_id: number = 0;
  parent_question_id: string = '';
  question_type_id: string = '';
  question_level: string = '';
  options: Option2[] = [];
}

export class Q12 {
  result_question_id: string = '';
  question_text: string = '';
  question_description?: any;
  result_type_id: number = 0;
  parent_question_id: string = '';
  question_type_id: string = '';
  question_level: string = '';
  options: Option2[] = [];
}

export class Option2 {
  result_question_id: string = '';
  question_text: string = '';
  question_description?: any;
  result_type_id: number = 0;
  parent_question_id: string = '';
  question_type_id: string = '';
  question_level: string = '';
  answer_boolean?: any;
  answer_text?: any;
  subOptions: any[] = [];
}

export class Responsibleinnovationandscaling {
  result_question_id: string = '';
  question_text: string = '';
  question_description?: any;
  result_type_id: number = 0;
  parent_question_id?: any;
  question_type_id: string = '';
  question_level: string = '';
  q1: Q1 = new Q1();
  q2: Q1 = new Q1();
}

export class Q1 {
  result_question_id: string = '';
  question_text: string = '';
  question_description: string = '';
  result_type_id: number = 0;
  parent_question_id: string = '';
  question_type_id: string = '';
  question_level: string = '';
  options: Option[] = [];
}

export class Option {
  result_question_id: string = '';
  question_text: string = '';
  question_description?: any;
  result_type_id: number = 0;
  parent_question_id: string = '';
  question_type_id: string = '';
  question_level: string = '';
  answer_boolean?: any;
  answer_text?: any;
  subOptions: SubOption[] = [];
}

export class SubOption {
  result_question_id: string = '';
  question_text: string = '';
  question_description?: any;
  result_type_id: number = 0;
  parent_question_id: string = '';
  question_type_id: string = '';
  question_level: string = '';
  answer_boolean?: any;
  answer_text?: any;
}
