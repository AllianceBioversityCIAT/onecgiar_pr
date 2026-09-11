export interface ClarisaProjectCountryObjectDto {
  id: number;
  name?: string | null;
  iso_alpha_2?: string | null;
  iso_alpha_3?: string | null;
  iso_numeric?: number | null;
  geoposition_id?: number | null;
}

export interface ClarisaProjectCountryDto {
  id: number;
  project_id: number;
  country_code: number | null;
  allocation_percentage?: number | string | null;
  country_object?: ClarisaProjectCountryObjectDto | null;
}

export interface ClarisaProjectGlobalUnitObjectDto {
  id: number;
  name?: string | null;
  short_name?: string | null;
  acronym?: string | null;
  smo_code?: string | null;
  financial_code?: string | null;
  year?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  level?: number | null;
  institution_id?: number | null;
  global_unit_type_id?: number | null;
  parent_id?: number | null;
  portfolio_id?: number | null;
}

export interface ClarisaProjectMappingDto {
  id: number;
  project_id: number;
  program_id: number;
  allocation: number | string | null;
  complementarity: string | null;
  efficiencies: string | null;
  comments: string | null;
  status: string | null;
  global_unit_object?: ClarisaProjectGlobalUnitObjectDto | null;
}

export interface ClarisaProjectDto {
  id: number;
  short_name: string | null;
  full_name: string | null;
  summary: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  total_budget: string | null;
  remaining: string | null;
  annual: string | null;
  source_of_funding: string | null;
  organization_code: number | null;
  funder_code: number | null;
  interim_director_review: string | null;
  project_results: string | null;
  modification_justification: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_active: boolean | null;
  created_by: number | null;
  updated_by: number | null;
  // W3 Registry integration (CLARISA `w3-registry-integration` branch, not yet
  // deployed). Field names are best-guess snake_case matching this DTO's existing
  // 1:1 convention with column names — verify against a real CLARISA payload
  // before relying on them (see PROJECTS_W3_PARAMS in clarisa-endpoints.enum.ts).
  phase?: number | null;
  external_source?: string | null;
  external_project_id?: string | null;
  external_code?: string | null;
  source_center_acronym?: string | null;
  source_center_name?: string | null;
  source_status?: string | null;
  project_countries_array?: ClarisaProjectCountryDto[] | null;
  project_mappings_array?: ClarisaProjectMappingDto[] | null;
}
