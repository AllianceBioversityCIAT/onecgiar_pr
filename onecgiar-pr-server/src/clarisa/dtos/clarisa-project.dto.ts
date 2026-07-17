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
  project_countries_array?: ClarisaProjectCountryDto[] | null;
  project_mappings_array?: ClarisaProjectMappingDto[] | null;
}
