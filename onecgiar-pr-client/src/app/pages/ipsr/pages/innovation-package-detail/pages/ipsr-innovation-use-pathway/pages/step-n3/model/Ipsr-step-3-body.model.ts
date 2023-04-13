export class IpsrStep3Body {
  example: any = null;
  innovatonUse: InnovatonUse = new InnovatonUse();
}

class InnovatonUse {
  actors: ActorN3[] = [];
  organization: OrganizationN3[] = [];
  measures: MeasureN3[] = [];
}

export class MeasureN3 {
  unit_of_measure: string;
  quantity: number;
  is_active: boolean;
}

export class OrganizationN3 {
  institution_types_id: number;
  institution_sub_type_id: number;
  how_many: number;
  // Aux
  hide: boolean;
  is_active: boolean;
}

export class ActorN3 {
  actor_type_id: number;
  women: number;
  women_youth: number;
  men: number;
  men_youth: number;
  is_active: boolean;
}
