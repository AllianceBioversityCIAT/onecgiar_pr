export class TargetIndicator {
  phase: string;
  toc_results_indicator_id: string;
  indicator_description: string;
  unit_messurament: string;
  location: string;
  type_value: string;
  statement: string;
  result: {
    id: number;
    description: string;
    is_active: number;
    last_updated_date: string;
    gender_tag_level_id: null;
    version_id: string;
    result_type_id: number;
    status: number;
    created_by: string;
    last_updated_by: null;
    reported_year_id: number;
    created_date: string;
    result_level_id: number;
    title: string;
    legacy_id: null;
    krs_url: null;
    is_krs: null;
    climate_change_tag_level_id: null;
    no_applicable_partner: number;
    has_regions: null;
    has_countries: null;
    geographic_scope_id: null;
    lead_contact_person: null;
    result_code: string;
    status_id: string;
    nutrition_tag_level_id: null;
    environmental_biodiversity_tag_level_id: null;
    poverty_tag_level_id: null;
    is_discontinued: null;
    is_replicated: number;
    last_action_type: null;
    justification_action_type: null;
    in_qa: number;
    start_date: string;
    end_date: string;
    phase_name: string;
    cgspace_year: number;
    phase_year: number;
    previous_phase: string;
    app_module_id: string;
    toc_pahse_id: string;
    reporting_phase: null;
    name: string;
  };
  type: string;
  number_result_type: number;
  targets: Target[];
  is_calculable: boolean;
  total: number;
}

export class Target {
  indicator_question: boolean;
  number_target: number;
  contributing: string;
  target_progress_narrative: string;
}
