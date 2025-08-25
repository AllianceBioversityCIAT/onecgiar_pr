export interface PhaseList {
  reporting: Phases[];
  ipsr: Phases[];
}

export interface Phases {
  is_active: boolean;
  created_date: string;
  last_updated_date: string;
  created_by: any;
  last_updated_by: any;
  id: number;
  phase_name: string;
  start_date: string;
  end_date: string;
  toc_pahse_id: string;
  cgspace_year: number;
  phase_year: number;
  status: boolean;
  previous_phase: number;
  app_module_id: number;
  obj_previous_phase: Phases;
  can_be_deleted: boolean;
  selected: boolean;
  obj_portfolio?: {
    acronym?: string;
  };
}
