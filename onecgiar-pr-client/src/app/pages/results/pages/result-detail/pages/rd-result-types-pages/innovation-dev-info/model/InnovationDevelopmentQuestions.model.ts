export interface InnovationDevelopmentQuestions {
  responsible_innovation_and_scaling: Responsibleinnovationandscaling[];
  intellectual_property_rights: Intellectualpropertyrights;
  innovation_team_diversity: Innovationteamdiversity;
}

interface Innovationteamdiversity {
  result_question_id: string;
  question_text: string;
  question_description: string;
  result_type_id: number;
  parent_question_id?: any;
  question_type_id: string;
  question_level: string;
  options: Option3[];
}

interface Option3 {
  result_question_id: string;
  question_text: string;
  question_description?: any;
  result_type_id: number;
  parent_question_id: string;
  question_type_id: string;
  question_level: string;
  subOptions: Option2[];
}

interface Intellectualpropertyrights {
  result_question_id: string;
  question_text: string;
  question_description?: any;
  result_type_id: number;
  parent_question_id?: any;
  question_type_id: string;
  question_level: string;
  q1: Q12;
  q2: Q12;
  q3: Q3;
}

interface Q3 {
  result_question_id: string;
  question_text: string;
  question_description: string;
  result_type_id: number;
  parent_question_id: string;
  question_type_id: string;
  question_level: string;
  options: Option2[];
}

interface Q12 {
  result_question_id: string;
  question_text: string;
  question_description?: any;
  result_type_id: number;
  parent_question_id: string;
  question_type_id: string;
  question_level: string;
  options: Option2[];
}

interface Option2 {
  result_question_id: string;
  question_text: string;
  question_description?: any;
  result_type_id: number;
  parent_question_id: string;
  question_type_id: string;
  question_level: string;
  answer_boolean?: any;
  answer_text?: any;
  subOptions: any[];
}

interface Responsibleinnovationandscaling {
  result_question_id: string;
  question_text: string;
  question_description?: any;
  result_type_id: number;
  parent_question_id?: any;
  question_type_id: string;
  question_level: string;
  q1: Q1;
  q2: Q1;
}

interface Q1 {
  result_question_id: string;
  question_text: string;
  question_description: string;
  result_type_id: number;
  parent_question_id: string;
  question_type_id: string;
  question_level: string;
  options: Option[];
}

interface Option {
  result_question_id: string;
  question_text: string;
  question_description?: any;
  result_type_id: number;
  parent_question_id: string;
  question_type_id: string;
  question_level: string;
  answer_boolean?: any;
  answer_text?: any;
  subOptions: SubOption[];
}

interface SubOption {
  result_question_id: string;
  question_text: string;
  question_description?: any;
  result_type_id: number;
  parent_question_id: string;
  question_type_id: string;
  question_level: string;
  answer_boolean?: any;
  answer_text?: any;
}
