export class InnovationDevInfoBody {
  public result_innovation_dev_id: number;
  public short_title: string; //todo
  public innovation_characterization_id: number; //todo
  public innovation_nature_id: number; //todo
  public innovation_readiness_level_id: number; //todo
  public is_new_variety: boolean; //todo
  public number_of_varieties: number; //todo
  public innovation_developers: string; //todo
  public innovation_collaborators: string; //todo
  // public readiness_level: string; //todo
  public evidences_justification: string; //todo
  public innovation_acknowledgement: string;
  public result = { title: '' };
  public pictures: linkType[] = [{ link: '' }];
  public reference_materials: linkType[] = [{ link: '' }];
  public innovatonUse: InnovatonUse = new InnovatonUse();
  public innovation_pdf: boolean;
}

class InnovatonUse {
  actors: Actor[] = [];
  organization: Organization[] = [];
  measures: Measure[] = [];
}

export class Measure {
  unit_of_measure: string = null;
  quantity: number = null;
  is_active: boolean = null;
  result_ip_measure_id: any;
}

export class Organization {
  institution_types_id: number;
  institution_sub_type_id: number;
  how_many: number;
  other_institution: string;
  graduate_students: string;
  // Aux
  hide: boolean;
  is_active: boolean;
  id: any;
}

export class Actor {
  actor_type_id: number;
  women: number;
  women_youth: number;
  men: number;
  men_youth: number;
  is_active: boolean;
  women_non_youth: any;
  men_non_youth: any;
  previousWomen: any;
  previousWomen_youth: any;
  other_actor_type: any;
  sex_and_age_disaggregation: boolean;
  how_many: any;
  result_actors_id: number;
}

export class linkType {
  id?: string = '';
  link?: string = '';
  description?: string | null = null;
  result_id?: string = '';
  gender_related?: string | null = null;
  youth_related?: string | null = null;
  nutrition_related?: string | null = null;
  environmental_biodiversity_related?: string | null = null;
  poverty_related?: string | null = null;
  is_supplementary?: string | null = null;
  is_active?: number = 1;
  creation_date?: string = '';
  last_updated_date?: string = '';
  evidence_type_id?: string = '';
}
