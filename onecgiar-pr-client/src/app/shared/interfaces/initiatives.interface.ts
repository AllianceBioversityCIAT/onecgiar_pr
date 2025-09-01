export interface Initiative {
  id: number;
  official_code: string;
  name: string;
  short_name: string;
  active: boolean;
  portfolio_id: number;
  toc_id: string;
  cgiar_entity_type_id: string;
  obj_cgiar_entity_type: ObjCgiarEntityType;
  initiative_id: number;
  full_name: string;
}

export interface ObjCgiarEntityType {
  code: string;
  name: string;
}
